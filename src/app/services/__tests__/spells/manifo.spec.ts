/**
 * Integration tests for MANIFO spell
 * @see data/spells/manifo.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

describe('MANIFO (Level 2 Priest) - Paralysis', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('manifo')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('manifo')
    expect(spell!.name).toBe('MANIFO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('manifo')
    expect(spell!.level).toBe(2)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('debuff')
    expect(spell!.target).toBe('group')
  })

  it('attempts to paralyze enemy group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('manifo', caster, targets)

    expect(effect.statusEffects).toBeDefined()
    expect(effect.message).toContain('MANIFO')
  })
})
