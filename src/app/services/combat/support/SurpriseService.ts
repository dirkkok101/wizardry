/**
 * Surprise Service
 *
 * Handles surprise roll mechanics at the start of combat.
 *
 * Per Apple II reference:
 * - 20% chance party surprises monsters
 * - 20% chance monsters surprise party (only if party didn't surprise)
 */

import { RandomService } from '@services/RandomService'
import { SURPRISE } from '../CombatConstants'

// Re-export for convenience
export { SurpriseService }

/**
 * Result of a surprise roll
 */
export interface SurpriseResult {
  /** True if party surprises monsters */
  partySurprises: boolean
  /** True if monsters surprise party */
  monstersSurprise: boolean
}

/**
 * Surprise state for combat
 */
export type SurpriseState = 'party' | 'monsters' | 'none'

/**
 * Surprise Service
 *
 * Handles surprise roll mechanics.
 */
class SurpriseService {
  /**
   * Roll for surprise at combat start
   *
   * @returns SurpriseResult with flags for who surprises whom
   */
  static rollSurprise(): SurpriseResult {
    // 20% chance party surprises monsters
    const partySurprises = RandomService.chance(SURPRISE.PARTY_SURPRISE_CHANCE)

    // If party didn't surprise, monsters get 20% chance to surprise party
    const monstersSurprise =
      !partySurprises && RandomService.chance(SURPRISE.MONSTER_SURPRISE_CHANCE)

    return { partySurprises, monstersSurprise }
  }

  /**
   * Convert surprise result to surprise state
   */
  static toSurpriseState(result: SurpriseResult): SurpriseState {
    if (result.partySurprises) return 'party'
    if (result.monstersSurprise) return 'monsters'
    return 'none'
  }

  /**
   * Determine surprise state for combat initiation
   *
   * @param forceAmbush - Force monsters to surprise party (used for camp encounters)
   * @returns Surprise state
   */
  static determineSurpriseState(forceAmbush: boolean = false): SurpriseState {
    if (forceAmbush) {
      return 'monsters'
    }

    const result = this.rollSurprise()
    return this.toSurpriseState(result)
  }
}

// Standalone function exports
export const rollSurprise = SurpriseService.rollSurprise.bind(SurpriseService)
export const toSurpriseState = SurpriseService.toSurpriseState.bind(SurpriseService)
export const determineSurpriseState = SurpriseService.determineSurpriseState.bind(SurpriseService)
