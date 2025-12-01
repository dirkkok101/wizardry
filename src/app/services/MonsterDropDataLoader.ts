import { z } from 'zod'

/**
 * Schema for monster drop pools data file
 */
const MonsterDropPoolsSchema = z.object({
  description: z.string().optional(),
  pools: z.record(z.string(), z.array(z.string()))
})

/**
 * Loads and validates monster drop pool data from JSON files
 *
 * Monster drop pools define which items can drop from monsters at each level.
 * This replaces hardcoded ITEM_POOLS in VictoryService.
 */
export class MonsterDropDataLoader {
  private static pools: Map<number, string[]> | null = null
  private static loadPromise: Promise<Map<number, string[]>> | null = null
  private static loading = false
  private static loaded = false
  private static loadError: Error | null = null

  /**
   * Load monster drop pools from data file
   */
  static async loadPools(): Promise<Map<number, string[]>> {
    // Return cached pools if already loaded
    if (this.loaded && this.pools) {
      return this.pools
    }

    // Return in-progress promise if loading
    if (this.loading && this.loadPromise) {
      return this.loadPromise
    }

    this.loading = true
    this.loadPromise = this.performLoad()
    return this.loadPromise
  }

  private static async performLoad(): Promise<Map<number, string[]>> {
    try {
      const response = await fetch('/assets/treasure/monster-drop-pools.json')
      if (!response.ok) {
        throw new Error(`Failed to load monster drop pools: ${response.statusText}`)
      }

      const rawData = await response.json()
      const validated = MonsterDropPoolsSchema.parse(rawData)

      this.pools = new Map()
      for (const [levelStr, items] of Object.entries(validated.pools)) {
        const level = parseInt(levelStr, 10)
        if (!isNaN(level)) {
          this.pools.set(level, items)
        }
      }

      this.loaded = true
      this.loading = false
      console.log(`MonsterDropDataLoader: Loaded ${this.pools.size} level pools`)

      return this.pools
    } catch (error) {
      this.loadError = error instanceof Error ? error : new Error(String(error))
      this.loading = false
      console.error('MonsterDropDataLoader: Failed to load pools', error)
      // Return empty map as fallback
      this.pools = new Map()
      return this.pools
    }
  }

  /**
   * Get item pool for a specific monster level
   * Returns array of item IDs that can drop at this level
   * Note: Must call loadPools() first or use getPoolForLevelAsync()
   */
  static getPoolForLevel(level: number): string[] {
    return this.pools?.get(level) ?? []
  }

  /**
   * Get item pool for a specific monster level (async version)
   * Ensures pools are loaded before returning
   */
  static async getPoolForLevelAsync(level: number): Promise<string[]> {
    await this.loadPools()
    return this.pools?.get(level) ?? []
  }

  /**
   * Get all available level pools
   */
  static getAllPools(): Map<number, string[]> {
    return new Map(this.pools ?? [])
  }

  /**
   * Get maximum level with defined drops
   */
  static getMaxLevel(): number {
    if (!this.pools || this.pools.size === 0) return 1
    return Math.max(...this.pools.keys())
  }

  /**
   * Check if pools are loaded
   */
  static isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Check if loading is in progress
   */
  static isLoading(): boolean {
    return this.loading
  }

  /**
   * Check if pools loaded with error
   */
  static hasLoadError(): boolean {
    return this.loadError !== null
  }

  /**
   * Get load error if any
   */
  static getLoadError(): Error | null {
    return this.loadError
  }

  /**
   * Reset loaded data (useful for testing)
   */
  static reset(): void {
    this.pools = null
    this.loadPromise = null
    this.loading = false
    this.loaded = false
    this.loadError = null
  }
}
