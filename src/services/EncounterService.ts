import { EncounterTable, MonsterEntry } from '../types/Dungeon'

// Import encounter tables
import level1Encounters from '../../data/encounters/level-1-encounters.json'
import level2Encounters from '../../data/encounters/level-2-encounters.json'
import level3Encounters from '../../data/encounters/level-3-encounters.json'
import level4Encounters from '../../data/encounters/level-4-encounters.json'
import level5Encounters from '../../data/encounters/level-5-encounters.json'
import level6Encounters from '../../data/encounters/level-6-encounters.json'
import level7Encounters from '../../data/encounters/level-7-encounters.json'
import level8Encounters from '../../data/encounters/level-8-encounters.json'
import level9Encounters from '../../data/encounters/level-9-encounters.json'
import level10Encounters from '../../data/encounters/level-10-encounters.json'

const ENCOUNTER_TABLES: Record<number, EncounterTable> = {
  1: level1Encounters as EncounterTable,
  2: level2Encounters as EncounterTable,
  3: level3Encounters as EncounterTable,
  4: level4Encounters as EncounterTable,
  5: level5Encounters as EncounterTable,
  6: level6Encounters as EncounterTable,
  7: level7Encounters as EncounterTable,
  8: level8Encounters as EncounterTable,
  9: level9Encounters as EncounterTable,
  10: level10Encounters as EncounterTable,
}

export const EncounterService = {
  /**
   * Roll for random encounter (10% chance)
   */
  rollRandomEncounter(): boolean {
    return Math.random() < 0.10
  },

  /**
   * Get encounter table for dungeon level
   */
  getEncounterTable(level: number): EncounterTable {
    if (level < 1 || level > 10) {
      throw new Error(`Invalid dungeon level: ${level}. Must be 1-10.`)
    }

    const table = ENCOUNTER_TABLES[level]
    if (!table) {
      throw new Error(`Encounter table not found for level ${level}`)
    }

    return table
  },
}
