import { ClassChangeService } from '../ClassChangeService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { Race } from '@models/Race'
import { RaceService } from '../RaceService'
import { RandomService } from '../RandomService'

describe('ClassChangeService', () => {
  describe('canChangeClass', () => {
    it('allows class change when requirements are met', () => {
      // Samurai requires: STR 15, INT 11, PIE 10, VIT 14, AGI 10, LUC 9
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        strength: 15,
        intelligence: 11,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 9
      })

      const result = ClassChangeService.canChangeClass(character, CharacterClass.SAMURAI)

      expect(result.allowed).toBe(true)
    })

    it('rejects class change when stat requirements not met', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        strength: 10, // Too low for Samurai (needs 15)
        intelligence: 11,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 9
      })

      const result = ClassChangeService.canChangeClass(character, CharacterClass.SAMURAI)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('STR')
    })

    it('rejects change to current class', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER
      })

      const result = ClassChangeService.canChangeClass(character, CharacterClass.FIGHTER)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Already')
    })
  })

  describe('changeClass', () => {
    it('resets level to 1', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 13,
        strength: 15,
        intelligence: 11,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 9
      })

      const result = ClassChangeService.changeClass(character, CharacterClass.SAMURAI)

      expect(result.success).toBe(true)
      expect(result.updatedCharacter!.level).toBe(1)
    })

    it('resets XP to 0', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        experience: 50000,
        strength: 15,
        intelligence: 11,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 9
      })

      const result = ClassChangeService.changeClass(character, CharacterClass.SAMURAI)

      expect(result.success).toBe(true)
      expect(result.updatedCharacter!.experience).toBe(0)
    })

    describe('age increase (authentic Wizardry 1)', () => {
      // Authentic formula: (1d3+3) years + 44 weeks = 252-356 weeks

      it('increases age by 4-6+ years (minimum: 1d3=1 → 4 years + 44 weeks = 252 weeks)', () => {
        const character = createTestCharacter({
          class: CharacterClass.MAGE,
          age: 20 * 52, // 20 years in weeks
          strength: 15,
          intelligence: 11,
          piety: 10,
          vitality: 14,
          agility: 10,
          luck: 9
        })

        // Queue d3 roll of 1 → 4 years + 44 weeks = 252 weeks
        RandomService.queueNextValues([0.01])  // d3=1

        const result = ClassChangeService.changeClass(character, CharacterClass.SAMURAI)

        expect(result.success).toBe(true)
        expect(result.ageIncrease).toBe(252)  // (1+3)*52 + 44 = 252
        expect(result.updatedCharacter!.age).toBe(20 * 52 + 252)
      })

      it('increases age by maximum (1d3=3 → 6 years + 44 weeks = 356 weeks)', () => {
        const character = createTestCharacter({
          class: CharacterClass.MAGE,
          age: 20 * 52,
          strength: 15,
          intelligence: 11,
          piety: 10,
          vitality: 14,
          agility: 10,
          luck: 9
        })

        // Queue d3 roll of 3 → 6 years + 44 weeks = 356 weeks
        RandomService.queueNextValues([0.99])  // d3=3

        const result = ClassChangeService.changeClass(character, CharacterClass.SAMURAI)

        expect(result.success).toBe(true)
        expect(result.ageIncrease).toBe(356)  // (3+3)*52 + 44 = 356
        expect(result.updatedCharacter!.age).toBe(20 * 52 + 356)
      })

      it('age increase is within authentic range (252-356 weeks)', () => {
        const character = createTestCharacter({
          class: CharacterClass.MAGE,
          age: 20 * 52,
          strength: 15,
          intelligence: 11,
          piety: 10,
          vitality: 14,
          agility: 10,
          luck: 9
        })

        const result = ClassChangeService.changeClass(character, CharacterClass.SAMURAI)

        expect(result.success).toBe(true)
        // Authentic range: (4-6 years × 52) + 44 = 252-356 weeks
        expect(result.ageIncrease).toBeGreaterThanOrEqual(252)
        expect(result.ageIncrease).toBeLessThanOrEqual(356)
      })
    })

    it('preserves maxLev for HP reroll system', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 10,
        maxLev: 10,
        strength: 15,
        intelligence: 11,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 9
      })

      const result = ClassChangeService.changeClass(character, CharacterClass.SAMURAI)

      expect(result.success).toBe(true)
      expect(result.updatedCharacter!.maxLev).toBe(10) // Preserved for HP reroll
    })

    it('preserves known spells', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        knownSpells: ['halito', 'katino', 'mogref'],
        strength: 15,
        intelligence: 11,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 9
      })

      const result = ClassChangeService.changeClass(character, CharacterClass.SAMURAI)

      expect(result.success).toBe(true)
      expect(result.updatedCharacter!.knownSpells).toEqual(['halito', 'katino', 'mogref'])
    })

    describe('stats reset to racial base (authentic Wizardry 1)', () => {
      // Authentic Wizardry 1 resets all stats to racial base on class change

      it('resets Human stats to racial base', () => {
        const character = createTestCharacter({
          race: Race.HUMAN,
          class: CharacterClass.MAGE,
          // High stats from leveling up
          strength: 18,
          intelligence: 18,
          piety: 15,
          vitality: 16,
          agility: 14,
          luck: 12
        })

        const result = ClassChangeService.changeClass(character, CharacterClass.FIGHTER)

        expect(result.success).toBe(true)
        // Human racial base stats from data/races/human.json
        const raceData = RaceService.getRaceData(Race.HUMAN)
        expect(result.updatedCharacter!.strength).toBe(raceData.baseStats.str) // 8
        expect(result.updatedCharacter!.intelligence).toBe(raceData.baseStats.int) // 8
        expect(result.updatedCharacter!.piety).toBe(raceData.baseStats.pie) // 5
        expect(result.updatedCharacter!.vitality).toBe(raceData.baseStats.vit) // 8
        expect(result.updatedCharacter!.agility).toBe(raceData.baseStats.agi) // 8
        expect(result.updatedCharacter!.luck).toBe(raceData.baseStats.luc) // 9
      })

      it('resets Elf stats to racial base', () => {
        const character = createTestCharacter({
          race: Race.ELF,
          class: CharacterClass.MAGE,
          strength: 18,
          intelligence: 18,
          piety: 15,
          vitality: 16,
          agility: 14,
          luck: 12
        })

        const result = ClassChangeService.changeClass(character, CharacterClass.FIGHTER)

        expect(result.success).toBe(true)
        const raceData = RaceService.getRaceData(Race.ELF)
        expect(result.updatedCharacter!.strength).toBe(raceData.baseStats.str)
        expect(result.updatedCharacter!.intelligence).toBe(raceData.baseStats.int)
        expect(result.updatedCharacter!.piety).toBe(raceData.baseStats.pie)
        expect(result.updatedCharacter!.vitality).toBe(raceData.baseStats.vit)
        expect(result.updatedCharacter!.agility).toBe(raceData.baseStats.agi)
        expect(result.updatedCharacter!.luck).toBe(raceData.baseStats.luc)
      })

      it('resets Dwarf stats to racial base', () => {
        const character = createTestCharacter({
          race: Race.DWARF,
          class: CharacterClass.FIGHTER,
          alignment: 'NEUTRAL' as any, // Thief allows neutral alignment
          // Thief requires no stats (basic class)
          strength: 18,
          intelligence: 18,
          piety: 18,
          vitality: 18,
          agility: 18,
          luck: 18
        })

        const result = ClassChangeService.changeClass(character, CharacterClass.THIEF)

        expect(result.success).toBe(true)
        const raceData = RaceService.getRaceData(Race.DWARF)
        expect(result.updatedCharacter!.strength).toBe(raceData.baseStats.str)
        expect(result.updatedCharacter!.intelligence).toBe(raceData.baseStats.int)
        expect(result.updatedCharacter!.piety).toBe(raceData.baseStats.pie)
        expect(result.updatedCharacter!.vitality).toBe(raceData.baseStats.vit)
        expect(result.updatedCharacter!.agility).toBe(raceData.baseStats.agi)
        expect(result.updatedCharacter!.luck).toBe(raceData.baseStats.luc)
      })

      it('stats are no longer preserved after class change', () => {
        const character = createTestCharacter({
          race: Race.HUMAN,
          class: CharacterClass.MAGE,
          // Very high stats that should NOT be preserved
          strength: 18,
          intelligence: 18,
          piety: 18,
          vitality: 18,
          agility: 18,
          luck: 18
        })

        const result = ClassChangeService.changeClass(character, CharacterClass.FIGHTER)

        expect(result.success).toBe(true)
        // Human base stats are much lower than 18
        expect(result.updatedCharacter!.strength).toBeLessThan(18)
        expect(result.updatedCharacter!.intelligence).toBeLessThan(18)
        expect(result.updatedCharacter!.piety).toBeLessThan(18)
        expect(result.updatedCharacter!.vitality).toBeLessThan(18)
        expect(result.updatedCharacter!.agility).toBeLessThan(18)
        expect(result.updatedCharacter!.luck).toBeLessThan(18)
      })
    })
  })

  describe('getAvailableClasses', () => {
    it('returns classes character can change to (excludes current class)', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        alignment: 'GOOD' as any,
        // High stats to meet most requirements
        strength: 12,
        intelligence: 12,
        piety: 12,
        vitality: 12,
        agility: 12,
        luck: 12
      })

      const available = ClassChangeService.getAvailableClasses(character)

      // Should return some available classes
      expect(available.length).toBeGreaterThan(0)
      // Current class (Fighter) should NOT be in the list
      expect(available).not.toContain(CharacterClass.FIGHTER)
      // Mage and Priest should be available (GOOD alignment meets their requirements)
      expect(available).toContain(CharacterClass.MAGE)
      expect(available).toContain(CharacterClass.PRIEST)
      // Thief requires neutral/evil alignment so won't be available to GOOD character
      expect(available).not.toContain(CharacterClass.THIEF)
    })

    it('excludes classes with unmet stat requirements', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        // Minimum stats - won't meet elite class requirements
        strength: 11,  // Meets Fighter/Thief
        intelligence: 11,  // Meets Mage
        piety: 11,  // Meets Priest
        vitality: 10,
        agility: 10,
        luck: 10
      })

      const available = ClassChangeService.getAvailableClasses(character)

      // Elite classes require high stats (Samurai needs 15 STR, 14 VIT, etc.)
      expect(available).not.toContain(CharacterClass.SAMURAI)
      expect(available).not.toContain(CharacterClass.LORD)
      expect(available).not.toContain(CharacterClass.NINJA)
    })
  })
})
