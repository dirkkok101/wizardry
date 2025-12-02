/**
 * Integration tests for MATU spell
 * @see data/spells/matu.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../spell-test-helpers'

describe('MATU (Level 2 Priest) - Better Blessing', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('matu')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('matu')
    expect(spell!.name).toBe('MATU')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('matu')
    expect(spell!.level).toBe(2)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.acModifier).toBe(-2)
  })

  it('applies -2 AC to all allies', () => {
    const caster = createTestCharacter()
    const allies = [createTestCharacter({ id: 'a1' })]

    const effect = SpellCastingService.resolveSpellEffect('matu', caster, allies)

    expect(effect.acBuffs![0].acModifier).toBe(-2)
  })
})
