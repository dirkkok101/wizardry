/**
 * Integration tests for MONTINO spell
 * @see data/spells/montino.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('MONTINO (Level 2 Priest) - Silence', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('montino')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('montino')
    expect(spell!.name).toBe('MONTINO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('montino')
    expect(spell!.level).toBe(2)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('debuff')
    expect(spell!.target).toBe('group')
  })

  it('attempts to silence enemy group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('montino', caster, targets)

    expect(effect.statusEffects).toBeDefined()
  })
})
