/**
 * Initiative Service Tests
 */

import { RandomService } from '@services/RandomService'
import {
  calculateInitiative,
  calculateCharacterInitiative,
  calculateMonsterInitiative,
  getAgilityModifier,
} from '../core/InitiativeService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'

describe('InitiativeService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('getAgilityModifier', () => {
    it('returns +2 for AGI 1-3 (slowest)', () => {
      expect(getAgilityModifier(1)).toBe(2)
      expect(getAgilityModifier(2)).toBe(2)
      expect(getAgilityModifier(3)).toBe(2)
    })

    it('returns +1 for AGI 4-5', () => {
      expect(getAgilityModifier(4)).toBe(1)
      expect(getAgilityModifier(5)).toBe(1)
    })

    it('returns 0 for AGI 6-7', () => {
      expect(getAgilityModifier(6)).toBe(0)
      expect(getAgilityModifier(7)).toBe(0)
    })

    it('returns -1 for AGI 8-14', () => {
      expect(getAgilityModifier(8)).toBe(-1)
      expect(getAgilityModifier(10)).toBe(-1)
      expect(getAgilityModifier(14)).toBe(-1)
    })

    it('returns -2 for AGI 15', () => {
      expect(getAgilityModifier(15)).toBe(-2)
    })

    it('returns -3 for AGI 16', () => {
      expect(getAgilityModifier(16)).toBe(-3)
    })

    it('returns -4 for AGI 17', () => {
      expect(getAgilityModifier(17)).toBe(-4)
    })

    it('returns -5 for AGI 18+ (fastest)', () => {
      expect(getAgilityModifier(18)).toBe(-5)
      expect(getAgilityModifier(20)).toBe(-5)
    })
  })

  describe('calculateCharacterInitiative', () => {
    it('returns value between 1 and 10', () => {
      // Queue specific random values
      RandomService.queueNextValues([0.5]) // Mid-range roll

      const result = calculateCharacterInitiative(10)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(10)
    })

    it('clamps result to minimum of 1', () => {
      // Queue low roll with high agility modifier
      RandomService.queueNextValues([0.0]) // Lowest roll = 1

      const result = calculateCharacterInitiative(18) // -5 modifier
      expect(result).toBe(1) // 1 + (-5) = -4, clamped to 1
    })

    it('clamps result to maximum of 10', () => {
      // Queue high roll with low agility modifier
      RandomService.queueNextValues([0.99]) // Highest roll = 10

      const result = calculateCharacterInitiative(3) // +2 modifier
      expect(result).toBe(10) // 10 + 2 = 12, clamped to 10
    })
  })

  describe('calculateMonsterInitiative', () => {
    it('returns value between 2 and 9', () => {
      // Test minimum (1d8 roll of 1, +1 = 2)
      RandomService.queueNextValues([0.0])
      expect(calculateMonsterInitiative()).toBe(2)

      // Test maximum (1d8 roll of 8, +1 = 9)
      RandomService.queueNextValues([0.99])
      expect(calculateMonsterInitiative()).toBe(9)
    })
  })

  describe('calculateInitiative', () => {
    it('uses character formula for characters', () => {
      RandomService.queueNextValues([0.5])

      const character = createTestCharacter({ agility: 15 })
      const result = calculateInitiative(character)

      // Should be in character range (1-10)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(10)
    })

    it('uses monster formula for monsters', () => {
      RandomService.queueNextValues([0.5])

      const monster = createTestMonster()
      const result = calculateInitiative(monster)

      // Should be in monster range (2-9)
      expect(result).toBeGreaterThanOrEqual(2)
      expect(result).toBeLessThanOrEqual(9)
    })
  })
})
