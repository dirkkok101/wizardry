import { EncounterTable, MonsterEntry } from '@models/Dungeon'
import { MonsterGroup, MonsterInstance, ENCOUNTER_CONFIG } from '@models/Combat'
import { MonsterService } from './MonsterService'
import { MonsterDataLoader } from './MonsterDataLoader'
import { RandomService } from './RandomService'
import { FixedEncounterConfig } from './EncounterTriggerService'

type Alignment = 'good' | 'neutral' | 'evil'
type MonsterClass = 'fighter' | 'mage' | 'priest' | 'thief' | 'giant' | 'mythical' |
  'dragon' | 'animal' | 'were' | 'undead' | 'demon' | 'insect' | 'enchanted'

/**
 * Friendly encounter chances by monster class (per Apple II source)
 * Only Good-aligned parties can encounter friendly monsters
 * See: docs/research/monster-technical-reference.md lines 789-814
 */
const FRIENDLY_CHANCES: Record<MonsterClass, number> = {
  dragon: 26,
  priest: 16,
  fighter: 11,
  mage: 6,
  thief: 4,
  giant: 1,
  mythical: 1,
  animal: 1,
  were: 1,
  undead: 1,
  demon: 1,
  insect: 1,
  enchanted: 1
}

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
   * Roll for random encounter (1% chance - authentic Wizardry 1)
   *
   * Original formula: (RANDOM MOD 99) === 35
   * This gives exactly 1/99 = ~1.01% chance
   *
   * See: docs/research/door-kicking-encounter-mechanics.md Section 4
   */
  rollRandomEncounter(): boolean {
    // Use EncounterTriggerService for authentic 1% rate
    const roll = Math.floor(RandomService.random(0, 98)) // 0-98 (99 values)
    return roll === 35 // Target value from original source
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
   * Uses weighted probability for group count from JSON data:
   * - Level 1: 85% single group, 15% two groups (multi-group is "rare")
   * - Level 2-3: 60% single, 30% two, 10% three groups
   * - Level 4+: 25% single, 35% two, 25% three, 15% four groups
   *
   * Party level overrides:
   * - Average level < 4: Always face 1 group
   * - Min level 1: Max 1 monster per group, Min level 2: Max 2, Min level 3: Max 3
   *
   * @param dungeonLevel - Current dungeon level (1-10)
   * @param latumapicActive - Whether LATUMAPIC spell is active (monsters pre-identified)
   * @param partyLevel - Average party level (for group count balancing)
   * @param minPartyLevel - Minimum party level (for monster count balancing)
   * @returns Array of MonsterGroups (1-4 groups)
   */
  generateEncounter(dungeonLevel: number, latumapicActive: boolean = false, partyLevel?: number, minPartyLevel?: number): MonsterGroup[] {
    const encounterTable = this.getEncounterTable(dungeonLevel)

    // Read config from JSON data, with party level overrides
    const maxMonstersPerGroup = ENCOUNTER_CONFIG.getMaxMonstersPerGroup(
      encounterTable.maxMonstersPerGroup,
      minPartyLevel
    )
    const maxFrontRowGroups = encounterTable.maxFrontRowGroups

    // Roll number of groups using weighted probability (with party level override)
    const groupCountWeights = ENCOUNTER_CONFIG.getGroupCountWeights(
      encounterTable.groupCountWeights,
      partyLevel
    )
    const groupCounts = [1, 2, 3, 4].slice(0, groupCountWeights.length)
    const numGroups = RandomService.weightedRandom(groupCounts, groupCountWeights)

    const groups: MonsterGroup[] = []
    const groupIds: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
    let frontRowCount = 0

    for (let i = 0; i < numGroups; i++) {
      // Select monster type for this group
      const monsterId = this.selectMonster(encounterTable)

      // Generate monster instances (respecting level-based limits)
      let monsters = MonsterService.generateMonsterGroup(monsterId)

      // Enforce max monsters per group (party level override applied above)
      if (monsters.length > maxMonstersPerGroup) {
        monsters = monsters.slice(0, maxMonstersPerGroup)
      }

      // Determine formation with front row limit enforcement
      let formation = this.determineFormation(monsters)
      if (formation === 'front' && frontRowCount >= maxFrontRowGroups) {
        formation = 'back'  // Force to back row if front is full
      }
      if (formation === 'front') {
        frontRowCount++
      }

      // Create the group
      groups.push({
        id: groupIds[i],
        monsters: monsters,
        formation: formation,
        identified: latumapicActive  // Monsters identified if LATUMAPIC active for expedition
      })
    }

    return groups
  },

  /**
   * Generate encounter from fixed encounter config
   * Uses encounterId directly to spawn the specified monster
   *
   * @param dungeonLevel - Current dungeon level (1-10)
   * @param config - Fixed encounter configuration with encounterId
   * @param latumapicActive - Whether LATUMAPIC spell is active (monsters pre-identified)
   * @returns Array of MonsterGroups (1 group for fixed encounters)
   */
  generateFixedEncounter(dungeonLevel: number, config: FixedEncounterConfig, latumapicActive: boolean = false): MonsterGroup[] {
    const encounterTable = this.getEncounterTable(dungeonLevel)
    const maxMonstersPerGroup = encounterTable.maxMonstersPerGroup

    // Use encounterId directly - no table lookup needed!
    const monsterId = config.encounterId

    // Generate monster instances (respecting level-based limits)
    let monsters = MonsterService.generateMonsterGroup(monsterId)
    if (monsters.length > maxMonstersPerGroup) {
      monsters = monsters.slice(0, maxMonstersPerGroup)
    }

    // Fixed encounters are always a single group
    const group: MonsterGroup = {
      id: 'A',
      monsters: monsters,
      formation: this.determineFormation(monsters),
      identified: latumapicActive  // Monsters identified if LATUMAPIC active for expedition
    }

    return [group]
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

  /**
   * Check if an encounter should be friendly
   * Per Apple II source: only Good parties can meet friendly monsters
   *
   * Friendly encounter chances by monster class:
   * - Dragon: 26%
   * - Priest: 16%
   * - Fighter: 11%
   * - Mage: 6%
   * - Thief: 4%
   * - All others: 1%
   *
   * @param partyAlignment - Party's alignment (good/neutral/evil)
   * @param monsterClass - Monster's class type
   * @returns true if monsters are friendly
   */
  checkFriendlyEncounter(
    partyAlignment: Alignment,
    monsterClass: MonsterClass
  ): boolean {
    // Only Good-aligned parties can encounter friendly monsters
    if (partyAlignment !== 'good') {
      return false
    }

    const friendlyChance = FRIENDLY_CHANCES[monsterClass] ?? 1
    return RandomService.chance(friendlyChance)
  },
}
