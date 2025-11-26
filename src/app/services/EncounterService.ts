import { EncounterTable, MonsterEntry } from '@types/Dungeon'
import { MonsterGroup, MonsterInstance, ENCOUNTER_CONFIG } from '@types/Combat'
import { MonsterService } from './MonsterService'
import { MonsterDataLoader } from './MonsterDataLoader'
import { RandomService } from './RandomService'

// Import encounter tables
import level1Encounters from '@data/encounters/level-1-encounters.json'
import level2Encounters from '@data/encounters/level-2-encounters.json'
import level3Encounters from '@data/encounters/level-3-encounters.json'
import level4Encounters from '@data/encounters/level-4-encounters.json'
import level5Encounters from '@data/encounters/level-5-encounters.json'
import level6Encounters from '@data/encounters/level-6-encounters.json'
import level7Encounters from '@data/encounters/level-7-encounters.json'
import level8Encounters from '@data/encounters/level-8-encounters.json'
import level9Encounters from '@data/encounters/level-9-encounters.json'
import level10Encounters from '@data/encounters/level-10-encounters.json'

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
    return RandomService.roll(0.10)
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

  /**
   * Select random monster from encounter table using weighted probability
   */
  selectMonster(table: EncounterTable): string {
    const monsterIds = table.monsters.map(m => m.monsterId)
    const weights = table.monsters.map(m => m.weight)
    return RandomService.weightedRandom(monsterIds, weights)
  },

  /**
   * Generate a complete encounter with 1-4 monster groups
   * Based on original Wizardry 1 mechanics
   *
   * Uses weighted probability for group count based on dungeon level:
   * - Level 1: 85% single group, 15% two groups (multi-group is "rare")
   * - Level 2: 60% single, 30% two, 10% three groups
   * - Level 3+: Progressively more multi-group encounters
   *
   * @param dungeonLevel - Current dungeon level (1-10)
   * @returns Array of MonsterGroups (1-4 groups)
   */
  generateEncounter(dungeonLevel: number): MonsterGroup[] {
    const maxMonstersPerGroup = ENCOUNTER_CONFIG.getMaxMonstersPerGroupForLevel(dungeonLevel)

    // Roll number of groups using weighted probability
    const groupCountWeights = ENCOUNTER_CONFIG.getGroupCountWeights(dungeonLevel)
    const groupCounts = [1, 2, 3, 4].slice(0, groupCountWeights.length)
    const numGroups = RandomService.weightedRandom(groupCounts, groupCountWeights)

    const groups: MonsterGroup[] = []
    const groupIds: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
    const encounterTable = this.getEncounterTable(dungeonLevel)

    for (let i = 0; i < numGroups; i++) {
      // Select monster type for this group
      const monsterId = this.selectMonster(encounterTable)

      // Generate monster instances (respecting level-based limits)
      let monsters = MonsterService.generateMonsterGroup(monsterId)

      // Enforce max monsters per group based on level
      if (monsters.length > maxMonstersPerGroup) {
        monsters = monsters.slice(0, maxMonstersPerGroup)
      }

      // Create the group
      groups.push({
        id: groupIds[i],
        monsters: monsters,
        formation: this.determineFormation(monsters)
      })
    }

    return groups
  },

  /**
   * Determine formation (front or back row) for a monster group
   * Uses intelligent placement based on monster attack capabilities:
   * - Melee-only monsters: 90% front row (need to be in front to attack)
   * - Ranged/spell monsters: 80% back row (protected while casting)
   * - Mixed attackers: 60% front row (can attack from either, slight front preference)
   *
   * @param monsters - Monster instances in the group
   * @returns 'front' or 'back'
   */
  determineFormation(monsters: MonsterInstance[]): 'front' | 'back' {
    if (monsters.length === 0) {
      return 'front'
    }

    // Get template for the first monster (all monsters in group are same type)
    const template = MonsterDataLoader.getMonster(monsters[0].monsterId)
    if (!template) {
      // Fallback to 50/50 if template not found
      return RandomService.roll(0.5) ? 'front' : 'back'
    }

    // Check if monster prefers back row (spellcasters, ranged attackers)
    if (MonsterService.prefersBackRow(template)) {
      // 80% chance back row for ranged/spell monsters
      return RandomService.roll(0.8) ? 'back' : 'front'
    }

    // Check attack range for melee vs mixed
    const attackRange = MonsterService.getAttackRange(template)

    if (attackRange === 'melee') {
      // 90% chance front row for melee-only monsters
      return RandomService.roll(0.9) ? 'front' : 'back'
    }

    // Mixed attackers (both melee and ranged): 60% front
    return RandomService.roll(0.6) ? 'front' : 'back'
  },
}
