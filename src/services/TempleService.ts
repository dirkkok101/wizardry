import { Character } from '../types/Character'
import { ServiceType } from '../types/ServiceType'

/**
 * TempleService - Temple of Cant service calculations
 *
 * Provides healing, curing, and resurrection services.
 * All services require payment (tithe) based on character level.
 */
export class TempleService {
  /**
   * Calculate tithe (cost) for a temple service.
   *
   * Base costs per level:
   * - Cure Poison: 10 gold
   * - Cure Paralysis: 20 gold
   * - Resurrect (DEAD → OK): 250 gold
   * - Restore (ASHES → OK): 500 gold
   */
  static calculateTithe(character: Character, service: ServiceType): number {
    const baseCosts: Record<ServiceType, number> = {
      [ServiceType.CURE_POISON]: 10,
      [ServiceType.CURE_PARALYSIS]: 20,
      [ServiceType.RESURRECT]: 250,
      [ServiceType.RESTORE]: 500
    }

    return baseCosts[service] * character.level
  }
}
