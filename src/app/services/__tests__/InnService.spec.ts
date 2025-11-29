import { InnService, RoomType, PartyHealPlan, PartyRestResult } from '../InnService'
import { createTestCharacter, createTestGameState } from '@testing/test-factories'
import { GameState } from '@models/GameState'
import { SpellPointPool } from '@models/SpellPoints'
import { CharacterStatus } from '@models/CharacterStatus'
import { CharacterClass } from '@models/CharacterClass'
import { RandomService } from '../RandomService'

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

  describe('executePartyRest', () => {
    it('heals all living characters and deducts gold', () => {
      const char1 = createTestCharacter({ id: 'char1', hp: 20, maxHp: 40, status: CharacterStatus.OK })
      const char2 = createTestCharacter({ id: 'char2', hp: 30, maxHp: 40, status: CharacterStatus.OK })

      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 2000,
          members: ['char1', 'char2']
        },
        roster: new Map([
          ['char1', char1],
          ['char2', char2]
        ])
      }

      const plan: PartyHealPlan = {
        roomTier: RoomType.ROYAL_SUITE,
        weeksNeeded: 2,
        totalCost: 2000,
        canAffordFull: true,
        hpPerCharacter: new Map([['char1', 20], ['char2', 10]])
      }

      const result = InnService.executePartyRest(state, plan, false)

      expect(result.goldSpent).toBe(2000)
      expect(result.weeksRested).toBe(2)
      expect(result.goldRemaining).toBe(0)
      expect(result.perCharacter.get('char1')?.hpAfter).toBe(40)
      expect(result.perCharacter.get('char2')?.hpAfter).toBe(40)
    })

    it('restores spell points when restoreSpells is true', () => {
      const depleted: SpellPointPool = {
        level1: { current: 1, max: 4 },
        level2: { current: 0, max: 2 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const mage = createTestCharacter({
        id: 'mage1',
        class: CharacterClass.MAGE,
        hp: 20,
        maxHp: 20,
        status: CharacterStatus.OK,
        spellPoints: { mage: depleted }
      })

      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 0,
          members: ['mage1']
        },
        roster: new Map([['mage1', mage]])
      }

      const plan: PartyHealPlan = {
        roomTier: RoomType.STABLES,
        weeksNeeded: 1,
        totalCost: 0,
        canAffordFull: true,
        hpPerCharacter: new Map()
      }

      const result = InnService.executePartyRest(state, plan, true)

      const updatedMage = result.updatedState.roster.get('mage1')!
      expect(updatedMage.spellPoints?.mage?.level1.current).toBe(4)
      expect(updatedMage.spellPoints?.mage?.level2.current).toBe(2)
      expect(result.perCharacter.get('mage1')?.spellsRestored).toBe(true)
    })

    it('does not restore spell points when restoreSpells is false', () => {
      const depleted: SpellPointPool = {
        level1: { current: 1, max: 4 },
        level2: { current: 0, max: 2 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }
      const mage = createTestCharacter({
        id: 'mage1',
        class: CharacterClass.MAGE,
        hp: 10,
        maxHp: 20,
        status: CharacterStatus.OK,
        spellPoints: { mage: depleted }
      })

      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 1000,
          members: ['mage1']
        },
        roster: new Map([['mage1', mage]])
      }

      const plan: PartyHealPlan = {
        roomTier: RoomType.ROYAL_SUITE,
        weeksNeeded: 1,
        totalCost: 500,
        canAffordFull: true,
        hpPerCharacter: new Map([['mage1', 10]])
      }

      const result = InnService.executePartyRest(state, plan, false)

      const updatedMage = result.updatedState.roster.get('mage1')!
      expect(updatedMage.spellPoints?.mage?.level1.current).toBe(1) // unchanged
      expect(updatedMage.spellPoints?.mage?.level2.current).toBe(0) // unchanged
      expect(result.perCharacter.get('mage1')?.spellsRestored).toBe(false)
    })

    it('triggers level-ups for characters with enough XP', () => {
      // Queue random values for HP roll during level-up
      RandomService.queueNextValues([0.7]) // HP roll

      const fighter = createTestCharacter({
        id: 'fighter1',
        name: 'BOLDAR',
        class: CharacterClass.FIGHTER,
        hp: 20,
        maxHp: 20,
        level: 1,
        status: CharacterStatus.OK,
        experience: 3000 // Enough to level up (needs 2262 for level 2 Fighter)
      })

      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 1000,
          members: ['fighter1']
        },
        roster: new Map([['fighter1', fighter]])
      }

      const plan: PartyHealPlan = {
        roomTier: RoomType.STABLES,
        weeksNeeded: 1,
        totalCost: 0,
        canAffordFull: true,
        hpPerCharacter: new Map()
      }

      const result = InnService.executePartyRest(state, plan, false)

      expect(result.levelUps.length).toBe(1)
      expect(result.levelUps[0].characterId).toBe('fighter1')
      expect(result.levelUps[0].characterName).toBe('BOLDAR')
      expect(result.levelUps[0].newLevel).toBe(2)
    })

    it('learns new spells when caster levels up', () => {
      // Queue random values for HP roll during level-up
      RandomService.queueNextValues([0.5]) // HP roll

      // Create a level 2 priest with enough XP to hit level 3
      // Level 3 priests gain access to level 2 priest spells
      const priest = createTestCharacter({
        id: 'priest1',
        name: 'ACOLYTE',
        class: CharacterClass.PRIEST,
        hp: 15,
        maxHp: 15,
        level: 2,
        status: CharacterStatus.OK,
        experience: 8000, // Needs 4536 for level 3 Priest
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 }, // No L2 spells yet
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        },
        knownSpells: ['DIOS', 'BADIOS', 'KALKI', 'MILWA'] // L1 priest spells
      })

      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 1000,
          members: ['priest1']
        },
        roster: new Map([['priest1', priest]])
      }

      const plan: PartyHealPlan = {
        roomTier: RoomType.STABLES,
        weeksNeeded: 1,
        totalCost: 0,
        canAffordFull: true,
        hpPerCharacter: new Map()
      }

      const result = InnService.executePartyRest(state, plan, false)

      // Verify level-up occurred
      expect(result.levelUps.length).toBe(1)
      expect(result.levelUps[0].characterId).toBe('priest1')
      expect(result.levelUps[0].newLevel).toBe(3)

      // Verify new spells were learned (L2 priest spells)
      const newSpells = result.levelUps[0].newSpells
      expect(newSpells.length).toBeGreaterThan(0)
      // Verify newSpells contains spell names (strings), not Spell objects
      expect(typeof newSpells[0]).toBe('string')

      // Verify the updated character has the new spells in knownSpells
      const updatedPriest = result.updatedState.roster.get('priest1')!
      expect(updatedPriest.knownSpells.length).toBeGreaterThan(priest.knownSpells.length)
    })

    it('does not trigger level-up when HP not at max after rest', () => {
      const fighter = createTestCharacter({
        id: 'fighter1',
        class: CharacterClass.FIGHTER,
        hp: 5,
        maxHp: 100, // Needs lots of healing
        level: 1,
        status: CharacterStatus.OK,
        experience: 2000
      })

      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 50,
          members: ['fighter1']
        },
        roster: new Map([['fighter1', fighter]])
      }

      // Partial heal - only 5 weeks at barracks = 5 HP
      const plan: PartyHealPlan = {
        roomTier: RoomType.BARRACKS,
        weeksNeeded: 5,
        totalCost: 50,
        canAffordFull: false,
        hpPerCharacter: new Map([['fighter1', 95]])
      }

      const result = InnService.executePartyRest(state, plan, false)

      expect(result.levelUps.length).toBe(0)
      // HP should be 10 (5 + 5)
      expect(result.perCharacter.get('fighter1')?.hpAfter).toBe(10)
    })

    it('skips dead characters', () => {
      const living = createTestCharacter({ id: 'char1', hp: 20, maxHp: 40, status: CharacterStatus.OK })
      const dead = createTestCharacter({ id: 'char2', hp: 0, maxHp: 40, status: CharacterStatus.DEAD })

      const state: GameState = {
        ...createTestGameState(),
        party: {
          ...createTestGameState().party,
          gold: 1000,
          members: ['char1', 'char2']
        },
        roster: new Map([
          ['char1', living],
          ['char2', dead]
        ])
      }

      const plan: PartyHealPlan = {
        roomTier: RoomType.ROYAL_SUITE,
        weeksNeeded: 2,
        totalCost: 1000,
        canAffordFull: true,
        hpPerCharacter: new Map([['char1', 20]])
      }

      const result = InnService.executePartyRest(state, plan, false)

      // Living character healed
      expect(result.perCharacter.get('char1')?.hpAfter).toBe(40)
      // Dead character not in results
      expect(result.perCharacter.has('char2')).toBe(false)
    })
  })

  describe('hasDepletedSpellPoints', () => {
    it('returns true when mage has depleted spell points', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        status: CharacterStatus.OK,
        spellPoints: {
          mage: {
            level1: { current: 1, max: 4 }, // depleted
            level2: { current: 2, max: 2 }, // full
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      expect(InnService.hasDepletedSpellPoints(mage)).toBe(true)
    })

    it('returns false when all spell points are full', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        status: CharacterStatus.OK,
        spellPoints: {
          mage: {
            level1: { current: 4, max: 4 },
            level2: { current: 2, max: 2 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      expect(InnService.hasDepletedSpellPoints(mage)).toBe(false)
    })

    it('returns false for non-caster classes', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER })
      expect(InnService.hasDepletedSpellPoints(fighter)).toBe(false)
    })
  })

  describe('partyHasDepletedSpellPoints', () => {
    it('returns true if any party member has depleted spells', () => {
      const characters = [
        createTestCharacter({ class: CharacterClass.FIGHTER, status: CharacterStatus.OK }),
        createTestCharacter({
          class: CharacterClass.MAGE,
          status: CharacterStatus.OK,
          spellPoints: {
            mage: {
              level1: { current: 0, max: 4 },
              level2: { current: 0, max: 0 },
              level3: { current: 0, max: 0 },
              level4: { current: 0, max: 0 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })
      ]

      expect(InnService.partyHasDepletedSpellPoints(characters)).toBe(true)
    })

    it('returns false if no casters in party', () => {
      const characters = [
        createTestCharacter({ class: CharacterClass.FIGHTER, status: CharacterStatus.OK }),
        createTestCharacter({ class: CharacterClass.THIEF, status: CharacterStatus.OK })
      ]

      expect(InnService.partyHasDepletedSpellPoints(characters)).toBe(false)
    })

    it('returns false if all caster spells are full', () => {
      const characters = [
        createTestCharacter({ class: CharacterClass.FIGHTER, status: CharacterStatus.OK }),
        createTestCharacter({
          class: CharacterClass.MAGE,
          status: CharacterStatus.OK,
          spellPoints: {
            mage: {
              level1: { current: 4, max: 4 },
              level2: { current: 2, max: 2 },
              level3: { current: 0, max: 0 },
              level4: { current: 0, max: 0 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })
      ]

      expect(InnService.partyHasDepletedSpellPoints(characters)).toBe(false)
    })
  })

  describe('partyHasCasters', () => {
    it('returns true if party has a caster', () => {
      const characters = [
        createTestCharacter({ class: CharacterClass.FIGHTER, status: CharacterStatus.OK }),
        createTestCharacter({
          class: CharacterClass.MAGE,
          status: CharacterStatus.OK,
          spellPoints: {
            mage: {
              level1: { current: 4, max: 4 },
              level2: { current: 0, max: 0 },
              level3: { current: 0, max: 0 },
              level4: { current: 0, max: 0 },
              level5: { current: 0, max: 0 },
              level6: { current: 0, max: 0 },
              level7: { current: 0, max: 0 }
            }
          }
        })
      ]

      expect(InnService.partyHasCasters(characters)).toBe(true)
    })

    it('returns false if no casters in party', () => {
      const characters = [
        createTestCharacter({ class: CharacterClass.FIGHTER, status: CharacterStatus.OK }),
        createTestCharacter({ class: CharacterClass.THIEF, status: CharacterStatus.OK })
      ]

      expect(InnService.partyHasCasters(characters)).toBe(false)
    })
  })
})
