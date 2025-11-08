// src/services/VictoryService.ts
import { MonsterInstance } from '../types/Combat'
import { Character } from '../types/Character'

export interface VictoryRewards {
  totalXP: number
  xpPerCharacter: number
  totalGold: number
}

export class VictoryService {
  /**
   * Calculate XP and gold rewards from defeated monsters
   * XP is divided evenly among party members (rounded down)
   * Gold goes to party pool
   */
  static calculateVictoryRewards(
    monsters: MonsterInstance[],
    partySize: number
  ): VictoryRewards {
    const totalXP = monsters.reduce((sum, m) => sum + m.xp, 0)
    const totalGold = monsters.reduce((sum, m) => sum + (m.gold || 0), 0)

    return {
      totalXP,
      xpPerCharacter: Math.floor(totalXP / partySize),
      totalGold
    }
  }

  /**
   * Distribute rewards to party members
   * Returns new roster Map with updated characters (immutable)
   */
  static distributeRewards(
    roster: Map<string, Character>,
    partyMembers: string[],
    xpPerCharacter: number,
    totalGold: number
  ): Map<string, Character> {
    const newRoster = new Map(roster)

    // Add XP to each party member
    for (const memberId of partyMembers) {
      const character = newRoster.get(memberId)
      if (!character) continue

      newRoster.set(memberId, {
        ...character,
        experience: character.experience + xpPerCharacter
      })
    }

    return newRoster
  }
}
