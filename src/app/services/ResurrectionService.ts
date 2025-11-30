import { Character } from '@models/Character'
import { ServiceType } from '@models/ServiceType'
import { RandomService } from './RandomService'

/**
 * ResurrectionService - Handles resurrection and restoration success rates
 *
 * Authentic Wizardry 1 success rates based on character Vitality:
 * - Cure services: 100% (always succeed)
 * - Resurrection (DEAD → OK): 50% + (Vitality × 3%)
 * - Restoration (ASHES → OK): 40% + (Vitality × 3%)
 *
 * On failure:
 * - Resurrection failure: DEAD → ASHES
 * - Restoration failure: ASHES → LOST (permanent death)
 *
 * Source: Thomas William Ewers' reverse-engineered Apple II source
 */
export class ResurrectionService {
  /**
   * Calculate success rate for a temple service based on character vitality.
   * Authentic Wizardry 1 formulas using 3×VIT multiplier.
   */
  static getSuccessRate(character: Character, service: ServiceType): number {
    switch (service) {
      case ServiceType.CURE_POISON:
      case ServiceType.CURE_PARALYSIS:
        return 100 // Cure services always succeed

      case ServiceType.RESURRECT:
        // Authentic Wizardry 1: 50% + (Vitality × 3%)
        return 50 + (character.vitality * 3)

      case ServiceType.RESTORE:
        // Authentic Wizardry 1: 40% + (Vitality × 3%)
        return 40 + (character.vitality * 3)

      default:
        return 100
    }
  }

  /**
   * Attempt a temple service with success/failure based on success rate.
   * Returns true if service succeeds, false if it fails.
   */
  static attemptService(character: Character, service: ServiceType): boolean {
    const successRate = this.getSuccessRate(character, service)
    return RandomService.chance(successRate)
  }
}
