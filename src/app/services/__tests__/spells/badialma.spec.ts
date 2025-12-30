/**
 * Integration tests for BADIALMA spell
 * @see data/spells/badialma.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('BADIALMA (Level 5 Priest) - Single Target Divine', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('badialma')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('badialma')
    expect(spell!.name).toBe('BADIALMA')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('badialma')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('3d8')
  })

  it('deals 3-24 divine damage', () => {
    const caster = createTestCharacter()
    const target = createTestMonster({ id: 't1' })

    const effect = SpellCastingService.resolveSpellEffect('badialma', caster, [target])

    expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
    expect(effect.damage![0]).toBeLessThanOrEqual(24)
  })
})
