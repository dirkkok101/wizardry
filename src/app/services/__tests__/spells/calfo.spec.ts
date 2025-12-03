/**
 * Integration tests for CALFO spell
 * @see data/spells/calfo.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('CALFO (Level 2 Priest) - Identify Trap', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('calfo')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('calfo')
    expect(spell!.name).toBe('CALFO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('calfo')
    expect(spell!.level).toBe(2)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('utility')
    expect(spell!.utility).toBe('identify_trap')
    expect(spell!.castableIn).toContain('looting')
  })

  it('reveals trap type', () => {
    const caster = createTestCharacter()

    const effect = SpellCastingService.resolveSpellEffect('calfo', caster, [caster])

    expect(effect.message).toContain('CALFO')
    expect(effect.message).toContain('trap')
  })
})
