/**
 * Integration tests for BAMATU spell
 * @see data/spells/bamatu.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('BAMATU (Level 3 Priest) - Powerful Prayer', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('bamatu')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('bamatu')
    expect(spell!.name).toBe('BAMATU')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('bamatu')
    expect(spell!.level).toBe(3)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('buff')
    expect(spell!.acModifier).toBe(-4)
  })

  it('applies -4 AC to party', () => {
    const caster = createTestCharacter()
    const allies = [createTestCharacter({ id: 'a1' })]

    const effect = SpellCastingService.resolveSpellEffect('bamatu', caster, allies)

    expect(effect.acBuffs![0].acModifier).toBe(-4)
  })
})
