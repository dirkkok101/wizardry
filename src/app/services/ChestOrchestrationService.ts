/**
 * ChestOrchestrationService - Coordinates chest interaction flow
 *
 * Extracts chest interaction logic from MazeComponent.
 * Handles:
 * - Chest discovery
 * - Trap inspection (CALFO spell or Thief skill)
 * - Trap disarming
 * - Trap triggering
 * - Chest opening
 * - Treasure distribution
 *
 * Works with MazeStateMachine for state management.
 */

import { Injectable } from '@angular/core'
import { GameState } from '@models/GameState'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { Chest, TreasureDistributionResult, InventoryWarning, MAX_INVENTORY_SIZE } from '@models/Chest'
import { TrapId, ScrambledTrapState } from '@models/Trap'
import { ChestService } from '@services/ChestService'
import { TrapService } from '@services/TrapService'
import { TrapDataLoader } from '@services/TrapDataLoader'
import { CharacterQueries } from '@utils/CharacterQueries'

/**
 * Result from trap inspection attempt
 */
export interface TrapInspectionResult {
  success: boolean
  trapIdentified: boolean
  scrambledState: ScrambledTrapState | null
  trapName: string | null
  message: string
}

/**
 * Result from trap disarm attempt
 */
export interface TrapDisarmResult {
  success: boolean
  trapTriggered: boolean
  message: string
}

/**
 * Result from trap trigger
 */
export interface TrapTriggerResult {
  trapId: TrapId
  trapName: string
  message: string
  damageDealt: Map<string, number>
  statusEffects: Map<string, CharacterStatus>
  updatedState: GameState
}

/**
 * Result from chest opening
 */
