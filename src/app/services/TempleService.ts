import { Character } from '@models/Character'
import { ServiceType } from '@models/ServiceType'
import { GameState } from '@models/GameState'
import { CharacterStatus } from '@models/CharacterStatus'
import * as PartyService from './PartyService'
import { ResurrectionService } from './ResurrectionService'

/**
 * TempleService - Temple of Cant service calculations
 *
 * Provides healing, curing, and resurrection services.
 * All services require payment (tithe) based on character level.
 * Gold is deducted from party, not individual characters.
 *
 * Authentic Wizardry 1 mechanics:
 * - Resurrection ages character by 1 year (52 weeks)
 * - Restoration ages character by 1 year (52 weeks)
 * - Cure services do not age character
 */

interface ServiceResult {
  success: boolean
  error?: string
  state?: GameState
  ageIncrease?: number  // Weeks aged by service
}

export class TempleService {
  /**
   * Calculate tithe (cost) for a temple service.
   *
   * Authentic Wizardry 1 base costs per level:
   * - Cure Poison: 10 gold
   * - Cure Paralysis: 100 gold
   * - Cure Stoned: 200 gold
   * - Resurrect (DEAD → OK): 250 gold
   * - Restore (ASHES → OK): 500 gold
   */
  static calculateTithe(character: Character, service: ServiceType): number {
    const baseCosts: Record<ServiceType, number> = {
      [ServiceType.CURE_POISON]: 10,
      [ServiceType.CURE_PARALYSIS]: 100,  // Authentic Wizardry 1 (was 20)
      [ServiceType.CURE_STONED]: 200,     // Authentic Wizardry 1
      [ServiceType.RESURRECT]: 250,
      [ServiceType.RESTORE]: 500
    }

    return baseCosts[service] * character.level
  }

  /**
   * Get age increase for a temple service (authentic Wizardry 1)
   *
   * - Resurrection: 1 year (52 weeks)
   * - Restoration: 1 year (52 weeks)
   * - Cure services: No aging
   */
  static getServiceAgeIncrease(service: ServiceType): number {
    const ageIncreases: Record<ServiceType, number> = {
      [ServiceType.CURE_POISON]: 0,
      [ServiceType.CURE_PARALYSIS]: 0,
      [ServiceType.CURE_STONED]: 0,
      [ServiceType.RESURRECT]: 52,  // 1 year
      [ServiceType.RESTORE]: 52     // 1 year
    }
    return ageIncreases[service]
  }

  /**
   * Perform a temple service on a character.
   * Deducts cost from party gold and applies the service effect.
   *
   * @param state - Current game state
   * @param characterId - Character receiving the service
   * @param service - Type of service to perform
   * @returns ServiceResult with updated state or error
   */
  static performService(state: GameState, characterId: string, service: ServiceType): ServiceResult {
    const character = state.roster.get(characterId)
    if (!character) {
      return { success: false, error: 'Character not found' }
    }

    // Calculate cost
    const cost = this.calculateTithe(character, service)

    // Check party gold
    if (!PartyService.hasEnoughGold(state, cost)) {
      return { success: false, error: 'Insufficient party gold' }
    }

    // Deduct from party gold
    let newState = PartyService.removePartyGold(state, cost)

    // Attempt service (for resurrection/restoration, may fail)
    const success = ResurrectionService.attemptService(character, service)

    // Determine new status and HP based on service and success
    let newStatus = character.status
    let newHp = character.hp
    let errorMessage: string | undefined

    if (success) {
      // All successful services restore to OK
      newStatus = CharacterStatus.OK

      // HP restoration based on service type:
      // - RESURRECT: Character returns with 1 HP (barely alive)
      // - RESTORE: Character returns with full HP (per original Wizardry 1)
      // - Cure services: No HP change
      if (service === ServiceType.RESURRECT) {
        newHp = 1
      } else if (service === ServiceType.RESTORE) {
        newHp = character.maxHp
      }
    } else {
      // Handle failures (only resurrection and restoration can fail)
      if (service === ServiceType.RESURRECT) {
        newStatus = CharacterStatus.ASHES
        newHp = 0
        errorMessage = `Resurrection failed. ${character.name} has turned to ashes.`
      } else if (service === ServiceType.RESTORE) {
        newStatus = CharacterStatus.LOST
        newHp = 0
        errorMessage = `Restoration failed. ${character.name} is lost forever.`
      }
    }

    // Calculate age increase (authentic Wizardry 1)
    const ageIncrease = this.getServiceAgeIncrease(service)

    // Update character status, HP, and age
    const updatedCharacter = {
      ...character,
      status: newStatus,
      hp: newHp,
      age: character.age + ageIncrease
    }

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter)
    }

    if (!success && errorMessage) {
      return { success: false, error: errorMessage, state: newState, ageIncrease }
    }

    return { success: true, state: newState, ageIncrease }
  }
}
