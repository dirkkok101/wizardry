/**
 * Integration tests for MABADI spell
 * @see data/spells/mabadi.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('MABADI (Level 6 Priest) - HP Reduction', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('mabadi')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('mabadi')
    expect(spell!.name).toBe('MABADI')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('mabadi')
    expect(spell!.level).toBe(6)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('offensive')
    expect(spell!.effect?.type).toBe('hp_reduction')
    expect(spell!.effect?.remainingHP?.dice).toBe('1d8')
    expect(spell!.effect?.noSavingThrow).toBe(true)
  })

  it('reduces target HP to 1-8 regardless of current HP', () => {
    const caster = createTestCharacter()
    const target = createTestMonster({ id: 't1', hp: 500, maxHp: 500 })

    const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, [target])

    expect(effect.hpReduction).toBeDefined()
    expect(effect.hpReduction).toHaveLength(1)
    expect(effect.hpReduction![0].targetId).toBe('t1')
    expect(effect.hpReduction![0].newHp).toBeGreaterThanOrEqual(1)
    expect(effect.hpReduction![0].newHp).toBeLessThanOrEqual(8)
    expect(effect.message).toContain('MABADI')
  })

  it('cannot be resisted', () => {
    const spell = SpellDataLoader.getSpell('mabadi')
    expect(spell!.effect?.noSavingThrow).toBe(true)
  })

  it('affects multiple targets', () => {
    const caster = createTestCharacter()
    const targets = [
      createTestMonster({ id: 't1', hp: 100 }),
      createTestMonster({ id: 't2', hp: 200 }),
      createTestMonster({ id: 't3', hp: 300 })
    ]

    const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, targets)

    expect(effect.hpReduction).toHaveLength(3)
    effect.hpReduction!.forEach(reduction => {
      expect(reduction.newHp).toBeGreaterThanOrEqual(1)
      expect(reduction.newHp).toBeLessThanOrEqual(8)
    })
  })
})
