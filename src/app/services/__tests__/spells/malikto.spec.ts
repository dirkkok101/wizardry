/**
 * Integration tests for MALIKTO spell
 * @see data/spells/malikto.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

describe('MALIKTO (Level 7 Priest) - All Enemies', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('malikto')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('malikto')
    expect(spell!.name).toBe('MALIKTO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('malikto')
    expect(spell!.level).toBe(7)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('offensive')
    expect(spell!.target).toBe('all_enemies')
    expect(spell!.damage?.dice).toBe('12d6')
    expect(spell!.damage?.type).toBe('divine')
  })

  it('deals massive divine damage to all enemies', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' }), createTestMonster({ id: 't2' })]

    const effect = SpellCastingService.resolveSpellEffect('malikto', caster, targets)

    expect(effect.damage).toHaveLength(2)
    effect.damage!.forEach(dmg => {
      expect(dmg).toBeGreaterThanOrEqual(12)
      expect(dmg).toBeLessThanOrEqual(72)
    })
  })
})
