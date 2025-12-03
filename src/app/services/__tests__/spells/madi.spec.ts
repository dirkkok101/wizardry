/**
 * Integration tests for MADI spell
 * @see data/spells/madi.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('MADI (Level 6 Priest) - Full Heal + Cure', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('madi')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('madi')
    expect(spell!.name).toBe('MADI')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('madi')
    expect(spell!.level).toBe(6)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('healing')
    expect(spell!.healing?.type).toBe('full')
    expect(spell!.castableIn).toContain('camp')
  })

  it('fully heals a single ally', () => {
    const caster = createTestCharacter()
    const target = createTestCharacter({ id: 'ally1', hp: 1, maxHp: 50 })

    const effect = SpellCastingService.resolveSpellEffect('madi', caster, [target])

    expect(effect.fullHeal).toBeDefined()
    expect(effect.fullHeal).toContain('ally1')
    expect(effect.message).toContain('fully')
  })
})
