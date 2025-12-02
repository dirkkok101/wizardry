/**
 * Integration tests for MAHALITO spell
 * @see data/spells/mahalito.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../spell-test-helpers'

describe('MAHALITO (Level 3 Mage) - Group Fire', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('mahalito')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('mahalito')
    expect(spell!.name).toBe('MAHALITO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('mahalito')
    expect(spell!.level).toBe(3)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('4d6')
    expect(spell!.damage?.type).toBe('fire')
  })

  it('deals 4-24 fire damage to group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('mahalito', caster, targets)

    expect(effect.damage![0]).toBeGreaterThanOrEqual(4)
    expect(effect.damage![0]).toBeLessThanOrEqual(24)
  })
})
