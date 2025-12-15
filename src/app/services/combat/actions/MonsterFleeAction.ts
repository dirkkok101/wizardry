/**
 * Monster Flee Action
 *
 * Handles monster fleeing from combat when demoralized.
 * Per Apple II Reference: Monsters with Run ability have 65% chance to flee
 * when demoralized. Fleeing monsters don't grant XP.
 */

import { CommandExecutionResult, MonsterInstance } from '@models/Combat'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'

/**
 * Monster Flee Action Handler
 *
 * When a monster with the Run ability is demoralized and passes the flee check,
 * it flees from combat. The monster is removed from its group.
 */
export class MonsterFleeAction extends BaseCombatAction {
  readonly actionType = 'MONSTER_FLEE' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command } = ctx
    const monster = command.actor as MonsterInstance
    const { groupId } = command.data || {}

    const messages: string[] = []
    messages.push(`${this.getCombatantName(monster, ctx)} flees in terror!`)

    // Remove the fleeing monster from its group
    const newMonsterGroups = state.monsterGroups
      .map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            monsters: g.monsters.filter(m => m.id !== monster.id),
          }
        }
        return g
      })
      .filter(g => g.monsters.length > 0) // Remove empty groups

    return {
      newState: {
        ...state,
        monsterGroups: newMonsterGroups,
      },
      messages,
    }
  }
}

// Register the action
combatActionRegistry.register(new MonsterFleeAction())
