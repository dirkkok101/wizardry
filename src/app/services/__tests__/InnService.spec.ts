import { InnService, RoomType } from '../InnService'
import { createTestCharacter, createTestGameState } from '@testing/test-factories'
import { GameState } from '@models/GameState'
import { SpellPointPool } from '@models/SpellPoints'

describe('InnService', () => {
  describe('getRoomCost', () => {
    it('returns 0 for STABLES', () => {
      expect(InnService.getRoomCost(RoomType.STABLES)).toBe(0)
    })

    it('returns 10 for BARRACKS', () => {
      expect(InnService.getRoomCost(RoomType.BARRACKS)).toBe(10)
    })

    it('returns 50 for DOUBLE', () => {
      expect(InnService.getRoomCost(RoomType.DOUBLE)).toBe(50)
    })

    it('returns 200 for PRIVATE', () => {
      expect(InnService.getRoomCost(RoomType.PRIVATE)).toBe(200)
    })

    it('returns 500 for ROYAL_SUITE', () => {
      expect(InnService.getRoomCost(RoomType.ROYAL_SUITE)).toBe(500)
    })
  })

  describe('getRoomHealRate', () => {
    it('returns 0 HP/week for STABLES', () => {
      expect(InnService.getRoomHealRate(RoomType.STABLES)).toBe(0)
    })

    it('returns 1 HP/week for BARRACKS', () => {
      expect(InnService.getRoomHealRate(RoomType.BARRACKS)).toBe(1)
    })

    it('returns 3 HP/week for DOUBLE', () => {
      expect(InnService.getRoomHealRate(RoomType.DOUBLE)).toBe(3)
    })

    it('returns 7 HP/week for PRIVATE', () => {
      expect(InnService.getRoomHealRate(RoomType.PRIVATE)).toBe(7)
    })

    it('returns 10 HP/week for ROYAL_SUITE', () => {
      expect(InnService.getRoomHealRate(RoomType.ROYAL_SUITE)).toBe(10)
    })
  })

  describe('canAffordRoom', () => {
    it('returns true when party has enough gold', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      }

      const result = InnService.canAffordRoom(state, RoomType.BARRACKS)

      expect(result.allowed).toBe(true)
    })

    it('returns false when party lacks gold', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 5
        }
      }

      const result = InnService.canAffordRoom(state, RoomType.BARRACKS)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Not enough gold. Need 10, have 5.')
    })

    it('always allows STABLES (free)', () => {
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 0
        }
      }

      const result = InnService.canAffordRoom(state, RoomType.STABLES)

      expect(result.allowed).toBe(true)
    })
  })

  describe('restOneWeek', () => {
    it('heals character by room heal rate', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20
      })
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      }

      const result = InnService.restOneWeek(state, character, RoomType.BARRACKS)

      expect(result.updatedCharacter.hp).toBe(11) // 10 + 1 (barracks)
    })

    it('does not exceed max HP', () => {
      const character = createTestCharacter({
        hp: 19,
        maxHp: 20
      })
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      }

      const result = InnService.restOneWeek(state, character, RoomType.DOUBLE)

      expect(result.updatedCharacter.hp).toBe(20) // Capped at max HP
    })

    it('deducts room cost from party gold', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20
      })
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      }

      const result = InnService.restOneWeek(state, character, RoomType.BARRACKS)

      expect(result.updatedState.party.gold).toBe(90) // 100 - 10
    })

    it('returns isFullyHealed true when HP reaches max', () => {
      const character = createTestCharacter({
        hp: 19,
        maxHp: 20
      })
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      }

      const result = InnService.restOneWeek(state, character, RoomType.BARRACKS)

      expect(result.isFullyHealed).toBe(true)
    })

    it('returns isFullyHealed false when HP not at max', () => {
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20
      })
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      }

      const result = InnService.restOneWeek(state, character, RoomType.BARRACKS)

      expect(result.isFullyHealed).toBe(false)
    })
  })

  describe('restoreSpellPoints', () => {
    it('restores all mage spell points to maximum', () => {
      const depleted: SpellPointPool = {
        level1: { current: 1, max: 3 },
        level2: { current: 0, max: 2 },
        level3: { current: 0, max: 1 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const character = createTestCharacter({
        spellPoints: { mage: depleted }
      })

      const result = InnService.restoreSpellPoints(character)

      expect(result.spellPoints?.mage?.level1.current).toBe(3)
      expect(result.spellPoints?.mage?.level2.current).toBe(2)
      expect(result.spellPoints?.mage?.level3.current).toBe(1)
    })

    it('restores all priest spell points to maximum', () => {
      const depleted: SpellPointPool = {
        level1: { current: 0, max: 4 },
        level2: { current: 1, max: 3 },
        level3: { current: 0, max: 2 },
        level4: { current: 0, max: 1 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const character = createTestCharacter({
        spellPoints: { priest: depleted }
      })

      const result = InnService.restoreSpellPoints(character)

      expect(result.spellPoints?.priest?.level1.current).toBe(4)
      expect(result.spellPoints?.priest?.level2.current).toBe(3)
      expect(result.spellPoints?.priest?.level3.current).toBe(2)
      expect(result.spellPoints?.priest?.level4.current).toBe(1)
    })

    it('restores both mage and priest spell points for Bishop', () => {
      const depletedMage: SpellPointPool = {
        level1: { current: 0, max: 2 },
        level2: { current: 0, max: 1 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const depletedPriest: SpellPointPool = {
        level1: { current: 0, max: 2 },
        level2: { current: 0, max: 1 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const character = createTestCharacter({
        spellPoints: { mage: depletedMage, priest: depletedPriest }
      })

      const result = InnService.restoreSpellPoints(character)

      expect(result.spellPoints?.mage?.level1.current).toBe(2)
      expect(result.spellPoints?.mage?.level2.current).toBe(1)
      expect(result.spellPoints?.priest?.level1.current).toBe(2)
      expect(result.spellPoints?.priest?.level2.current).toBe(1)
    })

    it('returns character unchanged if no spellPoints', () => {
      const character = createTestCharacter({
        spellPoints: undefined
      })

      const result = InnService.restoreSpellPoints(character)

      expect(result).toEqual(character)
    })
  })
})
