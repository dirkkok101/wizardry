// src/services/__tests__/CombatService.callForHelp.spec.ts
import { CombatService } from '../CombatService'
import { CombatState, MonsterInstance, MonsterGroup } from '@models/Combat'
import { Character } from '@models/Character'
import { RandomService } from '../RandomService'

/**
 * Call for Help Tests (Apple II Reference)
 *
 * Monsters with the Call ability have a 75% chance to call for help
 * if their group count drops below 5. The chance help actually arrives is:
 * (MonsterLevel × 5)%
 *
 * Source: Zimlab - "Some monsters have the capability to call for help.
 * The ones that do so have a 75% chance to call for help if their group
 * count drops below 5."
 */

// Helper to create test monster with call ability
function createCallingMonster(
  id: string,
  level: number,
  canCall: boolean = true
): MonsterInstance {
  return {
    id,
    monsterId: 'kobold',  // Uses existing monster for template
    name: 'Kobold',
    hp: 10,
    maxHp: 10,
    ac: 8,
    damage: [{ dice: '1d4', min: 1, max: 4 }],
    xp: 10,
    status: 'ALIVE',
    level,
    undead: false,
    canCall
  }
}

// Helper to create basic test monster without call ability
function createBasicMonster(id: string): MonsterInstance {
  return createCallingMonster(id, 1, false)
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
    statusDurations: new Map()
  }
}

