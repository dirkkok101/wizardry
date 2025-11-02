import { Race, RaceData, getRaceId } from '../types/Race'
import { AssetLoadingService } from './AssetLoadingService'

type SaveType = 'death' | 'wand' | 'breath' | 'petrify' | 'spell'

class RaceServiceClass {
  private raceData: Map<string, RaceData> | null = null

  /**
   * Initialize the race service by loading all race data
   */
  async initialize(): Promise<void> {
    const service = new AssetLoadingService()
    this.raceData = await service.loadDataFiles<RaceData>('races')
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
