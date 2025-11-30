// src/services/__tests__/CombatService.statusRecovery.spec.ts
import { CombatService } from '../CombatService'
import { CombatState, MonsterGroup, MonsterInstance, CombatantStatus } from '@models/Combat'
import { RandomService } from '../RandomService'

/**
 * Tests for monster status effect recovery per round
 *
 * Recovery formulas from Wizardry 1 research (capped at 50%):
 * - Sleep: (20 × Level)% per round
 * - Fear: (10 × Level)% per round
 * - Paralysis: (7 × Level)% per round
 * - Silence: (10 × Level)% per round (bug-fixed from "never recovers")
 */

// Create minimal test monster
const createTestMonster = (overrides: Partial<MonsterInstance> = {}): MonsterInstance => ({
  id: 'monster-1',
  monsterId: 'kobold',
  name: 'Kobold',
  hp: 10,
  maxHp: 10,
  ac: 8,
  damage: [{ dice: '1d4', min: 1, max: 4 }],
  xp: 10,
  status: 'ALIVE' as CombatantStatus,
  level: 1,
  undead: false,
  ...overrides
})

// Create minimal combat state for testing
const createTestCombatState = (
  monsters: MonsterInstance[],
  statusEffects: Map<string, Set<string>> = new Map()
): CombatState => ({
  phase: 'player_input',
  round: 1,
  partyMembers: [],
  monsterGroups: [{
    id: 'group-1',
    templateId: 'kobold',
    monsters,
    range: 'melee',
    identified: true
  }],
  currentCharacterIndex: 0,
  pendingActions: [],
  combatLog: [],
  activeBuffs: new Map(),
  statusEffects,
  surpriseState: { partySurprised: false, monstersSurprised: false }
})

describe('CombatService.processMonsterStatusRecovery', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('ASLEEP recovery', () => {
    it('recovers sleeping monster when roll succeeds', () => {
      const monster = createTestMonster({ status: 'ASLEEP', level: 2 })
      const state = createTestCombatState([monster])

      // Level 2: 20 × 2 = 40% recovery chance
      // Queue roll < 0.4 to succeed
      RandomService.queueNextValues([0.3])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('ALIVE')
      expect(result.messages).toContain('Kobold recovers from asleep!')
    })

    it('keeps monster asleep when roll fails', () => {
      const monster = createTestMonster({ status: 'ASLEEP', level: 2 })
      const state = createTestCombatState([monster])

      // Level 2: 40% recovery chance
      // Queue roll > 0.4 to fail
      RandomService.queueNextValues([0.5])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('ASLEEP')
      expect(result.messages).toHaveLength(0)
    })

    it('caps recovery at 50% for high level monsters', () => {
      const monster = createTestMonster({ status: 'ASLEEP', level: 5 })
      const state = createTestCombatState([monster])

      // Level 5: 20 × 5 = 100%, capped to 50%
      // Roll 0.49 should succeed (< 50%)
      RandomService.queueNextValues([0.49])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('ALIVE')
    })
  })

  describe('PARALYZED recovery', () => {
    it('recovers paralyzed monster when roll succeeds', () => {
      const monster = createTestMonster({ status: 'PARALYZED', level: 5 })
      const state = createTestCombatState([monster])

      // Level 5: 7 × 5 = 35% recovery chance
      RandomService.queueNextValues([0.3])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('ALIVE')
      expect(result.messages).toContain('Kobold recovers from paralyzed!')
    })

    it('keeps monster paralyzed when roll fails', () => {
      const monster = createTestMonster({ status: 'PARALYZED', level: 5 })
      const state = createTestCombatState([monster])

      // Level 5: 35% recovery chance
      RandomService.queueNextValues([0.5])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('PARALYZED')
    })
  })

  describe('SILENCED recovery (bug-fixed)', () => {
    it('recovers silenced monster from statusEffects map', () => {
      const monster = createTestMonster({ level: 3 })
      const statusEffects = new Map<string, Set<string>>([
        ['monster-1', new Set(['SILENCED'])]
      ])
      const state = createTestCombatState([monster], statusEffects)

      // Level 3: 10 × 3 = 30% recovery chance
      RandomService.queueNextValues([0.2])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.statusEffects.has('monster-1')).toBe(false)
      expect(result.messages).toContain('Kobold recovers from silence!')
    })

    it('keeps SILENCED when roll fails', () => {
      const monster = createTestMonster({ level: 3 })
      const statusEffects = new Map<string, Set<string>>([
        ['monster-1', new Set(['SILENCED'])]
      ])
      const state = createTestCombatState([monster], statusEffects)

      // Level 3: 30% recovery chance, roll > 30% fails
      RandomService.queueNextValues([0.5])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.statusEffects.get('monster-1')?.has('SILENCED')).toBe(true)
    })
  })

  describe('BLIND recovery (uses FEAR formula)', () => {
    it('recovers blind monster using FEAR recovery rate', () => {
      const monster = createTestMonster({ level: 4 })
      const statusEffects = new Map<string, Set<string>>([
        ['monster-1', new Set(['BLIND'])]
      ])
      const state = createTestCombatState([monster], statusEffects)

      // Level 4: FEAR formula 10 × 4 = 40% recovery chance
      RandomService.queueNextValues([0.3])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.statusEffects.has('monster-1')).toBe(false)
      expect(result.messages).toContain('Kobold recovers from blindness!')
    })
  })

  describe('multiple monsters and effects', () => {
    it('processes recovery for each monster independently', () => {
      const monster1 = createTestMonster({ id: 'monster-1', name: 'Kobold A', status: 'ASLEEP', level: 2 })
      const monster2 = createTestMonster({ id: 'monster-2', name: 'Kobold B', status: 'ASLEEP', level: 2 })
      const state = createTestCombatState([monster1, monster2])

      // First monster recovers (0.3 < 40%), second doesn't (0.5 > 40%)
      RandomService.queueNextValues([0.3, 0.5])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('ALIVE')
      expect(result.newState.monsterGroups[0].monsters[1].status).toBe('ASLEEP')
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0]).toContain('Kobold A')
    })

    it('does not process ALIVE or DEAD monsters', () => {
      const aliveMonster = createTestMonster({ id: 'monster-1', status: 'ALIVE' })
      const deadMonster = createTestMonster({ id: 'monster-2', status: 'DEAD' })
      const state = createTestCombatState([aliveMonster, deadMonster])

      const result = CombatService.processMonsterStatusRecovery(state)

      // No changes, no messages
      expect(result.messages).toHaveLength(0)
      expect(result.newState.monsterGroups[0].monsters[0].status).toBe('ALIVE')
      expect(result.newState.monsterGroups[0].monsters[1].status).toBe('DEAD')
    })

    it('preserves other status effects when one recovers', () => {
      const monster = createTestMonster({ level: 5 })
      const statusEffects = new Map<string, Set<string>>([
        ['monster-1', new Set(['SILENCED', 'BLIND'])]
      ])
      const state = createTestCombatState([monster], statusEffects)

      // SILENCED recovers (0.4 < 50%), BLIND does not (0.6 > 50%)
      RandomService.queueNextValues([0.4, 0.6])

      const result = CombatService.processMonsterStatusRecovery(state)

      expect(result.newState.statusEffects.get('monster-1')?.has('SILENCED')).toBe(false)
      expect(result.newState.statusEffects.get('monster-1')?.has('BLIND')).toBe(true)
      expect(result.messages).toContain('Kobold recovers from silence!')
    })
  })
})
