import { SpellDefinition, LoadedSpell } from '../types/SpellDefinition'
import { SpellDefinitionSchema } from '../validation/spell-schema'
import { AssetLoadingService } from './AssetLoadingService'

/**
 * Service for loading and validating spell data from JSON files
 * Uses AssetLoadingService for centralized loading infrastructure
 * Implements caching to prevent multiple loads
 * Gracefully handles individual spell failures
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
   * Internal method to perform the actual loading
   * Uses AssetLoadingService for centralized infrastructure
   */
  private static async performLoad(): Promise<Map<string, LoadedSpell>> {
    this.loading = true
    this.loadError = null
    this.failedSpells.clear()

    const spells = new Map<string, LoadedSpell>()
    const loadedAt = Date.now()

    try {
      // Use AssetLoadingService to load spell JSON files
      const assetLoader = new AssetLoadingService()
      const rawSpells = await assetLoader.loadDataFiles<SpellDefinition>('spells')

      // Validate each spell with Zod and convert to LoadedSpell
      for (const [spellId, rawSpell] of rawSpells.entries()) {
        try {
          // Validate with Zod
          const validated = SpellDefinitionSchema.parse(rawSpell)

          // Convert to LoadedSpell
          const loadedSpell: LoadedSpell = {
            ...validated,
            loaded: true,
            validatedAt: loadedAt
          }

          spells.set(spellId, loadedSpell)
        } catch (error) {
          // Track validation failure but continue loading other spells
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.failedSpells.set(spellId, errorMessage)
          console.warn(`Failed to validate spell ${spellId}:`, errorMessage)
        }
      }

      this.loaded = true

      const successCount = spells.size
      const failCount = this.failedSpells.size
      const totalCount = successCount + failCount

      if (failCount > 0) {
        console.warn(`Loaded ${successCount}/${totalCount} spells (${failCount} failed)`)
      } else {
        console.log(`Loaded ${successCount}/${totalCount} spells`)
      }

      return spells
    } catch (error) {
      // Catastrophic failure (e.g., directory not found)
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
}
