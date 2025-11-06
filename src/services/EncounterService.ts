import { EncounterTable, MonsterEntry } from '../types/Dungeon'

export const EncounterService = {
  /**
   * Roll for random encounter (10% chance)
   */
  rollRandomEncounter(): boolean {
    return Math.random() < 0.10
  },
}
