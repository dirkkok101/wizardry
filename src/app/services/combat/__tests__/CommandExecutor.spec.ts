/**
 * CommandExecutor Tests
 *
 * Verifies that the command executor correctly dispatches to registered actions
 */

import { CommandExecutor, hasHandler } from '../orchestration/CommandExecutor'
import { combatActionRegistry } from '../actions/CombatAction'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'
import { CombatState, CombatCommand, MonsterGroup } from '@models/Combat'
import { RandomService } from '@services/RandomService'

// Import all actions to register them
import '../actions/AttackAction'
import '../actions/ParryAction'
import '../actions/FleeAction'
import '../actions/AdvanceAction'
import '../actions/BreathAction'
import '../actions/CallForHelpAction'
import '../actions/CastSpellAction'
import '../actions/DispelAction'
import '../actions/MonsterFleeAction'

describe('CommandExecutor', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('hasHandler', () => {
    it('returns true for registered action types', () => {
      expect(hasHandler('ATTACK')).toBe(true)
      expect(hasHandler('PARRY')).toBe(true)
      expect(hasHandler('RUN')).toBe(true)
    })

    it('returns false for unregistered action types', () => {
      expect(hasHandler('USE_ITEM')).toBe(false)
      expect(hasHandler('UNKNOWN' as any)).toBe(false)
    })
  })

  describe('executeCommand', () => {
    const createMinimalCombatState = (): CombatState => ({
      monsterGroups: [],
      commandQueue: [],
      roundNumber: 1,
      canFlee: true,
      dungeonLevel: 1,
      statusEffects: new Map(),
      statusDurations: new Map(),
      acModifiers: new Map(),
    })

    it('executes PARRY command and returns result', () => {
      const character = createTestCharacter({ id: 'c1', name: 'Fighter' })
      const state = createMinimalCombatState()
      const command: CombatCommand = {
        id: 'cmd1',
        actor: character,
        type: 'PARRY',
        initiative: 5,
      }

      const result = CommandExecutor.executeCommand(
        state,
        command,
        new Set(),
        [character],
        [character.id]
      )

      expect(result.newState).toBeDefined()
      expect(result.messages).toBeDefined()
      expect(result.messages.length).toBeGreaterThan(0)
      expect(result.messages[0]).toContain('Fighter')
      expect(result.messages[0]).toContain('defensive stance')
    })

    it('executes RUN command and returns result', () => {
      const character = createTestCharacter({ id: 'c1', name: 'Thief' })
      const state = createMinimalCombatState()
      const command: CombatCommand = {
        id: 'cmd1',
        actor: character,
        type: 'RUN',
        initiative: 5,
      }

      const result = CommandExecutor.executeCommand(
        state,
        command,
        new Set(),
        [character],
        [character.id]
      )

      expect(result.newState).toBeDefined()
      expect(result.messages).toBeDefined()
      expect(result.messages.length).toBeGreaterThan(0)
      expect(result.messages[0]).toContain('Thief')
    })

    it('returns error message for unregistered action type', () => {
      const character = createTestCharacter({ id: 'c1', name: 'Test' })
      const state = createMinimalCombatState()
      const command: CombatCommand = {
        id: 'cmd1',
        actor: character,
        type: 'USE_ITEM' as any,
        initiative: 5,
      }

      const result = CommandExecutor.executeCommand(
        state,
        command,
        new Set(),
        [character],
        [character.id]
      )

      expect(result.messages[0]).toContain('not yet implemented')
    })
  })

  describe('combatActionRegistry', () => {
    it('has all expected actions registered', () => {
      expect(combatActionRegistry.has('ATTACK')).toBe(true)
      expect(combatActionRegistry.has('PARRY')).toBe(true)
      expect(combatActionRegistry.has('RUN')).toBe(true)
      expect(combatActionRegistry.has('CAST_SPELL')).toBe(true)
      expect(combatActionRegistry.has('DISPEL')).toBe(true)
      expect(combatActionRegistry.has('ADVANCE')).toBe(true)
      expect(combatActionRegistry.has('BREATH')).toBe(true)
      expect(combatActionRegistry.has('CALL_FOR_HELP')).toBe(true)
      expect(combatActionRegistry.has('MONSTER_FLEE')).toBe(true)
    })
  })
})
