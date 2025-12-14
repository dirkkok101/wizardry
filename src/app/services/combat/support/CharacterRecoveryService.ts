/**
 * Character Recovery Service
 *
 * Handles character status effect recovery during combat.
 *
 * Per Apple II reference (Section 15: Status Effects):
 * Character Recovery:
 * - ASLEEP: Level × 10% (max 50%)
 * - AFRAID: Level × 5% (max 50%)
 * - PARALYZED: NO natural recovery in combat!
 * - SILENCED: NEVER recovers during battle (MONTINO bug)
 *
 * Note: Characters have DIFFERENT recovery rates than monsters!
 */

import { Character } from '@models/Character'
import { CombatState } from '@models/Combat'
import { CharacterStatus } from '@models/CharacterStatus'
import { MonsterResistanceService } from '@services/MonsterResistanceService'

// Re-export for convenience
export { CharacterRecoveryService }

/**
 * Result of character status recovery processing
 */
export interface CharacterRecoveryResult {
  curedCharacters: Map<string, Character>
  messages: string[]
}

/**
 * Character Recovery Service
 *
 * Handles character status effect recovery.
 */
class CharacterRecoveryService {
  /**
   * Process character status effect recovery for the round
   *
   * @param party - Party characters
   * @param state - Current combat state (for future expansion)
   * @returns Cured characters and messages
   */
  static processCharacterStatusRecovery(
    party: Character[],
    _state: CombatState
  ): CharacterRecoveryResult {
    const curedCharacters = new Map<string, Character>()
    const messages: string[] = []

    for (const char of party) {
      // Skip dead characters
      if (char.hp <= 0 || char.status === CharacterStatus.DEAD) continue

      // Check for ASLEEP recovery (Level × 10%, max 50%)
      if (char.status === CharacterStatus.ASLEEP) {
        if (MonsterResistanceService.rollCharacterRecovery(char.level, 'ASLEEP')) {
          const curedChar = { ...char, status: CharacterStatus.OK }
          curedCharacters.set(char.id, curedChar)
          messages.push(`${char.name} wakes up!`)
        }
      }

      // PARALYZED: Characters have NO natural recovery in combat!
      // This is a critical difference from monsters - intentionally not processing

      // SILENCED: NEVER recovers during battle (MONTINO bug)
      // Intentionally not processing SILENCED recovery
    }

    return { curedCharacters, messages }
  }
}

// Standalone function exports
export const processCharacterStatusRecovery =
  CharacterRecoveryService.processCharacterStatusRecovery.bind(CharacterRecoveryService)
