import { Race, RaceData, getRaceId } from '../types/Race'
import { AssetLoadingService } from './AssetLoadingService'
import { validateAndLoadRaceData } from '../types/RaceValidation'

type SaveType = 'death' | 'wand' | 'breath' | 'petrify' | 'spell'

class RaceServiceClass {
  private raceData: Map<string, RaceData> | null = null

  /**
   * Initialize the race service by loading all race data
   * Validates all race data against Zod schema and source material
   */
  async initialize(): Promise<void> {
    const service = new AssetLoadingService()
    const rawData = await service.loadDataFiles<RaceData>('races')

    // Validate each race data file
    const validatedData = new Map<string, RaceData>()
    const errors: string[] = []

    for (const [raceId, data] of rawData.entries()) {
      const validation = validateAndLoadRaceData(data)

      if (!validation.success) {
        const errorDetails = [
          ...(validation.schemaErrors || []),
          ...(validation.sourceErrors || [])
        ]
        errors.push(`Race ${raceId} validation failed:\n  ${errorDetails.join('\n  ')}`)
      } else {
        validatedData.set(raceId, validation.data!)
      }
    }

    if (errors.length > 0) {
      throw new Error(`Race data validation failed:\n${errors.join('\n\n')}`)
    }

    this.raceData = validatedData
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
}

export const RaceService = new RaceServiceClass()
