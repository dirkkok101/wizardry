/**
 * Integration tests for DIALKO spell
 * @see data/spells/dialko.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('DIALKO (Level 3 Priest) - Cure Paralysis', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('dialko')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('dialko')
    expect(spell!.name).toBe('DIALKO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('dialko')
    expect(spell!.level).toBe(3)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('support')
    expect(spell!.statusCure).toBe('paralysis')
  })

  it('cures paralysis from single target', () => {
    const caster = createTestCharacter()
    const target = createTestCharacter({ id: 'paralyzed1' })

    const effect = SpellCastingService.resolveSpellEffect('dialko', caster, [target])

    expect(effect.statusCures).toBeDefined()
    expect(effect.statusCures!.cureType).toBe('paralysis')
    expect(effect.message).toContain('DIALKO')
  })
})
