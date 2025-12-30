/**
 * Integration tests for KATINO spell
 * @see data/spells/katino.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('KATINO (Level 1 Mage) - Sleep', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('katino')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('katino')
    expect(spell!.name).toBe('KATINO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('katino')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('debuff')
    expect(spell!.target).toBe('group')
    expect(spell!.statusEffect).toBeDefined()
  })

  it('attempts to put group to sleep', () => {
    const caster = createTestCharacter()
    const targets = [
      createTestMonster({ id: 't1' }),
      createTestMonster({ id: 't2' })
    ]

    const effect = SpellCastingService.resolveSpellEffect('katino', caster, targets)

    expect(effect.statusEffects).toBeDefined()
    expect(effect.message).toContain('KATINO')
  })
})
