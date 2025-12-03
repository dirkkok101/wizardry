/**
 * Integration tests for HALITO spell
 * @see data/spells/halito.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

describe('HALITO (Level 1 Mage) - Single Target Fire', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('halito')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('halito')
    expect(spell!.name).toBe('HALITO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('halito')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('offensive')
    expect(spell!.target).toBe('single')
    expect(spell!.castableIn).toContain('combat')
    expect(spell!.damage?.dice).toBe('1d8')
    expect(spell!.damage?.type).toBe('fire')
  })

  it('deals 1-8 fire damage to target', () => {
    const caster = createTestCharacter()
    const target = createTestMonster({ id: 'target1' })

    const effect = SpellCastingService.resolveSpellEffect('halito', caster, [target])

    expect(effect.damage).toBeDefined()
    expect(effect.damage).toHaveLength(1)
    expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
    expect(effect.damage![0]).toBeLessThanOrEqual(8)
    expect(effect.message).toContain('HALITO')
  })

  it('is castable only in combat', () => {
    const spell = SpellDataLoader.getSpell('halito')
    expect(spell!.castableIn).toEqual(['combat'])
  })
})
