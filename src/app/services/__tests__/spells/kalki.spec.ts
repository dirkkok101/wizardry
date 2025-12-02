/**
 * Integration tests for KALKI spell
 * @see data/spells/kalki.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../spell-test-helpers'

describe('KALKI (Level 1 Priest) - Party Blessing', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('kalki')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('kalki')
    expect(spell!.name).toBe('KALKI')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('kalki')
    expect(spell!.level).toBe(1)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('buff')
    expect(spell!.target).toBe('party')
    expect(spell!.acModifier).toBe(-1)
  })

  it('applies -1 AC to all party members', () => {
    const caster = createTestCharacter()
    const allies = [
      createTestCharacter({ id: 'a1' }),
      createTestCharacter({ id: 'a2' }),
      createTestCharacter({ id: 'a3' })
    ]

    const effect = SpellCastingService.resolveSpellEffect('kalki', caster, allies)

    expect(effect.acBuffs).toHaveLength(3)
    effect.acBuffs!.forEach(buff => {
      expect(buff.acModifier).toBe(-1)
    })
  })
})
