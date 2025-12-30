/**
 * Integration tests for MILWA spell
 * @see data/spells/milwa.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

setupSpellTests();

describe('MILWA (Level 1 Priest) - Light', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('milwa')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('milwa')
    expect(spell!.name).toBe('MILWA')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('milwa')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('utility')
    expect(spell!.utility).toBe('extended_light')
  })

  it('creates light', () => {
    const caster = createTestCharacter()

    const effect = SpellCastingService.resolveSpellEffect('milwa', caster, [caster])

    expect(effect.message).toContain('MILWA')
  })
})
