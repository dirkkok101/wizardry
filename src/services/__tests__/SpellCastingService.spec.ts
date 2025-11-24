// src/services/__tests__/SpellCastingService.spec.ts
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster } from '../../test-helpers/test-factories'
import { CharacterStatus } from '../../types/CharacterStatus'

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
})
