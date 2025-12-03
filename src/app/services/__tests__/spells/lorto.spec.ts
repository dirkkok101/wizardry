/**
 * Integration tests for LORTO spell
 * @see data/spells/lorto.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

describe('LORTO (Level 6 Priest) - Group Physical', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('lorto')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('lorto')
    expect(spell!.name).toBe('LORTO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('lorto')
    expect(spell!.level).toBe(6)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('6d6')
  })

  it('deals 6-36 damage to group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('lorto', caster, targets)

    expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
    expect(effect.damage![0]).toBeLessThanOrEqual(36)
  })
})
