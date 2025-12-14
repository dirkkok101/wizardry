/**
 * Flee Action (RUN)
 *
 * Handles party member's attempt to flee from combat.
 * The actual flee check is performed at the end of the round.
 */

import { CommandExecutionResult } from '@models/Combat'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'

/**
 * Flee Action Handler
 *
 * When a character chooses to flee (RUN):
 * - They declare their intent to flee
 * - At end of round, if enough party members chose RUN, a flee check is made
 * - If flee fails, monsters get a free attack round
 */
export class FleeAction extends BaseCombatAction {
  readonly actionType = 'RUN' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command } = ctx
    const actorName = this.getCombatantName(command.actor, ctx)

    return {
      newState: state, // State doesn't change, flee is checked at end of round
      messages: [`${actorName} attempts to flee!`],
    }
  }
}

// Register the action
combatActionRegistry.register(new FleeAction())
