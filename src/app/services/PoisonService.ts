/**
 * PoisonService - Handles poison damage-over-time effects
 *
 * Per Wizardry 1 spec:
 * - 25% chance per maze step for poison to activate
 * - 1 HP damage when poison activates
 * - Poison CAN kill (HP → 0 → DEAD status)
 *
 * Reference: https://www.zimlab.com/wizardry/walk/wizardry-123-game-calculations.htm
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { RandomService } from './RandomService'

export interface MazePoisonResult {
  updatedCharacters: Map<string, Character>
  messages: string[]
  anyDamaged: boolean
}

export const PoisonService = {
  /**
   * Apply poison damage during maze movement
   *
   * Per Wizardry 1: 25% chance per step, 1 HP damage, can kill
   * Only affects characters with POISONED status and hp > 0
   */
  applyMazePoison(party: Character[]): MazePoisonResult {
    const updatedCharacters = new Map<string, Character>()
    const messages: string[] = []
    let anyDamaged = false

    for (const char of party) {
      // Only affects POISONED characters who are still alive
      if (char.status !== CharacterStatus.POISONED || char.hp <= 0) {
        continue
      }

      // 25% chance per step
      if (!RandomService.chance(25)) {
        continue
      }

      anyDamaged = true
      const newHp = char.hp - 1

      if (newHp <= 0) {
        // Character dies from poison
        const deadChar: Character = {
          ...char,
          hp: 0,
          status: CharacterStatus.DEAD
        }
        updatedCharacters.set(char.id, deadChar)
        messages.push(`${char.name} succumbs to poison!`)
      } else {
        // Character takes damage but survives
        const damagedChar: Character = {
          ...char,
          hp: newHp
        }
        updatedCharacters.set(char.id, damagedChar)
        messages.push(`${char.name} takes poison damage!`)
      }
    }

    return { updatedCharacters, messages, anyDamaged }
  },

  /**
   * Check if all party members are dead (for party wipe detection)
   *
   * Considers both original party array and any updated characters
   * from poison damage in the same step
   */
  isPartyWiped(
    party: Character[],
    updatedCharacters: Map<string, Character>
  ): boolean {
    return party.every(char => {
      const updated = updatedCharacters.get(char.id)
      const checkChar = updated || char
      return (
        checkChar.status === CharacterStatus.DEAD ||
        checkChar.status === CharacterStatus.ASHES ||
        checkChar.status === CharacterStatus.LOST ||
        checkChar.hp <= 0
      )
    })
  }
}
