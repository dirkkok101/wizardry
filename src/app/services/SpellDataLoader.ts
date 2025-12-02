import { SpellDefinition, LoadedSpell } from '@models/SpellDefinition'
import { SpellFileData, SpellLevelData } from '@models/SpellFileData'
import { SpellDefinitionSchema } from '@validation/spell-schema'

/**
 * Service for loading and validating spell data from JSON files
 *
 * Data-driven architecture:
 * - All spell definitions live in data/spells/*.json
 * - Manifest file (data/spells/index.json) lists all spell IDs
 * - No hardcoded spell lists in code
 * - Zod validates all spell data at runtime
 *
 * Supports both formats:
 * - Legacy: Single-level spells with all fields at top level
 * - Consolidated: Multi-level spells with shared metadata and `levels` array
 */
export class SpellDataLoader {
  private static spellCache: Map<string, LoadedSpell> | null = null
  private static loadPromise: Promise<Map<string, LoadedSpell>> | null = null
  private static loading = false
  private static loaded = false
  private static loadError: Error | null = null
  private static failedSpells: Map<string, string> = new Map() // spellId → error message

  /**
   * Load all spell JSON files and validate them
   * Returns cached results on subsequent calls
   * Gracefully handles individual spell failures
   */
  static async loadAllSpells(): Promise<Map<string, LoadedSpell>> {
    // Return cached result if available
    if (this.spellCache) {
      return this.spellCache
    }

    // Return in-progress load if one exists
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Start new load
    this.loadPromise = this.performLoad()
    this.spellCache = await this.loadPromise
    return this.spellCache
  }

  /**
   * Check if a raw spell object is in consolidated format (has `levels` array)
   */
  private static isConsolidatedFormat(rawSpell: any): rawSpell is SpellFileData {
    return Array.isArray(rawSpell.levels) && rawSpell.levels.length > 0
  }

  /**
   * Flatten a consolidated spell into individual SpellDefinition objects
   */
  private static flattenConsolidatedSpell(fileData: SpellFileData): SpellDefinition[] {
    const spells: SpellDefinition[] = []

    for (const levelData of fileData.levels) {
      // Merge shared metadata with level-specific data
      const spell: SpellDefinition = {
        id: levelData.id,
        name: fileData.name,
        level: levelData.level,
        casterType: fileData.casterType,
        category: fileData.category,
        target: levelData.target,
        castableIn: fileData.castableIn,
        description: levelData.description,
        // Copy all level-specific fields
        ...this.extractLevelSpecificFields(levelData)
      }

      spells.push(spell)
    }

    return spells
  }

