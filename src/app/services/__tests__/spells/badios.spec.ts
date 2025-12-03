/**
 * Integration tests for BADIOS spell
 * @see data/spells/badios.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

describe('BADIOS (Level 1 Priest) - Single Target Divine', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('badios')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('badios')
    expect(spell!.name).toBe('BADIOS')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('badios')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('offensive')
    expect(spell!.target).toBe('single')
    expect(spell!.damage?.dice).toBe('1d8')
    expect(spell!.damage?.type).toBe('divine')
  })

  it('deals 1-8 divine damage to single target', () => {
    const caster = createTestCharacter()
    const target = createTestMonster({ id: 'target1' })

    const effect = SpellCastingService.resolveSpellEffect('badios', caster, [target])

    expect(effect.damage).toHaveLength(1)
    expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
    expect(effect.damage![0]).toBeLessThanOrEqual(8)
  })
})
