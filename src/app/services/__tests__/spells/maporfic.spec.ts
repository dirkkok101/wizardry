/**
 * Integration tests for MAPORFIC spell
 * @see data/spells/maporfic.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('MAPORFIC (Level 4 Priest) - Shield All', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('maporfic')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('maporfic')
    expect(spell!.name).toBe('MAPORFIC')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('maporfic')
    expect(spell!.level).toBe(4)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('buff')
    expect(spell!.acModifier).toBe(-2)
  })

  it('applies -2 AC to all allies', () => {
    const caster = createTestCharacter()
    const allies = [
      createTestCharacter({ id: 'a1' }),
      createTestCharacter({ id: 'a2' })
    ]

    const effect = SpellCastingService.resolveSpellEffect('maporfic', caster, allies)

    expect(effect.acBuffs).toHaveLength(2)
    effect.acBuffs!.forEach(buff => {
      expect(buff.acModifier).toBe(-2)
    })
  })
})
