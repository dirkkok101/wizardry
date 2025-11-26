import { ClassData, CharacterClass, getClassId } from '@types/CharacterClass'
import { ClassDataSchema } from '@types/CharacterClass.schema'
import { AssetLoadingService } from './AssetLoadingService'

/**
 * Loaded class data with validation metadata
 */
export interface LoadedClassData extends ClassData {
  loaded: true
  validatedAt: number
}

/**
 * Service for loading and validating class data from JSON files
 * Uses AssetLoadingService for centralized loading infrastructure
 * Implements caching to prevent multiple loads
 * Gracefully handles individual class failures
 *
 * Pattern: Follows the same structure as SpellDataLoader for consistency
 */
export class ClassDataLoader {
  private static classCache: Map<string, LoadedClassData> | null = null
  private static loadPromise: Promise<Map<string, LoadedClassData>> | null = null
  private static loading = false
  private static loaded = false
  private static loadError: Error | null = null
  private static failedClasses: Map<string, string> = new Map() // classId → error message

  /**
   * Load all class JSON files and validate them
   * Returns cached results on subsequent calls
   * Gracefully handles individual class failures
   */
  static async loadAllClasses(): Promise<Map<string, LoadedClassData>> {
    // Return cached result if available
    if (this.classCache) {
      return this.classCache
    }

    // Return in-progress load if one exists
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Start new load
    this.loadPromise = this.performLoad()
    this.classCache = await this.loadPromise
    return this.classCache
  }

  /**
   * Internal method to perform the actual loading
   * Uses AssetLoadingService for centralized infrastructure
   */
  private static async performLoad(): Promise<Map<string, LoadedClassData>> {
    this.loading = true
    this.loadError = null
    this.failedClasses.clear()

    const classes = new Map<string, LoadedClassData>()
    const loadedAt = Date.now()

    try {
      // Use AssetLoadingService to load class JSON files
      const assetLoader = new AssetLoadingService()
      const rawClasses = await assetLoader.loadDataFiles<ClassData>('classes')

      // Validate each class with Zod and convert to LoadedClassData
      for (const [classId, rawClass] of rawClasses.entries()) {
        try {
          // Validate with Zod
          const validated = ClassDataSchema.parse(rawClass)

          // Convert to LoadedClassData
          const loadedClass: LoadedClassData = {
            ...validated,
            loaded: true,
            validatedAt: loadedAt
          }

          classes.set(classId, loadedClass)
        } catch (error) {
          // Track validation failure but continue loading other classes
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.failedClasses.set(classId, errorMessage)
          console.warn(`Failed to validate class ${classId}:`, errorMessage)
        }
      }

      this.loaded = true

      const successCount = classes.size
      const failCount = this.failedClasses.size
      const totalCount = successCount + failCount

      if (failCount > 0) {
        console.warn(`Loaded ${successCount}/${totalCount} classes (${failCount} failed)`)
      } else {
        console.log(`Loaded ${successCount}/${totalCount} classes`)
      }

      return classes
    } catch (error) {
      // Catastrophic failure (e.g., directory not found)
      this.loadError = error as Error
      console.error('Failed to load classes:', error)
      throw error
    } finally {
      this.loading = false
    }
  }

  /**
   * Get a specific class by CharacterClass enum
   * Must call loadAllClasses first
   */
  static getClass(charClass: CharacterClass): LoadedClassData | undefined {
    if (!this.classCache) {
      throw new Error('Classes not loaded. Call loadAllClasses() first.')
    }
    const id = getClassId(charClass)
    return this.classCache.get(id)
  }

  /**
   * Get a specific class by ID string
   * Must call loadAllClasses first
   */
  static getClassById(classId: string): LoadedClassData | undefined {
    if (!this.classCache) {
      throw new Error('Classes not loaded. Call loadAllClasses() first.')
    }
    return this.classCache.get(classId)
  }

  /**
   * Get all loaded classes
   */
  static getAllClasses(): Map<string, LoadedClassData> {
    if (!this.classCache) {
      throw new Error('Classes not loaded. Call loadAllClasses() first.')
    }
    return this.classCache
  }

  /**
   * Get all loaded classes as array
   */
  static getAllClassesArray(): LoadedClassData[] {
    if (!this.classCache) {
      throw new Error('Classes not loaded. Call loadAllClasses() first.')
    }
    return Array.from(this.classCache.values())
  }

  /**
   * Check if classes are currently being loaded
   */
  static isLoading(): boolean {
    return this.loading
  }

  /**
   * Check if classes have been successfully loaded
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
   * Get map of failed class loads
   * @returns Map of classId → error message for classes that failed to load or validate
   */
  static getFailedClasses(): ReadonlyMap<string, string> {
    return this.failedClasses
  }

  /**
   * Get count of successfully loaded classes
   */
  static getLoadedCount(): number {
    return this.classCache?.size ?? 0
  }

  /**
   * Get total count of classes attempted to load
   */
  static getTotalCount(): number {
    return this.getLoadedCount() + this.failedClasses.size
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.classCache = null
    this.loadPromise = null
    this.loading = false
    this.loaded = false
    this.loadError = null
    this.failedClasses.clear()
  }
}
