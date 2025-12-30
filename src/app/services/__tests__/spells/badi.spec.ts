/**
 * Integration tests for BADI spell
 * @see data/spells/badi.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('BADI (Level 5 Priest) - Single Target Death', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('badi')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('badi')
    expect(spell!.name).toBe('BADI')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('badi')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('instant_death')
    expect(spell!.target).toBe('single')
    expect(spell!.instantDeath).toBeDefined()
  })

  it('attempts instant death on single target', () => {
    const caster = createTestCharacter()
    const target = createTestMonster({ id: 't1' })

    const effect = SpellCastingService.resolveSpellEffect('badi', caster, [target])

    expect(effect.instantDeath).toBeDefined()
    expect(effect.message).toContain('BADI')
  })
})
