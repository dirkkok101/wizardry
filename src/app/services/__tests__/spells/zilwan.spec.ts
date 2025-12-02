/**
 * Integration tests for ZILWAN spell
 * @see data/spells/zilwan.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter,
  createTestMonster
} from '../spell-test-helpers'

describe('ZILWAN (Level 6 Mage) - Undead Only', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('zilwan')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('zilwan')
    expect(spell!.name).toBe('ZILWAN')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('zilwan')
    expect(spell!.level).toBe(6)
    expect(spell!.casterType).toBe('mage')
    expect(spell!.category).toBe('offensive')
    expect(spell!.undeadOnly).toBe(true)
    expect(spell!.damage?.dice).toBe('10d200')
    expect(spell!.damage?.type).toBe('holy')
  })

  it('has no effect on living creatures', () => {
    const caster = createTestCharacter()
    const livingTarget = createTestMonster({ id: 't1', undead: false })

    const effect = SpellCastingService.resolveSpellEffect('zilwan', caster, [livingTarget])

    expect(effect.message).toContain('no effect')
  })

  it('deals massive damage to undead', () => {
    const caster = createTestCharacter()
    const undeadTarget = createTestMonster({ id: 't1', undead: true, name: 'Skeleton' })

    const effect = SpellCastingService.resolveSpellEffect('zilwan', caster, [undeadTarget])

    expect(effect.damage).toBeDefined()
    expect(effect.damage![0]).toBeGreaterThanOrEqual(10)
  })
})
