// src/app/services/__tests__/CombatService.audit.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'
import { CombatCommand, MonsterGroup } from '@models/Combat'

describe('CombatService Audit', () => {
  beforeEach(() => {
    // Audit is always enabled now (data generation, not logging)
    CombatService.DEBUG_COMBAT = false  // Don't spam console in tests
    RandomService.resetSeed()
  })

  describe('executeRoundWithEvents audit', () => {
    it('returns audit with all queued actions in initiative order', () => {
      const fighter = createTestCharacter({ id: 'f1', name: 'Fighter', hp: 20 })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold' })

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      // Queue commands with different initiatives
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      fighterCmd.initiative = 5
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)
      monsterCmd.initiative = 8
      state.commandQueue = [fighterCmd, monsterCmd]

      // Queue values for attack rolls
      RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5])

      const result = CombatService.executeRoundWithEvents(state, [fighter], ['f1'])

      expect(result.audit).toBeDefined()
      expect(result.audit!.roundNumber).toBe(1)
      expect(result.audit!.actions).toHaveLength(2)
      // Monster acts first (higher initiative)
      expect(result.audit!.actions[0].actorName).toBe('Kobold')
      expect(result.audit!.actions[1].actorName).toBe('Fighter')
      expect(result.audit!.summary.totalActions).toBe(2)
    })

    it('marks actions as skipped with DIED_BEFORE_TURN when character dies mid-round', () => {
      // Fighter is slow (initiative 1), monster is fast (initiative 10)
      // Monster kills fighter before fighter's turn
      const fighter = createTestCharacter({ id: 'f1', name: 'Fighter', hp: 1 }) // Low HP
      const monster = createTestMonster({ id: 'm1', name: 'Kobold', hp: 100 })

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      // Fighter has low initiative, monster has high
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      fighterCmd.initiative = 1  // Slowest
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)
      monsterCmd.initiative = 10  // Fastest
      state.commandQueue = [fighterCmd, monsterCmd]

      // Monster hits and kills fighter
      RandomService.queueNextValues([0.1, 0.9])  // Hit, high damage

      const result = CombatService.executeRoundWithEvents(state, [fighter], ['f1'])

      const fighterEntry = result.audit!.actions.find(a => a.actorId === 'f1')
      expect(fighterEntry?.status).toBe('skipped')
      expect(fighterEntry?.skipReason).toBe('DIED_BEFORE_TURN')
    })

    it('marks actions as skipped with ASLEEP when character is asleep', () => {
      const sleeper = createTestCharacter({
        id: 'f1',
        name: 'Sleeper',
        hp: 20,
        status: CharacterStatus.ASLEEP
      })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold' })

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      const sleeperCmd = CombatService.createCommand(sleeper, 'ATTACK', monster)
      state.commandQueue = [sleeperCmd]

      const result = CombatService.executeRoundWithEvents(state, [sleeper], ['f1'])

      const sleeperEntry = result.audit!.actions.find(a => a.actorId === 'f1')
      expect(sleeperEntry?.status).toBe('skipped')
      expect(sleeperEntry?.skipReason).toBe('ASLEEP')
    })

    it('marks actions as skipped with PARALYZED when character is paralyzed', () => {
      const paralyzed = createTestCharacter({
        id: 'f1',
        name: 'Paralyzed',
        hp: 20,
        status: CharacterStatus.PARALYZED
      })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold' })

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      const paralyzedCmd = CombatService.createCommand(paralyzed, 'ATTACK', monster)
      state.commandQueue = [paralyzedCmd]

      const result = CombatService.executeRoundWithEvents(state, [paralyzed], ['f1'])

      const paralyzedEntry = result.audit!.actions.find(a => a.actorId === 'f1')
      expect(paralyzedEntry?.status).toBe('skipped')
      expect(paralyzedEntry?.skipReason).toBe('PARALYZED')
    })

    it('marks spell actions as skipped with SILENCED when character is silenced', () => {
      const mage = createTestCharacter({ id: 'f1', name: 'Mage', hp: 20 })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold' })

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup],
        // Add silenced status effect
        statusEffects: new Map([['f1', new Set(['SILENCED'] as const)]])
      })

      const mageCmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, {
        spellId: 'halito',
        groupId: 'A'
      })
      state.commandQueue = [mageCmd]

      const result = CombatService.executeRoundWithEvents(state, [mage], ['f1'])

      const mageEntry = result.audit!.actions.find(a => a.actorId === 'f1')
      expect(mageEntry?.status).toBe('skipped')
      expect(mageEntry?.skipReason).toBe('SILENCED')
    })

    it('includes spell details in audit entry for CAST_SPELL actions', () => {
      const mage = createTestCharacter({ id: 'f1', name: 'Mage', hp: 20 })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold' })

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      const mageCmd = CombatService.createCommand(mage, 'CAST_SPELL', monster, {
        spellId: 'mahalito',
        groupId: 'A'
      })
      state.commandQueue = [mageCmd]

      // Queue values for spell resolution
      RandomService.queueNextValues([0.5, 0.5, 0.5])

      const result = CombatService.executeRoundWithEvents(state, [mage], ['f1'])

      const mageEntry = result.audit!.actions.find(a => a.actorId === 'f1')
      expect(mageEntry?.details).toContain('mahalito')
    })

    it('calculates correct summary statistics', () => {
      const fighter = createTestCharacter({ id: 'f1', name: 'Fighter', hp: 20 })
      const sleeper = createTestCharacter({
        id: 'f2',
        name: 'Sleeper',
        hp: 20,
        status: CharacterStatus.ASLEEP
      })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold' })

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      const sleeperCmd = CombatService.createCommand(sleeper, 'ATTACK', monster)
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)
      state.commandQueue = [fighterCmd, sleeperCmd, monsterCmd]

      RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5])

      const result = CombatService.executeRoundWithEvents(state, [fighter, sleeper], ['f1', 'f2'])

      expect(result.audit!.summary.totalActions).toBe(3)
      expect(result.audit!.summary.executed).toBe(2)  // Fighter + Monster
      expect(result.audit!.summary.skipped).toBe(1)   // Sleeper
      expect(result.audit!.summary.skipReasons.ASLEEP).toBe(1)
    })

    it('marks monster actions as skipped when monster dies mid-round', () => {
      // Fighter is fast, monster is slow
      const fighter = createTestCharacter({ id: 'f1', name: 'Fighter', hp: 50 })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold', hp: 1 }) // Low HP

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      fighterCmd.initiative = 10  // Fastest
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)
      monsterCmd.initiative = 1   // Slowest
      state.commandQueue = [fighterCmd, monsterCmd]

      // Fighter hits and kills monster
      RandomService.queueNextValues([0.1, 0.9])

      const result = CombatService.executeRoundWithEvents(state, [fighter], ['f1'])

      const monsterEntry = result.audit!.actions.find(a => a.actorId === 'm1')
      expect(monsterEntry?.status).toBe('skipped')
      expect(monsterEntry?.skipReason).toBe('DIED_BEFORE_TURN')
    })

    it('marks actions as skipped with TARGET_DEAD when attack target dies before action', () => {
      // Two fighters attack same monster, first kills it, second should skip with TARGET_DEAD
      const fighter1 = createTestCharacter({ id: 'f1', name: 'FastFighter', hp: 50 })
      const fighter2 = createTestCharacter({ id: 'f2', name: 'SlowFighter', hp: 50 })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold', hp: 1 }) // Low HP

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      // Both fighters attack the same monster
      const fighter1Cmd = CombatService.createCommand(fighter1, 'ATTACK', monster)
      fighter1Cmd.initiative = 10  // Fastest
      const fighter2Cmd = CombatService.createCommand(fighter2, 'ATTACK', monster)
      fighter2Cmd.initiative = 1   // Slowest

      state.commandQueue = [fighter1Cmd, fighter2Cmd]

      // Fighter1 hits and kills monster
      RandomService.queueNextValues([0.1, 0.9])

      const result = CombatService.executeRoundWithEvents(state, [fighter1, fighter2], ['f1', 'f2'])

      // Fighter1 should have executed
      const fighter1Entry = result.audit!.actions.find(a => a.actorId === 'f1')
      expect(fighter1Entry?.status).toBe('executed')

      // Fighter2 should be skipped with TARGET_DEAD
      const fighter2Entry = result.audit!.actions.find(a => a.actorId === 'f2')
      expect(fighter2Entry?.status).toBe('skipped')
      expect(fighter2Entry?.skipReason).toBe('TARGET_DEAD')
    })

    it('includes TARGET_DEAD in summary skip reasons', () => {
      const fighter1 = createTestCharacter({ id: 'f1', name: 'FastFighter', hp: 50 })
      const fighter2 = createTestCharacter({ id: 'f2', name: 'SlowFighter', hp: 50 })
      const monster = createTestMonster({ id: 'm1', name: 'Kobold', hp: 1 })

      const monsterGroup: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      const state = createTestCombatState({
        monsterGroups: [monsterGroup]
      })

      const fighter1Cmd = CombatService.createCommand(fighter1, 'ATTACK', monster)
      fighter1Cmd.initiative = 10
      const fighter2Cmd = CombatService.createCommand(fighter2, 'ATTACK', monster)
      fighter2Cmd.initiative = 1

      state.commandQueue = [fighter1Cmd, fighter2Cmd]

      RandomService.queueNextValues([0.1, 0.9])

      const result = CombatService.executeRoundWithEvents(state, [fighter1, fighter2], ['f1', 'f2'])

      expect(result.audit!.summary.skipReasons.TARGET_DEAD).toBe(1)
    })
  })
})
