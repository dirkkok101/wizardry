/**
 * CombatOrchestrationService - Coordinates combat flow and actions
 *
 * Extracts combat orchestration logic from MazeComponent.
 * Handles:
 * - Combat initialization
 * - Action collection and validation
 * - Round execution coordination
 * - Victory/defeat processing
 *
 * Works with MazeStateMachine for state management.
 */

import { Injectable } from '@angular/core'
import { GameState } from '@models/GameState'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import {
  CombatState,
  CombatCommand,
  CombatActionType,
  MonsterGroup,
  CombatRoundResult,
  CombatRoundEvent,
  CombatRoundAudit
} from '@models/Combat'
import { CombatService } from '@services/CombatService'
import { EncounterService } from '@services/EncounterService'
import { VictoryService, VictoryRewards } from '@services/VictoryService'
import { CharacterQueries } from '@utils/CharacterQueries'
import { FixedEncounterConfig } from '@services/EncounterTriggerService'

/**
 * Configuration for initiating combat
 */
export interface CombatInitConfig {
  dungeonLevel: number
  canFlee: boolean
  fixedEncounterConfig?: FixedEncounterConfig
  encounterReason?: 'random' | 'door_kick' | 'treasure_room' | 'alarm' | 'fixed' | 'chest_trap'
  partyCharacters: Character[]
  latumapicActive: boolean
  expeditionAcBuff: number
}

/**
 * Result from combat initialization
 */
export interface CombatInitResult {
  combatState: CombatState
  surpriseState: 'party' | 'monsters' | 'none'
  messages: string[]
}

/**
 * Available action for a character
 */
export interface AvailableCombatAction {
  type: CombatActionType
  enabled: boolean
  requiresTarget: boolean
  targetType?: 'monster_group' | 'party_member' | 'self'
}

/**
 * Result from round execution
 */
export interface RoundExecutionResult {
  events: CombatRoundEvent[]
  audit: CombatRoundAudit | null
  finalState: CombatState
  characterUpdates: Map<string, Character>
  spellCasters: Map<string, { character: Character; spellId: string }>
  victory: boolean
  defeat: boolean
  fled: boolean
}

@Injectable({
  providedIn: 'root'
})
export class CombatOrchestrationService {
  /**
   * Initialize combat with the given configuration
   */
  initiateCombat(config: CombatInitConfig): CombatInitResult {
    const messages: string[] = ['You encounter monsters!']

    // Generate combat state
    const combatState = CombatService.initiateCombat(
      config.dungeonLevel,
      config.canFlee,
      config.fixedEncounterConfig,
      config.encounterReason,
      config.partyCharacters,
      config.latumapicActive,
      config.expeditionAcBuff
    )

    // Determine surprise state
    const surpriseState = combatState.surpriseState ?? 'none'

    if (surpriseState === 'party') {
      messages.push('You have surprised the enemy!')
    } else if (surpriseState === 'monsters') {
      messages.push('The monsters have ambushed you!')
    }

    return {
      combatState,
      surpriseState,
      messages
    }
  }

  /**
   * Get available actions for a character in combat
   */
  getAvailableActions(
    character: Character,
    frontRow: string[],
    hasSpells: boolean
  ): AvailableCombatAction[] {
    const actions: AvailableCombatAction[] = []

    // All characters can attack (back row can use ranged/spells)
    const inFrontRow = frontRow.includes(character.id)
    actions.push({
      type: 'ATTACK',
      enabled: true,
      requiresTarget: true,
      targetType: 'monster_group'
    })

    // Cast spell if character has spells
    if (hasSpells) {
      actions.push({
        type: 'CAST_SPELL',
        enabled: true,
        requiresTarget: true,
        targetType: 'monster_group' // May also target party
      })
    }

    // Parry is always available
    actions.push({
      type: 'PARRY',
      enabled: true,
      requiresTarget: false
    })

    return actions
  }

