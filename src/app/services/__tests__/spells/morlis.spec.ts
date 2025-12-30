/**
 * Integration tests for MORLIS spell
 * @see data/spells/morlis.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('MORLIS (Level 4 Mage) - Fear', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('morlis')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('morlis')
    expect(spell!.name).toBe('MORLIS')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('morlis')
    expect(spell!.level).toBe(4)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('debuff')
    expect(spell!.target).toBe('group')
  })

  it('attempts to cause fear in enemy group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('morlis', caster, targets)

    expect(effect.statusEffects).toBeDefined()
  })
})
