/**
 * Integration tests for DI spell
 * @see data/spells/di.json
 */
import {
  setupSpellTests,
  SpellDataLoader,
  SpellCastingService,
  RandomService,
  createTestCharacter,
  CharacterStatus
} from '../../spell-test-helpers'

setupSpellTests();

describe('DI (Level 5 Priest) - Basic Resurrection', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('di')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('di')
    expect(spell!.name).toBe('DI')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('di')
    expect(spell!.level).toBe(5)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('resurrection')
    expect(spell!.target).toBe('dead_ally')
    expect(spell!.castableIn).toContain('camp')
    expect(spell!.resurrection).toBeDefined()
    expect(spell!.resurrection?.worksOn).toContain('dead')
    expect(spell!.resurrection?.doesNotWorkOn).toContain('ashes')
  })

  it('uses vitality-based success formula', () => {
    const spell = SpellDataLoader.getSpell('di')
    expect(spell!.resurrection?.typed?.variable).toBe('vitality')
    expect(spell!.resurrection?.typed?.multiplier).toBe(4)
  })

  it('resolves resurrection on dead character with high vitality', () => {
    RandomService.queueNextValues([0.1]) // 10% roll < 40% rate (vitality 10 × 4)
    const target = createTestCharacter({
      id: 'dead1',
      status: CharacterStatus.DEAD,
      vitality: 10,
      hp: 0,
      maxHp: 30
    })

    const result = SpellCastingService.resolveResurrection('di', target)

    expect(result.success).toBe(true)
    expect(result.newHp).toBe(1)
    expect(result.vitalityLoss).toBe(1)
    expect(result.updatedCharacter.status).toBe(CharacterStatus.OK)
  })

  it('fails on ashes (DI only works on DEAD)', () => {
    const target = createTestCharacter({
      status: CharacterStatus.ASHES,
      vitality: 18
    })

    const result = SpellCastingService.resolveResurrection('di', target)

    expect(result.success).toBe(false)
    expect(result.message).toContain('cannot resurrect ashes')
  })
})
