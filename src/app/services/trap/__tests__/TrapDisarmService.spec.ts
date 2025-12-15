/**
 * TrapDisarmService Tests
 *
 * Tests for trap disarm mechanics matching original Wizardry 1 formulas.
 */

import { TrapDisarmService } from '../TrapDisarmService'
import { RandomService } from '../../RandomService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { Chest, RewardTier } from '@models/Chest'
import { loadTrapsWithResistanceForTests } from '@testing/test-data-loader'

// Load trap data with class data (needed for trap name lookup)
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

describe('TrapDisarmService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateDisarmChance', () => {
    it('should calculate 71% for Level 1 Thief on Maze Level 1', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1 })
      // (1 + 50 - 1) / 70 × 100 = 71.43%
      const chance = TrapDisarmService.calculateDisarmChance(thief, 1)
      expect(chance).toBeCloseTo(71.43, 1)
    })

    it('should calculate 84% for Level 10 Thief on Maze Level 1', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      // (10 + 50 - 1) / 70 × 100 = 84.29%
      const chance = TrapDisarmService.calculateDisarmChance(thief, 1)
      expect(chance).toBeCloseTo(84.29, 1)
    })

    it('should calculate 0% for Level 1 Fighter on Maze Level 1', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 1 })
      // (1 + 0 - 1) / 70 × 100 = 0%
      expect(TrapDisarmService.calculateDisarmChance(fighter, 1)).toBe(0)
    })

    it('should calculate ~71% for Level 51 Fighter (equals Level 1 Thief)', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 51 })
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1 })

      // Fighter: (51 + 0 - 1) / 70 = 71.43%
      // Thief: (1 + 50 - 1) / 70 = 71.43%
      const fighterChance = TrapDisarmService.calculateDisarmChance(fighter, 1)
      const thiefChance = TrapDisarmService.calculateDisarmChance(thief, 1)

      expect(fighterChance).toBeCloseTo(thiefChance, 1)
    })

    it('should reduce chance on higher maze levels', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1 })

      const chanceLevel1 = TrapDisarmService.calculateDisarmChance(thief, 1)
      const chanceLevel5 = TrapDisarmService.calculateDisarmChance(thief, 5)

      // Level 1: (1 + 50 - 1) / 70 = 71.43%
      // Level 5: (1 + 50 - 5) / 70 = 65.71%
      expect(chanceLevel1).toBeGreaterThan(chanceLevel5)
      expect(chanceLevel5).toBeCloseTo(65.71, 1)
    })

    it('should cap chance at 95%', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 50 })
      // (50 + 50 - 1) / 70 = 141% → capped at 95%
      expect(TrapDisarmService.calculateDisarmChance(thief, 1)).toBe(95)
    })

    it('should not go below 0%', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 1 })
      // (1 + 0 - 10) / 70 = -12.86% → capped at 0%
      expect(TrapDisarmService.calculateDisarmChance(fighter, 10)).toBe(0)
    })

    it('should give Ninja same +50 bonus as Thief', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 1 })
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1 })

      expect(TrapDisarmService.calculateDisarmChance(ninja, 1))
        .toBe(TrapDisarmService.calculateDisarmChance(thief, 1))
    })
  })

  describe('calculateTriggerAvoidance', () => {
    it('should calculate 90% for AGI 18', () => {
      const character = createTestCharacter({ agility: 18 })
      // 18 × 5 = 90%
      expect(TrapDisarmService.calculateTriggerAvoidance(character)).toBe(90)
    })

    it('should calculate 50% for AGI 10', () => {
      const character = createTestCharacter({ agility: 10 })
      // 10 × 5 = 50%
      expect(TrapDisarmService.calculateTriggerAvoidance(character)).toBe(50)
    })

    it('should calculate 15% for AGI 3', () => {
      const character = createTestCharacter({ agility: 3 })
      // 3 × 5 = 15%
      expect(TrapDisarmService.calculateTriggerAvoidance(character)).toBe(15)
    })
  })

  describe('calculateWrongNameTriggerChance', () => {
    it('should return ~99% trigger for level 10 character', () => {
      // Original formula: Level × 0.1% chance to NOT trigger
      // So trigger chance = 100 - (10 × 0.1) = 99%
      expect(TrapDisarmService.calculateWrongNameTriggerChance(10)).toBeCloseTo(99, 0)
    })

    it('should return ~95% trigger for level 50 character', () => {
      // 100 - (50 × 0.1) = 95%
      expect(TrapDisarmService.calculateWrongNameTriggerChance(50)).toBeCloseTo(95, 0)
    })

    it('should return ~99.9% trigger for level 1 character', () => {
      // 100 - (1 × 0.1) = 99.9%
      expect(TrapDisarmService.calculateWrongNameTriggerChance(1)).toBeCloseTo(99.9, 1)
    })

    it('should not go below 0%', () => {
      // Even at absurdly high level (1000+), cap at 0%
      expect(TrapDisarmService.calculateWrongNameTriggerChance(1000)).toBe(0)
    })
  })

  describe('attemptDisarm', () => {
    it('should succeed with correct trap name and successful roll', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      // Queue value for disarm roll (< 84% = success)
      RandomService.queueNextValues([0.5])

      const result = TrapDisarmService.attemptDisarm(thief, chest, 'POISON NEEDLE')

      expect(result.success).toBe(true)
      expect(result.triggered).toBe(false)
      expect(result.wrongName).toBe(false)
    })

    it('should almost always trigger with wrong trap name (99%+ chance)', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      // Level 10 = 99% trigger chance
      // Queue value > 1% avoid chance = trigger
      RandomService.queueNextValues([0.5])  // 50% > 1% = trigger

      const result = TrapDisarmService.attemptDisarm(thief, chest, 'WRONG TRAP')

      expect(result.success).toBe(false)
      expect(result.wrongName).toBe(true)
      expect(result.triggered).toBe(true)  // 50% < 99% trigger = trigger
    })

    it('should very rarely avoid trigger with wrong name (based on character level)', () => {
      // A level 1000 character would have 0% trigger chance (100 - 1000*0.1 = 0%)
      const godlike = createTestCharacter({ class: CharacterClass.THIEF, level: 1000 })
      const chest = createTestChest({ mazeLevel: 10 })

      // At level 1000, trigger chance is 0%, so any roll avoids
      RandomService.queueNextValues([0.5])

      const result = TrapDisarmService.attemptDisarm(godlike, chest, 'WRONG TRAP')

      expect(result.success).toBe(false)
      expect(result.wrongName).toBe(true)
      expect(result.triggered).toBe(false)  // 0% trigger = never triggers
    })

    it('should check AGI save on failed disarm', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1, agility: 18 })
      const chest = createTestChest({ mazeLevel: 1 })

      // Queue values: first for disarm (> 71% = fail), second for AGI save (< 90% = saved)
      RandomService.queueNextValues([0.99, 0.5])

      const result = TrapDisarmService.attemptDisarm(thief, chest, 'POISON NEEDLE')

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(false)  // Saved by AGI
    })

    it('should trigger if AGI save fails', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1, agility: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      // Queue values: first for disarm (> 71% = fail), second for AGI save (> 50% = not saved)
      RandomService.queueNextValues([0.99, 0.99])

      const result = TrapDisarmService.attemptDisarm(thief, chest, 'POISON NEEDLE')

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(true)  // AGI save failed
    })

    it('should accept trap name with different casing', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      RandomService.queueNextValues([0.5])

      const result = TrapDisarmService.attemptDisarm(thief, chest, 'poison needle')

      expect(result.wrongName).toBe(false)
    })

    it('should accept trap name without spaces', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      RandomService.queueNextValues([0.5])

      const result = TrapDisarmService.attemptDisarm(thief, chest, 'POISONNEEDLE')

      expect(result.wrongName).toBe(false)
    })
  })
})
