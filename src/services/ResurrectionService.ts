import { Character } from '../types/Character'
import { ServiceType } from '../types/ServiceType'

/**
 * ResurrectionService - Handles resurrection and restoration success rates
 *
 * Success rates are based on character Vitality:
 * - Cure services: 100% (always succeed)
 * - Resurrection (DEAD → OK): 50% + (Vitality × 2%)
 * - Restoration (ASHES → OK): 40% + (Vitality × 1%)
 *
 * On failure:
 * - Resurrection failure: DEAD → ASHES
 * - Restoration failure: ASHES → LOST (permanent death)
 */
export class ResurrectionService {
  /**
   * Calculate success rate for a temple service based on character vitality.
   */
  static getSuccessRate(character: Character, service: ServiceType): number {
    switch (service) {
      case ServiceType.CURE_POISON:
      case ServiceType.CURE_PARALYSIS:
        return 100 // Cure services always succeed

      case ServiceType.RESURRECT:
        // 50% base + (Vitality × 2%)
        return 50 + (character.vitality * 2)

      case ServiceType.RESTORE:
        // 40% base + (Vitality × 1%)
        return 40 + (character.vitality * 1)

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
    const roll = Math.random() * 100
    return roll < successRate
  }
}
