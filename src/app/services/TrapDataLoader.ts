import { TrapId, TrapEffect, TrapTargetMode, TrapSpecialEffect } from '@models/Trap'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { TrapSchema, ValidatedTrap, TrapEffectType } from '@validation/trap-schema'

/**
 * Service for loading and validating trap data from JSON files
 *
 * Data-driven architecture:
 * - All trap definitions live in data/traps/*.json
 * - Manifest file (data/traps/index.json) lists all trap IDs
 * - No hardcoded trap types in code
 * - Zod validates all trap data at runtime
 */
export class TrapDataLoader {
  private static trapsCache: Map<TrapId, TrapEffect> | null = null
  private static loadPromise: Promise<Map<TrapId, TrapEffect>> | null = null
  private static loading = false
  private static loaded = false
  private static loadError: Error | null = null
  private static failedTraps: Map<string, string> = new Map() // trapId → error message

  /**
   * Load all trap JSON files and validate them
   * Returns cached results on subsequent calls
   * Gracefully handles individual trap failures
   */
  static async loadAllTraps(): Promise<Map<TrapId, TrapEffect>> {
    // Return cached result if available
    if (this.trapsCache) {
      return this.trapsCache
    }

    // Return in-progress load if one exists
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Start new load
    this.loadPromise = this.performLoad()
    this.trapsCache = await this.loadPromise
    return this.trapsCache
  }

  /**
   * Internal method to perform the actual loading
   * Reads manifest file to discover all traps
   */
  private static async performLoad(): Promise<Map<TrapId, TrapEffect>> {
    this.loading = true
    this.loadError = null
    this.failedTraps.clear()

    const traps = new Map<TrapId, TrapEffect>()

    try {
      // Load manifest to get list of all trap IDs
      const manifestResponse = await fetch('/assets/traps/index.json')
      if (!manifestResponse.ok) {
        throw new Error('Failed to load trap manifest')
      }
      const trapFileNames: string[] = await manifestResponse.json()

      // Load each trap file
      for (const fileName of trapFileNames) {
        try {
          const response = await fetch(`/assets/traps/${fileName}.json`)
          if (!response.ok) {
            this.failedTraps.set(fileName, `HTTP ${response.status}`)
            continue
          }

          const rawTrap = await response.json()

          // Validate with Zod
          const validated: ValidatedTrap = TrapSchema.parse(rawTrap)

          // Transform to runtime TrapEffect format
          const trapEffect = this.transformValidatedToTrapEffect(validated)

          traps.set(trapEffect.id, trapEffect)
        } catch (error) {
          // Track validation failure but continue loading other traps
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.failedTraps.set(fileName, errorMessage)
          console.warn(`Failed to validate trap ${fileName}:`, errorMessage)
        }
      }

      this.loaded = true

      const successCount = traps.size
      const failCount = this.failedTraps.size
      const totalCount = successCount + failCount

      if (failCount > 0) {
        console.warn(`Loaded ${successCount}/${totalCount} traps (${failCount} failed)`)
      } else {
        console.log(`✅ Loaded and validated ${successCount}/${totalCount} traps`)
      }

      return traps
    } catch (error) {
      // Catastrophic failure (e.g., manifest not found)
      this.loadError = error as Error
      console.error('Failed to load traps:', error)
      throw error
    } finally {
      this.loading = false
    }
  }

  /**
   * Transform validated JSON trap to runtime TrapEffect format
   */
  private static transformValidatedToTrapEffect(validated: ValidatedTrap): TrapEffect {
    // Map target classes if present
    const targetClasses = validated.targetClasses?.map(cls => this.mapClassString(cls))

    // Map status effect if present
    const statusEffect = validated.statusEffect
      ? this.mapStatusString(validated.statusEffect)
      : undefined

    // Map special effect if present
    const specialEffect = validated.specialEffect as TrapSpecialEffect | undefined

    return {
      id: validated.id,
      name: validated.name,
      targetMode: validated.targetMode as TrapTargetMode,
      targetClasses,
      damageFormula: validated.damageFormula,
      statusEffect,
      specialEffect,
      hitChance: validated.hitChance,
      description: validated.description,
      effectType: validated.effectType,
      tiers: validated.tiers,
      resistanceType: validated.resistanceType  // Data-driven resistance type
    }
  }

