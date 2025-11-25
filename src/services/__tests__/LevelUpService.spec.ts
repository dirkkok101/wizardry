import { LevelUpService } from '../LevelUpService'
import { RandomService } from '../RandomService'
import { createTestCharacter } from '../../test-helpers/test-factories'
import { CharacterClass } from '../../types/CharacterClass'

describe('LevelUpService', () => {
  describe('getXPRequirement', () => {
    it('calculates XP requirement for Fighter level 2', () => {
      const xp = LevelUpService.getXPRequirement(2, CharacterClass.FIGHTER)

      // Fighters level fast: base 1000 * 2^1.5 * 0.8 ≈ 2262
      expect(xp).toBe(2262)
    })

    it('calculates XP requirement for Mage level 2', () => {
      const xp = LevelUpService.getXPRequirement(2, CharacterClass.MAGE)

      // Mages level slow: base 1000 * 2^1.5 * 1.2 ≈ 3394
      expect(xp).toBe(3394)
    })

    it('calculates increasing XP for higher levels', () => {
      const level2 = LevelUpService.getXPRequirement(2, CharacterClass.FIGHTER)
      const level3 = LevelUpService.getXPRequirement(3, CharacterClass.FIGHTER)
      const level4 = LevelUpService.getXPRequirement(4, CharacterClass.FIGHTER)

      expect(level3).toBeGreaterThan(level2)
      expect(level4).toBeGreaterThan(level3)
    })
  })

  describe('canLevelUp', () => {
    it('returns true when character has enough XP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER
      })

      const result = LevelUpService.canLevelUp(character)

      expect(result).toBe(true)
    })

    it('returns false when character lacks XP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 1000,
        class: CharacterClass.FIGHTER
      })

      const result = LevelUpService.canLevelUp(character)

      expect(result).toBe(false)
    })

    it('returns false when already at max level (13)', () => {
      const character = createTestCharacter({
        level: 13,
        experience: 999999,
        class: CharacterClass.FIGHTER
      })

      const result = LevelUpService.canLevelUp(character)

      expect(result).toBe(false)
    })
  })

  describe('rollHPIncrease', () => {
    it('rolls HP increase for Fighter (d10 hit die)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        vitality: 16 // +2 bonus
      })

      const hpIncrease = LevelUpService.rollHPIncrease(character)

      // d10 + 2 VIT bonus = 3-12 HP
      expect(hpIncrease).toBeGreaterThanOrEqual(3)
      expect(hpIncrease).toBeLessThanOrEqual(12)
    })

    it('rolls HP increase for Mage (d4 hit die)', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        vitality: 10 // +0 bonus
      })

      const hpIncrease = LevelUpService.rollHPIncrease(character)

      // d4 + 0 VIT bonus = 1-4 HP
      expect(hpIncrease).toBeGreaterThanOrEqual(1)
      expect(hpIncrease).toBeLessThanOrEqual(4)
    })

    it('guarantees minimum 1 HP even with negative VIT bonus', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        vitality: 3 // -3 bonus
      })

      const hpIncrease = LevelUpService.rollHPIncrease(character)

      expect(hpIncrease).toBeGreaterThanOrEqual(1)
    })

    it('applies maximum vitality bonus for VIT 18', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        vitality: 18 // +4 bonus
      })

      const hpIncrease = LevelUpService.rollHPIncrease(character)

      // d10 + 4 VIT bonus = 5-14
      expect(hpIncrease).toBeGreaterThanOrEqual(5)
      expect(hpIncrease).toBeLessThanOrEqual(14)
    })
  })

  describe('rollStatIncreases', () => {
    it('returns stat increases object', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER
      })

      const statIncreases = LevelUpService.rollStatIncreases(character)

      expect(statIncreases).toBeDefined()
      expect(typeof statIncreases).toBe('object')
      // Stats may or may not increase (random)
    })

    it('increases stats by at most 1 point each', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER
      })

      const statIncreases = LevelUpService.rollStatIncreases(character)

      Object.values(statIncreases).forEach(increase => {
        expect(increase).toBeLessThanOrEqual(1)
        expect(increase).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('performLevelUp', () => {
    it('increases character level by 1', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 10,
        maxHp: 10
      })

      const result = LevelUpService.performLevelUp(character)

      expect(result.updatedCharacter.level).toBe(2)
    })

    it('increases max HP by rolled amount', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        vitality: 16
      })

      const result = LevelUpService.performLevelUp(character)

      // d10 + 3 VIT (16 = +3) = 4-13 increase
      const hpIncrease = result.updatedCharacter.maxHp - 15
      expect(hpIncrease).toBeGreaterThanOrEqual(4)
      expect(hpIncrease).toBeLessThanOrEqual(13)
      expect(result.levelUpData.hpIncrease).toBe(hpIncrease)
    })

    it('sets HP to new max HP', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15
      })

      const result = LevelUpService.performLevelUp(character)

      expect(result.updatedCharacter.hp).toBe(result.updatedCharacter.maxHp)
    })

    it('applies stat increases to character', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        strength: 14
      })

      // Queue low values to guarantee stat increases (1% < 5% chance for each stat)
      // First value is for HP roll, then 6 values for stat rolls (STR, INT, PIE, VIT, AGI, LCK)
      RandomService.queueNextValues([0.5, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01])

      const result = LevelUpService.performLevelUp(character)

      // At least one stat should increase
      const statsIncreased = Object.keys(result.levelUpData.statIncreases).length
      expect(statsIncreased).toBeGreaterThan(0)
    })

    it('returns level up data for UI display', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15
      })

      const result = LevelUpService.performLevelUp(character)

      expect(result.levelUpData.newLevel).toBe(2)
      expect(result.levelUpData.hpIncrease).toBeGreaterThan(0)
      expect(result.levelUpData.statIncreases).toBeDefined()
    })
  })
})
