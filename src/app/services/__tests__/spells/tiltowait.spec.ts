/**
 * Integration tests for TILTOWAIT spell
 * @see data/spells/tiltowait.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../spell-test-helpers'

describe('TILTOWAIT (Level 7 Mage) - All Enemies', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('tiltowait')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('tiltowait')
    expect(spell!.name).toBe('TILTOWAIT')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('tiltowait')
    expect(spell!.level).toBe(7)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('offensive')
    expect(spell!.target).toBe('all_enemies')
    expect(spell!.damage?.dice).toBe('10d15')
    expect(spell!.damage?.type).toBe('force')
  })

  it('deals massive damage to all enemies', () => {
    const caster = createTestCharacter()
    const targets = [
      createTestMonster({ id: 't1' }),
      createTestMonster({ id: 't2' }),
      createTestMonster({ id: 't3' }),
      createTestMonster({ id: 't4' })
    ]

    const effect = SpellCastingService.resolveSpellEffect('tiltowait', caster, targets)

    expect(effect.damage).toHaveLength(4)
    effect.damage!.forEach(dmg => {
      expect(dmg).toBeGreaterThanOrEqual(10)
      expect(dmg).toBeLessThanOrEqual(150)
    })
  })
})
