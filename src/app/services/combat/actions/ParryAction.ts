/**
 * Parry Action
 *
 * Handles defensive stance which grants -2 AC bonus.
 */

import { CommandExecutionResult } from '@models/Combat'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'
import { HIT_CHANCE } from '../CombatConstants'

/**
 * Parry Action Handler
 *
 * When a combatant chooses to parry:
 * - They gain -2 AC (better defense) for the round
 * - They cannot attack
 */
export class ParryAction extends BaseCombatAction {
  readonly actionType = 'PARRY' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command, parryingCombatants } = ctx

    // Add actor to parrying set
    parryingCombatants.add(command.actor.id)

    const actorName = this.getCombatantName(command.actor, ctx)
    const acBonus = Math.abs(HIT_CHANCE.PARRY_AC_BONUS)

    return {
      newState: state, // State doesn't change for PARRY, just tracks in parryingCombatants set
      messages: [`${actorName} assumes a defensive stance! (AC -${acBonus})`],
    }
  }
}

// Register the action
combatActionRegistry.register(new ParryAction())
