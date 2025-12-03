/**
 * Integration tests for DIAL spell
 * @see data/spells/dial.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('DIAL (Level 4 Priest) - Improved Healing', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('dial')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('dial')
    expect(spell!.name).toBe('DIAL')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('dial')
    expect(spell!.level).toBe(4)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('healing')
    expect(spell!.healing?.dice).toBe('2d8')
  })

  it('heals 2-16 HP to single ally', () => {
    const caster = createTestCharacter()
    const target = createTestCharacter({ id: 'ally1' })

    const effect = SpellCastingService.resolveSpellEffect('dial', caster, [target])

    expect(effect.healing![0]).toBeGreaterThanOrEqual(2)
    expect(effect.healing![0]).toBeLessThanOrEqual(16)
  })
})
