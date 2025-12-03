/**
 * Integration tests for LOKTOFEIT spell
 * @see data/spells/loktofeit.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  RandomService,
  createTestCharacter
} from '../../spell-test-helpers'

describe('LOKTOFEIT (Level 6 Priest) - Recall to Town', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('loktofeit')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('loktofeit')
    expect(spell!.name).toBe('LOKTOFEIT')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('loktofeit')
    expect(spell!.level).toBe(6)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('utility')
    expect(spell!.utility).toBe('recall')
    expect(spell!.escape?.destination).toBe('castle')
    expect(spell!.escape?.onSuccess?.equipmentLost).toBe(true)
    expect(spell!.escape?.onSuccess?.goldLostPercent).toBe(90)
  })

  it('success rate scales with caster level', () => {
    const spell = SpellDataLoader.getSpell('loktofeit')
    expect(spell!.escape?.typed?.type).toBe('level_scaled')
    expect(spell!.escape?.typed?.variable).toBe('caster_level')
    expect(spell!.escape?.typed?.multiplier).toBe(2)
  })

  it('on success recalls to town but loses equipment and gold', () => {
    RandomService.queueNextValues([0.01])
    const caster = createTestCharacter({ level: 10 })

    const effect = SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster])

    expect(effect.recall).toBeDefined()
    expect(effect.recall!.success).toBe(true)
    expect(effect.recall!.equipmentLost).toBe(true)
    expect(effect.recall!.goldLostPercent).toBe(90)
    expect(effect.message).toContain('equipment')
  })

  it('can fail at low caster levels', () => {
    RandomService.queueNextValues([0.99])
    const caster = createTestCharacter({ level: 1 })

    const effect = SpellCastingService.resolveSpellEffect('loktofeit', caster, [caster])

    expect(effect.recall!.success).toBe(false)
    expect(effect.message).toContain('fails')
  })
})
