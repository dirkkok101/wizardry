/**
 * MonsterDataLoader - Service for loading and caching monster data
 *
 * Supports both pre-loading (for common monsters) and on-demand loading
 * Uses centralized cache to prevent duplicate loads
 * Gracefully handles individual monster failures
 */

export interface MonsterTemplate {
  id: string
  name: string
  level: number
  numberAppearing: { min: number; max: number }
  hp: { min: number; max: number }
  ac: number
  damage: Array<{ dice: string; min: number; max: number }>
  xp: number
  gold?: number
  type: string
  specialAbilities: string[]
  resistances: Array<{ type: string; value: number }>
  regeneration: number
  isBoss: boolean
  canFlee: boolean
}

/**
 * MonsterDataLoader - Centralized monster data loading and caching
 */
export class MonsterDataLoader {
  private static monsterCache: Map<string, MonsterTemplate> = new Map()
  private static loadingPromises: Map<string, Promise<MonsterTemplate>> = new Map()
  private static failedMonsters: Map<string, string> = new Map() // monsterId → error message

  /**
   * Pre-load common monsters (typically called during game initialization)
   * Loads monsters from encounter tables for levels 1-3
   */
  static async preloadCommonMonsters(): Promise<void> {
    console.log('Pre-loading common monsters...')

    // Common monsters from levels 1-3 (most frequently encountered)
    const commonMonsters = [
      'kobold', 'orc', 'zombie', 'bubbly_slime', 'rogue', 'bushwacker',
      'highwayman', 'undead_kobold', 'lvl_1_mage', 'lvl_1_priest',
      'lvl_1_ninja', 'giant_spider', 'rotting_corpse', 'grave_mist'
    ]

    const results = await Promise.allSettled(
      commonMonsters.map(id => this.loadMonster(id))
    )

    const loaded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    if (failed > 0) {
      console.warn(`Pre-loaded ${loaded}/${commonMonsters.length} common monsters (${failed} failed)`)
    } else {
      console.log(`Pre-loaded ${loaded} common monsters`)
    }
  }

  /**
   * Load a single monster by ID (async)
   * Uses cache if available, otherwise fetches from assets
   */
  static async loadMonster(monsterId: string): Promise<MonsterTemplate> {
    // Check cache first
    const cached = this.monsterCache.get(monsterId)
    if (cached) {
      return cached
    }

    // Check if already loading
    const loadingPromise = this.loadingPromises.get(monsterId)
    if (loadingPromise) {
      return loadingPromise
    }

    // Start new load
    const promise = this.performLoad(monsterId)
    this.loadingPromises.set(monsterId, promise)

    try {
      const monster = await promise
      this.monsterCache.set(monsterId, monster)
      return monster
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.failedMonsters.set(monsterId, errorMessage)
      throw error
    } finally {
      this.loadingPromises.delete(monsterId)
    }
  }

  /**
   * Internal method to perform the actual loading
   */
  private static async performLoad(monsterId: string): Promise<MonsterTemplate> {
    try {
      const response = await fetch(`/assets/monsters/${monsterId}.json`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const monsterData = await response.json() as MonsterTemplate

      // Validate required fields
      if (!monsterData.id || !monsterData.name) {
        throw new Error('Invalid monster data: missing id or name')
      }

      return monsterData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[MonsterDataLoader] Failed to load monster "${monsterId}":`, errorMessage)
      throw new Error(`Failed to load monster: ${monsterId} (${errorMessage})`)
    }
  }

  /**
   * Get monster from cache synchronously (throws if not loaded)
   */
  static getMonster(monsterId: string): MonsterTemplate {
    const cached = this.monsterCache.get(monsterId)
    if (cached) {
      return cached
    }

    throw new Error(`Monster not loaded: ${monsterId}. Call loadMonster() first.`)
  }

  /**
   * Check if a monster is loaded in cache
   */
  static isLoaded(monsterId: string): boolean {
    return this.monsterCache.has(monsterId)
  }

  /**
   * Get statistics about loaded monsters
   */
  static getStats() {
    return {
      loaded: this.monsterCache.size,
      failed: this.failedMonsters.size,
      total: this.monsterCache.size + this.failedMonsters.size
    }
  }

  /**
   * Get failed monsters map
   */
  static getFailedMonsters(): Map<string, string> {
    return new Map(this.failedMonsters)
  }

  /**
   * Clear cache (mainly for testing)
   */
  static clearCache(): void {
    this.monsterCache.clear()
    this.loadingPromises.clear()
    this.failedMonsters.clear()
  }
}
