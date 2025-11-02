import { Character } from '../types/Character'

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
  isFullyHealed: boolean
  goldSpent: number
  hpRecovered: number
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
   * Check if character can afford room
   */
  static canAffordRoom(character: Character, roomType: RoomType): ValidationResult {
    const cost = this.getRoomCost(roomType)

    if (cost === 0) {
      return { allowed: true }
    }

    const characterGold = character.gold || 0

    if (characterGold < cost) {
      return {
        allowed: false,
        reason: `Not enough gold. Need ${cost}, have ${characterGold}.`
      }
    }

    return { allowed: true }
  }

  /**
   * Rest character for one week
   * Heals HP, deducts gold, returns updated character
   */
  static restOneWeek(character: Character, roomType: RoomType): RestResult {
    const cost = this.getRoomCost(roomType)
    const healRate = this.getRoomHealRate(roomType)

    const newHp = Math.min(character.hp + healRate, character.maxHp)
    const newGold = (character.gold || 0) - cost

    const updatedCharacter: Character = {
      ...character,
      hp: newHp,
      gold: newGold
    }

    return {
      updatedCharacter,
      isFullyHealed: newHp === character.maxHp,
      goldSpent: cost,
      hpRecovered: newHp - character.hp
    }
  }
}
