// src/services/__tests__/CombatService.demoralization.spec.ts
import { CombatService } from '../CombatService'
import { CombatState, MonsterInstance, MonsterGroup } from '@models/Combat'
import { Character } from '@models/Character'
import { RandomService } from '../RandomService'

/**
 * Demoralization & Monster Flee Tests (Apple II Reference)
 *
 * Demoralization occurs when:
 *   Total Party Level > Total Monster Morale
 *   Where Monster Morale = sum of (Monster Level × Alive Count) for each group
 *
 * When demoralized:
 *   - Party gets +20% flee bonus
 *   - Monsters with Run ability have 65% chance to flee each turn
 *
 * Source: Data Driven Gamer - "If the monsters are demoralized (e.g. some of
 * them want to run), then add 20% to the odds."
 */

// Helper to create test monster with flee ability
function createFleeingMonster(
  id: string,
  level: number,
  canFlee: boolean = true
): MonsterInstance {
  return {
    id,
    monsterId: 'kobold',
    name: 'Kobold',
    hp: 10,
    maxHp: 10,
    ac: 8,
    damage: [{ dice: '1d4', min: 1, max: 4 }],
    xp: 10,
    status: 'ALIVE',
    level,
    undead: false,
    canFlee
  }
}

// Helper to create basic test monster without flee ability
function createBasicMonster(id: string, level: number = 1): MonsterInstance {
  return createFleeingMonster(id, level, false)
}

// Helper to create combat state
function createCombatState(monsterGroups: MonsterGroup[]): CombatState {
  return {
    monsterGroups,
    commandQueue: [],
    roundNumber: 1,
    combatLog: [],
    canFlee: true,
    dungeonLevel: 1,
    statusEffects: new Map(),
    acModifiers: new Map(),
    statusDurations: new Map(),
    monstersDemoralized: false
  }
}

// Helper to create test character
function createTestCharacter(id: string, level: number = 5): Character {
  return {
    id,
    name: `Hero ${id}`,
    race: 'Human',
    class: 'Fighter',
    alignment: 'Good',
    level,
    maxLev: level,
    experience: 1000,
    age: 1000,
    hp: 30,
    maxHp: 30,
    strength: 14,
    intelligence: 10,
    piety: 10,
    vitality: 12,
    agility: 12,
    luck: 10,
    ac: 5,
    status: 'OK',
    vim: { current: 100, max: 100 },
    knownSpells: [],
    inventory: [],
    gold: 0,
    deathCount: 0,
    monsterKills: 0
  } as Character
}

