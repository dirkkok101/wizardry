/**
 * Integration tests for MAMORLIS spell
 * @see data/spells/mamorlis.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../spell-test-helpers'

describe('MAMORLIS (Level 5 Mage) - Mass Fear', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('mamorlis')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('mamorlis')
    expect(spell!.name).toBe('MAMORLIS')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('mamorlis')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('debuff')
    expect(spell!.target).toBe('all_enemies')
  })

  it('attempts to cause fear in all enemies', () => {
    const caster = createTestCharacter()
    const targets = [
      createTestMonster({ id: 't1' }),
      createTestMonster({ id: 't2' }),
      createTestMonster({ id: 't3' })
    ]

    const effect = SpellCastingService.resolveSpellEffect('mamorlis', caster, targets)

    expect(effect.statusEffects).toBeDefined()
  })
})
