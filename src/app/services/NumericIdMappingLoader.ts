/**
 * NumericIdMappingLoader - Loads numeric-to-string ID mapping for original Wizardry 1 compatibility
 *
 * This mapping is used by TreasureService to convert numeric item IDs from the original
 * game's treasure tables to string item IDs used in our data files.
 */

interface NumericIdMappingData {
  description: string
  mapping: Record<string, string>
  notes?: {
    never_drops?: string[]
    special_items?: string[]
  }
}

export class NumericIdMappingLoader {
  private static mappingCache: Map<number, string> | null = null
  private static loadPromise: Promise<Map<number, string>> | null = null
  private static loading = false
  private static loaded = false
  private static loadError: Error | null = null

  /**
   * Load the numeric ID mapping from JSON
   */
  static async loadMapping(): Promise<Map<number, string>> {
    // Return cached mapping if already loaded
    if (this.loaded && this.mappingCache) {
      return this.mappingCache
    }

    // Return in-progress promise if loading
    if (this.loading && this.loadPromise) {
      return this.loadPromise
    }

    this.loading = true
    this.loadPromise = this.performLoad()
    return this.loadPromise
  }

  private static async performLoad(): Promise<Map<number, string>> {
    try {
      const response = await fetch('/assets/items/numeric-id-mapping.json')
      if (!response.ok) {
        throw new Error(`Failed to load numeric ID mapping: ${response.statusText}`)
      }

      const data: NumericIdMappingData = await response.json()

      // Convert string keys to number keys
      this.mappingCache = new Map<number, string>()
      for (const [numericId, itemId] of Object.entries(data.mapping)) {
        this.mappingCache.set(parseInt(numericId, 10), itemId)
      }

      this.loaded = true
      this.loading = false
      console.log(`NumericIdMappingLoader: Loaded ${this.mappingCache.size} item ID mappings`)

      return this.mappingCache
    } catch (error) {
      this.loadError = error instanceof Error ? error : new Error(String(error))
      this.loading = false
      console.error('NumericIdMappingLoader: Failed to load mapping', error)
      throw this.loadError
    }
  }

  /**
   * Get string item ID from numeric ID
   * Returns null if mapping not loaded or ID not found
   */
  static getItemId(numericId: number): string | null {
    if (!this.mappingCache) {
      return null
    }
    return this.mappingCache.get(numericId) ?? null
  }

  /**
   * Get all numeric IDs in the mapping
   */
  static getAllNumericIds(): number[] {
    if (!this.mappingCache) {
      return []
    }
    return Array.from(this.mappingCache.keys()).sort((a, b) => a - b)
  }

  /**
   * Check if mapping is loaded
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
   * Get load error if any
   */
  static getError(): Error | null {
    return this.loadError
  }

  /**
   * Get the number of mappings loaded
   */
  static getMappingCount(): number {
    return this.mappingCache?.size ?? 0
  }

  /**
   * Clear the cache (for testing)
   */
  static clearCache(): void {
    this.mappingCache = null
    this.loadPromise = null
    this.loading = false
    this.loaded = false
    this.loadError = null
  }
}
