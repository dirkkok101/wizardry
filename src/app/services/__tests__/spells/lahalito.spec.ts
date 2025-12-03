/**
 * Integration tests for LAHALITO spell
 * @see data/spells/lahalito.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

describe('LAHALITO (Level 4 Mage) - Group Fire', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('lahalito')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('lahalito')
    expect(spell!.name).toBe('LAHALITO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('lahalito')
    expect(spell!.level).toBe(4)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('6d6')
    expect(spell!.damage?.type).toBe('fire')
  })

  it('deals 6-36 fire damage to group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('lahalito', caster, targets)

    expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
    expect(effect.damage![0]).toBeLessThanOrEqual(36)
  })
})
