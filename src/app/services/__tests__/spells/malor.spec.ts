/**
 * Integration tests for MALOR spell
 * @see data/spells/malor.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../spell-test-helpers'

describe('MALOR (Level 7 Mage) - Teleport', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('malor')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('malor')
    expect(spell!.name).toBe('MALOR')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('malor')
    expect(spell!.level).toBe(7)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('utility')
    expect(spell!.utility).toBe('teleport')
    expect(spell!.castableIn).toContain('combat')
    expect(spell!.castableIn).toContain('camp')
  })

  it('has different camp and combat behaviors', () => {
    const spell = SpellDataLoader.getSpell('malor')
    expect(spell!.campBehavior?.type).toBe('coordinate_teleport')
    expect(spell!.combatBehavior?.type).toBe('random_escape')
    expect(spell!.combatBehavior?.safe).toBe(true)
  })

  it('teleports safely in combat', () => {
    const caster = createTestCharacter()

    const effect = SpellCastingService.resolveSpellEffect('malor', caster, [caster], 'combat')

    expect(effect.teleport).toBeDefined()
    expect(effect.teleport!.success).toBe(true)
    expect(effect.teleport!.safe).toBe(true)
    expect(effect.teleport!.mode).toBe('random_escape')
  })

  it('requires coordinates in camp with rock death danger', () => {
    const caster = createTestCharacter()

    const effect = SpellCastingService.resolveSpellEffect('malor', caster, [caster], 'camp')

    expect(effect.teleport).toBeDefined()
    expect(effect.teleport!.mode).toBe('coordinate_teleport')
    expect(effect.teleport!.dangers?.solidRock).toBe('instant_party_death')
  })
})
