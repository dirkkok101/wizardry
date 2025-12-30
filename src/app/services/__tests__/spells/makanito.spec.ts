/**
 * Integration tests for MAKANITO spell
 * @see data/spells/makanito.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('MAKANITO (Level 5 Mage) - Suffocation All', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('makanito')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('makanito')
    expect(spell!.name).toBe('MAKANITO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('makanito')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('instant_death')
    expect(spell!.target).toBe('all_enemies')
    expect(spell!.instantDeath).toBeDefined()
  })

  it('attempts instant death on all enemies', () => {
    const caster = createTestCharacter()
    const targets = [
      createTestMonster({ id: 't1' }),
      createTestMonster({ id: 't2' })
    ]

    const effect = SpellCastingService.resolveSpellEffect('makanito', caster, targets)

    expect(effect.instantDeath).toBeDefined()
  })
})
