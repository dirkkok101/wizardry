/**
 * Integration tests for MAPORFIC spell
 * MAPORFIC is an expedition-lasting AC buff (-2 AC to all party members)
 * Unlike MATU which only lasts during combat, MAPORFIC persists until leaving the dungeon
 * @see data/spells/maporfic.json
 */
import {
  SpellDataLoader,
  SpellCastingService,
  createTestCharacter
} from '../../spell-test-helpers'
import { loadSpellsForTests } from '@testing/test-data-loader'

describe('MAPORFIC (Level 4 Priest) - Shield All', () => {
  beforeAll(async () => {
    await loadSpellsForTests()
  })
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

  it('has expedition duration (lasts entire dungeon expedition)', () => {
    const spell = SpellDataLoader.getSpell('maporfic')
    expect(spell!.buffDuration).toBe('expedition')
  })

  it('can be cast in both combat and camp', () => {
    const spell = SpellDataLoader.getSpell('maporfic')
    expect(spell!.castableIn).toContain('combat')
    expect(spell!.castableIn).toContain('camp')
  })

  // Note: When cast via SpellCastingService (combat path), still returns acBuffs
  // The expedition duration is handled by the maze component's applyDungeonSpellEffect
  it('returns AC buff effect when resolved through SpellCastingService', () => {
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
