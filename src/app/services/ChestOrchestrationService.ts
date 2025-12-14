/**
 * ChestOrchestrationService - Coordinates chest interaction flow
 *
 * Currently provides helper methods for chest-related computed signals.
 * Full chest interaction logic (inspect, disarm, open) will be migrated
 * when chest flow is fully integrated.
 *
 * Works with MazeStateMachine for state management.
 */

import { Injectable } from '@angular/core'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { TrapService } from '@services/TrapService'
import { CharacterQueries } from '@utils/CharacterQueries'

/**
 * Handler recommendation for chest
 */
export interface RecommendedHandler {
  character: Character
  reason: string
  inspectChance: number
  disarmChance: number
}

@Injectable({
  providedIn: 'root'
})
export class ChestOrchestrationService {
  /**
   * Get recommended handler for a chest
   */
  getRecommendedHandler(
    partyCharacters: Character[],
    mazeLevel: number
  ): RecommendedHandler | null {
    const activeMembers = CharacterQueries.getActiveMembers(partyCharacters)
    if (activeMembers.length === 0) return null

    // Find best Thief (highest AGI + luck combo)
    const thieves = activeMembers.filter(c => c.class === CharacterClass.THIEF || c.class === CharacterClass.NINJA)
    if (thieves.length > 0) {
      const bestThief = thieves.reduce((best, current) =>
        (current.agility + current.luck) > (best.agility + best.luck) ? current : best
      )

      return {
        character: bestThief,
        reason: 'Best trap handler',
        inspectChance: TrapService.calculateInspectChance(bestThief),
        disarmChance: TrapService.calculateDisarmChance(bestThief, mazeLevel)
      }
    }

    // Fall back to character with highest AGI
    const bestAgi = activeMembers.reduce((best, current) =>
      current.agility > best.agility ? current : best
    )

    return {
      character: bestAgi,
      reason: 'Highest agility',
      inspectChance: TrapService.calculateInspectChance(bestAgi),
      disarmChance: TrapService.calculateDisarmChance(bestAgi, mazeLevel)
    }
  }

  /**
   * Get characters who can cast CALFO
   */
  getCalfoEligibleCasters(partyCharacters: Character[]): Character[] {
    return partyCharacters.filter(c => TrapService.canCastCalfo(c))
  }

  // TODO: The following methods need to be implemented with correct TrapService/ChestService APIs
  // when chest interaction flow is fully integrated:
  // - inspectTrap()
  // - castCalfo()
  // - attemptDisarm()
  // - triggerTrap()
  // - openChest()
  // - checkInventoryWarning()
  // These are not currently called from MazeComponent

  /**
   * Calculate inspect chance for display
   */
  calculateInspectChance(character: Character): number {
    return TrapService.calculateInspectChance(character)
  }

  /**
   * Calculate disarm chance for display
   */
  calculateDisarmChance(character: Character, mazeLevel: number): number {
    return Math.round(TrapService.calculateDisarmChance(character, mazeLevel))
  }

  /**
   * Get characters who can act (for chest interaction)
   */
  getAvailableCharacters(partyCharacters: Character[]): Character[] {
    return CharacterQueries.getActiveMembers(partyCharacters)
  }
}
