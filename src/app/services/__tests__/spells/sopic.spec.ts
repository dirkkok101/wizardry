/**
 * Integration tests for SOPIC spell
 * @see data/spells/sopic.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

setupSpellTests();

describe('SOPIC (Level 2 Mage) - Self Invisibility', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('sopic')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('sopic')
    expect(spell!.name).toBe('SOPIC')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('sopic')
    expect(spell!.level).toBe(2)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('buff')
    expect(spell!.acModifier).toBe(-4)
  })

  it('applies -4 AC via invisibility', () => {
    const caster = createTestCharacter({ id: 'caster1' })

    const effect = SpellCastingService.resolveSpellEffect('sopic', caster, [caster])

    expect(effect.acBuffs![0].acModifier).toBe(-4)
  })
})