  /**
   * Extract level-specific fields from SpellLevelData
   */
  private static extractLevelSpecificFields(levelData: SpellLevelData): Partial<SpellDefinition> {
    const fields: Partial<SpellDefinition> = {}

    // Copy optional fields if present
    if (levelData.damage) fields.damage = levelData.damage
    if (levelData.healing) fields.healing = levelData.healing

    // Handle effect field - convert to specific boolean flags
    if (levelData.effect) {
      switch (levelData.effect.type) {
        case 'instant_death':
          fields.instantDeath = true
          break
        case 'transformation':
          fields.transformation = true
          break
        case 'dispel':
          fields.dispelMagic = true
          break
        case 'petrification':
          // Petrification is a form of instant death in Wizardry
          fields.instantDeath = true
          break
        case 'sleep':
          fields.statusEffect = 'ASLEEP'
          break
        case 'blind':
          fields.statusEffect = 'BLIND'
          break
        case 'silence':
          fields.statusEffect = 'SILENCED'
          break
        case 'invisible':
          fields.statusEffect = 'INVISIBLE'
          break
        case 'paralysis':
          fields.statusEffect = 'PARALYZED'
          break
        case 'fear':
          // Fear could be handled as a status effect or special mechanic
          // For now, treating it as a debuff without a specific status
          break
        default:
          // Pass through unknown effect types (like hp_reduction for MABADI)
          fields.effect = levelData.effect
          break
      }
    }

    // Direct boolean flags override effect field
    if (levelData.acModifier !== undefined) fields.acModifier = levelData.acModifier
    if (levelData.statusEffect) fields.statusEffect = levelData.statusEffect
    if (levelData.instantDeath !== undefined) fields.instantDeath = levelData.instantDeath
    if (levelData.resurrection !== undefined) fields.resurrection = levelData.resurrection
    if (levelData.resurrectionSuccessRate !== undefined) fields.resurrectionSuccessRate = levelData.resurrectionSuccessRate
    if (levelData.dispelMagic !== undefined) fields.dispelMagic = levelData.dispelMagic
    if (levelData.transformation !== undefined) fields.transformation = levelData.transformation
    if (levelData.undeadOnly !== undefined) fields.undeadOnly = levelData.undeadOnly
    if (levelData.ignoresAC !== undefined) fields.ignoresAC = levelData.ignoresAC
    if (levelData.utility) fields.utility = levelData.utility
    if (levelData.teleportSuccessRate !== undefined) fields.teleportSuccessRate = levelData.teleportSuccessRate
    if (levelData.recallSuccessRate) fields.recallSuccessRate = levelData.recallSuccessRate
    if (levelData.statusCure) fields.statusCure = levelData.statusCure
    if (levelData.failureResult) fields.failureResult = levelData.failureResult

    // New spell data fields for Phase 3-6 implementations
    if (levelData.campBehavior) fields.campBehavior = levelData.campBehavior
    if (levelData.combatBehavior) fields.combatBehavior = levelData.combatBehavior
    if (levelData.randomEffects) fields.randomEffects = levelData.randomEffects
    if (levelData.cost) fields.cost = levelData.cost
    if (levelData.requirements) fields.requirements = levelData.requirements
    if (levelData.escape) fields.escape = levelData.escape
    if (levelData.risks) fields.risks = levelData.risks

    return fields
  }

  /**
   * Internal method to perform the actual loading
   * Reads manifest file to discover all spells
   * Loads files directly with fetch() to support both legacy (single-level)
   * and consolidated (multi-level) formats.
   */
  private static async performLoad(): Promise<Map<string, LoadedSpell>> {
    this.loading = true
    this.loadError = null
    this.failedSpells.clear()

    const spells = new Map<string, LoadedSpell>()
    const loadedAt = Date.now()

    try {
      // Load manifest to get list of all spell file names
      const manifestResponse = await fetch('/assets/spells/index.json')
      if (!manifestResponse.ok) {
        throw new Error('Failed to load spell manifest')
      }
      const spellFileNames: string[] = await manifestResponse.json()

      // Load each spell file
      for (const fileName of spellFileNames) {
        try {
          const response = await fetch(`/assets/spells/${fileName}.json`)
          if (!response.ok) {
            this.failedSpells.set(fileName, `HTTP ${response.status}`)
            continue
          }

          const rawSpell = await response.json()

          try {
            // Detect format and convert to SpellDefinition array
            const spellDefinitions: SpellDefinition[] = this.isConsolidatedFormat(rawSpell)
              ? this.flattenConsolidatedSpell(rawSpell)
              : [rawSpell as SpellDefinition]

            // Validate and load each spell definition
            for (const spellDef of spellDefinitions) {
              try {
                // Validate with Zod
                const validated = SpellDefinitionSchema.parse(spellDef)

                // Warn if spell has formula strings but no typed data
                this.warnMissingTypedData(validated)

                // Convert to LoadedSpell
                const loadedSpell: LoadedSpell = {
                  ...validated,
                  loaded: true,
                  validatedAt: loadedAt
                }

                spells.set(spellDef.id, loadedSpell)
              } catch (error) {
                // Track validation failure but continue loading other spells
                const errorMessage = error instanceof Error ? error.message : String(error)
                this.failedSpells.set(spellDef.id, errorMessage)
                console.warn(`Failed to validate spell ${spellDef.id}:`, errorMessage)
              }
            }
          } catch (error) {
            // Track file parsing failure
            const errorMessage = error instanceof Error ? error.message : String(error)
            this.failedSpells.set(fileName, errorMessage)
            console.warn(`Failed to process spell file ${fileName}:`, errorMessage)
          }
        } catch (error) {
          // Track fetch error
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.failedSpells.set(fileName, errorMessage)
          console.warn(`Failed to fetch spell file ${fileName}:`, errorMessage)
        }
      }

      this.loaded = true

      const successCount = spells.size
      const failCount = this.failedSpells.size
      const totalCount = spellFileNames.length  // Total files attempted

      if (failCount > 0) {
        console.warn(`Loaded ${successCount} spell definitions from ${totalCount} files (${failCount} files failed)`)
      } else {
        console.log(`Loaded ${successCount} spell definitions from ${totalCount} files`)
      }

      return spells
    } catch (error) {
      // Catastrophic failure (e.g., manifest not found)
      this.loadError = error as Error
      console.error('Failed to load spells:', error)
      throw error
    } finally {
      this.loading = false
    }
  }

