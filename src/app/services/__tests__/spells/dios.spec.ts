/**
 * Integration tests for DIOS spell
 * @see data/spells/dios.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

setupSpellTests();

describe('DIOS (Level 1 Priest) - Basic Healing', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('dios')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('dios')
    expect(spell!.name).toBe('DIOS')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('dios')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('healing')
    expect(spell!.target).toBe('single')
    expect(spell!.castableIn).toContain('combat')
    expect(spell!.castableIn).toContain('camp')
    expect(spell!.healing?.dice).toBe('1d8')
  })

  it('heals 1-8 HP to single ally', () => {
    const caster = createTestCharacter()
    const target = createTestCharacter({ id: 'ally1', hp: 5, maxHp: 20 })

    const effect = SpellCastingService.resolveSpellEffect('dios', caster, [target])

    expect(effect.healing).toBeDefined()
    expect(effect.healing).toHaveLength(1)
    expect(effect.healing![0]).toBeGreaterThanOrEqual(1)
    expect(effect.healing![0]).toBeLessThanOrEqual(8)
    expect(effect.message).toContain('DIOS')
  })

  it('is castable in both combat and camp', () => {
    const spell = SpellDataLoader.getSpell('dios')
    expect(spell!.castableIn).toContain('combat')
    expect(spell!.castableIn).toContain('camp')
  })
})