// Helper to create test character
function createTestCharacter(id: string): Character {
  return {
    id,
    name: `Hero ${id}`,
    race: 'Human',
    class: 'Fighter',
    alignment: 'Good',
    level: 5,
    maxLev: 5,
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

describe('CombatService - Call for Help', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('selectMonsterAction - Call for Help decision', () => {
    it('monster with canCall=true attempts call when group < 5 members', () => {
      const monster = createCallingMonster('m1', 5, true)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster, createBasicMonster('m2'), createBasicMonster('m3')], // 3 alive
        formation: 'front',
        identified: true
      }
      const state = createCombatState([group])
      const party = [createTestCharacter('c1')]

      // Queue: 75% call chance succeeds
      RandomService.queueNextValues([0.5])  // 50% < 75% = will call

      const command = CombatService.selectMonsterAction(monster, party, ['c1'], group, [group])

      expect(command.type).toBe('CALL_FOR_HELP')
      expect(command.data.groupId).toBe('A')
      expect(command.data.monsterLevel).toBe(5)
    })

    it('monster does not attempt call when group has 5+ members', () => {
      const monster = createCallingMonster('m1', 5, true)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [
          monster,
          createBasicMonster('m2'),
          createBasicMonster('m3'),
          createBasicMonster('m4'),
          createBasicMonster('m5')
        ], // 5 alive
        formation: 'front',
        identified: true
      }
      const state = createCombatState([group])
      const party = [createTestCharacter('c1')]

      // Should not call since group has 5 members
      const command = CombatService.selectMonsterAction(monster, party, ['c1'], group, [group])

      expect(command.type).not.toBe('CALL_FOR_HELP')
    })

    it('monster without canCall ability does not attempt call', () => {
      const monster = createCallingMonster('m1', 5, false) // canCall = false
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster], // 1 alive, but no call ability
        formation: 'front',
        identified: true
      }
      const state = createCombatState([group])
      const party = [createTestCharacter('c1')]

      const command = CombatService.selectMonsterAction(monster, party, ['c1'], group, [group])

      expect(command.type).not.toBe('CALL_FOR_HELP')
    })

    it('75% chance to attempt call is checked', () => {
      const monster = createCallingMonster('m1', 5, true)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster, createBasicMonster('m2')], // 2 alive
        formation: 'front',
        identified: true
      }
      const party = [createTestCharacter('c1')]

      // Queue: 80% > 75% = fails call check, falls through to attack
      RandomService.queueNextValues([0.8])

      const command = CombatService.selectMonsterAction(monster, party, ['c1'], group, [group])

      // Should not be call since 80% > 75%
      expect(command.type).not.toBe('CALL_FOR_HELP')
    })
  })

  describe('executeCallForHelpCommand', () => {
    it('help arrives when roll succeeds (Level × 5%)', () => {
      const monster = createCallingMonster('m1', 10, true) // Level 10 = 50% success
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
        type: 'CALL_FOR_HELP' as const,
        initiative: 5,
        data: {
          monsterId: 'kobold',
          monsterLevel: 10,
          groupId: 'A'
        }
      }

      // Queue: success roll (40% < 50%) and reinforcement count (1-4)
      RandomService.queueNextValues([0.4, 0.5]) // Help arrives, random for reinforcement count

      const result = CombatService.executeCommand(state, command)

      expect(result.messages[0]).toContain('calls for help')
      expect(result.messages[1]).toMatch(/join[s]? the battle/)
      // Group should have more monsters now
      expect(result.newState.monsterGroups[0].monsters.length).toBeGreaterThan(1)
    })

    it('no help arrives when roll fails', () => {
      const monster = createCallingMonster('m1', 2, true) // Level 2 = 10% success
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
        type: 'CALL_FOR_HELP' as const,
        initiative: 5,
        data: {
          monsterId: 'kobold',
          monsterLevel: 2,
          groupId: 'A'
        }
      }

      // Queue: failed roll (50% > 10%)
      RandomService.queueNextValues([0.5])

      const result = CombatService.executeCommand(state, command)

      expect(result.messages[0]).toContain('calls for help')
      expect(result.messages[1]).toContain('No help arrives')
      // Group should still have just 1 monster
      expect(result.newState.monsterGroups[0].monsters.length).toBe(1)
    })

    it('higher level monsters have better success chance', () => {
      // Level 20 = 100% success chance (capped at 100%)
      const monster = createCallingMonster('m1', 20, true)
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
        type: 'CALL_FOR_HELP' as const,
        initiative: 5,
        data: {
          monsterId: 'kobold',
          monsterLevel: 20,
          groupId: 'A'
        }
      }

      // Queue: Any roll should succeed at 100% (queue 0.99 to prove it)
      RandomService.queueNextValues([0.99, 0.5])

      const result = CombatService.executeCommand(state, command)

      // Even 99% roll succeeds at 100% chance
      expect(result.messages[1]).toMatch(/join[s]? the battle/)
    })

    it('adds 1-4 reinforcements when help arrives', () => {
      const monster = createCallingMonster('m1', 10, true)
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
        type: 'CALL_FOR_HELP' as const,
        initiative: 5,
        data: {
          monsterId: 'kobold',
          monsterLevel: 10,
          groupId: 'A'
        }
      }

      // Run multiple times to verify 1-4 range
      const counts: number[] = []
      for (let i = 0; i < 5; i++) {
        RandomService.resetSeed()
        // Queue success + different reinforcement count seeds
        RandomService.queueNextValues([0.1, i * 0.2])

        const result = CombatService.executeCommand(state, command)
        const newCount = result.newState.monsterGroups[0].monsters.length - 1 // Subtract original
        counts.push(newCount)
      }

      // All counts should be 1-4
      counts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(1)
        expect(count).toBeLessThanOrEqual(4)
      })
    })
  })

  describe('integration - call for help in combat round', () => {
    it('monster calls for help during its turn in combat', () => {
      const callingMonster = createCallingMonster('m1', 5, true)
      const group: MonsterGroup = {
        id: 'A',
        monsters: [callingMonster, createBasicMonster('m2')], // 2 alive
        formation: 'front',
        identified: true
      }
      const state = createCombatState([group])
      const party = [createTestCharacter('c1')]

      // Queue values for:
      // 1. Call check (50% < 75% = will call)
      // 2. Help arrival (40% < 25% fails for level 5)
      RandomService.queueNextValues([0.5, 0.4])

      const command = CombatService.selectMonsterAction(
        callingMonster,
        party,
        ['c1'],
        group,
        [group]
      )

      expect(command.type).toBe('CALL_FOR_HELP')

      const result = CombatService.executeCommand(state, command)
      expect(result.messages[0]).toContain('calls for help')
    })
  })
})
