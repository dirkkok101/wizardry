import { MonsterTemplate, validateMonster } from '../validation/MonsterSchema'
import { AssetLoadingService } from './AssetLoadingService'

/**
 * Service for loading and validating monster data from JSON files
 * Uses AssetLoadingService for centralized loading infrastructure
 * Implements caching to prevent multiple loads
 * Gracefully handles individual monster failures
 *
 * Follows the same pattern as SpellDataLoader for consistency
 */
export class MonsterDataLoader {
  private static monsterCache: Map<string, MonsterTemplate> | null = null
  private static loadPromise: Promise<Map<string, MonsterTemplate>> | null = null
  private static loading = false
  private static loaded = false
  private static loadError: Error | null = null
  private static failedMonsters: Map<string, string> = new Map() // monsterId → error message

  /**
   * Load all monster JSON files and validate them
   * Returns cached results on subsequent calls
   * Gracefully handles individual monster failures
   */
  static async loadAllMonsters(): Promise<Map<string, MonsterTemplate>> {
    // Return cached result if available
    if (this.monsterCache) {
      return this.monsterCache
    }

    // Return in-progress load if one exists
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Start new load
    this.loadPromise = this.performLoad()
    this.monsterCache = await this.loadPromise
    return this.monsterCache
  }

  /**
   * Internal method to perform the actual loading
   * Uses AssetLoadingService for centralized infrastructure
   */
  private static async performLoad(): Promise<Map<string, MonsterTemplate>> {
    this.loading = true
    this.loadError = null
    this.failedMonsters.clear()

    const monsters = new Map<string, MonsterTemplate>()
    const loadedAt = Date.now()

    try {
      // Use AssetLoadingService to load monster JSON files
      const assetLoader = new AssetLoadingService()
      const rawMonsters = await assetLoader.loadDataFiles<any>('monsters')

      // Validate each monster with Zod
      for (const [monsterId, rawMonster] of rawMonsters.entries()) {
        try {
          // Validate with Zod
          const validated = validateMonster(rawMonster)
          monsters.set(monsterId, validated)
        } catch (error) {
          // Track validation failure but continue loading other monsters
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.failedMonsters.set(monsterId, errorMessage)
          console.warn(`Failed to validate monster ${monsterId}:`, errorMessage)
        }
      }

      this.loaded = true

      const successCount = monsters.size
      const failCount = this.failedMonsters.size
      const totalCount = successCount + failCount

      if (failCount > 0) {
        console.warn(`Loaded ${successCount}/${totalCount} monsters (${failCount} failed)`)
      } else {
        console.log(`Loaded ${successCount}/${totalCount} monsters`)
      }

      return monsters
    } catch (error) {
      // Catastrophic failure (e.g., directory not found)
      this.loadError = error as Error
      console.error('Failed to load monsters:', error)
      throw error
    } finally {
      this.loading = false
    }
  }

  /**
   * Get a specific monster by ID
   * Must call loadAllMonsters first
   */
  static getMonster(monsterId: string): MonsterTemplate | undefined {
    if (!this.monsterCache) {
      throw new Error('Monsters not loaded. Call loadAllMonsters() first.')
    }
    return this.monsterCache.get(monsterId)
  }

  /**
   * Get all loaded monsters
   */
  static getAllMonsters(): Map<string, MonsterTemplate> {
    if (!this.monsterCache) {
      throw new Error('Monsters not loaded. Call loadAllMonsters() first.')
    }
    return this.monsterCache
  }

  /**
   * Check if monsters are currently being loaded
   */
  static isLoading(): boolean {
    return this.loading
  }

  /**
   * Check if monsters have been successfully loaded
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
   * Get map of failed monster loads
   * @returns Map of monsterId → error message for monsters that failed to load or validate
   */
  static getFailedMonsters(): ReadonlyMap<string, string> {
    return this.failedMonsters
  }

  /**
   * Get count of successfully loaded monsters
   */
  static getLoadedCount(): number {
    return this.monsterCache?.size ?? 0
  }

  /**
   * Get total count of monsters attempted to load
   */
  static getTotalCount(): number {
    return this.getLoadedCount() + this.failedMonsters.size
  }

  /**
   * Check if a specific monster is loaded
   */
  static hasMonster(monsterId: string): boolean {
    return this.monsterCache?.has(monsterId) ?? false
  }

  /**
   * Get all loaded monster IDs
   */
  static getLoadedMonsterIds(): string[] {
    return this.monsterCache ? Array.from(this.monsterCache.keys()) : []
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.monsterCache = null
    this.loadPromise = null
    this.loading = false
    this.loaded = false
    this.loadError = null
    this.failedMonsters.clear()
  }
}
