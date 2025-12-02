/**
 * Integration tests for KADORTO spell
 * @see data/spells/kadorto.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  RandomService,
  createTestCharacter,
  CharacterStatus
} from '../spell-test-helpers'

describe('KADORTO (Level 7 Priest) - Advanced Resurrection', () => {
  it('loads spell data from JSON', () => {
    const spell = SpellDataLoader.getSpell('kadorto')
    expect(spell).toBeDefined()
    expect(spell!.id).toBe('kadorto')
    expect(spell!.name).toBe('KADORTO')
  })

  it('has correct metadata', () => {
    const spell = SpellDataLoader.getSpell('kadorto')
    expect(spell!.level).toBe(7)
    expect(spell!.casterType).toBe('priest')
    expect(spell!.category).toBe('resurrection')
    expect(spell!.resurrection).toBeDefined()
    expect(spell!.resurrection?.worksOn).toContain('dead')
    expect(spell!.resurrection?.worksOn).toContain('ashes')
  })

  it('can resurrect from ashes with full HP on success', () => {
    RandomService.queueNextValues([0.1])
    const target = createTestCharacter({
      id: 'ash1',
      status: CharacterStatus.ASHES,
      vitality: 18,
      hp: 0,
      maxHp: 50
    })

    const result = SpellCastingService.resolveResurrection('kadorto', target)

    expect(result.success).toBe(true)
    expect(result.newHp).toBe(50)
    expect(result.updatedCharacter.status).toBe(CharacterStatus.OK)
  })

  it('character becomes LOST if resurrect from ashes fails', () => {
    RandomService.queueNextValues([0.99])
    const target = createTestCharacter({
      status: CharacterStatus.ASHES,
      vitality: 10
    })

    const result = SpellCastingService.resolveResurrection('kadorto', target)

    expect(result.success).toBe(false)
    expect(result.resultStatus).toBe('LOST')
    expect(result.updatedCharacter.status).toBe(CharacterStatus.LOST)
  })
})
