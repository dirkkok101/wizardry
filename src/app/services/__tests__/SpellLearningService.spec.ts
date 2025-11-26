import { SpellLearningService } from '../SpellLearningService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@types/CharacterClass'

// Note: Real spell data is loaded from data/spells/ via setup-jest.ts
// This follows the project philosophy: "No mocks for services - test with real data"

describe('SpellLearningService', () => {
  describe('isCaster', () => {
    it('returns true for Mage', () => {
      const character = createTestCharacter({ class: CharacterClass.MAGE })
      expect(SpellLearningService.isCaster(character)).toBe(true)
    })

    it('returns true for Priest', () => {
      const character = createTestCharacter({ class: CharacterClass.PRIEST })
      expect(SpellLearningService.isCaster(character)).toBe(true)
    })

    it('returns true for Bishop', () => {
      const character = createTestCharacter({ class: CharacterClass.BISHOP })
      expect(SpellLearningService.isCaster(character)).toBe(true)
    })

    it('returns false for Fighter', () => {
      const character = createTestCharacter({ class: CharacterClass.FIGHTER })
      expect(SpellLearningService.isCaster(character)).toBe(false)
    })
  })

  describe('getAvailableSpellLevel', () => {
    it('returns spell level 1 at character level 1 for Mage', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 1
      })

      const spellLevel = SpellLearningService.getAvailableSpellLevel(character)

      expect(spellLevel).toBe(1)
    })

    it('returns spell level 2 at character level 3 for Mage', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 3
      })

      const spellLevel = SpellLearningService.getAvailableSpellLevel(character)

      expect(spellLevel).toBe(2)
    })

    it('returns spell level 7 (max) at character level 13 for Mage', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 13
      })

      const spellLevel = SpellLearningService.getAvailableSpellLevel(character)

      expect(spellLevel).toBe(7)
    })

    it('returns 0 for non-caster', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 10
      })

      const spellLevel = SpellLearningService.getAvailableSpellLevel(character)

      expect(spellLevel).toBe(0)
    })
  })

  describe('learnNewSpells', () => {
    it('returns empty array for non-casters', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 5
      })

      const result = SpellLearningService.learnNewSpells(character, 4, 5)

      expect(result.newSpells).toEqual([])
      expect(result.updatedCharacter).toEqual(character)
    })

    it('learns new spell when reaching new spell level', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 2,
        knownSpells: []
      })

      // Level 2 → 3 unlocks spell level 2
      const result = SpellLearningService.learnNewSpells(character, 2, 3)

      expect(result.newSpells.length).toBeGreaterThan(0)
      expect(result.newSpells[0].level).toBe(2)
    })

    it('does not learn spells when not reaching new spell level', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 1,
        knownSpells: []
      })

      // Level 1 → 2 does not unlock new spell level (still level 1)
      const result = SpellLearningService.learnNewSpells(character, 1, 2)

      expect(result.newSpells).toEqual([])
    })

    it('adds learned spells to character', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 2,
        knownSpells: []
      })

      const result = SpellLearningService.learnNewSpells(character, 2, 3)

      expect(result.updatedCharacter.knownSpells.length).toBeGreaterThan(0)
      expect(result.updatedCharacter.knownSpells).toEqual(
        expect.arrayContaining(result.newSpells.map(s => s.id))
      )
    })

    it('does not duplicate already known spells', () => {
      const existingSpellId = 'MAKANITO' // Level 2 mage spell
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 2,
        knownSpells: [existingSpellId]
      })

      const result = SpellLearningService.learnNewSpells(character, 2, 3)

      // Count occurrences of existing spell
      const count = result.updatedCharacter.knownSpells.filter(id => id === existingSpellId).length
      expect(count).toBe(1)
    })
  })

  describe('learnInitialSpells', () => {
    it('returns empty array for non-casters', () => {
      const character = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 1,
        knownSpells: []
      })

      const result = SpellLearningService.learnInitialSpells(character)

      expect(result.newSpells).toEqual([])
      expect(result.updatedCharacter.knownSpells).toEqual([])
    })

    it('learns all level 1 mage spells for new Mage', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 1,
        knownSpells: []
      })

      const result = SpellLearningService.learnInitialSpells(character)

      // Should learn at least halito and katino (level 1 mage spells)
      expect(result.newSpells.length).toBeGreaterThan(0)
      expect(result.newSpells.every(s => s.level === 1)).toBe(true)
      expect(result.newSpells.every(s => s.type === 'MAGE')).toBe(true)
      expect(result.updatedCharacter.knownSpells.length).toBeGreaterThan(0)
    })

    it('learns all level 1 priest spells for new Priest', () => {
      const character = createTestCharacter({
        class: CharacterClass.PRIEST,
        level: 1,
        knownSpells: []
      })

      const result = SpellLearningService.learnInitialSpells(character)

      // Should learn level 1 priest spells (e.g., dios, kalki)
      expect(result.newSpells.length).toBeGreaterThan(0)
      expect(result.newSpells.every(s => s.level === 1)).toBe(true)
      expect(result.newSpells.every(s => s.type === 'PRIEST')).toBe(true)
      expect(result.updatedCharacter.knownSpells.length).toBeGreaterThan(0)
    })

    it('learns both mage and priest level 1 spells for new Bishop', () => {
      const character = createTestCharacter({
        class: CharacterClass.BISHOP,
        level: 1,
        knownSpells: []
      })

      const result = SpellLearningService.learnInitialSpells(character)

      // Bishop should learn both mage and priest spells
      const mageSpells = result.newSpells.filter(s => s.type === 'MAGE')
      const priestSpells = result.newSpells.filter(s => s.type === 'PRIEST')

      expect(mageSpells.length).toBeGreaterThan(0)
      expect(priestSpells.length).toBeGreaterThan(0)
      expect(result.newSpells.every(s => s.level === 1)).toBe(true)
    })

    it('does not duplicate already known spells', () => {
      const character = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 1,
        knownSpells: ['halito'] // Already knows halito
      })

      const result = SpellLearningService.learnInitialSpells(character)

      // Should still have halito but not duplicated
      const halitoCount = result.updatedCharacter.knownSpells.filter(id => id === 'halito').length
      expect(halitoCount).toBe(1)
    })
  })
})
