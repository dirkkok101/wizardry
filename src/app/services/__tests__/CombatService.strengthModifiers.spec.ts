/**
 * CombatService Strength Modifier Integration Tests
 *
 * Tests that CombatService correctly uses authentic Wizardry 1 strength modifier tables
 * from StatModifierService instead of D&D-style (STR-10)/2 formula.
 *
 * Reference: Section 3 of Combat System Gap Closure Plan
 * STR 3: -15% hit, -3 damage
 * STR 4: -10% hit, -2 damage
 * STR 5: -5% hit, -1 damage
 * STR 6-15: 0% hit, 0 damage
 * STR 16: +5% hit, +1 damage
 * STR 17: +10% hit, +2 damage
 * STR 18: +15% hit, +3 damage
 */
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'

describe('CombatService - Strength Modifiers (Authentic Wizardry 1)', () => {
  describe('STR 3 (weakest) - Hit Modifier', () => {
    it('applies -15% hit probability modifier', () => {
      // Create character with STR 3
      const attacker = createTestCharacter({
        strength: 3,
        level: 5,
        class: 'Fighter'
      })
      const defender = createTestMonster({ ac: 5 })

      // Calculate hit chance
      const hitChance = CombatService.calculateHitChance(attacker, defender)

      // With STR 3, should get -15% penalty
      // Base calculation would be around 50-60%, minus 15% from STR modifier
      // The exact value depends on HitCalcMod, but we can verify it's lower than STR 10
      const attackerSTR10 = createTestCharacter({
        strength: 10,
        level: 5,
        class: 'Fighter'
      })
      const hitChanceSTR10 = CombatService.calculateHitChance(attackerSTR10, defender)

      expect(hitChance).toBeLessThan(hitChanceSTR10)
      // Should be approximately 15% lower
      expect(hitChanceSTR10 - hitChance).toBeCloseTo(15, 0)
    })
  })

  describe('STR 3 (weakest) - Damage Modifier', () => {
    it('applies -3 damage modifier', () => {
      const attacker = createTestCharacter({ strength: 3 })
      const defender = createTestMonster()

      // Queue values: hit roll (success), damage roll = max (1d2), crit roll (no crit)
      // For 1d2: 0.99 * 2 = 1.98 → floor = 1 → +1 = 2
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, defender)

      // Base damage 2 (max 1d2) - 3 (STR penalty) = -1, clamped to minimum 1
      expect(result.hit).toBe(true)
      expect(result.damage).toBe(1)
    })
  })

  describe('STR 16 (above average) - Hit Modifier', () => {
    it('applies +5% hit probability modifier', () => {
      const attacker = createTestCharacter({
        strength: 16,
        level: 5,
        class: 'Fighter'
      })
      const defender = createTestMonster({ ac: 5 })

      const hitChance = CombatService.calculateHitChance(attacker, defender)

      // Verify it's higher than STR 10 baseline
      const attackerSTR10 = createTestCharacter({
        strength: 10,
        level: 5,
        class: 'Fighter'
      })
      const hitChanceSTR10 = CombatService.calculateHitChance(attackerSTR10, defender)

      expect(hitChance).toBeGreaterThan(hitChanceSTR10)
      // Should be approximately 5% higher
      expect(hitChance - hitChanceSTR10).toBeCloseTo(5, 0)
    })
  })

  describe('STR 16 (above average) - Damage Modifier', () => {
    it('applies +1 damage modifier', () => {
      const attacker = createTestCharacter({ strength: 16 })
      const defender = createTestMonster()

      // Queue values: hit roll (success), damage roll = max (1d2), crit roll (no crit)
      // For 1d2: 0.99 * 2 = 1.98 → floor = 1 → +1 = 2
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, defender)

      // Base damage 2 (max 1d2) + 1 (STR bonus) = 3
      expect(result.hit).toBe(true)
      expect(result.damage).toBe(3)
    })
  })

  describe('STR 18 (maximum) - Hit Modifier', () => {
    it('applies +15% hit probability modifier', () => {
      const attacker = createTestCharacter({
        strength: 18,
        level: 5,
        class: 'Fighter'
      })
      const defender = createTestMonster({ ac: 5 })

      const hitChance = CombatService.calculateHitChance(attacker, defender)

      // Verify it's higher than STR 10 baseline
      const attackerSTR10 = createTestCharacter({
        strength: 10,
        level: 5,
        class: 'Fighter'
      })
      const hitChanceSTR10 = CombatService.calculateHitChance(attackerSTR10, defender)

      expect(hitChance).toBeGreaterThan(hitChanceSTR10)
      // Should be approximately 15% higher
      expect(hitChance - hitChanceSTR10).toBeCloseTo(15, 0)
    })
  })

  describe('STR 18 (maximum) - Damage Modifier', () => {
    it('applies +3 damage modifier', () => {
      const attacker = createTestCharacter({ strength: 18 })
      const defender = createTestMonster()

      // Queue values: hit roll (success), damage roll = max (1d2), crit roll (no crit)
      // For 1d2: 0.99 * 2 = 1.98 → floor = 1 → +1 = 2
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, defender)

      // Base damage 2 (max 1d2) + 3 (STR bonus) = 5
      expect(result.hit).toBe(true)
      expect(result.damage).toBe(5)
    })
  })

  describe('STR 10 (average) - Baseline', () => {
    it('applies 0% hit modifier and 0 damage modifier', () => {
      const attacker = createTestCharacter({ strength: 10 })
      const defender = createTestMonster()

      // Queue values: hit roll (success), damage roll = max (1d2), crit roll (no crit)
      // For 1d2: 0.99 * 2 = 1.98 → floor = 1 → +1 = 2
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, defender)

      // Base damage 2 (max 1d2) + 0 (no STR modifier) = 2
      expect(result.hit).toBe(true)
      expect(result.damage).toBe(2)
    })
  })

  describe('Edge cases', () => {
    it('enforces minimum damage of 1 even with negative STR modifier', () => {
      const attacker = createTestCharacter({ strength: 3 })
      const defender = createTestMonster()

      // Queue values: hit roll (success), damage roll = min (1d2), crit roll (no crit)
      // For 1d2: 0.01 * 2 = 0.02 → floor = 0 → +1 = 1
      RandomService.queueNextValues([0.1, 0.01, 0.99])

      const result = CombatService.resolveAttack(attacker, defender)

      // Base damage 1 (min 1d2) - 3 (STR penalty) = -2, clamped to minimum 1
      expect(result.hit).toBe(true)
      expect(result.damage).toBe(1)
    })
  })
})
