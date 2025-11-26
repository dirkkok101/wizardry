import { LevelUpService } from '../LevelUpService'
import { RandomService } from '../RandomService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'

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

  describe('rollStatChanges', () => {
    it('returns stat changes object', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 20
      })

      const statChanges = LevelUpService.rollStatChanges(character)

      expect(statChanges).toBeDefined()
      expect(typeof statChanges).toBe('object')
    })

    it('changes stats by at most 1 point each (increase or decrease)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 50 // Middle age for balanced chances
      })

      const statChanges = LevelUpService.rollStatChanges(character)

      Object.values(statChanges).forEach(change => {
        expect(change).toBeLessThanOrEqual(1)
        expect(change).toBeGreaterThanOrEqual(-1)
      })
    })

    it('young characters (age 20) almost always gain stats', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 20, // Young: 130-20=110% capped to 95%
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      })

      // Queue values: all stats checked (below 75%), all rolls at 50 (below 95% threshold)
      // Format: 6 pairs of (check roll, change roll) for each stat
      RandomService.queueNextValues([
        0.5, 0.50, // STR: checked (50% < 75%), roll 50 < 95% = increase
        0.5, 0.50, // INT: checked, roll 50 < 95% = increase
        0.5, 0.50, // PIE: checked, roll 50 < 95% = increase
        0.5, 0.50, // VIT: checked, roll 50 < 95% = increase
        0.5, 0.50, // AGI: checked, roll 50 < 95% = increase
        0.5, 0.50  // LUC: checked, roll 50 < 95% = increase
      ])

      const statChanges = LevelUpService.rollStatChanges(character)

      // All stats should increase for young character with favorable rolls
      expect(statChanges.strength).toBe(1)
      expect(statChanges.intelligence).toBe(1)
      expect(statChanges.piety).toBe(1)
      expect(statChanges.vitality).toBe(1)
      expect(statChanges.agility).toBe(1)
      expect(statChanges.luck).toBe(1)
    })

    it('old characters (age 80) often lose stats', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 80, // Old: 130-80=50%
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      })

      // Queue values: all stats checked (below 75%), all rolls at 60 (above 50% threshold)
      RandomService.queueNextValues([
        0.5, 0.60, // STR: checked, roll 60 > 50% = decrease
        0.5, 0.60, // INT: decrease
        0.5, 0.60, // PIE: decrease
        0.5, 0.60, // VIT: decrease
        0.5, 0.60, // AGI: decrease
        0.5, 0.60  // LUC: decrease
      ])

      const statChanges = LevelUpService.rollStatChanges(character)

      // All stats should decrease for old character with unfavorable rolls
      expect(statChanges.strength).toBe(-1)
      expect(statChanges.intelligence).toBe(-1)
      expect(statChanges.piety).toBe(-1)
      expect(statChanges.vitality).toBe(-1)
      expect(statChanges.agility).toBe(-1)
      expect(statChanges.luck).toBe(-1)
    })

    it('respects stat cap of 18 (no increase above 18)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 20,
        strength: 18 // Already at cap
      })

      // Queue favorable rolls for increase
      RandomService.queueNextValues([
        0.5, 0.10 // STR: checked, roll would increase but capped
      ])

      const statChanges = LevelUpService.rollStatChanges(character)

      // Strength shouldn't be in changes since it's already at max
      expect(statChanges.strength).toBeUndefined()
    })

    it('respects stat floor of 3 (no decrease below 3)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 90, // Very old
        strength: 3 // Already at floor
      })

      // Queue unfavorable rolls for decrease
      RandomService.queueNextValues([
        0.5, 0.95 // STR: checked, roll would decrease but floored
      ])

      const statChanges = LevelUpService.rollStatChanges(character)

      // Strength shouldn't be in changes since it's already at min
      expect(statChanges.strength).toBeUndefined()
    })

    it('75% chance each stat is checked for modification', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 30
      })

      // Queue value above 75% threshold - stat should NOT be checked
      RandomService.queueNextValues([0.80]) // 80% > 75%, not checked

      const statChanges = LevelUpService.rollStatChanges(character)

      // First stat (strength) should not be modified
      expect(statChanges.strength).toBeUndefined()
    })
  })

  describe('rollStatIncreases (deprecated)', () => {
    it('delegates to rollStatChanges for backwards compatibility', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        age: 30
      })

      const result = LevelUpService.rollStatIncreases(character)

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
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

    it('applies stat changes to character (age-based)', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        age: 20, // Young for better stat growth
        strength: 14,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 10
      })

      // Queue HP roll, then pairs for stat checks (check%, roll%)
      // Young character (age 20) has 95% threshold, so roll of 50% = increase
      RandomService.queueNextValues([
        0.5,       // HP roll
        0.5, 0.50, // STR: checked, increase
        0.5, 0.50, // INT: checked, increase
        0.5, 0.50, // PIE: checked, increase
        0.5, 0.50, // VIT: checked, increase
        0.5, 0.50, // AGI: checked, increase
        0.5, 0.50  // LUC: checked, increase
      ])

      const result = LevelUpService.performLevelUp(character)

      // All stats should increase for young character
      expect(result.updatedCharacter.strength).toBe(15)
      expect(result.updatedCharacter.intelligence).toBe(11)
      expect(result.levelUpData.statChanges.strength).toBe(1)
    })

    it('can decrease stats for old characters', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        age: 80, // Old: 130-80=50% threshold
        strength: 14
      })

      // Queue HP roll, then stat check with roll above 50% threshold
      RandomService.queueNextValues([
        0.5,       // HP roll
        0.5, 0.60  // STR: checked, roll 60 > 50% = decrease
      ])

      const result = LevelUpService.performLevelUp(character)

      // Strength should decrease
      expect(result.updatedCharacter.strength).toBe(13)
      expect(result.levelUpData.statChanges.strength).toBe(-1)
    })

    it('returns level up data for UI display', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        age: 30
      })

      const result = LevelUpService.performLevelUp(character)

      expect(result.levelUpData.newLevel).toBe(2)
      expect(result.levelUpData.hpIncrease).toBeGreaterThan(0)
      expect(result.levelUpData.statChanges).toBeDefined()
    })

    it('increases spell points for Mage on level up', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 5000,
        class: CharacterClass.MAGE,
        hp: 8,
        maxHp: 8,
        age: 20,
        spellPoints: {
          mage: {
            level1: { current: 2, max: 2 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const result = LevelUpService.performLevelUp(character)

      // Level 2 mage should have more level 1 spell points
      expect(result.updatedCharacter.spellPoints?.mage?.level1.max).toBeGreaterThan(2)
    })

    it('increases spell points for Priest on level up', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 5000,
        class: CharacterClass.PRIEST,
        hp: 10,
        maxHp: 10,
        age: 20,
        spellPoints: {
          priest: {
            level1: { current: 2, max: 2 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const result = LevelUpService.performLevelUp(character)

      // Level 2 priest should have more level 1 spell points
      expect(result.updatedCharacter.spellPoints?.priest?.level1.max).toBeGreaterThan(2)
    })

    it('unlocks spell level 2 points at character level 3', () => {
      const character = createTestCharacter({
        level: 2,
        experience: 10000,
        class: CharacterClass.MAGE,
        hp: 12,
        maxHp: 12,
        age: 20,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const result = LevelUpService.performLevelUp(character)

      // Level 3 mage should unlock spell level 2 points
      expect(result.updatedCharacter.spellPoints?.mage?.level2.max).toBeGreaterThan(0)
    })

    it('does not modify spell points for non-caster (Fighter)', () => {
      const character = createTestCharacter({
        level: 1,
        experience: 5000,
        class: CharacterClass.FIGHTER,
        hp: 15,
        maxHp: 15,
        age: 20
      })

      const result = LevelUpService.performLevelUp(character)

      // Fighter should have no spell points
      expect(result.updatedCharacter.spellPoints).toBeUndefined()
    })
  })

  describe('getXPRequirement - all classes', () => {
    it('calculates correct XP for all basic classes at level 2', () => {
      // Fighter (0.8 multiplier) - fastest to level
      expect(LevelUpService.getXPRequirement(2, CharacterClass.FIGHTER)).toBe(2262)
      // Thief (0.9 multiplier)
      expect(LevelUpService.getXPRequirement(2, CharacterClass.THIEF)).toBe(2545)
      // Priest (1.0 multiplier)
      expect(LevelUpService.getXPRequirement(2, CharacterClass.PRIEST)).toBe(2828)
      // Mage (1.2 multiplier) - slower
      expect(LevelUpService.getXPRequirement(2, CharacterClass.MAGE)).toBe(3394)
    })

    it('calculates correct XP for elite classes at level 2', () => {
      // Samurai (1.1 multiplier)
      expect(LevelUpService.getXPRequirement(2, CharacterClass.SAMURAI)).toBe(3111)
      // Lord (1.1 multiplier)
      expect(LevelUpService.getXPRequirement(2, CharacterClass.LORD)).toBe(3111)
      // Ninja (1.2 multiplier)
      expect(LevelUpService.getXPRequirement(2, CharacterClass.NINJA)).toBe(3394)
      // Bishop (1.3 multiplier) - slowest
      expect(LevelUpService.getXPRequirement(2, CharacterClass.BISHOP)).toBe(3676)
    })

    it('all classes can level up with sufficient XP', () => {
      const allClasses = [
        CharacterClass.FIGHTER,
        CharacterClass.THIEF,
        CharacterClass.PRIEST,
        CharacterClass.MAGE,
        CharacterClass.SAMURAI,
        CharacterClass.LORD,
        CharacterClass.NINJA,
        CharacterClass.BISHOP
      ]

      for (const charClass of allClasses) {
        const xpNeeded = LevelUpService.getXPRequirement(2, charClass)
        const character = createTestCharacter({
          level: 1,
          experience: xpNeeded,
          class: charClass
        })

        expect(LevelUpService.canLevelUp(character)).toBe(true)
      }
    })
  })
})
