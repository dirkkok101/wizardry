import { CharacterCreationService } from '../CharacterCreationService'
import { Race } from '../../types/Race'

describe('CharacterCreationService', () => {
  describe('rollStats', () => {
    it('rolls 3d6 for each attribute', () => {
      const stats = CharacterCreationService.rollStats()

      // Each stat should be between 3-18 (3d6 range)
      expect(stats.strength).toBeGreaterThanOrEqual(3)
      expect(stats.strength).toBeLessThanOrEqual(18)
      expect(stats.intelligence).toBeGreaterThanOrEqual(3)
      expect(stats.intelligence).toBeLessThanOrEqual(18)
      expect(stats.piety).toBeGreaterThanOrEqual(3)
      expect(stats.piety).toBeLessThanOrEqual(18)
      expect(stats.vitality).toBeGreaterThanOrEqual(3)
      expect(stats.vitality).toBeLessThanOrEqual(18)
      expect(stats.agility).toBeGreaterThanOrEqual(3)
      expect(stats.agility).toBeLessThanOrEqual(18)
      expect(stats.luck).toBeGreaterThanOrEqual(3)
      expect(stats.luck).toBeLessThanOrEqual(18)
    })

    it('generates random bonus points (7-29)', () => {
      const stats = CharacterCreationService.rollStats()

      expect(stats.bonusPoints).toBeGreaterThanOrEqual(7)
      expect(stats.bonusPoints).toBeLessThanOrEqual(29)
    })
  })

  describe('applyRaceModifiers', () => {
    it('applies human modifiers (no changes)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.HUMAN)

      expect(result.strength).toBe(10)
      expect(result.intelligence).toBe(10)
      expect(result.piety).toBe(10)
      expect(result.vitality).toBe(10)
      expect(result.agility).toBe(10)
      expect(result.luck).toBe(10)
    })

    it('applies elf modifiers (-1 STR, +1 INT, +1 PIE, -2 VIT, +1 AGI)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.ELF)

      expect(result.strength).toBe(9)
      expect(result.intelligence).toBe(11)
      expect(result.piety).toBe(11)
      expect(result.vitality).toBe(8)
      expect(result.agility).toBe(11)
      expect(result.luck).toBe(10)
    })

    it('applies dwarf modifiers (+2 STR, +2 VIT, -1 AGI)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.DWARF)

      expect(result.strength).toBe(12)
      expect(result.intelligence).toBe(10)
      expect(result.piety).toBe(10)
      expect(result.vitality).toBe(12)
      expect(result.agility).toBe(9)
      expect(result.luck).toBe(10)
    })
  })

  describe('allocateBonusPoints', () => {
    it('adds bonus points to specified stat', () => {
      const stats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 5
      }

      const result = CharacterCreationService.allocateBonusPoints(stats, 'strength', 3)

      expect(result.strength).toBe(13)
      expect(result.bonusPoints).toBe(2)
    })

    it('throws error when not enough bonus points', () => {
      const stats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 2
      }

      expect(() => {
        CharacterCreationService.allocateBonusPoints(stats, 'strength', 5)
      }).toThrow('Not enough bonus points')
    })
  })
})
