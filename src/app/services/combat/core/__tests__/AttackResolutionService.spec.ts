/**
 * Attack Resolution Service Tests
 *
 * Tests for hit resolution, damage calculation, and roll detail capture.
 */

import { RandomService } from '@services/RandomService'
import { StatModifierService } from '@services/StatModifierService'
import {
  resolveAttack,
  calculateCriticalChance,
  monsterResistsCritical,
} from '../AttackResolutionService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'

describe('AttackResolutionService', () => {
  beforeAll(async () => {
    await StatModifierService.initialize()
  })

  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('resolveAttack', () => {
    describe('roll details', () => {
      it('populates rollDetails on hit', () => {
        const attacker = createTestCharacter({ level: 5, strength: 14 })
        const defender = createTestMonster({ ac: 10, level: 3 }) // Easy to hit

        // Queue: hit roll (10%), damage die, crit roll (90% = no crit)
        RandomService.queueNextValues([0.10, 0.5, 0.90])

        const result = resolveAttack(attacker, defender)

        expect(result.hit).toBe(true)
        expect(result.rollDetails).toBeDefined()
        expect(result.rollDetails.hitChance).toBeGreaterThan(0)
        expect(result.rollDetails.hitRoll).toBeLessThan(result.rollDetails.hitChance)
        expect(result.rollDetails.critChance).toBe(10) // 5 * 2 = 10%
        expect(result.rollDetails.critRoll).toBeDefined()
      })

      it('populates rollDetails on miss', () => {
        const attacker = createTestCharacter({ level: 1, strength: 10 })
        const defender = createTestMonster({ ac: -10, level: 10 }) // Very hard to hit

        // Queue high roll (99%) to guarantee miss
        RandomService.queueNextValues([0.99])

        const result = resolveAttack(attacker, defender)

        expect(result.hit).toBe(false)
        expect(result.rollDetails).toBeDefined()
        expect(result.rollDetails.hitChance).toBeGreaterThan(0)
        expect(result.rollDetails.hitRoll).toBeGreaterThanOrEqual(result.rollDetails.hitChance)
        expect(result.rollDetails.damageBase).toBe(0) // No damage rolled on miss
        expect(result.rollDetails.critChance).toBe(2) // 1 * 2 = 2%
      })

      it('captures critical roll when crit triggers on monster', () => {
        const attacker = createTestCharacter({ level: 10, strength: 14 })
        const defender = createTestMonster({ ac: 10, level: 1 }) // Easy to hit, low level

        // Queue: hit roll (5% = hit), damage die, crit roll (5% = crit), monster resist (high = no resist)
        // Monster level 1, threshold 11. Roll > 11 means no resist.
        RandomService.queueNextValues([0.05, 0.5, 0.05, 30 / 35])

        const result = resolveAttack(attacker, defender)

        expect(result.hit).toBe(true)
        expect(result.critical).toBe(true)
        expect(result.instantKill).toBe(true)
        expect(result.rollDetails.critRoll).toBeDefined()
        expect(result.rollDetails.critRoll!).toBeLessThan(result.rollDetails.critChance)
        expect(result.rollDetails.monsterResistRoll).toBeDefined()
        expect(result.rollDetails.monsterResistThreshold).toBe(11) // level 1 + 10
      })

      it('captures monster resist roll when monster resists crit', () => {
        const attacker = createTestCharacter({ level: 10, strength: 14 })
        const defender = createTestMonster({ ac: 10, level: 10 }) // Level 10 monster

        // Queue: hit roll (5%), damage die, crit roll (5% = triggers), monster resist (low = resists)
        // Monster level 10, threshold 20. Roll 10 < 20 means resist.
        RandomService.queueNextValues([0.05, 0.5, 0.05, 10 / 35])

        const result = resolveAttack(attacker, defender)

        expect(result.hit).toBe(true)
        expect(result.critical).toBe(false) // Monster resisted
        expect(result.instantKill).toBe(false)
        expect(result.rollDetails.monsterResistRoll).toBe(10)
        expect(result.rollDetails.monsterResistThreshold).toBe(20) // level 10 + 10
      })

      it('includes STR damage modifier in rollDetails for high STR', () => {
        const attacker = createTestCharacter({ level: 5, strength: 18 }) // High STR
        const defender = createTestMonster({ ac: 10, level: 1 })

        // Queue: hit roll (5%), damage die, crit roll (90% = no crit)
        RandomService.queueNextValues([0.05, 0.5, 0.90])

        const result = resolveAttack(attacker, defender)

        expect(result.hit).toBe(true)
        expect(result.rollDetails.damageStrMod).toBeGreaterThan(0) // STR 18 gives bonus
      })
    })
  })

  describe('monsterResistsCritical', () => {
    // Note: random(0, 34) uses Math.floor(value * 35), so queue value/35 to get value
    it('returns roll and threshold in result', () => {
      RandomService.queueNextValues([15 / 35]) // Roll 15 out of 0-34

      const result = monsterResistsCritical(10) // Level 10 monster, threshold = 20

      expect(result.roll).toBe(15)
      expect(result.threshold).toBe(20)
      expect(result.resisted).toBe(true) // 20 >= 15
    })

    it('monster resists when threshold >= roll', () => {
      RandomService.queueNextValues([19 / 35]) // Roll 19, threshold 20

      const result = monsterResistsCritical(10)

      expect(result.resisted).toBe(true)
    })

    it('monster fails to resist when threshold < roll', () => {
      RandomService.queueNextValues([25 / 35]) // Roll 25, threshold 20

      const result = monsterResistsCritical(10)

      expect(result.resisted).toBe(false)
    })

    it('high level monsters always resist (threshold 34 >= any roll 0-34)', () => {
      RandomService.queueNextValues([34 / 35]) // Maximum roll

      const result = monsterResistsCritical(24) // Level 24, threshold = 34

      expect(result.threshold).toBe(34)
      expect(result.resisted).toBe(true)
    })
  })

  describe('calculateCriticalChance', () => {
    it('calculates 2% per level', () => {
      expect(calculateCriticalChance(1)).toBe(2)
      expect(calculateCriticalChance(5)).toBe(10)
      expect(calculateCriticalChance(10)).toBe(20)
    })

    it('caps at 50%', () => {
      expect(calculateCriticalChance(25)).toBe(50)
      expect(calculateCriticalChance(50)).toBe(50)
    })
  })
})