  /**
   * Get a specific spell by ID
   * Must call loadAllSpells first
   */
  static getSpell(spellId: string): LoadedSpell | undefined {
    if (!this.spellCache) {
      throw new Error('Spells not loaded. Call loadAllSpells() first.')
    }
    return this.spellCache.get(spellId)
  }

  /**
   * Get all loaded spells
   */
  static getAllSpells(): Map<string, LoadedSpell> {
    if (!this.spellCache) {
      throw new Error('Spells not loaded. Call loadAllSpells() first.')
    }
    return this.spellCache
  }

  /**
   * Check if spells are currently being loaded
   */
  static isLoading(): boolean {
    return this.loading
  }

  /**
   * Check if spells have been successfully loaded
   */
  static isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Get any error that occurred during loading
   */
  static getError(): Error | null {
    return this.loadError
  }

  /**
   * Get map of failed spell loads
   * @returns Map of spellId → error message for spells that failed to load or validate
   */
  static getFailedSpells(): ReadonlyMap<string, string> {
    return this.failedSpells
  }

  /**
   * Get count of successfully loaded spells
   */
  static getLoadedCount(): number {
    return this.spellCache?.size ?? 0
  }

  /**
   * Get total count of spells attempted to load
   */
  static getTotalCount(): number {
    return this.getLoadedCount() + this.failedSpells.size
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.spellCache = null
    this.loadPromise = null
    this.loading = false
    this.loaded = false
    this.loadError = null
    this.failedSpells.clear()
  }

  /**
   * Warn if spell has formula strings but no typed data
   * This helps track migration progress to typed formulas
   *
   * Code should ONLY read typed data, not parse formula strings.
   * Spells with formula strings but no typed field need migration.
   */
  private static warnMissingTypedData(spell: any): void {
    const warnings: string[] = []

    // Check resistance formula
    if (spell.resistance?.formula && !spell.resistance?.typed) {
      warnings.push('resistance.formula without resistance.typed')
    }

    // Check recovery formula
    if (spell.recovery?.formula && !spell.recovery?.typed) {
      warnings.push('recovery.formula without recovery.typed')
    }

    // Check resurrection success formula
    if (typeof spell.resurrection === 'object' &&
        spell.resurrection?.successFormula &&
        !spell.resurrection?.typed) {
      warnings.push('resurrection.successFormula without resurrection.typed')
    }

    // Check escape success formula
    if (spell.escape?.successFormula && !spell.escape?.typed) {
      warnings.push('escape.successFormula without escape.typed')
    }

    if (warnings.length > 0) {
      console.warn(`Spell ${spell.id} has formula strings without typed data: ${warnings.join(', ')}`)
    }
  }
}
