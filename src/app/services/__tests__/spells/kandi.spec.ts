/**
 * Integration tests for KANDI spell
 * @see data/spells/kandi.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

setupSpellTests();

describe('KANDI (Level 5 Priest) - Locate Person', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('kandi')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('kandi')
    expect(spell!.name).toBe('KANDI')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('kandi')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('utility')
    expect(spell!.utility).toBe('locate_person')
    expect(spell!.castableIn).toContain('camp')
  })

  it('locates missing persons', () => {
    const caster = createTestCharacter()

    const effect = SpellCastingService.resolveSpellEffect('kandi', caster, [caster])

    expect(effect.message).toContain('KANDI')
    expect(effect.message).toContain('locates')
  })
})
