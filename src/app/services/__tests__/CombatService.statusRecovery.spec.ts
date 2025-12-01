// src/services/__tests__/CombatService.statusRecovery.spec.ts
import { CombatService } from '../CombatService'
import { CombatState, MonsterGroup, MonsterInstance, CombatantStatus, CombatStatusEffect } from '@models/Combat'
import { RandomService } from '../RandomService'

/**
 * Tests for monster status effect recovery per round
 *
 * Per Apple II reference (Section 15: Status Effects):
 * Monster Recovery:
 * - ASLEEP: Level × 20% (max 50%)
 * - AFRAID: Level × 10% (max 50%)
 * - PARALYZED: Level × 7% (max 50%)
 * - SILENCED: NEVER recovers (MONTINO bug)
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
  statusEffects: Map<string, Set<CombatStatusEffect>> = new Map()
): CombatState => ({
  monsterGroups: [{
    id: 'A',
    monsters,
    formation: 'front',
    identified: true
  }],
  commandQueue: [],
  roundNumber: 1,
  combatLog: [],
  canFlee: true,
  dungeonLevel: 1,
  statusEffects,
  acModifiers: new Map(),
  statusDurations: new Map()
})

describe('CombatService.processMonsterStatusRecovery', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('ASLEEP recovery: Level × 20%, max 50%', () => {
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

  describe('PARALYZED recovery: Level × 7%, max 50%', () => {
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

  describe('SILENCED recovery: NEVER recovers (MONTINO bug)', () => {
    it('silenced monsters never recover in combat', () => {
      const monster = createTestMonster({ level: 10 })
      const statusEffects = new Map<string, Set<CombatStatusEffect>>([
        ['monster-1', new Set(['SILENCED'] as CombatStatusEffect[])]
      ])
      const state = createTestCombatState([monster], statusEffects)

      // Even with lowest possible roll, should not recover
      // No random value needed since chance is 0%

      const result = CombatService.processMonsterStatusRecovery(state)

      // SILENCED should remain - never recovers per MONTINO bug
      expect(result.newState.statusEffects.get('monster-1')?.has('SILENCED')).toBe(true)
      expect(result.messages.some(m => m.includes('silence'))).toBe(false)
    })
  })

  describe('BLIND recovery: uses FEAR formula (Level × 10%, max 50%)', () => {
    it('recovers blind monster using FEAR recovery rate', () => {
      const monster = createTestMonster({ level: 4 })
      const statusEffects = new Map<string, Set<CombatStatusEffect>>([
        ['monster-1', new Set(['BLIND'] as CombatStatusEffect[])]
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

    it('preserves SILENCED when BLIND recovers (SILENCED never recovers)', () => {
      const monster = createTestMonster({ level: 5 })
      const statusEffects = new Map<string, Set<CombatStatusEffect>>([
        ['monster-1', new Set(['SILENCED', 'BLIND'] as CombatStatusEffect[])]
      ])
      const state = createTestCombatState([monster], statusEffects)

      // BLIND recovers (0.4 < 50%), SILENCED never recovers (0% chance)
      RandomService.queueNextValues([0.4])

      const result = CombatService.processMonsterStatusRecovery(state)

      // SILENCED remains (never recovers), BLIND recovers
      expect(result.newState.statusEffects.get('monster-1')?.has('SILENCED')).toBe(true)
      expect(result.newState.statusEffects.get('monster-1')?.has('BLIND')).toBe(false)
      expect(result.messages).toContain('Kobold recovers from blindness!')
    })
  })
})
