/**
 * Poison Service
 *
 * Handles poison damage application during combat.
 *
 * Per Wizardry 1 spec:
 * - 25% chance per round for poison to activate
 * - Damage is always 1 HP (does NOT stack)
 * - Applies to both characters and monsters
 */

import { Character } from '@models/Character'
import { CombatState, MonsterInstance } from '@models/Combat'
import { CharacterStatus } from '@models/CharacterStatus'
import { RandomService } from '@services/RandomService'
import { applyDamageToCharacter, applyDamage, getAllMonsters } from '../core/DamageApplicationService'
import { getStatusDuration } from '../core/StatusEffectService'
import { getMonsterDisplayName } from '@utils/MonsterNameUtils'

// Re-export for convenience
export { PoisonService }

/**
 * Poison activation chance (25% per round)
 */
const POISON_ACTIVATION_CHANCE = 25

/**
 * Poison damage per tick (always 1 HP)
 */
const POISON_DAMAGE = 1

/**
 * Result of poison damage application
 */
export interface PoisonDamageResult {
  newState: CombatState
  damagedCharacters: Map<string, Character>
  messages: string[]
}

/**
 * Poison Service
 *
 * Handles poison damage mechanics.
 */
class PoisonService {
  /**
   * Apply poison damage to all poisoned combatants
   *
   * @param state - Current combat state
   * @param party - Party characters
   * @returns Updated state, damaged characters, and messages
   */
  static applyPoisonDamage(
    state: CombatState,
    party: Character[]
  ): PoisonDamageResult {
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

// Standalone function exports
export const applyPoisonDamage = PoisonService.applyPoisonDamage.bind(PoisonService)
