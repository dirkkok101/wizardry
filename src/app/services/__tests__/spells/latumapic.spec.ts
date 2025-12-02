/**
 * Integration tests for LATUMAPIC spell
 * @see data/spells/latumapic.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../spell-test-helpers'

describe('LATUMAPIC (Level 3 Priest) - Identify Monsters', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('latumapic')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('latumapic')
    expect(spell!.name).toBe('LATUMAPIC')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('latumapic')
    expect(spell!.level).toBe(3)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('utility')
    expect(spell!.utility).toBe('identify_foe')
    expect(spell!.castableIn).toContain('combat')
    expect(spell!.castableIn).toContain('camp')
  })

  it('identifies enemies', () => {
    const caster = createTestCharacter()

    const effect = SpellCastingService.resolveSpellEffect('latumapic', caster, [caster])

    expect(effect.message).toContain('LATUMAPIC')
    expect(effect.message).toContain('identifies')
  })
})
