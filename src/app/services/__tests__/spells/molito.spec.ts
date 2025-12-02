/**
 * Integration tests for MOLITO spell
 * @see data/spells/molito.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../spell-test-helpers'

describe('MOLITO (Level 3 Mage) - Group Non-Elemental', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('molito')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('molito')
    expect(spell!.name).toBe('MOLITO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('molito')
    expect(spell!.level).toBe(3)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('3d6')
    expect(spell!.damage?.type).toBe('non-elemental')
  })

  it('deals 3-18 non-elemental damage to group', () => {
    const caster = createTestCharacter()
    const targets = [
      createTestMonster({ id: 't1' }),
      createTestMonster({ id: 't2' }),
      createTestMonster({ id: 't3' })
    ]

    const effect = SpellCastingService.resolveSpellEffect('molito', caster, targets)

    expect(effect.damage).toHaveLength(3)
    effect.damage!.forEach(dmg => {
      expect(dmg).toBeGreaterThanOrEqual(3)
      expect(dmg).toBeLessThanOrEqual(18)
    })
  })
})
