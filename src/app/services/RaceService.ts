import { Race, RaceData, getRaceId } from '@types/Race'
import { SaveType } from '@types/SavingThrow'
import { AssetLoadingService } from './AssetLoadingService'
import { validateAndLoadRaceData } from '@types/RaceValidation'

class RaceServiceClass {
  private raceData: Map<string, RaceData> | null = null
  private failedRaces: Map<string, string> = new Map() // raceId → error message
  private loaded = false

  /**
   * Initialize the race service by loading all race data
   * Validates all race data against Zod schema and source material
   * Similar to SpellDataLoader pattern but throws on any failure (races are critical)
   */
  async initialize(): Promise<void> {
    console.log('Loading races...')

    const service = new AssetLoadingService()
    const rawData = await service.loadDataFiles<RaceData>('races')

    // Validate each race data file
    const validatedData = new Map<string, RaceData>()
    this.failedRaces.clear()

    for (const [raceId, data] of rawData.entries()) {
      try {
        const validation = validateAndLoadRaceData(data)

        if (!validation.success) {
          const errorDetails = [
            ...(validation.schemaErrors || []),
            ...(validation.sourceErrors || [])
          ]
          const errorMessage = errorDetails.join('\n  ')
          this.failedRaces.set(raceId, errorMessage)
          console.warn(`Failed to validate race ${raceId}:`, errorMessage)
        } else {
          validatedData.set(raceId, validation.data!)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.failedRaces.set(raceId, errorMessage)
        console.warn(`Failed to validate race ${raceId}:`, errorMessage)
      }
    }

    // Report statistics
    const successCount = validatedData.size
    const failCount = this.failedRaces.size
    const totalCount = successCount + failCount

    if (failCount > 0) {
      console.error(`Loaded ${successCount}/${totalCount} races (${failCount} failed)`)
      console.error('Failed races:', Array.from(this.failedRaces.entries()))

      // Races are critical for game initialization - all 5 must load successfully
      // because character creation, class eligibility calculations, and saving throw
      // mechanics depend on complete and accurate race data. Unlike spells (which can
      // gracefully degrade), missing or invalid race data would break core game systems.
      // This strict validation ensures data integrity at startup rather than runtime failures.
      throw new Error(
        `Race data validation failed: ${failCount} race(s) failed to load.\n` +
        Array.from(this.failedRaces.entries())
          .map(([id, msg]) => `  ${id}: ${msg}`)
          .join('\n')
      )
    } else {
      console.log(`Loaded ${successCount} races successfully`)
    }

    this.raceData = validatedData
    this.loaded = true
  }

  /**
   * Get race data for a specific race
   */
  getRaceData(race: Race): RaceData {
    if (!this.raceData) {
      throw new Error('RaceService not initialized. Call initialize() first.')
    }

    const id = getRaceId(race)
    const data = this.raceData.get(id)

    if (!data) {
      throw new Error(`Race data not found for: ${race}`)
    }

    return data
  }

  /**
   * Get all race data
   */
  getAllRaces(): RaceData[] {
    if (!this.raceData) {
      throw new Error('RaceService not initialized. Call initialize() first.')
    }

    return Array.from(this.raceData.values())
  }

  /**
   * Get saving throw bonus for a race and save type
   * Returns 0 if no bonus exists
   */
  getSavingThrowBonus(race: Race, saveType: SaveType): number {
    const data = this.getRaceData(race)
    return data.savingThrowBonus[saveType] ?? 0
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.raceData !== null
  }

  /**
   * Check if races have been successfully loaded
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Get map of failed race loads (for diagnostics)
   * @returns Map of raceId → error message for races that failed to load or validate
   */
  getFailedRaces(): ReadonlyMap<string, string> {
    return this.failedRaces
  }

  /**
   * Get count of successfully loaded races
   */
  getLoadedCount(): number {
    return this.raceData?.size ?? 0
  }

  /**
   * Get total count of races attempted to load
   */
  getTotalCount(): number {
    return this.getLoadedCount() + this.failedRaces.size
  }
}

export const RaceService = new RaceServiceClass()
