/**
 * Integration tests for DILTO spell
 * @see data/spells/dilto.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../../spell-test-helpers'

describe('DILTO (Level 2 Mage) - Blind', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('dilto')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('dilto')
    expect(spell!.name).toBe('DILTO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('dilto')
    expect(spell!.level).toBe(2)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('debuff')
    expect(spell!.statusEffect).toBeDefined()
  })

  it('attempts to blind enemy group', () => {
    const caster = createTestCharacter()
    const targets = [createTestMonster({ id: 't1' })]

    const effect = SpellCastingService.resolveSpellEffect('dilto', caster, targets)

    expect(effect.statusEffects).toBeDefined()
  })
})
