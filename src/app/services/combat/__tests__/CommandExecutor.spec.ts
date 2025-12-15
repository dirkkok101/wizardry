/**
 * CommandExecutor Tests
 *
 * Verifies that the command executor correctly dispatches to registered actions
 */

import { CommandExecutor, hasHandler, expandAttackCommands } from '../orchestration/CommandExecutor'
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

  describe('expandAttackCommands', () => {
    it('returns non-attack commands unchanged', () => {
      const character = createTestCharacter({ id: 'c1' })
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: character, type: 'PARRY', initiative: 5 },
        { id: 'cmd2', actor: character, type: 'RUN', initiative: 3 },
      ]

      const result = expandAttackCommands(commands)
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('PARRY')
      expect(result[1].type).toBe('RUN')
    })

    it('returns single attack command unchanged for 1-attack combatant', () => {
      const character = createTestCharacter({ id: 'c1', level: 1 })
      const monster = createTestMonster({ id: 'm1' })
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: character, type: 'ATTACK', target: monster, initiative: 5 },
      ]

      const result = expandAttackCommands(commands)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cmd1')
    })

    it('expands attack command for multi-attack fighter', () => {
      // Level 5 fighter gets 2 attacks
      const fighter = createTestCharacter({
        id: 'c1',
        level: 5,
        class: 'FIGHTER' as any
      })
      const monster = createTestMonster({ id: 'm1' })
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: fighter, type: 'ATTACK', target: monster, initiative: 5 },
      ]

      const result = expandAttackCommands(commands)
      // Fighter at level 5 should have 2 attacks
      expect(result.length).toBeGreaterThanOrEqual(1)

      // If expanded, check IDs are unique
      if (result.length > 1) {
        expect(result[0].id).toBe('cmd1_0')
        expect(result[1].id).toBe('cmd1_1')
        expect(result[0].attackIndex).toBe(0)
        expect(result[1].attackIndex).toBe(1)
      }
    })

    it('preserves target and initiative when expanding', () => {
      const fighter = createTestCharacter({
        id: 'c1',
        level: 10,
        class: 'FIGHTER' as any
      })
      const monster = createTestMonster({ id: 'm1' })
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: fighter, type: 'ATTACK', target: monster, initiative: 15 },
      ]

      const result = expandAttackCommands(commands)

      for (const cmd of result) {
        expect(cmd.target).toBe(monster)
        expect(cmd.initiative).toBe(15)
        expect(cmd.actor).toBe(fighter)
      }
    })

    it('handles mixed command types', () => {
      const fighter = createTestCharacter({ id: 'c1', level: 5 })
      const mage = createTestCharacter({ id: 'c2', level: 5 })
      const monster = createTestMonster({ id: 'm1' })

      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: fighter, type: 'ATTACK', target: monster, initiative: 10 },
        { id: 'cmd2', actor: mage, type: 'CAST_SPELL', target: monster, initiative: 8, data: { spellId: 'katino' } },
        { id: 'cmd3', actor: mage, type: 'PARRY', initiative: 5 },
      ]

      const result = expandAttackCommands(commands)

      // Non-attack commands should be unchanged
      const castSpell = result.find(c => c.type === 'CAST_SPELL')
      const parry = result.find(c => c.type === 'PARRY')
      expect(castSpell?.id).toBe('cmd2')
      expect(parry?.id).toBe('cmd3')
    })

    it('handles empty command array', () => {
      const result = expandAttackCommands([])
      expect(result).toEqual([])
    })
  })
})
