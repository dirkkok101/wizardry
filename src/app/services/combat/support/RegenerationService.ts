/**
 * Regeneration Service
 *
 * Handles monster regeneration during combat.
 *
 * Per game mechanics:
 * - 25% chance per round for regeneration to trigger
 * - Heals by monster's regeneration amount
 * - Capped at maxHp
 */

import { CombatState } from '@models/Combat'
import { RandomService } from '@services/RandomService'
import { getMonsterDisplayName } from '@utils/MonsterNameUtils'
import { STATUS_RECOVERY } from '../CombatConstants'

// Re-export for convenience
export { RegenerationService }

/**
 * Result of monster regeneration processing
 */
export interface RegenerationResult {
  newState: CombatState
  messages: string[]
}

/**
 * Regeneration Service
 *
 * Handles monster regeneration mechanics.
 */
class RegenerationService {
  /**
   * Process monster regeneration for all groups
   *
   * Only affects monsters that:
   * - Are alive (status !== 'DEAD')
   * - Have regeneration ability (regeneration > 0)
   * - Are not at full HP
   *
   * @param state - Current combat state
   * @returns Updated state and regeneration messages
   */
  static processMonsterRegeneration(state: CombatState): RegenerationResult {
    const messages: string[] = []

    const newMonsterGroups = state.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(monster => {
        // Skip if dead, no regeneration ability, or already at full HP
        if (
          monster.status === 'DEAD' ||
          !monster.regeneration ||
          monster.regeneration <= 0 ||
          monster.hp >= monster.maxHp
        ) {
          return monster
        }

        // 25% chance to regenerate each round
        if (!RandomService.chance(STATUS_RECOVERY.REGENERATION_CHANCE)) {
          return monster
        }

        // Heal by regeneration amount, capped at maxHp
        const healAmount = Math.min(
          monster.regeneration,
          monster.maxHp - monster.hp
        )
        const newHp = monster.hp + healAmount

        const displayName = getMonsterDisplayName(monster, group.identified)
        messages.push(`${displayName} regenerates ${healAmount} HP!`)

        return { ...monster, hp: newHp }
      }),
    }))

    return {
      newState: { ...state, monsterGroups: newMonsterGroups },
      messages,
    }
  }
}

// Standalone function exports
export const processMonsterRegeneration =
  RegenerationService.processMonsterRegeneration.bind(RegenerationService)