export interface ChestOpenResult {
  success: boolean
  trapTriggered: boolean
  trapResult?: TrapTriggerResult
  contents: {
    gold: number
    items: any[]
  }
  distribution: TreasureDistributionResult
  updatedState: GameState
}

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
    const thieves = activeMembers.filter(c => c.class === 'thief' || c.class === 'ninja')
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

  /**
   * Attempt to inspect trap using character skill
   */
  inspectTrap(
    chest: Chest,
    inspector: Character
  ): TrapInspectionResult {
    if (!chest.trapped) {
      return {
        success: true,
        trapIdentified: false,
        scrambledState: null,
        trapName: null,
        message: 'The chest appears to be safe.'
      }
    }

    // Calculate inspection chance
    const inspectChance = TrapService.calculateInspectChance(inspector)
    const success = Math.random() * 100 < inspectChance

    if (!success) {
      return {
        success: false,
        trapIdentified: false,
        scrambledState: null,
        trapName: null,
        message: `${inspector.name} cannot identify the trap.`
      }
    }

    // Success - generate scrambled trap name
    const trapData = TrapDataLoader.getTrap(chest.trapId!)
    const scrambledState = TrapService.generateScrambledName(chest.trapId!)

    return {
      success: true,
      trapIdentified: true,
      scrambledState,
      trapName: trapData?.displayName ?? chest.trapId,
      message: `${inspector.name} identifies a trap!`
    }
  }

  /**
   * Cast CALFO spell to identify trap
   */
  castCalfo(
    chest: Chest,
    caster: Character,
    state: GameState
  ): {
    result: TrapInspectionResult
    updatedState: GameState
  } {
    // Deduct spell points
    const updatedCaster = this.deductSpellPoints(caster, 'calfo')
    const updatedRoster = new Map(state.roster)
    updatedRoster.set(caster.id, updatedCaster)

    if (!chest.trapped) {
      return {
        result: {
          success: true,
          trapIdentified: false,
          scrambledState: null,
          trapName: null,
          message: 'CALFO reveals: This chest is safe.'
        },
        updatedState: { ...state, roster: updatedRoster }
      }
    }

    // CALFO always succeeds if chest is trapped
    const trapData = TrapDataLoader.getTrap(chest.trapId!)
    const scrambledState = TrapService.generateScrambledName(chest.trapId!)

    return {
      result: {
        success: true,
        trapIdentified: true,
        scrambledState,
        trapName: trapData?.displayName ?? chest.trapId,
        message: `CALFO reveals: ${scrambledState.scrambledName}`
      },
      updatedState: { ...state, roster: updatedRoster }
    }
  }

  /**
   * Attempt to disarm trap
   */
  attemptDisarm(
    chest: Chest,
    disarmer: Character,
    mazeLevel: number,
    guessedName?: string
  ): TrapDisarmResult {
    if (!chest.trapped || chest.trapDisarmed) {
      return {
        success: true,
        trapTriggered: false,
        message: 'Nothing to disarm.'
      }
    }

    // Calculate disarm chance
    let disarmChance = TrapService.calculateDisarmChance(disarmer, mazeLevel)

    // Bonus for correct trap name guess
    if (guessedName && chest.trapId) {
      const trapData = TrapDataLoader.getTrap(chest.trapId)
      if (trapData && guessedName.toUpperCase() === trapData.displayName.toUpperCase()) {
        disarmChance = Math.min(95, disarmChance + 20)
      }
    }

    const success = Math.random() * 100 < disarmChance

    if (success) {
      return {
        success: true,
        trapTriggered: false,
        message: `${disarmer.name} successfully disarms the trap!`
      }
    }

    // Failed - trap triggers
    return {
      success: false,
      trapTriggered: true,
      message: `${disarmer.name} fails to disarm the trap!`
    }
  }

  /**
   * Trigger a trap on the party
   */
  triggerTrap(
    chest: Chest,
    partyCharacters: Character[],
    state: GameState
  ): TrapTriggerResult {
    if (!chest.trapId) {
      return {
        trapId: 'poison_needle' as TrapId,
        trapName: 'Unknown Trap',
        message: 'The trap activates!',
        damageDealt: new Map(),
        statusEffects: new Map(),
        updatedState: state
      }
    }

    // Apply trap effects
    const trapResult = TrapService.triggerTrap(
      chest.trapId,
      partyCharacters,
      state,
      chest.mazeLevel
    )

    const trapData = TrapDataLoader.getTrap(chest.trapId)

    return {
      trapId: chest.trapId,
      trapName: trapData?.displayName ?? chest.trapId,
      message: trapData?.triggerMessage ?? 'A trap springs!',
      damageDealt: trapResult.damageDealt,
      statusEffects: trapResult.statusEffects,
      updatedState: trapResult.state
    }
  }

  /**
   * Open chest and distribute contents
   */
  openChest(
    chest: Chest,
    opener: Character,
    state: GameState
  ): ChestOpenResult {
    // Check for untriggered trap
    if (chest.trapped && !chest.trapDisarmed) {
      const trapResult = this.triggerTrap(
        chest,
        this.getPartyCharacters(state),
        state
      )

      // Still get contents after trap
      const distribution = ChestService.distributeTreasure(
        chest,
        opener,
        trapResult.updatedState
      )

      return {
        success: true,
        trapTriggered: true,
        trapResult,
        contents: chest.contents,
        distribution,
        updatedState: distribution.state
      }
    }

    // Safe to open
    const distribution = ChestService.distributeTreasure(chest, opener, state)

    return {
      success: true,
      trapTriggered: false,
      contents: chest.contents,
      distribution,
      updatedState: distribution.state
    }
  }

  /**
   * Check for inventory warning before opening
   */
  checkInventoryWarning(
    chest: Chest,
    opener: Character
  ): InventoryWarning | null {
    const itemCount = chest.contents.items.length
    if (itemCount === 0) return null

    const freeSlots = CharacterQueries.getAvailableInventorySlots(opener)
    const itemsAtRisk = Math.max(0, itemCount - freeSlots)

    if (itemsAtRisk === 0) return null

    return {
      itemCount,
      freeSlots,
      itemsAtRisk,
      warning: `${opener.name}'s inventory is full! ${itemsAtRisk} item${itemsAtRisk > 1 ? 's' : ''} will be lost.`
    }
  }

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

  /**
   * Deduct spell points for CALFO
   */
  private deductSpellPoints(caster: Character, spellId: string): Character {
    // CALFO is a level 3 priest spell
    const newSpellPoints = { ...caster.spellPoints }
    newSpellPoints.priest = {
      ...newSpellPoints.priest,
      current: [...newSpellPoints.priest.current]
    }
    newSpellPoints.priest.current[2] = Math.max(0, newSpellPoints.priest.current[2] - 1)

    return {
      ...caster,
      spellPoints: newSpellPoints
    }
  }

  /**
   * Get party characters from state
   */
  private getPartyCharacters(state: GameState): Character[] {
    return state.party.members
      .map(id => state.roster.get(id))
      .filter((c): c is Character => c !== undefined)
  }
}
