import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter } from '@testing/test-factories'

// Note: Real spell data is loaded from data/spells/ via setup-jest.ts
// This follows the project philosophy: "No mocks for services - test with real data"

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

  describe('HALITO (Little Fire)', () => {
    it('deals 1d8 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 2, max: 2 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        createTestCharacter({ id: 't2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('halito', caster, targets)

      expect(effect.damage).toBeDefined()
      expect(effect.damage).toHaveLength(2)
      expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
      expect(effect.damage![0]).toBeLessThanOrEqual(8)
    })
  })

  describe('SOPIC (Invisibility)', () => {
    it('applies -4 AC buff to single target (invisibility buff)', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const target = createTestCharacter({ id: 'target1' })

      const effect = SpellCastingService.resolveSpellEffect('sopic', caster, [target])

      // SOPIC provides -4 AC (better defense) like PORFIC, via invisibility in Wizardry
      expect(effect.acBuffs).toBeDefined()
      expect(effect.acBuffs).toHaveLength(1)
      expect(effect.acBuffs![0].target).toBe('target1')
      expect(effect.acBuffs![0].acModifier).toBe(-4)
      expect(effect.message).toContain('SOPIC')
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

  describe('MOLITO (Improved Sparks)', () => {
    it('deals 3d6 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 1, max: 1 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('molito', caster, targets)

      expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
      expect(effect.damage![0]).toBeLessThanOrEqual(18)
    })
  })

  describe('BAMATU (Prayer)', () => {
    it('applies -4 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } }
      })
      const allies = [createTestCharacter({ id: 'a1' })]

      const effect = SpellCastingService.resolveSpellEffect('bamatu', caster, allies)

      expect(effect.acBuffs![0].acModifier).toBe(-4)
    })
  })

  describe('LOMILWA (Extended Light)', () => {
    it('provides extended light utility', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } }
      })

      const effect = SpellCastingService.resolveSpellEffect('lomilwa', caster, [caster])

      expect(effect.message).toContain('LOMILWA')
    })
  })

  describe('LORTO (Blades)', () => {
    it('deals 6d6 physical damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level6: { current: 1, max: 1 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('lorto', caster, [target])

      expect(effect.damage).toHaveLength(1)
      expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
      expect(effect.damage![0]).toBeLessThanOrEqual(36)
    })
  })

  describe('MAPORFIC (Shield All)', () => {
    it('applies -4 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level4: { current: 1, max: 1 } } }
      })
      const allies = [createTestCharacter({ id: 'a1' })]

      const effect = SpellCastingService.resolveSpellEffect('maporfic', caster, allies)

      expect(effect.acBuffs![0].acModifier).toBe(-4)
    })
  })

  describe('LAKANITO (Suffocation)', () => {
    it('deals 6d6 air damage that ignores AC', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level5: { current: 1, max: 1 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('lakanito', caster, targets)

      expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
      expect(effect.damage![0]).toBeLessThanOrEqual(36)
      expect(effect.message).toContain('LAKANITO')
    })
  })

  describe('ZILWAN (Dispel Magic)', () => {
    it('dispels magic effects from group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level5: { current: 1, max: 1 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('zilwan', caster, targets)

      expect(effect.message).toContain('dispels')
    })
  })

  describe('BADI (Death)', () => {
    it('attempts instant death on single target', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level5: { current: 1, max: 1 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('badi', caster, [target])

      expect(effect.instantDeath).toBeDefined()
      expect(effect.instantDeath).toContain('t1')
    })
  })

  describe('HAMAN (Transformation)', () => {
    it('transforms single monster', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('haman', caster, [target])

      expect(effect.message).toContain('transforms')
    })
  })

  describe('MALOR (Teleport)', () => {
    it('provides teleport utility with 75% success rate', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })

      const spell = SpellCastingService.getSpell('malor')
      expect(spell?.teleportSuccessRate).toBe(0.75)
    })
  })

  describe('DI (Resurrection)', () => {
    it('has 90% resurrection success rate', () => {
      const spell = SpellCastingService.getSpell('di')
      expect(spell?.resurrectionSuccessRate).toBe(0.90)
    })
  })

  describe('MABADI (Death All)', () => {
    it('attempts instant death on all enemies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level6: { current: 1, max: 1 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        createTestCharacter({ id: 't2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, targets)

      expect(effect.instantDeath).toContain('t1')
      expect(effect.instantDeath).toContain('t2')
    })
  })

  describe('DUMAPIC (Show Coordinates)', () => {
    it('provides coordinate display utility', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const effect = SpellCastingService.resolveSpellEffect('dumapic', caster, [caster])

      expect(effect.message).toContain('DUMAPIC')
      expect(effect.message).toContain('location')
    })
  })
})
