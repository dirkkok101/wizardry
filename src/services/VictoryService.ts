// src/services/VictoryService.ts
import { MonsterInstance } from '../types/Combat'
import { Character } from '../types/Character'
import { CharacterStatus } from '../types/CharacterStatus'

export interface VictoryRewards {
  totalXP: number
  xpPerCharacter: number
  totalGold: number
  livingCharacterCount: number  // Number of living characters who receive XP
}

export class VictoryService {
  /**
   * Calculate XP and gold rewards from defeated monsters
   * XP is divided evenly among LIVING party members only (dead get no XP)
   * Gold goes to party pool
   */
  static calculateVictoryRewards(
    monsters: MonsterInstance[],
    roster: Map<string, Character>,
    partyMembers: string[]
  ): VictoryRewards {
    const totalXP = monsters.reduce((sum, m) => sum + m.xp, 0)
    const totalGold = monsters.reduce((sum, m) => sum + (m.gold || 0), 0)

    // Count only living characters
    const livingCharacterCount = partyMembers.filter(id => {
      const char = roster.get(id)
      return char && char.status !== CharacterStatus.DEAD && char.hp > 0
    }).length

    // Avoid division by zero if all party members are dead
    const xpPerCharacter = livingCharacterCount > 0
      ? Math.floor(totalXP / livingCharacterCount)
      : 0

    return {
      totalXP,
      xpPerCharacter,
      totalGold,
      livingCharacterCount
    }
  }

  /**
   * Distribute rewards to LIVING party members only
   * Dead characters receive no XP
   * Returns new roster Map with updated characters (immutable)
   */
  static distributeRewards(
    roster: Map<string, Character>,
    partyMembers: string[],
    xpPerCharacter: number
  ): Map<string, Character> {
    const newRoster = new Map(roster)

    // Add XP only to living party members
    for (const memberId of partyMembers) {
      const character = newRoster.get(memberId)
      if (!character) continue

      // Dead characters get no XP
      if (character.status === CharacterStatus.DEAD || character.hp <= 0) {
        continue
      }

      newRoster.set(memberId, {
        ...character,
        experience: character.experience + xpPerCharacter
      })
    }

    return newRoster
  }
}