  /**
   * Check if all required actions have been selected
   */
  allActionsSelected(
    selectedActions: Map<string, CombatCommand>,
    partyCharacters: Character[]
  ): boolean {
    const activeMembers = CharacterQueries.getActiveMembers(partyCharacters)
    return activeMembers.every(c => selectedActions.has(c.id))
  }

  /**
   * Create a combat command for a character action
   */
  createCommand(
    character: Character,
    actionType: CombatActionType,
    targetGroupId?: 'A' | 'B' | 'C' | 'D',
    spellId?: string
  ): CombatCommand {
    return CombatService.createCommand(
      character,
      actionType,
      targetGroupId ? { groupId: targetGroupId, spellId } : undefined
    )
  }

  /**
   * Create flee commands for all party members
   */
  createFleeCommands(partyCharacters: Character[]): Map<string, CombatCommand> {
    const commands = new Map<string, CombatCommand>()

    for (const char of partyCharacters) {
      if (CharacterQueries.canAct(char)) {
        commands.set(char.id, this.createCommand(char, 'RUN'))
      }
    }

    return commands
  }

  /**
   * Execute a combat round with the selected actions
   */
  executeRound(
    combatState: CombatState,
    partyCommands: Map<string, CombatCommand>,
    partyCharacters: Character[],
    frontRow: string[]
  ): RoundExecutionResult {
    // Generate monster commands
    const monsterCommands = CombatService.generateMonsterCommands(
      combatState,
      partyCharacters
    )

    // Build command queue
    const allCommands = [
      ...Array.from(partyCommands.values()),
      ...monsterCommands
    ]

    // Create state with command queue
    const stateWithCommands: CombatState = {
      ...combatState,
      commandQueue: allCommands
    }

    // Execute round
    const result = CombatService.executeRoundWithEvents(
      stateWithCommands,
      partyCharacters,
      frontRow
    )

    return {
      events: result.events,
      audit: result.audit ?? null,
      finalState: result.finalState,
      characterUpdates: result.finalCharacterUpdates,
      spellCasters: result.spellCasters,
      victory: result.victory,
      defeat: result.defeat,
      fled: result.fled
    }
  }

  /**
   * Process victory rewards
   */
  processVictory(
    combatState: CombatState,
    partyCharacters: Character[],
    dungeonLevel: number
  ): VictoryRewards {
    return VictoryService.calculateRewards(
      combatState.monsterGroups,
      partyCharacters,
      dungeonLevel
    )
  }

  /**
   * Check if combat should end in victory
   */
  isVictory(monsterGroups: MonsterGroup[]): boolean {
    return monsterGroups.every(group =>
      group.monsters.every(m => m.hp <= 0)
    )
  }

  /**
   * Check if combat should end in defeat
   */
  isDefeat(partyCharacters: Character[]): boolean {
    return CharacterQueries.isPartyWiped(partyCharacters)
  }

  /**
   * Get display text for a combat command
   */
  getCommandDisplayText(command: CombatCommand): string {
    const groupId = command.data?.groupId
    const targetText = groupId ? ` → ${groupId}` : ''

    switch (command.type) {
      case 'ATTACK':
        return `ATTACK${targetText}`
      case 'PARRY':
        return 'PARRY'
      case 'RUN':
        return 'FLEE'
      case 'CAST_SPELL':
        const spellId = command.data?.spellId
        if (spellId) {
          return `${spellId.toUpperCase()}${targetText}`
        }
        return `CAST${targetText}`
      default:
        return command.type
    }
  }

  /**
   * Get alive monster groups
   */
  getAliveMonsterGroups(groups: MonsterGroup[]): MonsterGroup[] {
    return groups.filter(g => g.monsters.some(m => m.hp > 0))
  }

  /**
   * Get total alive monster count
   */
  getAliveMonsterCount(groups: MonsterGroup[]): number {
    return groups.reduce(
      (sum, g) => sum + g.monsters.filter(m => m.hp > 0).length,
      0
    )
  }
}
