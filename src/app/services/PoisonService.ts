/**
 * PoisonService - Handles poison damage-over-time effects
 *
 * Per Wizardry 1 spec:
 * - 25% chance per round/step for poison to activate
 * - 1 HP damage when poison activates (does NOT stack)
 * - Poison CAN kill (HP → 0 → DEAD status)
 * - Applies to both characters (maze + combat) and monsters (combat only)
 *
 * Reference: https://www.zimlab.com/wizardry/walk/wizardry-123-game-calculations.htm
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { CombatState } from '@models/Combat'
import { GameState } from '@models/GameState'
import { GameStateQueries } from '@utils/GameStateQueries'
import { getMonsterDisplayName } from '@utils/MonsterNameUtils'
import { applyDamageToCharacter, applyDamage, getAllMonsters } from './combat/core/DamageApplicationService'
import { getStatusDuration } from './combat/core/StatusEffectService'
import { RandomService } from './RandomService'

/**
 * Poison activation chance (25% per round/step)
 */
const POISON_ACTIVATION_CHANCE = 25

/**
 * Poison damage per tick (always 1 HP)
 */
const POISON_DAMAGE = 1

export interface MazePoisonResult {
  updatedCharacters: Map<string, Character>
  messages: string[]
  anyDamaged: boolean
}

export interface CombatPoisonResult {
  newState: CombatState
  damagedCharacters: Map<string, Character>
  messages: string[]
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
      if (!RandomService.chance(POISON_ACTIVATION_CHANCE)) {
        continue
      }

      anyDamaged = true
      const newHp = char.hp - POISON_DAMAGE

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
  },

  /**
   * Apply maze poison damage to state - returns complete state
   *
   * This follows the "Components as Presenters" pattern by handling
   * all state updates within the service layer.
   *
   * @param state - Current game state
   * @returns Object with updated state and messages
   */
  applyMazePoisonToState(state: GameState): { state: GameState; messages: string[] } {
    const partyChars = GameStateQueries.partyCharacters(state)
    const result = this.applyMazePoison(partyChars)

    if (!result.anyDamaged) {
      return { state, messages: [] }
    }

    // Apply updated characters to roster
    const newRoster = new Map(state.roster)
    for (const [charId, char] of result.updatedCharacters) {
      newRoster.set(charId, char)
    }

    return {
      state: { ...state, roster: newRoster },
      messages: result.messages
    }
  },

  /**
   * Apply poison damage to all poisoned combatants during combat
   *
   * Per Wizardry 1: 25% chance per round, 1 HP damage
   * Applies to both characters and monsters with poison status
   *
   * @param state - Current combat state
   * @param party - Party characters
   * @returns Updated state, damaged characters, and messages
   */
  applyPoisonDamage(
    state: CombatState,
    party: Character[]
  ): CombatPoisonResult {
    let currentState = state
    const damagedCharacters = new Map<string, Character>()
    const messages: string[] = []

    // Check party members for poison
    for (const char of party) {
      if (char.status === CharacterStatus.POISONED && char.hp > 0) {
        // 25% chance per round for poison to activate
        if (!RandomService.chance(POISON_ACTIVATION_CHANCE)) {
          continue
        }

        // Poison always does 1 HP damage (per spec, does NOT stack)
        const damagedChar = applyDamageToCharacter(char, POISON_DAMAGE)
        damagedCharacters.set(char.id, damagedChar)

        if (damagedChar.hp <= 0) {
          messages.push(`${char.name} succumbs to poison!`)
        } else {
          messages.push(`${char.name} takes poison damage!`)
        }
      }
    }

    // Check monsters for poison
    for (const monster of getAllMonsters(currentState)) {
      if (monster.status === 'ALIVE' && monster.hp > 0) {
        const duration = getStatusDuration(currentState, monster.id, 'POISONED')
        if (duration > 0) {
          // 25% chance per round for poison to activate
          if (!RandomService.chance(POISON_ACTIVATION_CHANCE)) {
            continue
          }

          // Poison always does 1 HP damage
          currentState = applyDamage(currentState, monster, POISON_DAMAGE)

          // Get display name based on group identification status
          const group = currentState.monsterGroups.find(g =>
            g.monsters.some(m => m.id === monster.id)
          )
          const displayName = getMonsterDisplayName(monster, group?.identified ?? false)
          messages.push(`${displayName} takes poison damage!`)
        }
      }
    }

    return {
      newState: currentState,
      damagedCharacters,
      messages,
    }
  }
}
