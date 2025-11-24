import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster } from '../../test-helpers/test-factories'

// Note: Real spell data is loaded from data/spells/ via setup-jest.ts
// This follows the project philosophy: "No mocks for services - test with real data"

describe('SpellCastingService - Edge Cases', () => {
  describe('Insufficient spell points', () => {
    it('returns error when casting spell with 0 spell points', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 0, max: 3 }
          }
        }
      })

      const result = SpellCastingService.canCastSpell(caster, 'dumapic')
      expect(result.canCast).toBe(false)
      expect(result.reason).toContain('spell points')
    })

    it('does not deduct spell points if character has none', () => {
      const caster = createTestCharacter({
        spellPoints: {
          priest: {
            level1: { current: 0, max: 3 }
          }
        }
      })

      const canCast = SpellCastingService.canCastSpell(caster, 'kalki')
      expect(canCast.canCast).toBe(false)

      // Verify deduct would not work
      const updatedCaster = SpellCastingService.deductSpellPoints(caster, 'kalki')
      expect(updatedCaster.spellPoints?.priest?.level1.current).toBe(0)
    })
  })

  describe('Empty target arrays', () => {
    it('handles empty target array for group damage spell', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 2, max: 2 } } }
      })

      const effect = SpellCastingService.resolveSpellEffect('molito', caster, [])
      expect(effect.damage).toBeDefined()
      expect(effect.damage).toHaveLength(0)
    })

    it('handles empty target array for AC buff spell', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level2: { current: 2, max: 2 } } }
      })

      const effect = SpellCastingService.resolveSpellEffect('matu', caster, [])
      expect(effect.acBuffs).toBeDefined()
      expect(effect.acBuffs).toHaveLength(0)
    })

    it('handles empty target array for instant death spell', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level6: { current: 1, max: 1 } } }
      })

      const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, [])
      expect(effect.instantDeath).toBeDefined()
      expect(effect.instantDeath).toHaveLength(0)
    })
  })

  describe('Undead-only spells', () => {
    it('BADIOS has no effect on non-undead monsters', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } }
      })
      const target = createTestMonster({ undead: false })

      const effect = SpellCastingService.resolveSpellEffect('badios', caster, [target])
      expect(effect.message).toContain('no effect')
    })

    it('BADIOS affects undead monsters', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } }
      })
      const target = createTestMonster({ undead: true })

      const effect = SpellCastingService.resolveSpellEffect('badios', caster, [target])
      expect(effect.damage).toBeDefined()
      expect(effect.damage!.length).toBeGreaterThan(0)
    })

    it('BADIOS filters mixed undead/living targets', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } }
      })
      const undead = createTestMonster({ id: 'undead1', undead: true })
      const living = createTestMonster({ id: 'living1', undead: false })

      const effect = SpellCastingService.resolveSpellEffect('badios', caster, [undead, living])
      expect(effect.damage).toBeDefined()
      expect(effect.damage!.length).toBe(1)  // Only undead affected
    })
  })

  describe('Unknown spell handling', () => {
    it('returns error message for unknown spell ID', () => {
      const caster = createTestCharacter()

      const effect = SpellCastingService.resolveSpellEffect('unknownspell', caster, [])
      expect(effect.message).toBe('Unknown spell')
    })

    it('canCastSpell returns false for unknown spell', () => {
      const caster = createTestCharacter()

      const result = SpellCastingService.canCastSpell(caster, 'unknownspell')
      expect(result.canCast).toBe(false)
      expect(result.reason).toContain('Unknown')
    })

    it('getSpell returns undefined for unknown spell', () => {
      const spell = SpellCastingService.getSpell('unknownspell')
      expect(spell).toBeUndefined()
    })
  })

  describe('Level 1 caster edge cases', () => {
    it('LOKTOFEIT has 2% success rate at level 1', () => {
      const caster = createTestCharacter({
        level: 1,
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })

      // Run 1000 times to verify 2% success rate (expect ~20 successes)
      const results = Array.from({ length: 1000 }, () =>
        SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster])
      )

      const successes = results.filter(r => r.recall?.success).length
      // At 2% rate, expect between 5 and 50 successes out of 1000 (allowing variance)
      expect(successes).toBeGreaterThan(5)
      expect(successes).toBeLessThan(50)
    })

    it('High level caster approaches 95% success cap for LOKTOFEIT', () => {
      const caster = createTestCharacter({
        level: 50,  // 50 * 2 = 100%, but capped at 95%
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })

      // Run multiple times to verify success rate is high
      const results = Array.from({ length: 100 }, () =>
        SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster])
      )

      const successes = results.filter(r => r.recall?.success).length
      expect(successes).toBeGreaterThan(85)  // Should be around 95%
    })
  })

  describe('Character without spell points', () => {
    it('Fighter cannot cast mage spells', () => {
      const fighter = createTestCharacter({
        // No spellPoints property at all
      })

      const result = SpellCastingService.canCastSpell(fighter, 'dumapic')
      expect(result.canCast).toBe(false)
    })

    it('Character without priest spell points cannot cast priest spells', () => {
      const character = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 }
          }
          // No priest spell points
        }
      })

      const result = SpellCastingService.canCastSpell(character, 'kalki')
      expect(result.canCast).toBe(false)
    })
  })

  describe('Transformation edge cases', () => {
    it('HAMAN transformation creates proper effect structure', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })
      const target = createTestMonster({ id: 'monster1' })

      const effect = SpellCastingService.resolveSpellEffect('haman', caster, [target])
      expect(effect.transformations).toHaveLength(1)
      expect(effect.transformations![0].monsterId).toBe('monster1')
      expect(effect.transformations![0].newType).toBe('RANDOM')
    })

    it('MAHAMAN transforms multiple monsters', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level7: { current: 1, max: 1 } } }
      })
      const targets = [
        createTestMonster({ id: 'm1' }),
        createTestMonster({ id: 'm2' }),
        createTestMonster({ id: 'm3' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('mahaman', caster, targets)
      expect(effect.transformations).toHaveLength(3)
      expect(effect.transformations!.map(t => t.monsterId)).toEqual(['m1', 'm2', 'm3'])
    })
  })

  describe('Dispel magic edge cases', () => {
    it('ZILWAN creates dispel effect for all targets', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level5: { current: 1, max: 1 } } }
      })
      const targets = [
        createTestMonster({ id: 't1' }),
        createTestMonster({ id: 't2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('zilwan', caster, targets)
      expect(effect.dispelEffects).toEqual(['t1', 't2'])
    })
  })

  describe('Teleport success rate', () => {
    it('MALOR has 75% success rate', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })

      // Run 100 times to verify probabilistic behavior
      const results = Array.from({ length: 100 }, () =>
        SpellCastingService.resolveSpellEffect('malor', caster, [caster])
      )

      const successes = results.filter(r => r.teleport?.success).length
      expect(successes).toBeGreaterThan(60)  // Should be around 75%
      expect(successes).toBeLessThan(90)
    })
  })

  describe('Resurrection success rates', () => {
    it('KADORTO spell has 50% resurrection success rate', () => {
      const spell = SpellCastingService.getSpell('kadorto')
      expect(spell?.resurrectionSuccessRate).toBe(0.50)
    })

    it('DI spell has 90% resurrection success rate', () => {
      const spell = SpellCastingService.getSpell('di')
      expect(spell?.resurrectionSuccessRate).toBe(0.90)
    })
  })
})
