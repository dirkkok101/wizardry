/**
 * Combat Action Interface
 *
 * Defines the contract for all combat actions using the Command Pattern.
 * This replaces the switch-on-type anti-pattern in executeCommand().
 *
 * Each action type implements this interface, encapsulating its own
 * execution logic and enabling Open/Closed Principle compliance.
 */

import { Character } from '@models/Character'
import {
  CombatState,
  CombatCommand,
  CommandExecutionResult,
  CombatActionType,
  Combatant,
  DamageResult,
} from '@models/Combat'
import { CombatContext } from '../CombatContext'

/**
 * Execution context passed to combat actions
 * Provides all necessary state and utilities for action execution
 */
export interface ActionExecutionContext {
  /** Current combat state */
  state: CombatState
  /** The command being executed */
  command: CombatCommand
  /** Set of combatant IDs that are parrying */
  parryingCombatants: Set<string>
  /** Existing character updates from previous actions in this round */
  existingCharacterUpdates?: Map<string, Character>
  /** Full combat context with helper methods */
  context: CombatContext
}

/**
 * Combat Action interface
 *
 * All combat action types implement this interface:
 * - AttackAction
 * - ParryAction
 * - CastSpellAction
 * - FleeAction (RUN)
 * - DispelAction
 * - AdvanceAction
 * - BreathAction
 * - CallForHelpAction
 * - MonsterFleeAction
 */
export interface ICombatAction {
  /**
   * The action type this handler processes
   */
  readonly actionType: CombatActionType

  /**
   * Execute the combat action
   *
   * @param ctx - Execution context containing state, command, and utilities
   * @returns Result including new state, messages, and any updates
   */
  execute(ctx: ActionExecutionContext): CommandExecutionResult

  /**
   * Check if this action can be executed given current state
   * Optional - defaults to true if not implemented
   */
  canExecute?(ctx: ActionExecutionContext): boolean
}

/**
 * Base class for combat actions with common utilities
 */
export abstract class BaseCombatAction implements ICombatAction {
  abstract readonly actionType: CombatActionType

  abstract execute(ctx: ActionExecutionContext): CommandExecutionResult

  canExecute(_ctx: ActionExecutionContext): boolean {
    return true
  }

  /**
   * Result message marker prefix
   */
  protected readonly RESULT_MARKER = '→ '

  /**
   * Get display name for a combatant
   */
  protected getCombatantName(combatant: Combatant, ctx: ActionExecutionContext): string {
    return ctx.context.getCombatantName(combatant)
  }

  /**
   * Create a simple result with just messages
   */
  protected createMessageResult(
    state: CombatState,
    messages: string[]
  ): CommandExecutionResult {
    return { newState: state, messages }
  }

  /**
   * Create a result message (prefixed with marker)
   */
  protected resultMessage(message: string): string {
    return `${this.RESULT_MARKER}${message}`
  }
}

/**
 * Registry of combat action handlers
 * Maps action types to their handler implementations
 */
export class CombatActionRegistry {
  private actions: Map<CombatActionType, ICombatAction> = new Map()

  /**
   * Register an action handler
   */
  register(action: ICombatAction): void {
    this.actions.set(action.actionType, action)
  }

  /**
   * Get handler for an action type
   */
  get(actionType: CombatActionType): ICombatAction | undefined {
    return this.actions.get(actionType)
  }

  /**
   * Check if a handler exists for an action type
   */
  has(actionType: CombatActionType): boolean {
    return this.actions.has(actionType)
  }

  /**
   * Execute a command using the appropriate handler
   */
  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const handler = this.get(ctx.command.type)

    if (!handler) {
      return {
        newState: ctx.state,
        messages: [`Unknown command type: ${ctx.command.type}`],
      }
    }

    // Check if action can be executed
    if (handler.canExecute && !handler.canExecute(ctx)) {
      const actorName = ctx.context.getCombatantName(ctx.command.actor)
      return {
        newState: ctx.state,
        messages: [`${actorName} cannot perform ${ctx.command.type}`],
      }
    }

    return handler.execute(ctx)
  }
}

/**
 * Global action registry instance
 * Actions register themselves on import
 */
export const combatActionRegistry = new CombatActionRegistry()