  /**
   * Map class string from JSON to CharacterClass enum
   */
  private static mapClassString(classStr: string): CharacterClass {
    const mapping: Record<string, CharacterClass> = {
      'FIGHTER': CharacterClass.FIGHTER,
      'MAGE': CharacterClass.MAGE,
      'PRIEST': CharacterClass.PRIEST,
      'THIEF': CharacterClass.THIEF,
      'BISHOP': CharacterClass.BISHOP,
      'SAMURAI': CharacterClass.SAMURAI,
      'LORD': CharacterClass.LORD,
      'NINJA': CharacterClass.NINJA
    }

    return mapping[classStr.toUpperCase()] || CharacterClass.FIGHTER
  }

  /**
   * Map status string from JSON to CharacterStatus enum
   */
  private static mapStatusString(statusStr: string): CharacterStatus {
    const mapping: Record<string, CharacterStatus> = {
      'OK': CharacterStatus.OK,
      'INJURED': CharacterStatus.INJURED,
      'POISONED': CharacterStatus.POISONED,
      'PARALYZED': CharacterStatus.PARALYZED,
      'STONED': CharacterStatus.STONED,
      'DEAD': CharacterStatus.DEAD,
      'ASHES': CharacterStatus.ASHES,
      'LOST': CharacterStatus.LOST
    }

    return mapping[statusStr.toUpperCase()] || CharacterStatus.OK
  }

  /**
   * Get a specific trap effect by ID
   * Must call loadAllTraps first
   */
  static getTrapEffect(trapId: TrapId): TrapEffect | null {
    if (!this.trapsCache) {
      throw new Error('Traps not loaded. Call loadAllTraps() first.')
    }
    return this.trapsCache.get(trapId) ?? null
  }

  /**
   * Get all loaded trap effects
   */
  static getAllTrapEffects(): Map<TrapId, TrapEffect> {
    if (!this.trapsCache) {
      throw new Error('Traps not loaded. Call loadAllTraps() first.')
    }
    return this.trapsCache
  }

  /**
   * Get traps available for a specific reward tier
   * @param tier Reward tier (1-5)
   * @returns Array of TrapEffect objects available for that tier
   */
  static async getTrapsForTier(tier: number): Promise<TrapEffect[]> {
    const allTraps = await this.loadAllTraps()
    return Array.from(allTraps.values()).filter(trap => trap.tiers.includes(tier))
  }

  /**
   * Get trap display name from ID
   * Returns cached name if available, otherwise formats the ID
   */
  static getTrapDisplayName(trapId: TrapId): string {
    if (this.trapsCache) {
      const trap = this.trapsCache.get(trapId)
      if (trap) return trap.name
    }
    // Fallback: format ID as display name
    return trapId.toUpperCase().replace(/_/g, ' ')
  }

  /**
   * Check if traps are currently being loaded
   */
  static isLoading(): boolean {
    return this.loading
  }

  /**
   * Check if traps have been successfully loaded
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
   * Get map of failed trap loads
   * @returns Map of trapId → error message for traps that failed to load
   */
  static getFailedTraps(): ReadonlyMap<string, string> {
    return this.failedTraps
  }

  /**
   * Get count of successfully loaded traps
   */
  static getLoadedCount(): number {
    return this.trapsCache?.size ?? 0
  }

  /**
   * Get total count of traps attempted to load
   */
  static getTotalCount(): number {
    return this.getLoadedCount() + this.failedTraps.size
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.trapsCache = null
    this.loadPromise = null
    this.loading = false
    this.loaded = false
    this.loadError = null
    this.failedTraps.clear()
  }

  /**
   * Set cache directly (for testing only)
   * Allows tests to pre-populate trap data without fetch
   */
  static setTestCache(traps: Map<TrapId, TrapEffect>): void {
    this.trapsCache = traps
    this.loadPromise = null
    this.loading = false
    this.loaded = true
    this.loadError = null
    this.failedTraps.clear()
  }
}
