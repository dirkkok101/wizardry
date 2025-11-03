import { Character } from '../types/Character'
import { ServiceType } from '../types/ServiceType'
import { GameState } from '../types/GameState'
import { CharacterStatus } from '../types/CharacterStatus'
import * as PartyService from './PartyService'
import { ResurrectionService } from './ResurrectionService'

/**
 * TempleService - Temple of Cant service calculations
 *
 * Provides healing, curing, and resurrection services.
 * All services require payment (tithe) based on character level.
 * Gold is deducted from party, not individual characters.
 */

interface ServiceResult {
  success: boolean
  error?: string
  state?: GameState
}

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

    // Determine new status based on service and success
    let newStatus = character.status
    let errorMessage: string | undefined

    if (success) {
      // All successful services restore to OK
      newStatus = CharacterStatus.OK
    } else {
      // Handle failures (only resurrection and restoration can fail)
      if (service === ServiceType.RESURRECT) {
        newStatus = CharacterStatus.ASHES
        errorMessage = `Resurrection failed. ${character.name} has turned to ashes.`
      } else if (service === ServiceType.RESTORE) {
        newStatus = CharacterStatus.LOST
        errorMessage = `Restoration failed. ${character.name} is lost forever.`
      }
    }

    // Update character status
    const updatedCharacter = {
      ...character,
      status: newStatus
    }

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter)
    }

    if (!success && errorMessage) {
      return { success: false, error: errorMessage, state: newState }
    }

    return { success: true, state: newState }
  }
}
