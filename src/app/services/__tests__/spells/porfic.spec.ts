/**
 * Integration tests for PORFIC spell
 * @see data/spells/porfic.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

setupSpellTests();

describe('PORFIC (Level 1 Priest) - Self Shield', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('porfic')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('porfic')
    expect(spell!.name).toBe('PORFIC')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('porfic')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('buff')
    expect(spell!.target).toBe('caster')
    expect(spell!.acModifier).toBe(-4)
    expect(spell!.castableIn).toEqual(['combat'])
  })

  it('applies -4 AC to caster only', () => {
    const caster = createTestCharacter({ id: 'caster1' })

    const effect = SpellCastingService.resolveSpellEffect('porfic', caster, [caster])

    expect(effect.acBuffs).toHaveLength(1)
    expect(effect.acBuffs![0].target).toBe('caster1')
    expect(effect.acBuffs![0].acModifier).toBe(-4)
  })
})
