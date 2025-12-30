/**
 * Integration tests for LATUMOFIS spell
 * @see data/spells/latumofis.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

setupSpellTests();

describe('LATUMOFIS (Level 4 Priest) - Cure Poison', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('latumofis')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('latumofis')
    expect(spell!.name).toBe('LATUMOFIS')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('latumofis')
    expect(spell!.level).toBe(4)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('support')
    expect(spell!.statusCure).toBe('poison')
    expect(spell!.castableIn).toContain('combat')
    expect(spell!.castableIn).toContain('camp')
  })

  it('cures poison from single target', () => {
    const caster = createTestCharacter()
    const target = createTestCharacter({ id: 'poisoned1' })

    const effect = SpellCastingService.resolveSpellEffect('latumofis', caster, [target])

    expect(effect.statusCures).toBeDefined()
    expect(effect.statusCures!.targetIds).toContain('poisoned1')
    expect(effect.statusCures!.cureType).toBe('poison')
    expect(effect.message).toContain('LATUMOFIS')
  })
})
