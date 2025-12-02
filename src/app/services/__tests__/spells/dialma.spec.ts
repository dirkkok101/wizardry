/**
 * Integration tests for DIALMA spell
 * @see data/spells/dialma.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../spell-test-helpers'

describe('DIALMA (Level 5 Priest) - Greater Healing', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('dialma')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('dialma')
    expect(spell!.name).toBe('DIALMA')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('dialma')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('healing')
    expect(spell!.healing?.dice).toBe('3d8')
  })

  it('heals 3-24 HP to single ally', () => {
    const caster = createTestCharacter()
    const target = createTestCharacter({ id: 'ally1' })

    const effect = SpellCastingService.resolveSpellEffect('dialma', caster, [target])

    expect(effect.healing![0]).toBeGreaterThanOrEqual(3)
    expect(effect.healing![0]).toBeLessThanOrEqual(24)
  })
})
