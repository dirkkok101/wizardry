/**
 * Command Executor
 *
 * Executes combat commands using the Command Pattern registry.
 * This replaces the switch-on-type anti-pattern in CombatService.executeCommand().
 *
 * Benefits:
 * - Open/Closed Principle: Add new actions without modifying this code
 * - Single Responsibility: Each action handles its own logic
 * - Testability: Actions can be tested in isolation
 */

import { Character } from '@models/Character'
import {
  CombatState,
  CombatCommand,
  CommandExecutionResult,
  Combatant,
} from '@models/Combat'
import { CombatContext } from '../CombatContext'
import {
  combatActionRegistry,
  ActionExecutionContext,
} from '../actions/CombatAction'
import { getAttacksPerRound } from '../core/AttackResolutionService'

// Re-export for convenience
export { CommandExecutor }

/**
 * Options for command execution
 */
export interface ExecuteCommandOptions {
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Command Executor
 *
 * Provides the integration layer between CombatService and the Command Pattern actions.
 */
class CommandExecutor {
  /**
   * Execute a combat command using the action registry
   *
   * @param state - Current combat state
   * @param command - The command to execute
   * @param parryingCombatants - Set of combatant IDs that are parrying
   * @param party - Party characters (for context)
   * @param frontRow - Front row character IDs (for context)
   * @param existingCharacterUpdates - Updates from previous commands in this round
   * @param options - Execution options
   * @returns Command execution result
   */
  static executeCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>,
    party: Character[],
    frontRow: string[],
    existingCharacterUpdates?: Map<string, Character>,
    options?: ExecuteCommandOptions
  ): CommandExecutionResult {
    // Log if debug enabled
    if (options?.debug) {
      this.logCommand(command, state)
    }

    // Create context for action execution
    const context = CombatContext.create(
      state,
      party,
      frontRow,
      parryingCombatants,
      existingCharacterUpdates ?? new Map()
    )

    const executionContext: ActionExecutionContext = {
      state,
      command,
      parryingCombatants,
      existingCharacterUpdates,
      context,
    }

    // Check if handler exists in registry
    if (!combatActionRegistry.has(command.type)) {
      // Fall back for unregistered actions (USE_ITEM, etc.)
      return {
        newState: state,
        messages: [`Action type ${command.type} not yet implemented in registry`],
      }
    }

    // Execute using registry
    return combatActionRegistry.execute(executionContext)
  }

  /**
   * Check if an action type has a registered handler
   */
  static hasHandler(actionType: string): boolean {
    return combatActionRegistry.has(actionType as any)
  }

  /**
   * Expand attack commands for multi-attack combatants
   *
   * Some combatants (high-level fighters, certain monsters) can make
   * multiple attacks per round. This method expands a single ATTACK
   * command into multiple commands, one for each attack.
   *
   * @param commands - Array of combat commands
   * @returns Expanded command array with multi-attacks split into individual commands
   */
  static expandAttackCommands(commands: CombatCommand[]): CombatCommand[] {
    return commands.flatMap(cmd => {
      // Only expand ATTACK commands
      if (cmd.type !== 'ATTACK') return [cmd]

      const attacks = getAttacksPerRound(cmd.actor)

      // If only 1 attack, return original command unchanged
      if (attacks <= 1) return [cmd]

      // Create multiple attack commands with unique IDs and attack index
      return Array.from({ length: attacks }, (_, i) => ({
        ...cmd,
        id: `${cmd.id}_${i}`,
        attackIndex: i
      }))
    })
  }

  /**
   * Log command execution for debugging
   */
  private static logCommand(command: CombatCommand, state: CombatState): void {
    const isMonster = 'monsterId' in command.actor
    const actorName = this.getCombatantName(command.actor, state)
    const targetName = command.target
      ? this.getTargetName(command.target, state)
      : 'none'

    console.log(`[CommandExecutor] Executing:`, {
      type: command.type,
      actor: actorName,
      actorId: command.actor.id,
      actorType: isMonster ? 'monster' : 'character',
      target: targetName,
      initiative: command.initiative,
    })
  }

  /**
   * Get display name for a combatant
   */
  private static getCombatantName(combatant: Combatant, state: CombatState): string {
    if ('monsterId' in combatant) {
      const group = state.monsterGroups.find(g =>
        g.monsters.some(m => m.id === combatant.id)
      )
      return group?.identified ? combatant.name : combatant.unidentifiedName
    }
    return combatant.name
  }

  /**
   * Get target name for logging
   */
  private static getTargetName(
    target: Combatant | Combatant[],
    state: CombatState
  ): string {
    if (Array.isArray(target)) {
      if (target.length === 0) return 'none'
      if (target.length === 1) return this.getCombatantName(target[0], state)
      return `${target.length} targets`
    }
    return this.getCombatantName(target, state)
  }
}

// Standalone function exports
export const executeCommand = CommandExecutor.executeCommand.bind(CommandExecutor)
export const hasHandler = CommandExecutor.hasHandler.bind(CommandExecutor)
export const expandAttackCommands = CommandExecutor.expandAttackCommands
