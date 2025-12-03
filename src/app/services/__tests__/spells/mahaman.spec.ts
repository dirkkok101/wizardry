/**
 * Integration tests for MAHAMAN spell
 * @see data/spells/mahaman.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  RandomService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('MAHAMAN (Level 7 Mage) - Powerful Random Effect', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('mahaman')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('mahaman')
    expect(spell!.name).toBe('MAHAMAN')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('mahaman')
    expect(spell!.level).toBe(7)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('buff')
    expect(spell!.randomEffects).toBeDefined()
    expect(spell!.randomEffects).toHaveLength(3)
    expect(spell!.cost?.experienceLevels).toBe(1)
    expect(spell!.cost?.mustRelearn).toBe(true)
  })

  it('selects random effect from 3 possibilities', () => {
    RandomService.queueNextValues([0.0, 0.0])
    const caster = createTestCharacter({ level: 15 })

    const effect = SpellCastingService.resolveSpellEffect('mahaman', caster, [caster])

    expect(effect.randomEffect).toBeDefined()
    expect(effect.randomEffect!.effectId).toBeGreaterThanOrEqual(1)
    expect(effect.randomEffect!.effectId).toBeLessThanOrEqual(3)
    expect(effect.randomEffect!.mustRelearn).toBe(true)
  })

  it('costs 1 level and must relearn spell', () => {
    RandomService.queueNextValues([0.0, 0.0])
    const caster = createTestCharacter({ level: 15 })

    const effect = SpellCastingService.resolveSpellEffect('mahaman', caster, [caster])

    expect(effect.randomEffect!.levelDrain).toBe(1)
    expect(effect.randomEffect!.mustRelearn).toBe(true)
  })
})
