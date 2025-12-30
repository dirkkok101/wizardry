/**
 * Integration tests for LOMILWA spell
 * @see data/spells/lomilwa.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

setupSpellTests();

describe('LOMILWA (Level 3 Priest) - Extended Light', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('lomilwa')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('lomilwa')
    expect(spell!.name).toBe('LOMILWA')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('lomilwa')
    expect(spell!.level).toBe(3)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('utility')
    expect(spell!.utility).toBe('extended_light')
  })

  it('provides extended light', () => {
    const caster = createTestCharacter()

    const effect = SpellCastingService.resolveSpellEffect('lomilwa', caster, [caster])

    expect(effect.message).toContain('LOMILWA')
  })
})
