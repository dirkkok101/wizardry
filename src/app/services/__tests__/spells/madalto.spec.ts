/**
 * Integration tests for MADALTO spell
 * @see data/spells/madalto.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

setupSpellTests();

describe('MADALTO (Level 5 Mage) - Group Cold', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('madalto')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('madalto')
    expect(spell!.name).toBe('MADALTO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('madalto')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('8d8')
    expect(spell!.damage?.type).toBe('cold')
  })

  it('deals 8-64 cold damage to group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('madalto', caster, targets)

    expect(effect.damage![0]).toBeGreaterThanOrEqual(8)
    expect(effect.damage![0]).toBeLessThanOrEqual(64)
  })
})
