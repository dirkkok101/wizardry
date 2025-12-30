/**
 * Integration tests for LAKANITO spell
 * @see data/spells/lakanito.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('LAKANITO (Level 6 Mage) - Suffocation Group', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('lakanito')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('lakanito')
    expect(spell!.name).toBe('LAKANITO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('lakanito')
    expect(spell!.level).toBe(6)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('instant_death')
    expect(spell!.target).toBe('group')
    expect(spell!.instantDeath).toBeDefined()
  })

  it('attempts instant death on group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('lakanito', caster, targets)

    expect(effect.instantDeath).toBeDefined()
    expect(effect.message).toContain('LAKANITO')
  })
})
