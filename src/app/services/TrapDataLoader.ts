import { TrapType, TrapEffect, TrapTargetMode, TrapSpecialEffect } from '@models/Trap'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { TrapSchema, ValidatedTrap } from '@validation/trap-schema'
import { AssetLoadingService } from './AssetLoadingService'

/**
 * Service for loading and validating trap data from JSON files
 * Uses AssetLoadingService for centralized loading infrastructure
 * Implements caching to prevent multiple loads
 * Gracefully handles individual trap failures
 * Validates all traps with Zod schemas at runtime
 */
export class TrapDataLoader {
  private static trapsCache: Map<TrapType, TrapEffect> | null = null
  private static loadPromise: Promise<Map<TrapType, TrapEffect>> | null = null
  private static loading = false
  private static loaded = false
  private static loadError: Error | null = null
  private static failedTraps: Map<string, string> = new Map() // trapId → error message

  /**
   * Load all trap JSON files and validate them
   * Returns cached results on subsequent calls
   * Gracefully handles individual trap failures
   */
  static async loadAllTraps(): Promise<Map<TrapType, TrapEffect>> {
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
   * Uses AssetLoadingService for centralized infrastructure
   */
  private static async performLoad(): Promise<Map<TrapType, TrapEffect>> {
    this.loading = true
    this.loadError = null
    this.failedTraps.clear()

    const traps = new Map<TrapType, TrapEffect>()

    try {
      // Use AssetLoadingService to load trap JSON files
      const assetLoader = new AssetLoadingService()
      const rawTraps = await assetLoader.loadDataFiles<any>('traps')

      // Validate each trap with Zod and convert to runtime TrapEffect format
      for (const [trapId, rawTrap] of rawTraps.entries()) {
        try {
          // Validate with Zod
          const validated: ValidatedTrap = TrapSchema.parse(rawTrap)

          // Transform to runtime TrapEffect format
          const trapEffect = this.transformValidatedToTrapEffect(validated)

          traps.set(trapEffect.type, trapEffect)
        } catch (error) {
          // Track validation failure but continue loading other traps
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.failedTraps.set(trapId, errorMessage)
          console.warn(`Failed to validate trap ${trapId}:`, errorMessage)
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
      // Catastrophic failure (e.g., directory not found)
      this.loadError = error as Error
      console.error('Failed to load traps:', error)
      throw error
    } finally {
      this.loading = false
    }
  }

  /**
   * Transform validated JSON trap to runtime TrapEffect format
   * Maps JSON schema to TrapEffect interface
   */
  private static transformValidatedToTrapEffect(validated: ValidatedTrap): TrapEffect {
    // Map trap ID to TrapType enum
    const type = this.mapIdToTrapType(validated.id)

    // Map target mode
    const targetMode = validated.targetMode as TrapTargetMode

    // Map target classes if present
    const targetClasses = validated.targetClasses?.map(cls => this.mapClassString(cls))

    // Map status effect if present
    const statusEffect = validated.statusEffect
      ? this.mapStatusString(validated.statusEffect)
      : undefined

    // Map special effect if present
    const specialEffect = validated.specialEffect as TrapSpecialEffect | undefined

    return {
      type,
      targetMode,
      targetClasses,
      damageFormula: validated.damageFormula,
      statusEffect,
      specialEffect,
      description: validated.description
    }
  }

  /**
   * Map trap ID string to TrapType enum
   */
  private static mapIdToTrapType(id: string): TrapType {
    const mapping: Record<string, TrapType> = {
      'POISON_NEEDLE': TrapType.POISON_NEEDLE,
      'GAS_BOMB': TrapType.GAS_BOMB,
      'CROSSBOW_BOLT': TrapType.CROSSBOW_BOLT,
      'EXPLODING_BOX': TrapType.EXPLODING_BOX,
      'STUNNER': TrapType.STUNNER,
      'TELEPORTER': TrapType.TELEPORTER,
      'MAGE_BLASTER': TrapType.MAGE_BLASTER,
      'PRIEST_BLASTER': TrapType.PRIEST_BLASTER,
      'ALARM': TrapType.ALARM
    }

    const trapType = mapping[id.toUpperCase()]
    if (!trapType) {
      throw new Error(`Unknown trap ID: ${id}`)
    }
    return trapType
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
   * Get a specific trap effect by type
   * Must call loadAllTraps first
   */
  static getTrapEffect(trapType: TrapType): TrapEffect | null {
    if (!this.trapsCache) {
      throw new Error('Traps not loaded. Call loadAllTraps() first.')
    }
    return this.trapsCache.get(trapType) ?? null
  }

  /**
   * Get all loaded trap effects
   */
  static getAllTrapEffects(): Map<TrapType, TrapEffect> {
    if (!this.trapsCache) {
      throw new Error('Traps not loaded. Call loadAllTraps() first.')
    }
    return this.trapsCache
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
}