describe('CombatService - Demoralization & Monster Flee', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateDemoralization', () => {
    it('returns true when party level exceeds monster morale', () => {
      // Party: 3 characters at level 10 each = 30 total level
      const party = [
        createTestCharacter('c1', 10),
        createTestCharacter('c2', 10),
        createTestCharacter('c3', 10)
      ]

      // Monsters: 2 level 5 monsters = 5 × 2 = 10 morale
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createBasicMonster('m1', 5), createBasicMonster('m2', 5)],
        formation: 'front',
        identified: true
      }

      const result = CombatService.calculateDemoralization(party, [group])

      // 30 party level > 10 monster morale = demoralized
      expect(result).toBe(true)
    })

    it('returns false when monster morale exceeds party level', () => {
      // Party: 2 level 3 characters = 6 total level
      const party = [
        createTestCharacter('c1', 3),
        createTestCharacter('c2', 3)
      ]

      // Monsters: 4 level 5 monsters = 5 × 4 = 20 morale
      const group: MonsterGroup = {
        id: 'A',
        monsters: [
          createBasicMonster('m1', 5),
          createBasicMonster('m2', 5),
          createBasicMonster('m3', 5),
          createBasicMonster('m4', 5)
        ],
        formation: 'front',
        identified: true
      }

      const result = CombatService.calculateDemoralization(party, [group])

      // 6 party level < 20 monster morale = not demoralized
      expect(result).toBe(false)
    })

    it('returns false when party level equals monster morale', () => {
      // Party: 2 level 5 characters = 10 total level
      const party = [
        createTestCharacter('c1', 5),
        createTestCharacter('c2', 5)
      ]

      // Monsters: 2 level 5 monsters = 5 × 2 = 10 morale
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createBasicMonster('m1', 5), createBasicMonster('m2', 5)],
        formation: 'front',
        identified: true
      }

      const result = CombatService.calculateDemoralization(party, [group])

      // 10 = 10, not greater, so not demoralized
      expect(result).toBe(false)
    })

    it('excludes dead characters from party level calculation', () => {
      // Party: 3 characters, but one is dead
      const party = [
        createTestCharacter('c1', 10),
        createTestCharacter('c2', 10),
        { ...createTestCharacter('c3', 10), status: 'DEAD' } as Character
      ]

      // Monsters: 3 level 7 monsters = 7 × 3 = 21 morale
      const group: MonsterGroup = {
        id: 'A',
        monsters: [
          createBasicMonster('m1', 7),
          createBasicMonster('m2', 7),
          createBasicMonster('m3', 7)
        ],
        formation: 'front',
        identified: true
      }

      const result = CombatService.calculateDemoralization(party, [group])

      // 20 party level (excluding dead) < 21 monster morale = not demoralized
      expect(result).toBe(false)
    })

    it('excludes dead monsters from morale calculation', () => {
      // Party: 2 level 5 characters = 10 total level
      const party = [
        createTestCharacter('c1', 5),
        createTestCharacter('c2', 5)
      ]

      // Monsters: 3 level 5, but one is dead
      const deadMonster = createBasicMonster('m3', 5)
      deadMonster.hp = 0
      deadMonster.status = 'DEAD'

      const group: MonsterGroup = {
        id: 'A',
        monsters: [createBasicMonster('m1', 5), createBasicMonster('m2', 5), deadMonster],
        formation: 'front',
        identified: true
      }

      const result = CombatService.calculateDemoralization(party, [group])

      // 10 party level = 10 monster morale (2 alive × 5) = not demoralized (equal, not greater)
      expect(result).toBe(false)
    })

    it('sums morale across multiple groups', () => {
      // Party: 2 level 10 characters = 20 total level
      const party = [
        createTestCharacter('c1', 10),
        createTestCharacter('c2', 10)
      ]

      // Group A: 2 level 3 monsters = 3 × 2 = 6 morale
      // Group B: 2 level 3 monsters = 3 × 2 = 6 morale
      // Total: 12 morale
      const groupA: MonsterGroup = {
        id: 'A',
        monsters: [createBasicMonster('m1', 3), createBasicMonster('m2', 3)],
        formation: 'front',
        identified: true
      }
      const groupB: MonsterGroup = {
        id: 'B',
        monsters: [createBasicMonster('m3', 3), createBasicMonster('m4', 3)],
        formation: 'back',
        identified: true
      }

      const result = CombatService.calculateDemoralization(party, [groupA, groupB])

      // 20 party level > 12 total monster morale = demoralized
      expect(result).toBe(true)
    })
  })

  describe('selectMonsterAction - Monster Flee decision', () => {
    it('monster with canFlee=true attempts flee when demoralized', () => {
      const monster = createFleeingMonster('m1', 3, true)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }

      // High level party to ensure demoralization
      // Party level 20 > monster morale 3
      const party = [createTestCharacter('c1', 20)]

      // Queue: 65% flee chance succeeds
      RandomService.queueNextValues([0.5])  // 50% < 65% = will flee

      const command = CombatService.selectMonsterAction(monster, party, ['c1'], group, [group])

      expect(command.type).toBe('MONSTER_FLEE')
      expect(command.data.groupId).toBe('A')
    })

    it('monster does not flee when not demoralized', () => {
      const monster = createFleeingMonster('m1', 20, true) // High level monster
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }

      // Low level party
      // Party level 3 < monster morale 20
      const party = [createTestCharacter('c1', 3)]

      // Should not flee since monsters have high morale
      const command = CombatService.selectMonsterAction(monster, party, ['c1'], group, [group])

      expect(command.type).not.toBe('MONSTER_FLEE')
    })

    it('monster without canFlee ability does not attempt flee', () => {
      const monster = createFleeingMonster('m1', 3, false) // canFlee = false
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }

      // High level party (would cause demoralization)
      const party = [createTestCharacter('c1', 20)]

      const command = CombatService.selectMonsterAction(monster, party, ['c1'], group, [group])

      expect(command.type).not.toBe('MONSTER_FLEE')
    })

    it('65% chance to attempt flee is checked', () => {
      const monster = createFleeingMonster('m1', 3, true)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }
      const party = [createTestCharacter('c1', 20)]

      // Queue: 70% > 65% = fails flee check
      RandomService.queueNextValues([0.7])

      const command = CombatService.selectMonsterAction(monster, party, ['c1'], group, [group])

      // Should not be flee since 70% > 65%
      expect(command.type).not.toBe('MONSTER_FLEE')
    })
  })

  describe('executeMonsterFleeCommand', () => {
    it('removes fleeing monster from group', () => {
      const monster = createFleeingMonster('m1', 3, true)
      const monster2 = createBasicMonster('m2', 3)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster, monster2],
        formation: 'front',
        identified: true
      }
      const state = createCombatState([group])

      const command = {
        id: 'cmd1',
        actor: monster,
        type: 'MONSTER_FLEE' as const,
        initiative: 5,
        data: { groupId: 'A' }
      }

      const result = CombatService.executeCommand(state, command)

      expect(result.messages[0]).toContain('flees')
      // Group should have 1 monster remaining
      expect(result.newState.monsterGroups[0].monsters.length).toBe(1)
      expect(result.newState.monsterGroups[0].monsters[0].id).toBe('m2')
    })

    it('removes empty group when last monster flees', () => {
      const monster = createFleeingMonster('m1', 3, true)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }
      const state = createCombatState([group])

      const command = {
        id: 'cmd1',
        actor: monster,
        type: 'MONSTER_FLEE' as const,
        initiative: 5,
        data: { groupId: 'A' }
      }

      const result = CombatService.executeCommand(state, command)

      // Group should be removed entirely
      expect(result.newState.monsterGroups.length).toBe(0)
    })

    it('preserves other groups when one monster flees', () => {
      const monster = createFleeingMonster('m1', 3, true)
      const groupA: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: true
      }
      const groupB: MonsterGroup = {
        id: 'B',
        monsters: [createBasicMonster('m2', 3)],
        formation: 'back',
        identified: true
      }
      const state = createCombatState([groupA, groupB])

      const command = {
        id: 'cmd1',
        actor: monster,
        type: 'MONSTER_FLEE' as const,
        initiative: 5,
        data: { groupId: 'A' }
      }

      const result = CombatService.executeCommand(state, command)

      // Group A removed, Group B preserved
      expect(result.newState.monsterGroups.length).toBe(1)
      expect(result.newState.monsterGroups[0].id).toBe('B')
    })
  })

  describe('integration - demoralization affects flee chance', () => {
    it('party flee chance includes +20% bonus when demoralized', () => {
      // Party: 2 level 15 characters = 30 total level
      const party = [
        createTestCharacter('c1', 15),
        createTestCharacter('c2', 15)
      ]

      // Monsters: 1 level 5 monster = 5 morale
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createBasicMonster('m1', 5)],
        formation: 'front',
        identified: true
      }

      // 30 > 5 = demoralized
      const state: CombatState = {
        ...createCombatState([group]),
        monstersDemoralized: true,
        dungeonLevel: 5  // Base: 39 - 15 = 24%
      }

      const fleeChance = CombatService.calculateFleeChance(state, party, new Set(['c1', 'c2']))

      // Level 5: 24% base + 10% small party (2 members) + 20% demoralization = 54%
      expect(fleeChance).toBe(54)
    })

    it('party flee chance has no bonus when not demoralized', () => {
      const party = [
        createTestCharacter('c1', 3),
        createTestCharacter('c2', 3)
      ]

      const group: MonsterGroup = {
        id: 'A',
        monsters: [createBasicMonster('m1', 10)],
        formation: 'front',
        identified: true
      }

      // 6 < 10 = not demoralized
      const state: CombatState = {
        ...createCombatState([group]),
        monstersDemoralized: false,
        dungeonLevel: 5
      }

      const fleeChance = CombatService.calculateFleeChance(state, party, new Set(['c1', 'c2']))

      // Level 5: 24% base + 10% small party (2 members), no demoralization bonus = 34%
      expect(fleeChance).toBe(34)
    })
  })
})
