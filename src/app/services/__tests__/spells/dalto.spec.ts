/**
 * Integration tests for DALTO spell
 * @see data/spells/dalto.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../spell-test-helpers'

describe('DALTO (Level 4 Mage) - Group Cold', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('dalto')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('dalto')
    expect(spell!.name).toBe('DALTO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('dalto')
    expect(spell!.level).toBe(4)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('6d6')
    expect(spell!.damage?.type).toBe('cold')
  })

  it('deals 6-36 cold damage to group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('dalto', caster, targets)

    expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
    expect(effect.damage![0]).toBeLessThanOrEqual(36)
  })
})
