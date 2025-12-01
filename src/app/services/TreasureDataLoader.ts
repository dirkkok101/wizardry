import { TreasureRewardSchema, TreasureReward } from '@validation/treasure-schema'

/**
 * Service for loading and validating treasure reward data from JSON files
 *
 * Data-driven architecture:
 * - All treasure definitions live in data/treasure/*.json
 * - Reward types 10-19 match Wizardry 1 reference document
 * - Zod validates all treasure data at runtime
 */
export class TreasureDataLoader {
  private static rewardsCache: Map<number, TreasureReward> | null = null
  private static loadPromise: Promise<Map<number, TreasureReward>> | null = null
  private static loaded = false
  private static loadError: Error | null = null

  /**
   * Load all treasure reward JSON files and validate them
   * Returns cached results on subsequent calls
   */
  static async loadAllRewards(): Promise<Map<number, TreasureReward>> {
    if (this.rewardsCache) {
      return this.rewardsCache
    }

    if (this.loadPromise) {
      return this.loadPromise
    }

    this.loadPromise = this.performLoad()
    this.rewardsCache = await this.loadPromise
    return this.rewardsCache
  }

  /**
   * Internal method to perform the actual loading
   */
  private static async performLoad(): Promise<Map<number, TreasureReward>> {
    const rewards = new Map<number, TreasureReward>()

    try {
      // Load manifest to get list of all reward files
      const manifestResponse = await fetch('/assets/treasure/index.json')
      if (!manifestResponse.ok) {
        throw new Error('Failed to load treasure manifest')
      }
      const rewardFileNames: string[] = await manifestResponse.json()

      // Load each reward file
      for (const fileName of rewardFileNames) {
        try {
          const response = await fetch(`/assets/treasure/${fileName}.json`)
          if (!response.ok) {
            console.warn(`Failed to load treasure ${fileName}: HTTP ${response.status}`)
            continue
          }

          const rawReward = await response.json()

          // Validate with Zod
          const validated = TreasureRewardSchema.parse(rawReward)

          rewards.set(validated.rewardType, validated)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.warn(`Failed to validate treasure ${fileName}:`, errorMessage)
        }
      }

      this.loaded = true
      console.log(`✅ Loaded and validated ${rewards.size} treasure reward types`)

      return rewards
    } catch (error) {
      this.loadError = error as Error
      console.error('Failed to load treasure rewards:', error)
      throw error
    }
  }

  /**
   * Get reward configuration for a specific reward type
   * Must call loadAllRewards first
   */
  static getRewardConfig(rewardType: number): TreasureReward | null {
    if (!this.rewardsCache) {
      throw new Error('Treasure rewards not loaded. Call loadAllRewards() first.')
    }
    return this.rewardsCache.get(rewardType) ?? null
  }

  /**
   * Get all loaded rewards
   */
  static getAllRewards(): Map<number, TreasureReward> {
    if (!this.rewardsCache) {
      throw new Error('Treasure rewards not loaded. Call loadAllRewards() first.')
    }
    return this.rewardsCache
  }

  /**
   * Check if rewards are loaded
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
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.rewardsCache = null
    this.loadPromise = null
    this.loaded = false
    this.loadError = null
  }
}
