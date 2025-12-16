/**
 * TrapInspectionService Tests
 *
 * Tests for trap inspection mechanics and formula calculations.
 */

import { TrapInspectionService } from '../TrapInspectionService'
import { TrapDisarmService } from '../TrapDisarmService'
import { RandomService } from '../../RandomService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Chest, RewardTier } from '@models/Chest'
import { loadTrapsWithResistanceForTests } from '@testing/test-data-loader'

// Load trap data with class data (needed for trap effects and resistance checks)
beforeAll(async () => {
  await loadTrapsWithResistanceForTests()
})

// Helper to create a test chest
function createTestChest(overrides: Partial<Chest> = {}): Chest {
  return {
    id: 'test-chest',
    trapped: true,
    trapId: 'POISON_NEEDLE',
    trapIdentified: false,
    trapDisarmed: false,
    rewardTier: 10 as RewardTier,
    contents: { gold: 100, items: [] },
    sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
    mazeLevel: 1,
    source: 'combat_victory',
    ...overrides
  }
}

describe('TrapInspectionService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateInspectChance', () => {
    it('should calculate 95% for Thief with AGI 16+', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      expect(TrapInspectionService.calculateInspectChance(thief)).toBe(95)
    })

    it('should calculate 95% for Thief with AGI 18 (capped)', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 18 })
      // 18 × 6 = 108, capped at 95
      expect(TrapInspectionService.calculateInspectChance(thief)).toBe(95)
    })

    it('should calculate 72% for Ninja with AGI 18', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, agility: 18 })
      // 18 × 4 = 72
      expect(TrapInspectionService.calculateInspectChance(ninja)).toBe(72)
    })

    it('should calculate 60% for Thief with AGI 10', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 10 })
      // 10 × 6 = 60
      expect(TrapInspectionService.calculateInspectChance(thief)).toBe(60)
    })

    it('should calculate 12% for Fighter with AGI 12', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 12 })
      // 12 × 1 = 12
      expect(TrapInspectionService.calculateInspectChance(fighter)).toBe(12)
    })

    it('should calculate 10% for Mage with AGI 10', () => {
      const mage = createTestCharacter({ class: CharacterClass.MAGE, agility: 10 })
      // 10 × 1 = 10
      expect(TrapInspectionService.calculateInspectChance(mage)).toBe(10)
    })

    it('should use multiplier 1 for Priest', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST, agility: 15 })
      // 15 × 1 = 15
      expect(TrapInspectionService.calculateInspectChance(priest)).toBe(15)
    })

    it('should use multiplier 1 for Bishop', () => {
      const bishop = createTestCharacter({ class: CharacterClass.BISHOP, agility: 14 })
      // 14 × 1 = 14
      expect(TrapInspectionService.calculateInspectChance(bishop)).toBe(14)
    })
  })

  describe('attemptInspection', () => {
    it('should succeed when roll is under inspect chance', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const chest = createTestChest()

      // Queue values: first for critical failure check (> 2 = no crit), second for inspect (< 95 = success)
      RandomService.queueNextValues([0.5, 0.5])

      const result = TrapInspectionService.attemptInspection(thief, chest)

      expect(result.success).toBe(true)
      expect(result.trapIdentified).toBe('POISON_NEEDLE')
      expect(result.triggered).toBe(false)
    })

    it('should return random trap name on failed inspection (deception mechanic)', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 18 })
      const chest = createTestChest({ trapId: 'POISON_NEEDLE' })

      // Queue values: crit check pass, inspection fail, AGI trigger check pass (roll < AGI), random trap pick
      RandomService.queueNextValues([0.5, 0.99, 0.1, 0.3])

      const result = TrapInspectionService.attemptInspection(fighter, chest)

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(false)
      // Should return SOME trap name (deception - could be correct by chance)
      expect(result.trapIdentified).not.toBeNull()
    })

    it('should trigger trap if AGI check fails on failed inspection', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 5 })
      const chest = createTestChest()

      // Queue values: crit check pass, inspection fail, AGI trigger check fail (roll >= 5)
      // AGI check: RandomService.random(0, 19) - if result >= AGI, trap triggers
      RandomService.queueNextValues([0.5, 0.99])  // crit pass, inspect fail
      RandomService.queueNextValues([0.5])  // 0.5 * 20 = 10 >= 5 = fail AGI check

      const result = TrapInspectionService.attemptInspection(fighter, chest)

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(true)
      expect(result.trapIdentified).toBeNull()
    })

    it('should trigger trap on critical failure (1-2%)', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const chest = createTestChest()

      // Queue value for critical failure check (< 2% = critical failure)
      RandomService.queueNextValues([0.01])

      const result = TrapInspectionService.attemptInspection(thief, chest)

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(true)
    })

    it('should not trigger on untrapped chest even with critical failure', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const chest = createTestChest({ trapped: false, trapId: null })

      // Queue value for critical failure check
      RandomService.queueNextValues([0.01])

      const result = TrapInspectionService.attemptInspection(thief, chest)

      expect(result.triggered).toBe(false)
    })

    it('should return random trap on failed inspection of untrapped chest', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 10 })
      const chest = createTestChest({ trapped: false, trapId: null })

      // Queue: crit pass, inspect fail, random trap selection
      RandomService.queueNextValues([0.5, 0.99, 0.3])

      const result = TrapInspectionService.attemptInspection(fighter, chest)

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(false)
      // Deception: even untrapped chest returns random trap name on failed inspect!
      expect(result.trapIdentified).not.toBeNull()
    })
  })

  describe('getRecommendedHandler', () => {
    it('should recommend Thief over Fighter', () => {
      const fighter = createTestCharacter({
        id: 'fighter',
        class: CharacterClass.FIGHTER,
        agility: 12,
        level: 5
      })
      const thief = createTestCharacter({
        id: 'thief',
        class: CharacterClass.THIEF,
        agility: 16,
        level: 3
      })

      const result = TrapInspectionService.getRecommendedHandler(
        [fighter, thief],
        1,
        TrapDisarmService.calculateDisarmChance
      )

      expect(result?.character.id).toBe('thief')
    })

    it('should skip dead characters', () => {
      const deadThief = createTestCharacter({
        id: 'thief',
        class: CharacterClass.THIEF,
        agility: 18,
        status: CharacterStatus.DEAD
      })
      const fighter = createTestCharacter({
        id: 'fighter',
        class: CharacterClass.FIGHTER,
        agility: 12,
        level: 5
      })

      const result = TrapInspectionService.getRecommendedHandler(
        [deadThief, fighter],
        1,
        TrapDisarmService.calculateDisarmChance
      )

      expect(result?.character.id).toBe('fighter')
    })

    it('should return null for empty party', () => {
      const result = TrapInspectionService.getRecommendedHandler(
        [],
        1,
        TrapDisarmService.calculateDisarmChance
      )
      expect(result).toBeNull()
    })

    it('should return null if all party members are incapacitated', () => {
      const dead = createTestCharacter({ id: 'dead', status: CharacterStatus.DEAD })
      const paralyzed = createTestCharacter({ id: 'paralyzed', status: CharacterStatus.PARALYZED })

      const result = TrapInspectionService.getRecommendedHandler(
        [dead, paralyzed],
        1,
        TrapDisarmService.calculateDisarmChance
      )

      expect(result).toBeNull()
    })
  })
})
