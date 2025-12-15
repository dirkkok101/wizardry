/**
 * CombatRoundOrchestrator Tests
 *
 * Tests for combat round orchestration including:
 * - Command sorting by initiative
 * - Surprise filtering
 * - Round context management
 * - Combat end detection
 */

import { RandomService } from '@services/RandomService'
import {
  CombatRoundOrchestrator,
  createRoundContext,
  createAuditContext,
  sortCommandsByInitiative,
  applySurpriseFilter,
  canActorAct,
  getSkipReason,
  isTargetValid,
  checkCombatEnd,
  buildAudit,
  type AuditContext,
} from '../orchestration/CombatRoundOrchestrator'
import {
  createTestCharacter,
  createTestMonster,
  createTestCombatState,
} from '@testing/test-factories'
import { CombatCommand, CombatState, MonsterGroup } from '@models/Combat'
import { CharacterStatus } from '@models/CharacterStatus'

describe('CombatRoundOrchestrator', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('createRoundContext', () => {
    it('creates context with empty tracking maps', () => {
      const state = createTestCombatState()
      const ctx = createRoundContext(state)

      expect(ctx.damagedCharacters).toBeInstanceOf(Map)
      expect(ctx.damagedCharacters.size).toBe(0)
      expect(ctx.spellCasters).toBeInstanceOf(Map)
      expect(ctx.curedCharacters).toBeInstanceOf(Map)
      expect(ctx.parryingCombatants).toBeInstanceOf(Set)
      expect(ctx.fleeingCharacters).toBeInstanceOf(Set)
    })

    it('clears command queue in context state', () => {
      const state = createTestCombatState({
        commandQueue: [
          { id: 'cmd1', actor: createTestCharacter(), type: 'ATTACK', initiative: 5 },
        ],
      })
      const ctx = createRoundContext(state)

      expect(ctx.state.commandQueue).toEqual([])
    })

    it('initializes empty events and messages arrays', () => {
      const state = createTestCombatState()
      const ctx = createRoundContext(state)

      expect(ctx.events).toEqual([])
      expect(ctx.messages).toEqual([])
    })
  })

  describe('createAuditContext', () => {
    it('creates enabled audit context by default', () => {
      const ctx = CombatRoundOrchestrator.createAuditContext()
      expect(ctx.enabled).toBe(true)
      expect(ctx.entries).toEqual([])
    })

    it('respects enabled parameter', () => {
      const ctx = CombatRoundOrchestrator.createAuditContext(false)
      expect(ctx.enabled).toBe(false)
    })

    it('initializes all skip reason counts to zero', () => {
      const ctx = CombatRoundOrchestrator.createAuditContext()
      expect(ctx.skipReasonCounts.DEAD).toBe(0)
      expect(ctx.skipReasonCounts.ASLEEP).toBe(0)
      expect(ctx.skipReasonCounts.PARALYZED).toBe(0)
      expect(ctx.skipReasonCounts.SURPRISED).toBe(0)
      expect(ctx.skipReasonCounts.NONE).toBe(0)
    })

    it('works as standalone export (binding test)', () => {
      // Verify the standalone export works without `this` binding issues
      const ctx = createAuditContext()
      expect(ctx.enabled).toBe(true)
      expect(ctx.skipReasonCounts.DEAD).toBe(0)
    })
  })

  describe('sortCommandsByInitiative', () => {
    it('sorts commands by initiative descending (highest first)', () => {
      const char1 = createTestCharacter({ id: 'c1' })
      const char2 = createTestCharacter({ id: 'c2' })
      const char3 = createTestCharacter({ id: 'c3' })

      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char1, type: 'ATTACK', initiative: 5 },
        { id: 'cmd2', actor: char2, type: 'ATTACK', initiative: 15 },
        { id: 'cmd3', actor: char3, type: 'ATTACK', initiative: 10 },
      ]

      const sorted = sortCommandsByInitiative(commands)

      expect(sorted[0].initiative).toBe(15)
      expect(sorted[1].initiative).toBe(10)
      expect(sorted[2].initiative).toBe(5)
    })

    it('returns new array without modifying original', () => {
      const char = createTestCharacter()
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 },
        { id: 'cmd2', actor: char, type: 'PARRY', initiative: 10 },
      ]

      const sorted = sortCommandsByInitiative(commands)

      expect(sorted).not.toBe(commands)
      expect(commands[0].initiative).toBe(5) // Original unchanged
    })

    it('handles empty array', () => {
      const sorted = sortCommandsByInitiative([])
      expect(sorted).toEqual([])
    })

    it('handles single command', () => {
      const char = createTestCharacter()
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 },
      ]

      const sorted = sortCommandsByInitiative(commands)
      expect(sorted).toHaveLength(1)
      expect(sorted[0].id).toBe('cmd1')
    })
  })

  describe('applySurpriseFilter', () => {
    it('returns all commands when surprise state is none', () => {
      const char = createTestCharacter()
      const monster = createTestMonster()
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 },
        { id: 'cmd2', actor: monster, type: 'ATTACK', initiative: 8 },
      ]

      const filtered = applySurpriseFilter(commands, 'none')
      expect(filtered).toHaveLength(2)
    })

    it('returns all commands when surprise state is undefined', () => {
      const char = createTestCharacter()
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 },
      ]

      const filtered = applySurpriseFilter(commands, undefined)
      expect(filtered).toHaveLength(1)
    })

    it('filters out monster commands when party surprises', () => {
      const char = createTestCharacter()
      const monster = createTestMonster()
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 },
        { id: 'cmd2', actor: monster, type: 'ATTACK', initiative: 8 },
      ]

      const filtered = applySurpriseFilter(commands, 'party')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].actor).toBe(char)
    })

    it('filters out party commands when monsters surprise', () => {
      const char = createTestCharacter()
      const monster = createTestMonster()
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 },
        { id: 'cmd2', actor: monster, type: 'ATTACK', initiative: 8 },
      ]

      const filtered = applySurpriseFilter(commands, 'monsters')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].actor).toBe(monster)
    })

    it('records skipped commands in audit context', () => {
      const char = createTestCharacter()
      const monster = createTestMonster()
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 },
        { id: 'cmd2', actor: monster, type: 'ATTACK', initiative: 8 },
      ]
      const auditCtx = CombatRoundOrchestrator.createAuditContext(true)

      CombatRoundOrchestrator.applySurpriseFilter(commands, 'party', auditCtx)

      expect(auditCtx.entries).toHaveLength(1)
      expect(auditCtx.entries[0].skipReason).toBe('SURPRISED')
      expect(auditCtx.skipReasonCounts.SURPRISED).toBe(1)
    })

    it('works as standalone export (binding test)', () => {
      // Verify the standalone export works without `this` binding issues
      const char = createTestCharacter()
      const monster = createTestMonster()
      const commands: CombatCommand[] = [
        { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 },
        { id: 'cmd2', actor: monster, type: 'ATTACK', initiative: 8 },
      ]
      const auditCtx = createAuditContext(true)

      // This should work with the binding fix
      const filtered = applySurpriseFilter(commands, 'party', auditCtx)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('cmd1')
      expect(auditCtx.entries).toHaveLength(1)
    })
  })

  describe('canActorAct', () => {
    it('returns true for alive character', () => {
      const char = createTestCharacter({ hp: 10, status: CharacterStatus.OK })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      expect(canActorAct(cmd, state, new Map())).toBe(true)
    })

    it('returns false for dead character', () => {
      const char = createTestCharacter({ hp: 0, status: CharacterStatus.DEAD })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      expect(canActorAct(cmd, state, new Map())).toBe(false)
    })

    it('returns false for asleep character', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASLEEP })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      expect(canActorAct(cmd, state, new Map())).toBe(false)
    })

    it('returns false for paralyzed character', () => {
      const char = createTestCharacter({ status: CharacterStatus.PARALYZED })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      expect(canActorAct(cmd, state, new Map())).toBe(false)
    })

    it('checks damagedCharacters map for updated state', () => {
      const char = createTestCharacter({ id: 'c1', hp: 10, status: CharacterStatus.OK })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      // Character was killed this round
      const damagedCharacters = new Map([
        ['c1', { ...char, hp: 0, status: CharacterStatus.DEAD }],
      ])

      expect(canActorAct(cmd, state, damagedCharacters)).toBe(false)
    })
  })

  describe('getSkipReason', () => {
    it('returns DEAD for dead character', () => {
      const char = createTestCharacter({ hp: 0, status: CharacterStatus.DEAD })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      expect(getSkipReason(cmd, state, new Map())).toBe('DEAD')
    })

    it('returns ASLEEP for sleeping character', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASLEEP })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      expect(getSkipReason(cmd, state, new Map())).toBe('ASLEEP')
    })

    it('returns PARALYZED for paralyzed character', () => {
      const char = createTestCharacter({ status: CharacterStatus.PARALYZED })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      expect(getSkipReason(cmd, state, new Map())).toBe('PARALYZED')
    })

    it('returns STONED for stoned character', () => {
      const char = createTestCharacter({ status: CharacterStatus.STONED })
      const state = createTestCombatState()
      const cmd: CombatCommand = { id: 'cmd1', actor: char, type: 'ATTACK', initiative: 5 }

      expect(getSkipReason(cmd, state, new Map())).toBe('STONED')
    })
  })

  describe('isTargetValid', () => {
    it('returns false when target monster is dead', () => {
      const deadMonster = createTestMonster({ id: 'm1', hp: 0, status: 'DEAD' })
      const state = createTestCombatState({
        monsterGroups: [
          { id: 'A', monsters: [deadMonster], formation: 'front', identified: true },
        ],
      })
      const cmd: CombatCommand = {
        id: 'cmd1',
        type: 'ATTACK',
        actor: createTestCharacter(),
        target: deadMonster,
        initiative: 5,
      }

      expect(isTargetValid(cmd, state)).toBe(false)
    })

    it('returns false when all monsters in target group are dead', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [
              createTestMonster({ id: 'm1', hp: 0, status: 'DEAD' }),
              createTestMonster({ id: 'm2', hp: 0, status: 'DEAD' }),
            ],
            formation: 'front',
            identified: true,
          },
        ],
      })
      const cmd: CombatCommand = {
        id: 'cmd1',
        type: 'ATTACK',
        actor: createTestCharacter(),
        targetGroupId: 'A',
        initiative: 5,
      }

      expect(isTargetValid(cmd, state)).toBe(false)
    })

    it('returns true when target group has alive monsters', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [
              createTestMonster({ id: 'm1', hp: 0, status: 'DEAD' }),
              createTestMonster({ id: 'm2', hp: 10, status: 'ALIVE' }),
            ],
            formation: 'front',
            identified: true,
          },
        ],
      })
      const cmd: CombatCommand = {
        id: 'cmd1',
        type: 'ATTACK',
        actor: createTestCharacter(),
        targetGroupId: 'A',
        initiative: 5,
      }

      expect(isTargetValid(cmd, state)).toBe(true)
    })

    it('returns true when specific target monster is alive', () => {
      const aliveMonster = createTestMonster({ id: 'm1', hp: 10, status: 'ALIVE' })
      const state = createTestCombatState({
        monsterGroups: [
          { id: 'A', monsters: [aliveMonster], formation: 'front', identified: true },
        ],
      })
      const cmd: CombatCommand = {
        id: 'cmd1',
        type: 'ATTACK',
        actor: createTestCharacter(),
        target: aliveMonster,
        initiative: 5,
      }

      expect(isTargetValid(cmd, state)).toBe(true)
    })

    it('returns true for non-ATTACK commands', () => {
      const cmd: CombatCommand = {
        id: 'cmd1',
        type: 'PARRY',
        actor: createTestCharacter(),
        initiative: 5,
      }

      expect(isTargetValid(cmd, {} as CombatState)).toBe(true)
    })

    it('returns false when target group does not exist', () => {
      const state = createTestCombatState({
        monsterGroups: [], // No groups
      })
      const cmd: CombatCommand = {
        id: 'cmd1',
        type: 'ATTACK',
        actor: createTestCharacter(),
        targetGroupId: 'A', // Group A doesn't exist
        initiative: 5,
      }

      expect(isTargetValid(cmd, state)).toBe(false)
    })

    it('returns false when target monster not found in any group', () => {
      const missingMonster = createTestMonster({ id: 'missing', hp: 10, status: 'ALIVE' })
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [createTestMonster({ id: 'm1', hp: 10, status: 'ALIVE' })],
            formation: 'front',
            identified: true,
          },
        ],
      })
      const cmd: CombatCommand = {
        id: 'cmd1',
        type: 'ATTACK',
        actor: createTestCharacter(),
        target: missingMonster, // This monster isn't in any group
        initiative: 5,
      }

      expect(isTargetValid(cmd, state)).toBe(false)
    })

    it('returns true for ATTACK targeting character (monster attacking party)', () => {
      const char = createTestCharacter({ id: 'c1', hp: 10 })
      const monster = createTestMonster({ id: 'm1' })
      const state = createTestCombatState()
      const cmd: CombatCommand = {
        id: 'cmd1',
        type: 'ATTACK',
        actor: monster,
        target: char,
        initiative: 5,
      }

      // Character targets are assumed valid (handled elsewhere)
      expect(isTargetValid(cmd, state)).toBe(true)
    })
  })

  describe('checkCombatEnd', () => {
    it('returns victory when all monsters are dead', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [createTestMonster({ hp: 0, status: 'DEAD' })],
            formation: 'front',
            identified: false,
          },
        ],
      })
      const party = [createTestCharacter({ hp: 10 })]

      const result = checkCombatEnd(state, party, new Map())
      expect(result.victory).toBe(true)
      expect(result.defeat).toBe(false)
      expect(result.ended).toBe(true)
    })

    it('returns defeat when all characters are dead', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [createTestMonster({ hp: 10 })],
            formation: 'front',
            identified: false,
          },
        ],
      })
      const party = [createTestCharacter({ id: 'c1', hp: 0, status: CharacterStatus.DEAD })]

      const result = checkCombatEnd(state, party, new Map())
      expect(result.victory).toBe(false)
      expect(result.defeat).toBe(true)
      expect(result.ended).toBe(true)
    })

    it('returns not ended when both sides have alive combatants', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [createTestMonster({ hp: 10 })],
            formation: 'front',
            identified: false,
          },
        ],
      })
      const party = [createTestCharacter({ hp: 10 })]

      const result = checkCombatEnd(state, party, new Map())
      expect(result.ended).toBe(false)
      expect(result.victory).toBe(false)
      expect(result.defeat).toBe(false)
    })

    it('considers damagedCharacters map for defeat check', () => {
      const state = createTestCombatState({
        monsterGroups: [
          {
            id: 'A',
            monsters: [createTestMonster({ hp: 10 })],
            formation: 'front',
            identified: false,
          },
        ],
      })
      const char = createTestCharacter({ id: 'c1', hp: 10 })
      const party = [char]
      const damagedCharacters = new Map([
        ['c1', { ...char, hp: 0, status: CharacterStatus.DEAD }],
      ])

      const result = checkCombatEnd(state, party, damagedCharacters)
      expect(result.defeat).toBe(true)
    })
  })

  describe('buildAudit', () => {
    it('returns undefined when audit is disabled', () => {
      const auditCtx: AuditContext = {
        enabled: false,
        entries: [],
        skipReasonCounts: CombatRoundOrchestrator.createEmptySkipReasonCounts(),
      }

      const result = buildAudit(auditCtx, 1)
      expect(result).toBeUndefined()
    })

    it('builds audit summary when enabled', () => {
      const auditCtx: AuditContext = {
        enabled: true,
        entries: [
          {
            commandId: 'cmd1',
            actorId: 'c1',
            actorName: 'Fighter',
            actionType: 'ATTACK',
            initiative: 10,
            status: 'executed',
          },
          {
            commandId: 'cmd2',
            actorId: 'c2',
            actorName: 'Mage',
            actionType: 'ATTACK',
            initiative: 5,
            status: 'skipped',
            skipReason: 'DEAD',
          },
        ],
        skipReasonCounts: {
          ...CombatRoundOrchestrator.createEmptySkipReasonCounts(),
          DEAD: 1,
          NONE: 1,
        },
      }

      const result = buildAudit(auditCtx, 3)

      expect(result).toBeDefined()
      expect(result?.roundNumber).toBe(3)
      expect(result?.totalCommands).toBe(2)
      expect(result?.executedCount).toBe(1)
      expect(result?.skippedCount).toBe(1)
      expect(result?.skipReasonCounts.DEAD).toBe(1)
    })
  })

  describe('monsterGroupsChanged', () => {
    it('returns false for identical groups', () => {
      const groups: MonsterGroup[] = [
        {
          id: 'A',
          monsters: [createTestMonster({ hp: 10, status: 'ALIVE' })],
          formation: 'front',
          identified: false,
        },
      ]

      expect(CombatRoundOrchestrator.monsterGroupsChanged(groups, groups)).toBe(false)
    })

    it('returns true when monster HP changes', () => {
      const before: MonsterGroup[] = [
        {
          id: 'A',
          monsters: [createTestMonster({ id: 'm1', hp: 10 })],
          formation: 'front',
          identified: false,
        },
      ]
      const after: MonsterGroup[] = [
        {
          id: 'A',
          monsters: [createTestMonster({ id: 'm1', hp: 5 })],
          formation: 'front',
          identified: false,
        },
      ]

      expect(CombatRoundOrchestrator.monsterGroupsChanged(before, after)).toBe(true)
    })

    it('returns true when monster status changes', () => {
      const before: MonsterGroup[] = [
        {
          id: 'A',
          monsters: [createTestMonster({ id: 'm1', status: 'ALIVE' })],
          formation: 'front',
          identified: false,
        },
      ]
      const after: MonsterGroup[] = [
        {
          id: 'A',
          monsters: [createTestMonster({ id: 'm1', status: 'DEAD' })],
          formation: 'front',
          identified: false,
        },
      ]

      expect(CombatRoundOrchestrator.monsterGroupsChanged(before, after)).toBe(true)
    })

    it('returns true when group count changes', () => {
      const before: MonsterGroup[] = [
        { id: 'A', monsters: [], formation: 'front', identified: false },
        { id: 'B', monsters: [], formation: 'back', identified: false },
      ]
      const after: MonsterGroup[] = [
        { id: 'A', monsters: [], formation: 'front', identified: false },
      ]

      expect(CombatRoundOrchestrator.monsterGroupsChanged(before, after)).toBe(true)
    })
  })
})
