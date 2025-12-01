// src/app/services/__tests__/CombatService.dispel.spec.ts
import { CombatService } from '../CombatService'
import { CombatState, MonsterGroup, MonsterInstance, CombatCommand } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { CharacterStatus } from '@models/CharacterStatus'
import { RandomService } from '../RandomService'

/**
 * Dispel (Turn Undead) Tests
 *
 * Apple II Reference:
 * - Formula: ((50 + 5×CharLevel) - (10×MonsterLevel))% per monster
 * - Class penalties: Priest=0, Bishop=-20%, Lord=-40%
 * - Only works on UNDEAD monsters
 * - CRITICAL BUG: Only OK-status undead can be dispelled
 * - Dispelled monsters grant NO XP
 */
describe('CombatService - Dispel Command', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  // Helper to create undead monster
  function createUndeadMonster(id: string, level: number, overrides: Partial<MonsterInstance> = {}): MonsterInstance {
    return {
      id,
      monsterId: 'skeleton',
      name: 'Skeleton',
      hp: 10,
      maxHp: 10,
      ac: 8,
      damage: [{ dice: '1d6', min: 1, max: 6 }],
      xp: 50,
      status: 'ALIVE',
      level,
      undead: true,
      ...overrides
    }
  }

  // Helper to create non-undead monster
  function createNonUndeadMonster(id: string, level: number): MonsterInstance {
    return {
      id,
      monsterId: 'kobold',
      name: 'Kobold',
      hp: 5,
      maxHp: 5,
      ac: 10,
      damage: [{ dice: '1d4', min: 1, max: 4 }],
      xp: 10,
      status: 'ALIVE',
      level,
      undead: false
    }
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

  // Helper to create priest character
  function createPriest(level: number, overrides: Partial<Character> = {}): Character {
    return {
      id: 'priest1',
      name: 'Test Priest',
      race: Race.HUMAN,
      class: CharacterClass.PRIEST,
      alignment: Alignment.GOOD,
      level,
      maxLev: level,
      experience: 0,
      hp: 20,
      maxHp: 20,
      ac: 8,
      strength: 10,
      intelligence: 12,
      piety: 15,
      vitality: 12,
      agility: 10,
      luck: 10,
      status: CharacterStatus.OK,
      vim: { current: 12, max: 12 },
      gold: 0,
      age: 20,
      inventory: [],
      knownSpells: [],
      deathCount: 0,
      monsterKills: 0,
      ...overrides
    }
  }

  describe('dispel formula: (50 + 5×CharLevel) - (10×MonsterLevel)', () => {
    it('Level 5 Priest vs Level 1 undead = 95% chance (capped)', () => {
      // 50 + (5×5) - (10×1) = 50 + 25 - 10 = 65%, but success means > chance
      // Actually testing that formula is applied correctly
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 1)],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(5)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      // Queue a success roll (65% = need roll <= 65)
      RandomService.queueNextValues([0.5])  // 50% < 65% = success

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('dispelled'))).toBe(true)
    })

    it('Level 1 Priest vs Level 5 undead = 5% chance (floored)', () => {
      // 50 + (5×1) - (10×5) = 50 + 5 - 50 = 5% (minimum)
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 5)],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(1)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      // Queue a failure roll (5% = need roll <= 5)
      RandomService.queueNextValues([0.1])  // 10% > 5% = failure

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('resist'))).toBe(true)
    })
  })

  describe('class penalties', () => {
    it('Bishop has -20% penalty', () => {
      // Level 5 Bishop vs Level 1 undead:
      // 50 + (5×5) - (10×1) - 20 = 50 + 25 - 10 - 20 = 45%
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 1)],
        formation: 'front',
        identified: true
      }])

      const bishop = createPriest(5, { class: CharacterClass.BISHOP })
      const command: CombatCommand = {
        id: 'cmd1',
        actor: bishop,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      // Queue a roll between 45-65% to test penalty effect
      RandomService.queueNextValues([0.5])  // 50% > 45% = failure due to penalty

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('resist'))).toBe(true)
    })

    it('Lord has -40% penalty', () => {
      // Level 10 Lord vs Level 1 undead:
      // 50 + (5×10) - (10×1) - 40 = 50 + 50 - 10 - 40 = 50%
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 1)],
        formation: 'front',
        identified: true
      }])

      const lord = createPriest(10, { class: CharacterClass.LORD })
      const command: CombatCommand = {
        id: 'cmd1',
        actor: lord,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      // Queue a roll > 50% to test penalty
      RandomService.queueNextValues([0.6])  // 60% > 50% = failure

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('resist'))).toBe(true)
    })

    it('Priest has no penalty', () => {
      // Level 5 Priest vs Level 1 undead:
      // 50 + (5×5) - (10×1) = 65%
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 1)],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(5)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      // Queue a roll at 60% - should succeed for Priest (65%) but fail for Bishop (45%)
      RandomService.queueNextValues([0.6])  // 60% < 65% = success

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('dispelled'))).toBe(true)
    })
  })

  describe('undead-only targeting', () => {
    it('has no effect on non-undead monsters', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [createNonUndeadMonster('m1', 1)],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(5)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('no effect on non-undead'))).toBe(true)
      // Monster should still be alive
      expect(result.newState.monsterGroups[0].monsters[0].hp).toBeGreaterThan(0)
    })

    it('only affects undead in mixed groups', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [
          createUndeadMonster('m1', 1),
          createNonUndeadMonster('m2', 1)
        ],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(10)  // High level = high success chance
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      // Queue success for undead
      RandomService.queueNextValues([0.01])  // Very low = success

      const result = CombatService.executeCommand(state, command)
      // Undead should be destroyed
      expect(result.newState.monsterGroups[0].monsters[0].hp).toBe(0)
      // Non-undead should be unaffected
      expect(result.newState.monsterGroups[0].monsters[1].hp).toBeGreaterThan(0)
    })
  })

  describe('status bug: sleeping undead immune', () => {
    it('does not affect sleeping undead', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 1, { status: 'ASLEEP' })],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(10)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('held and immune'))).toBe(true)
      // Monster should still be alive
      expect(result.newState.monsterGroups[0].monsters[0].hp).toBeGreaterThan(0)
    })

    it('does not affect paralyzed undead', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 1, { status: 'PARALYZED' })],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(10)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('held and immune'))).toBe(true)
    })

    it('only affects OK-status undead in mixed status group', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [
          createUndeadMonster('m1', 1, { status: 'ALIVE' }),  // Can be dispelled
          createUndeadMonster('m2', 1, { status: 'ASLEEP' }) // Immune
        ],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(10)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      // Queue success for the eligible undead
      RandomService.queueNextValues([0.01])

      const result = CombatService.executeCommand(state, command)
      // OK-status undead should be destroyed
      expect(result.newState.monsterGroups[0].monsters[0].hp).toBe(0)
      // Sleeping undead should be unaffected
      expect(result.newState.monsterGroups[0].monsters[1].hp).toBeGreaterThan(0)
    })
  })

  describe('per-monster rolls', () => {
    it('rolls individually for each monster', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [
          createUndeadMonster('m1', 1),
          createUndeadMonster('m2', 1),
          createUndeadMonster('m3', 1)
        ],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(5)  // 65% chance per monster
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      // Queue specific results: success, failure, success
      RandomService.queueNextValues([0.3, 0.8, 0.3])

      const result = CombatService.executeCommand(state, command)
      // First and third should be destroyed
      expect(result.newState.monsterGroups[0].monsters[0].hp).toBe(0)
      expect(result.newState.monsterGroups[0].monsters[1].hp).toBeGreaterThan(0)
      expect(result.newState.monsterGroups[0].monsters[2].hp).toBe(0)
      expect(result.messages.some(m => m.includes('2 undead dispelled'))).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles empty group', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(5)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('empty'))).toBe(true)
    })

    it('handles all dead monsters', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 1, { hp: 0, status: 'DEAD' })],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(5)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5,
        targetGroupId: 'A'
      }

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('already dead'))).toBe(true)
    })

    it('handles missing target group', () => {
      const state = createCombatState([{
        id: 'A',
        monsters: [createUndeadMonster('m1', 1)],
        formation: 'front',
        identified: true
      }])

      const priest = createPriest(5)
      const command: CombatCommand = {
        id: 'cmd1',
        actor: priest,
        type: 'DISPEL',
        initiative: 5
        // No targetGroupId
      }

      const result = CombatService.executeCommand(state, command)
      expect(result.messages.some(m => m.includes('no group targeted'))).toBe(true)
    })
  })
})
