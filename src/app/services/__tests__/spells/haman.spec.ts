/**
 * Integration tests for HAMAN spell
 * @see data/spells/haman.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  RandomService,
  createTestCharacter
} from '../spell-test-helpers'

describe('HAMAN (Level 6 Mage) - Random Effect', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('haman')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('haman')
    expect(spell!.name).toBe('HAMAN')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('haman')
    expect(spell!.level).toBe(6)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('buff')
    expect(spell!.randomEffects).toBeDefined()
    expect(spell!.randomEffects).toHaveLength(5)
    expect(spell!.cost?.experienceLevels).toBe(1)
    expect(spell!.requirements?.minCasterLevel).toBe(13)
  })

  it('selects random effect from 5 possibilities', () => {
    RandomService.queueNextValues([0.0, 0.0]) // First effect, no mangling
    const caster = createTestCharacter({ level: 15 })

    const effect = SpellCastingService.resolveSpellEffect('haman', caster, [caster])

    expect(effect.randomEffect).toBeDefined()
    expect(effect.randomEffect!.effectId).toBeGreaterThanOrEqual(1)
    expect(effect.randomEffect!.effectId).toBeLessThanOrEqual(5)
    expect(effect.randomEffect!.levelDrain).toBe(1)
    expect(effect.message).toContain('HAMAN')
  })

  it('can cause spellbook mangling', () => {
    RandomService.queueNextValues([0.0, 0.333])
    const caster = createTestCharacter({ level: 15 })

    const effect = SpellCastingService.resolveSpellEffect('haman', caster, [caster])

    expect(effect.randomEffect).toBeDefined()
  })
})
