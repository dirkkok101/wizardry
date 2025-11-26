// src/services/__tests__/SpellCastingService.spec.ts
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'
import { CharacterStatus } from '@models/CharacterStatus'

// Note: Real spell data is loaded from data/spells/ via setup-jest.ts
// This follows the project philosophy: "No mocks for services - test with real data"

describe('SpellCastingService', () => {
  describe('canCastSpell', () => {
    it('allows casting with sufficient spell points', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')

      expect(result.canCast).toBe(true)
    })

    it('prevents casting with insufficient spell points', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 0, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')

      expect(result.canCast).toBe(false)
      expect(result.reason).toBe('Insufficient spell points')
    })

    it('prevents casting while asleep', () => {
      const caster = createTestCharacter({
        status: CharacterStatus.ASLEEP,
        spellPoints: {
          mage: {
            level1: { current: 9, max: 9 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')

      expect(result.canCast).toBe(false)
      expect(result.reason).toBe('Cannot cast while incapacitated')
    })
  })

  describe('deductSpellPoints', () => {
    it('deducts one point from correct spell level', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 5, max: 5 },
            level2: { current: 3, max: 3 },
            level3: { current: 2, max: 2 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const newCaster = SpellCastingService.deductSpellPoints(caster, 'halito')

      expect(newCaster.spellPoints!.mage!.level1.current).toBe(4)
      expect(newCaster.spellPoints!.mage!.level2.current).toBe(3)
    })

    it('returns new character object (immutable)', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 5, max: 5 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const newCaster = SpellCastingService.deductSpellPoints(caster, 'halito')

      expect(newCaster).not.toBe(caster)
      expect(newCaster.spellPoints).not.toBe(caster.spellPoints)
    })
  })

  describe('resolveSpellEffect', () => {
    it('calculates damage for offensive spell', () => {
      const caster = createTestCharacter({ level: 3 })
      const targets = [
        createTestMonster({ hp: 10 }),
        createTestMonster({ hp: 8 })
      ]

      const result = SpellCastingService.resolveSpellEffect('halito', caster, targets)

      expect(result.damage).toHaveLength(2)
      result.damage!.forEach(dmg => {
        expect(dmg).toBeGreaterThanOrEqual(1)
        expect(dmg).toBeLessThanOrEqual(8)
      })
      expect(result.message).toContain('HALITO')
    })
  })

  describe('getSpellsByContext', () => {
    it('returns combat spells for combat context', () => {
      // Create a mage with known spells including combat-only halito
      const mage = createTestCharacter({
        knownSpells: ['halito', 'dios', 'dumapic'],
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          },
          priest: {
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

      const combatSpells = SpellCastingService.getSpellsByContext(mage, 'combat')

      // Should include halito (combat-only), dios (all contexts), and dumapic (combat/dungeon)
      const spellIds = combatSpells.map(s => s.id)
      expect(spellIds).toContain('halito')
      expect(spellIds).toContain('dios')
      expect(spellIds).toContain('dumapic')
    })

    it('excludes combat-only spells from dungeon context', () => {
      const mage = createTestCharacter({
        knownSpells: ['halito', 'dios', 'dumapic'],
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          },
          priest: {
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

      const dungeonSpells = SpellCastingService.getSpellsByContext(mage, 'dungeon')

      // Should exclude halito (combat-only) but include dios (heals ally) and dumapic (utility)
      const spellIds = dungeonSpells.map(s => s.id)
      expect(spellIds).not.toContain('halito')
      expect(spellIds).toContain('dios')
      expect(spellIds).toContain('dumapic')
    })

    it('excludes group-target spells from dungeon context', () => {
      // Group-target spells target enemies which aren't available in dungeon context
      const mage = createTestCharacter({
        knownSpells: ['halito', 'katino'], // both target 'group' (enemy group)
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

      const dungeonSpells = SpellCastingService.getSpellsByContext(mage, 'dungeon')

      // Neither should appear - both are group-target combat spells
      const spellIds = dungeonSpells.map(s => s.id)
      expect(spellIds).not.toContain('halito')
      expect(spellIds).not.toContain('katino')
    })

    it('returns healing spells for town context', () => {
      const priest = createTestCharacter({
        knownSpells: ['dios', 'dial'],
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 3, max: 3 }, // dial is level 4
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      const townSpells = SpellCastingService.getSpellsByContext(priest, 'town')

      // Both are healing spells castable in town
      const spellIds = townSpells.map(s => s.id)
      expect(spellIds).toContain('dios')
      expect(spellIds).toContain('dial')
    })

    it('returns empty array when no spells match context', () => {
      // Character only knows combat spells
      const mage = createTestCharacter({
        knownSpells: ['halito'],
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

      const dungeonSpells = SpellCastingService.getSpellsByContext(mage, 'dungeon')

      expect(dungeonSpells).toHaveLength(0)
    })

    it('returns empty array when character has no spell points', () => {
      const fighter = createTestCharacter({
        knownSpells: ['dios']
        // No spellPoints
      })

      const spells = SpellCastingService.getSpellsByContext(fighter, 'dungeon')

      expect(spells).toHaveLength(0)
    })
  })

  describe('hasSpellsInContext', () => {
    it('returns true when character has spells for context', () => {
      const priest = createTestCharacter({
        knownSpells: ['dios'],
        spellPoints: {
          priest: {
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

      expect(SpellCastingService.hasSpellsInContext(priest, 'dungeon')).toBe(true)
      expect(SpellCastingService.hasSpellsInContext(priest, 'combat')).toBe(true)
      expect(SpellCastingService.hasSpellsInContext(priest, 'town')).toBe(true)
    })

    it('returns false when character has no spells for context', () => {
      const mage = createTestCharacter({
        knownSpells: ['halito'], // combat-only
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

      expect(SpellCastingService.hasSpellsInContext(mage, 'dungeon')).toBe(false)
      expect(SpellCastingService.hasSpellsInContext(mage, 'town')).toBe(false)
      expect(SpellCastingService.hasSpellsInContext(mage, 'combat')).toBe(true)
    })

    it('returns false when character has no spell points', () => {
      const fighter = createTestCharacter({
        knownSpells: ['dios']
        // No spellPoints
      })

      expect(SpellCastingService.hasSpellsInContext(fighter, 'dungeon')).toBe(false)
    })
  })
})
