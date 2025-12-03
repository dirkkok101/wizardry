/**
 * Integration tests for DUMAPIC spell
 * @see data/spells/dumapic.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('DUMAPIC (Level 1 Mage) - Show Coordinates', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('dumapic')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('dumapic')
    expect(spell!.name).toBe('DUMAPIC')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('dumapic')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('utility')
    expect(spell!.target).toBe('party')
    expect(spell!.castableIn).toContain('camp')
    expect(spell!.utility).toBe('show_coordinates')
  })

  it('reveals dungeon location', () => {
    const caster = createTestCharacter()

    const effect = SpellCastingService.resolveSpellEffect('dumapic', caster, [caster])

    expect(effect.message).toContain('DUMAPIC')
    expect(effect.message).toContain('location')
  })

  it('is camp-only spell', () => {
    const spell = SpellDataLoader.getSpell('dumapic')
    expect(spell!.castableIn).toEqual(['camp'])
  })
})
