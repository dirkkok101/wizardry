/**
 * Integration tests for LITOKAN spell
 * @see data/spells/litokan.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../spell-test-helpers'

describe('LITOKAN (Level 5 Priest) - Group Fire', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('litokan')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('litokan')
    expect(spell!.name).toBe('LITOKAN')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('litokan')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('offensive')
    expect(spell!.damage?.dice).toBe('3d8')
    expect(spell!.damage?.type).toBe('fire')
  })

  it('deals 3-24 fire damage to group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('litokan', caster, targets)

    expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
    expect(effect.damage![0]).toBeLessThanOrEqual(24)
  })
})
