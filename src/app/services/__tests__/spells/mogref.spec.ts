/**
 * Integration tests for MOGREF spell
 * @see data/spells/mogref.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../spell-test-helpers'

describe('MOGREF (Level 1 Mage) - Self Hardening', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('mogref')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('mogref')
    expect(spell!.name).toBe('MOGREF')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('mogref')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('buff')
    expect(spell!.acModifier).toBe(-2)
  })

  it('applies -2 AC to caster', () => {
    const caster = createTestCharacter({ id: 'caster1' })

    const effect = SpellCastingService.resolveSpellEffect('mogref', caster, [caster])

    expect(effect.acBuffs).toBeDefined()
    expect(effect.acBuffs![0].acModifier).toBe(-2)
  })
})
