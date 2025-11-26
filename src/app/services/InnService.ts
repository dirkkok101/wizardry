import { Character } from '@models/Character'
import { GameState } from '@models/GameState'
import { SpellPointPool } from '@models/SpellPoints'
import * as PartyService from './PartyService'

export enum RoomType {
  STABLES = 'STABLES',
  BARRACKS = 'BARRACKS',
  DOUBLE = 'DOUBLE',
  PRIVATE = 'PRIVATE',
  ROYAL_SUITE = 'ROYAL_SUITE'
}

interface ValidationResult {
  allowed: boolean
  reason?: string
}

interface RestResult {
  updatedCharacter: Character
  updatedState: GameState
  isFullyHealed: boolean
  goldSpent: number
  hpRecovered: number
  spellPointsRestored: boolean
}

const ROOM_COSTS: Record<RoomType, number> = {
  [RoomType.STABLES]: 0,
  [RoomType.BARRACKS]: 10,
  [RoomType.DOUBLE]: 50,
  [RoomType.PRIVATE]: 200,
  [RoomType.ROYAL_SUITE]: 500
}

const ROOM_HEAL_RATES: Record<RoomType, number> = {
  [RoomType.STABLES]: 0,
  [RoomType.BARRACKS]: 1,
  [RoomType.DOUBLE]: 3,
  [RoomType.PRIVATE]: 7,
  [RoomType.ROYAL_SUITE]: 10
}

export class InnService {
  /**
   * Get cost per week for room type
   */
  static getRoomCost(roomType: RoomType): number {
    return ROOM_COSTS[roomType]
  }

  /**
   * Get HP healed per week for room type
   */
  static getRoomHealRate(roomType: RoomType): number {
    return ROOM_HEAL_RATES[roomType]
  }

  /**
   * Check if party can afford room
   */
  static canAffordRoom(state: GameState, roomType: RoomType): ValidationResult {
    const cost = this.getRoomCost(roomType)

    if (cost === 0) {
      return { allowed: true }
    }

    const partyGold = state.party.gold

    if (!PartyService.hasEnoughGold(state, cost)) {
      return {
        allowed: false,
        reason: `Not enough gold. Need ${cost}, have ${partyGold}.`
      }
    }

    return { allowed: true }
  }

  /**
   * Rest character for one week
   * Heals HP, deducts gold from party, returns updated character and state
   */
  static restOneWeek(state: GameState, character: Character, roomType: RoomType): RestResult {
    const cost = this.getRoomCost(roomType)
    const healRate = this.getRoomHealRate(roomType)

    const newHp = Math.min(character.hp + healRate, character.maxHp)

    const updatedCharacter: Character = {
      ...character,
      hp: newHp
    }

    const updatedState = PartyService.removePartyGold(state, cost)

    return {
      updatedCharacter,
      updatedState,
      isFullyHealed: newHp === character.maxHp,
      goldSpent: cost,
      hpRecovered: newHp - character.hp,
      spellPointsRestored: false
    }
  }

  /**
   * Restore all spell points to maximum for a character.
   * Only called when resting in Stables (per original Wizardry 1).
   */
  static restoreSpellPoints(character: Character): Character {
    if (!character.spellPoints) {
      return character
    }

    const restorePool = (pool: SpellPointPool): SpellPointPool => ({
      level1: { ...pool.level1, current: pool.level1.max },
      level2: { ...pool.level2, current: pool.level2.max },
      level3: { ...pool.level3, current: pool.level3.max },
      level4: { ...pool.level4, current: pool.level4.max },
      level5: { ...pool.level5, current: pool.level5.max },
      level6: { ...pool.level6, current: pool.level6.max },
      level7: { ...pool.level7, current: pool.level7.max }
    })

    return {
      ...character,
      spellPoints: {
        mage: character.spellPoints.mage
          ? restorePool(character.spellPoints.mage)
          : undefined,
        priest: character.spellPoints.priest
          ? restorePool(character.spellPoints.priest)
          : undefined
      }
    }
  }
}
