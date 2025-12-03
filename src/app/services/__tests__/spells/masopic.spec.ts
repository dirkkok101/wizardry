/**
 * Integration tests for MASOPIC spell
 * @see data/spells/masopic.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('MASOPIC (Level 6 Mage) - Party Invisibility', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('masopic')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('masopic')
    expect(spell!.name).toBe('MASOPIC')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('masopic')
    expect(spell!.level).toBe(6)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('buff')
    expect(spell!.target).toBe('party')
    expect(spell!.acModifier).toBe(-4)
  })

  it('applies -4 AC to entire party', () => {
    const caster = createTestCharacter()
    const allies = [
      createTestCharacter({ id: 'a1' }),
      createTestCharacter({ id: 'a2' }),
      createTestCharacter({ id: 'a3' })
    ]

    const effect = SpellCastingService.resolveSpellEffect('masopic', caster, allies)

    expect(effect.acBuffs).toHaveLength(3)
    effect.acBuffs!.forEach(buff => {
      expect(buff.acModifier).toBe(-4)
    })
  })
})
