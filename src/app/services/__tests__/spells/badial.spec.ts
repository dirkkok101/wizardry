/**
 * Integration tests for BADIAL spell
 * @see data/spells/badial.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

describe('BADIAL (Level 4 Priest) - Single Target Divine', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('badial')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('badial')
    expect(spell!.name).toBe('BADIAL')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('badial')
    expect(spell!.level).toBe(4)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('2d8')
  })

  it('deals 2-16 divine damage', () => {
    const caster = createTestCharacter()
    const target = createTestMonster({ id: 't1' })

    const effect = SpellCastingService.resolveSpellEffect('badial', caster, [target])

    expect(effect.damage![0]).toBeGreaterThanOrEqual(2)
    expect(effect.damage![0]).toBeLessThanOrEqual(16)
  })
})
