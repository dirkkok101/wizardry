import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('SpellCastingService - Level 1-2 Spells', () => {
  describe('PORFIC (Shield)', () => {
    it('applies -4 AC buff to single target', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level1: { current: 3, max: 3 } } }
      })
      const target = createTestCharacter({ id: 'target1' })

      const effect = SpellCastingService.resolveSpellEffect('porfic', caster, [target])

      expect(effect.acBuffs).toBeDefined()
      expect(effect.acBuffs).toHaveLength(1)
      expect(effect.acBuffs![0].target).toBe('target1')
      expect(effect.acBuffs![0].acModifier).toBe(-4)
      expect(effect.message).toContain('PORFIC')
    })
  })

  describe('MELITO (Sparks)', () => {
    it('deals 1d8 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        createTestCharacter({ id: 't2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('melito', caster, targets)

      expect(effect.damage).toBeDefined()
      expect(effect.damage).toHaveLength(2)
      expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
      expect(effect.damage![0]).toBeLessThanOrEqual(8)
    })
  })

  describe('SOPIC (Invisibility)', () => {
    it('applies INVISIBLE status to single target', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const target = createTestCharacter({ id: 'target1' })

      const effect = SpellCastingService.resolveSpellEffect('sopic', caster, [target])

      expect(effect.statusEffects).toBeDefined()
      expect(effect.statusEffects![0].effect).toBe('INVISIBLE')
    })
  })

  describe('MATU (Bless)', () => {
    it('applies -2 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level2: { current: 2, max: 2 } } }
      })
      const allies = [
        createTestCharacter({ id: 'a1' }),
        createTestCharacter({ id: 'a2' }),
        createTestCharacter({ id: 'a3' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('matu', caster, allies)

      expect(effect.acBuffs).toHaveLength(3)
      expect(effect.acBuffs![0].acModifier).toBe(-2)
    })
  })
})
