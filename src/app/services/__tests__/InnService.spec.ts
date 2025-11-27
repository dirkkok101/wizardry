import { InnService, RoomType, PartyHealPlan } from '../InnService'
import { createTestCharacter, createTestGameState } from '@testing/test-factories'
import { GameState } from '@models/GameState'
import { SpellPointPool } from '@models/SpellPoints'
import { CharacterStatus } from '@models/CharacterStatus'

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

    it('restores spell points when resting in STABLES', () => {
      const depleted: SpellPointPool = {
        level1: { current: 0, max: 3 },
        level2: { current: 0, max: 2 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        spellPoints: { mage: depleted }
      })
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 0
        }
      }

      const result = InnService.restOneWeek(state, character, RoomType.STABLES)

      expect(result.spellPointsRestored).toBe(true)
      expect(result.updatedCharacter.spellPoints?.mage?.level1.current).toBe(3)
      expect(result.updatedCharacter.spellPoints?.mage?.level2.current).toBe(2)
    })

    it('does NOT restore spell points when resting in BARRACKS', () => {
      const depleted: SpellPointPool = {
        level1: { current: 0, max: 3 },
        level2: { current: 0, max: 2 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        spellPoints: { mage: depleted }
      })
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 100
        }
      }

      const result = InnService.restOneWeek(state, character, RoomType.BARRACKS)

      expect(result.spellPointsRestored).toBe(false)
      expect(result.updatedCharacter.spellPoints?.mage?.level1.current).toBe(0)
    })

    it('does NOT restore spell points when resting in ROYAL_SUITE', () => {
      const depleted: SpellPointPool = {
        level1: { current: 1, max: 5 },
        level2: { current: 0, max: 3 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const character = createTestCharacter({
        hp: 10,
        maxHp: 20,
        spellPoints: { mage: depleted }
      })
      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 1000
        }
      }

      const result = InnService.restOneWeek(state, character, RoomType.ROYAL_SUITE)

      expect(result.spellPointsRestored).toBe(false)
      expect(result.updatedCharacter.spellPoints?.mage?.level1.current).toBe(1)
      expect(result.updatedCharacter.spellPoints?.mage?.level2.current).toBe(0)
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

  describe('calculatePartyHealPlan', () => {
    it('returns Royal Suite when party can afford fastest healing', () => {
      const characters = [
        createTestCharacter({ id: 'char1', hp: 20, maxHp: 40, status: CharacterStatus.OK }),
        createTestCharacter({ id: 'char2', hp: 30, maxHp: 40, status: CharacterStatus.OK }),
      ]
      const partyGold = 2000

      const plan = InnService.calculatePartyHealPlan(characters, partyGold)

      expect(plan.roomTier).toBe(RoomType.ROYAL_SUITE)
      expect(plan.weeksNeeded).toBe(2) // max(20/10, 10/10) = 2 weeks
      expect(plan.totalCost).toBe(2000) // 2 weeks * 500gp * 2 chars
      expect(plan.canAffordFull).toBe(true)
    })

    it('cascades to cheaper room when cannot afford Royal Suite', () => {
      const characters = [
        createTestCharacter({ id: 'char1', hp: 20, maxHp: 40, status: CharacterStatus.OK }),
      ]
      const partyGold = 500 // Can't afford 2 weeks at Royal (1000gp)

      const plan = InnService.calculatePartyHealPlan(characters, partyGold)

      // Royal: 500gp/week, 10 HP/week -> 2 weeks = 1000gp - can't afford
      // Private: 200gp/week, 7 HP/week -> 3 weeks (21 HP) = 600gp - can't afford
      // Double: 50gp/week, 3 HP/week -> 7 weeks (21 HP) = 350gp - CAN afford
      expect(plan.roomTier).toBe(RoomType.DOUBLE)
      expect(plan.weeksNeeded).toBe(7)
      expect(plan.totalCost).toBe(350)
      expect(plan.canAffordFull).toBe(true)
    })

    it('returns partial heal plan at Barracks when cannot afford full heal', () => {
      const characters = [
        createTestCharacter({ id: 'char1', hp: 10, maxHp: 100, status: CharacterStatus.OK }),
      ]
      const partyGold = 50 // Very limited

      const plan = InnService.calculatePartyHealPlan(characters, partyGold)

      // Barracks: 10gp/week, 1 HP/week
      // Full heal needs 90 weeks = 900gp (can't afford)
      // 50gp = 5 weeks = 5 HP healed (partial)
      expect(plan.roomTier).toBe(RoomType.BARRACKS)
      expect(plan.canAffordFull).toBe(false)
      expect(plan.weeksNeeded).toBe(5)
      expect(plan.totalCost).toBe(50)
    })

    it('excludes dead characters from calculation', () => {
      const characters = [
        createTestCharacter({ id: 'char1', hp: 20, maxHp: 40, status: CharacterStatus.OK }),
        createTestCharacter({ id: 'char2', hp: 0, maxHp: 40, status: CharacterStatus.DEAD }),
      ]
      const partyGold = 1000

      const plan = InnService.calculatePartyHealPlan(characters, partyGold)

      // Only 1 living char, 20 HP needed, Royal Suite
      expect(plan.weeksNeeded).toBe(2)
      expect(plan.totalCost).toBe(1000) // 2 weeks * 500gp * 1 living char
    })

    it('returns zero plan when all characters at full HP', () => {
      const characters = [
        createTestCharacter({ id: 'char1', hp: 40, maxHp: 40, status: CharacterStatus.OK }),
        createTestCharacter({ id: 'char2', hp: 40, maxHp: 40, status: CharacterStatus.OK }),
      ]

      const plan = InnService.calculatePartyHealPlan(characters, 1000)

      expect(plan.weeksNeeded).toBe(0)
      expect(plan.totalCost).toBe(0)
      expect(plan.canAffordFull).toBe(true)
    })

    it('handles multiple characters with different HP needs', () => {
      const characters = [
        createTestCharacter({ id: 'char1', hp: 0, maxHp: 30, status: CharacterStatus.OK }), // needs 30 HP
        createTestCharacter({ id: 'char2', hp: 10, maxHp: 20, status: CharacterStatus.OK }), // needs 10 HP
        createTestCharacter({ id: 'char3', hp: 25, maxHp: 25, status: CharacterStatus.OK }), // needs 0 HP (full)
      ]
      const partyGold = 5000

      const plan = InnService.calculatePartyHealPlan(characters, partyGold)

      // Max HP needed is 30, Royal Suite heals 10/week = 3 weeks
      // Only 2 chars need healing (char3 is at full HP), so cost = 3 * 500 * 2 = 3000gp
      expect(plan.roomTier).toBe(RoomType.ROYAL_SUITE)
      expect(plan.weeksNeeded).toBe(3)
      expect(plan.totalCost).toBe(3000)
    })
  })
})
