import { Race, RaceData, getRaceId } from '../types/Race'

type SaveType = 'death' | 'wand' | 'breath' | 'petrify' | 'spell'

/**
 * Load all JSON data files from a directory
 * @param directory - Directory name under /assets/ (e.g., 'races', 'classes')
 * @returns Map of data objects keyed by their 'id' property
 */
async function loadDataFiles<T extends { id: string }>(directory: string): Promise<Map<string, T>> {
  const dataMap = new Map<string, T>()

  // Determine file list based on directory
  const files = getDataFileList(directory)

  // Load each file
  for (const filename of files) {
    const path = `/assets/${directory}/${filename}`
    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`)
      }
      const data: T = await response.json()
      dataMap.set(data.id, data)
    } catch (error) {
      console.error(`Error loading ${path}:`, error)
      throw error
    }
  }

  return dataMap
}

/**
 * Get list of data files for a directory
 */
function getDataFileList(directory: string): string[] {
  switch (directory) {
    case 'races':
      return ['human.json', 'elf.json', 'dwarf.json', 'gnome.json', 'hobbit.json']
    case 'classes':
      return ['fighter.json', 'mage.json', 'priest.json', 'thief.json', 'bishop.json', 'samurai.json', 'lord.json', 'ninja.json']
    default:
      throw new Error(`Unknown data directory: ${directory}`)
  }
}

class RaceServiceClass {
  private raceData: Map<string, RaceData> | null = null

  /**
   * Initialize the race service by loading all race data
   */
  async initialize(): Promise<void> {
    this.raceData = await loadDataFiles<RaceData>('races')
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
