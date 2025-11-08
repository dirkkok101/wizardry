// src/services/__tests__/SpellCastingService.spec.ts
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster } from '../../test-helpers/test-factories'
import { CharacterStatus } from '../../types/CharacterStatus'

describe('SpellCastingService', () => {
  describe('canCastSpell', () => {
    it('allows casting with sufficient spell points', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: [0, 3, 2, 0, 0, 0, 0],
          priest: [0, 0, 0, 0, 0, 0, 0]
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')

      expect(result.canCast).toBe(true)
    })

    it('prevents casting with insufficient spell points', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: [0, 0, 0, 0, 0, 0, 0],
          priest: [0, 0, 0, 0, 0, 0, 0]
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
          mage: [0, 9, 0, 0, 0, 0, 0],
          priest: [0, 0, 0, 0, 0, 0, 0]
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
          mage: [0, 5, 3, 2, 0, 0, 0],
          priest: [0, 0, 0, 0, 0, 0, 0]
        }
      })

      const newCaster = SpellCastingService.deductSpellPoints(caster, 'halito')

      expect(newCaster.spellPoints!.mage[1]).toBe(4)
      expect(newCaster.spellPoints!.mage[2]).toBe(3)
    })

    it('returns new character object (immutable)', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: [0, 5, 0, 0, 0, 0, 0],
          priest: [0, 0, 0, 0, 0, 0, 0]
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
