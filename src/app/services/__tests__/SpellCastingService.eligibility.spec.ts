import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@types/CharacterClass'

// Note: Real spell data is loaded from data/spells/ via setup-jest.ts
// This follows the project philosophy: "No mocks for services - test with real data"

describe('SpellCastingService - Spell Eligibility', () => {
  describe('Mage spell eligibility', () => {
    it('Mage can cast mage spells when they have spell points', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 }
          }
        }
      })

      const result = SpellCastingService.canCastSpell(mage, 'dumapic')
      expect(result.canCast).toBe(true)
    })

    it('Fighter cannot cast mage spells', () => {
      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER
        // No spell points
      })

      const result = SpellCastingService.canCastSpell(fighter, 'dumapic')
      expect(result.canCast).toBe(false)
    })

    it('Priest cannot cast mage spells', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 }
          }
          // No mage spell points
        }
      })

      const result = SpellCastingService.canCastSpell(priest, 'dumapic')
      expect(result.canCast).toBe(false)
    })
  })

  describe('Priest spell eligibility', () => {
    it('Priest can cast priest spells when they have spell points', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 }
          }
        }
      })

      const result = SpellCastingService.canCastSpell(priest, 'dios')
      expect(result.canCast).toBe(true)
    })

    it('Fighter cannot cast priest spells', () => {
      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER
        // No spell points
      })

      const result = SpellCastingService.canCastSpell(fighter, 'dios')
      expect(result.canCast).toBe(false)
    })

    it('Mage cannot cast priest spells', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 }
          }
          // No priest spell points
        }
      })

      const result = SpellCastingService.canCastSpell(mage, 'dios')
      expect(result.canCast).toBe(false)
    })
  })

  describe('Spell level requirements', () => {
    it('Cannot cast level 2 spell with only level 1 spell points', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 }
            // No level2 spell points
          }
        }
      })

      const result = SpellCastingService.canCastSpell(mage, 'sopic')
      expect(result.canCast).toBe(false)
    })

    it('Cannot cast level 7 spell without level 7 spell points', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 1, max: 1 },
            level4: { current: 1, max: 1 },
            level5: { current: 1, max: 1 },
            level6: { current: 1, max: 1 }
            // No level7 spell points
          }
        }
      })

      const result = SpellCastingService.canCastSpell(mage, 'mahaman')
      expect(result.canCast).toBe(false)
    })

    it('Can cast level 7 spell with level 7 spell points', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        spellPoints: {
          mage: {
            level7: { current: 1, max: 1 }
          }
        }
      })

      const result = SpellCastingService.canCastSpell(mage, 'mahaman')
      expect(result.canCast).toBe(true)
    })
  })

  describe('Spell point deduction', () => {
    it('Deducting mage spell points only affects mage pool', () => {
      const character = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 }
          },
          priest: {
            level1: { current: 2, max: 2 }
          }
        }
      })

      const updated = SpellCastingService.deductSpellPoints(character, 'dumapic')
      expect(updated.spellPoints?.mage?.level1.current).toBe(2)
      expect(updated.spellPoints?.priest?.level1.current).toBe(2)  // Unchanged
    })

    it('Deducting priest spell points only affects priest pool', () => {
      const character = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 }
          },
          priest: {
            level1: { current: 2, max: 2 }
          }
        }
      })

      const updated = SpellCastingService.deductSpellPoints(character, 'dios')
      expect(updated.spellPoints?.priest?.level1.current).toBe(1)
      expect(updated.spellPoints?.mage?.level1.current).toBe(3)  // Unchanged
    })

    it('Deducting level 2 spell does not affect level 1 points', () => {
      const mage = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        }
      })

      const updated = SpellCastingService.deductSpellPoints(mage, 'sopic')
      expect(updated.spellPoints?.mage?.level2.current).toBe(1)
      expect(updated.spellPoints?.mage?.level1.current).toBe(3)  // Unchanged
    })
  })

  describe('getAvailableSpells', () => {
    it('Returns only mage spells for mage with mage spell points', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        },
        knownSpells: ['dumapic', 'sopic', 'kalki']  // Mix of mage and priest
      })

      const available = SpellCastingService.getAvailableSpells(mage)
      const spellIds = available.map(s => s.id)

      // Should include mage spells
      expect(spellIds).toContain('dumapic')
      expect(spellIds).toContain('sopic')

      // Should NOT include priest spell
      expect(spellIds).not.toContain('kalki')
    })

    it('Returns only priest spells for priest with priest spell points', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        },
        knownSpells: ['dios', 'porfic', 'dumapic']  // Mix of priest and mage
      })

      const available = SpellCastingService.getAvailableSpells(priest)
      const spellIds = available.map(s => s.id)

      // Should include priest spells
      expect(spellIds).toContain('dios')
      expect(spellIds).toContain('porfic')

      // Should NOT include mage spell
      expect(spellIds).not.toContain('dumapic')
    })

    it('Returns empty array for fighter with no spell points', () => {
      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        knownSpells: ['dumapic', 'dios']
      })

      const available = SpellCastingService.getAvailableSpells(fighter)
      expect(available).toHaveLength(0)
    })

    it('Only returns spells for levels with current spell points > 0', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        spellPoints: {
          mage: {
            level1: { current: 0, max: 3 },  // Exhausted
            level2: { current: 2, max: 2 }   // Available
          }
        },
        knownSpells: ['dumapic', 'sopic']
      })

      const available = SpellCastingService.getAvailableSpells(mage)
      const spellIds = available.map(s => s.id)

      // Should NOT include level 1 spell (no points)
      expect(spellIds).not.toContain('dumapic')

      // Should include level 2 spell (has points)
      expect(spellIds).toContain('sopic')
    })
  })

  describe('Spell metadata retrieval', () => {
    it('getSpell returns correct spell data for valid spell', () => {
      const spell = SpellCastingService.getSpell('dumapic')

      expect(spell).toBeDefined()
      expect(spell?.id).toBe('dumapic')
      expect(spell?.name).toBe('DUMAPIC')
      expect(spell?.level).toBe(1)
      expect(spell?.casterType).toBe('mage')
    })

    it('getSpell returns correct data for high-level spell', () => {
      const spell = SpellCastingService.getSpell('mahaman')

      expect(spell).toBeDefined()
      expect(spell?.id).toBe('mahaman')
      expect(spell?.name).toBe('MAHAMAN')
      expect(spell?.level).toBe(7)
      expect(spell?.casterType).toBe('mage')
      expect(spell?.transformation).toBe(true)
    })

    it('getSpell returns correct data for priest spell', () => {
      const spell = SpellCastingService.getSpell('maporfic')

      expect(spell).toBeDefined()
      expect(spell?.id).toBe('maporfic')
      expect(spell?.name).toBe('MAPORFIC')
      expect(spell?.level).toBe(4)
      expect(spell?.casterType).toBe('priest')
      expect(spell?.acModifier).toBe(-4)
    })
  })
})
