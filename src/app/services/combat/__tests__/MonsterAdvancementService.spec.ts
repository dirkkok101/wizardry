/**
 * MonsterAdvancementService Tests
 *
 * Tests for monster formation advancement including:
 * - Detecting when front row is cleared
 * - Advancing back-row melee groups to front
 * - Getting monster state from combat
 */

import {
  MonsterAdvancementService,
  hasAliveMonsters,
  checkAndAdvanceMonsters,
  getCurrentMonsterState,
  getMonsterGroup,
} from '../support/MonsterAdvancementService'
import { createTestMonster, createTestCombatState } from '@testing/test-factories'
import { CombatState, MonsterGroup } from '@models/Combat'

describe('MonsterAdvancementService', () => {
  describe('hasAliveMonsters', () => {
    it('returns true if group has alive monsters', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createTestMonster({ hp: 5 })],
        formation: 'front',
        identified: false,
      }
      expect(hasAliveMonsters(group)).toBe(true)
    })

    it('returns false if all monsters are dead', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createTestMonster({ hp: 0 })],
        formation: 'front',
        identified: false,
      }
      expect(hasAliveMonsters(group)).toBe(false)
    })

    it('returns true if at least one monster is alive', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [
          createTestMonster({ hp: 0 }),
          createTestMonster({ hp: 5 }),
          createTestMonster({ hp: 0 }),
        ],
        formation: 'front',
        identified: false,
      }
      expect(hasAliveMonsters(group)).toBe(true)
    })

    it('returns false for empty monster array', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [],
        formation: 'front',
        identified: false,
      }
      expect(hasAliveMonsters(group)).toBe(false)
    })
  })

  describe('getCurrentMonsterState', () => {
    it('returns monster if found in combat state', () => {
      const monster = createTestMonster({ id: 'monster-1', hp: 10 })
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [monster],
            formation: 'front',
            identified: false,
          },
        ],
      })

      const result = getCurrentMonsterState(state, 'monster-1')
      expect(result).toBeDefined()
      expect(result?.id).toBe('monster-1')
      expect(result?.hp).toBe(10)
    })

    it('returns undefined if monster not found', () => {
      const state = createTestCombatState()
      const result = getCurrentMonsterState(state, 'nonexistent')
      expect(result).toBeUndefined()
    })

    it('finds monster across multiple groups', () => {
      const monster1 = createTestMonster({ id: 'monster-1' })
      const monster2 = createTestMonster({ id: 'monster-2' })
      const state = createTestCombatState({
        monsterGroups: [
          { id: 'A', monsters: [monster1], formation: 'front', identified: false },
          { id: 'B', monsters: [monster2], formation: 'back', identified: false },
        ],
      })

      const result = getCurrentMonsterState(state, 'monster-2')
      expect(result?.id).toBe('monster-2')
    })
  })

  describe('getMonsterGroup', () => {
    it('returns group containing the monster', () => {
      const monster = createTestMonster({ id: 'monster-1' })
      const state = createTestCombatState({
        monsterGroups: [
          { id: 'A', monsters: [monster], formation: 'front', identified: false },
        ],
      })

      const result = getMonsterGroup(state, 'monster-1')
      expect(result).toBeDefined()
      expect(result?.id).toBe('A')
    })

    it('returns undefined if monster not in any group', () => {
      const state = createTestCombatState()
      const result = getMonsterGroup(state, 'nonexistent')
      expect(result).toBeUndefined()
    })
  })

  describe('checkAndAdvanceMonsters', () => {
    it('does not advance if front row has alive monsters', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [createTestMonster({ hp: 5 })],
            formation: 'front',
            identified: false,
          },
          {
            id: 'B',
            monsters: [createTestMonster({ hp: 5 })],
            formation: 'back',
            identified: false,
          },
        ],
      })

      const result = checkAndAdvanceMonsters(state)
      expect(result.advanced).toBe(false)
      expect(result.message).toBeUndefined()
      expect(result.newState.monsterGroups[1].formation).toBe('back')
    })

    it('does not advance if no back row groups exist', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [createTestMonster({ hp: 0 })],
            formation: 'front',
            identified: false,
          },
        ],
      })

      const result = checkAndAdvanceMonsters(state)
      expect(result.advanced).toBe(false)
    })

    it('does not advance if back row is all dead', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [createTestMonster({ hp: 0 })],
            formation: 'front',
            identified: false,
          },
          {
            id: 'B',
            monsters: [createTestMonster({ hp: 0 })],
            formation: 'back',
            identified: false,
          },
        ],
      })

      const result = checkAndAdvanceMonsters(state)
      expect(result.advanced).toBe(false)
    })
  })

  describe('isFrontRowWithAlive', () => {
    it('returns true for front row with alive monsters', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createTestMonster({ hp: 5 })],
        formation: 'front',
        identified: false,
      }
      expect(MonsterAdvancementService.isFrontRowWithAlive(group)).toBe(true)
    })

    it('returns false for back row', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createTestMonster({ hp: 5 })],
        formation: 'back',
        identified: false,
      }
      expect(MonsterAdvancementService.isFrontRowWithAlive(group)).toBe(false)
    })

    it('returns false for front row with all dead monsters', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createTestMonster({ hp: 0 })],
        formation: 'front',
        identified: false,
      }
      expect(MonsterAdvancementService.isFrontRowWithAlive(group)).toBe(false)
    })
  })

  describe('countAliveMonsters', () => {
    it('counts alive monsters in group', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [
          createTestMonster({ hp: 5 }),
          createTestMonster({ hp: 0 }),
          createTestMonster({ hp: 3 }),
        ],
        formation: 'front',
        identified: false,
      }
      expect(MonsterAdvancementService.countAliveMonsters(group)).toBe(2)
    })

    it('returns 0 for all dead monsters', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [
          createTestMonster({ hp: 0 }),
          createTestMonster({ hp: 0 }),
        ],
        formation: 'front',
        identified: false,
      }
      expect(MonsterAdvancementService.countAliveMonsters(group)).toBe(0)
    })
  })

  describe('createAdvancementMessage', () => {
    it('creates singular message for single monster', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createTestMonster({ hp: 5, name: 'Goblin' })],
        formation: 'back',
        identified: true,
      }
      const message = MonsterAdvancementService.createAdvancementMessage(group)
      expect(message).toBe('Goblin rushes forward to fill the gap!')
    })

    it('creates plural message for multiple monsters', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [
          createTestMonster({ hp: 5, name: 'Goblin' }),
          createTestMonster({ hp: 3, name: 'Goblin' }),
        ],
        formation: 'back',
        identified: true,
      }
      const message = MonsterAdvancementService.createAdvancementMessage(group)
      expect(message).toBe('The Goblins rush forward to fill the gap!')
    })

    it('uses unidentified name when not identified', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [createTestMonster({ hp: 5, unidentifiedName: 'Small Creature' })],
        formation: 'back',
        identified: false,
      }
      const message = MonsterAdvancementService.createAdvancementMessage(group)
      expect(message).toBe('Small Creature rushes forward to fill the gap!')
    })
  })

  describe('advanceGroup', () => {
    it('changes group formation to front', () => {
      const state = createTestCombatState({
        monsterGroups: [
          { id: 'A', monsters: [], formation: 'front', identified: false },
          { id: 'B', monsters: [], formation: 'back', identified: false },
        ],
      })

      const result = MonsterAdvancementService.advanceGroup(state, 'B')
      expect(result.monsterGroups[1].formation).toBe('front')
    })

    it('preserves other groups unchanged', () => {
      const state = createTestCombatState({
        monsterGroups: [
          { id: 'A', monsters: [], formation: 'front', identified: false },
          { id: 'B', monsters: [], formation: 'back', identified: false },
        ],
      })

      const result = MonsterAdvancementService.advanceGroup(state, 'B')
      expect(result.monsterGroups[0].formation).toBe('front')
    })

    it('returns immutable state update', () => {
      const state = createTestCombatState({
        monsterGroups: [
          { id: 'B', monsters: [], formation: 'back', identified: false },
        ],
      })

      const result = MonsterAdvancementService.advanceGroup(state, 'B')
      expect(result).not.toBe(state)
      expect(result.monsterGroups).not.toBe(state.monsterGroups)
    })
  })
})
