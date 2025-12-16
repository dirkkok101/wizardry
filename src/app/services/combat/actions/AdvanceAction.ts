/**
 * Advance Action
 *
 * Handles monster group movement from back row to front row.
 * Used when melee-only monsters need to advance to attack.
 */

import { CommandExecutionResult, MonsterInstance } from '@models/Combat'
import { getMonsterDisplayName } from '@utils/MonsterNameUtils'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'
import { CombatHelpers } from '../CombatHelpers'

/**
 * Advance Action Handler
 *
 * When a melee-only monster group is in the back row and the front row
 * has space, the group advances to the front row.
 */
export class AdvanceAction extends BaseCombatAction {
  readonly actionType = 'ADVANCE' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command } = ctx
    const monster = command.actor as MonsterInstance

    // Find the group this monster belongs to
    const group = state.monsterGroups.find(g =>
      g.monsters.some(m => m.id === monster.id)
    )

    if (!group) {
      return {
        newState: state,
        messages: [`${monster.unidentifiedName} tries to advance but can't find their group!`],
      }
    }

    // Get display name based on identification status
    const displayName = getMonsterDisplayName(monster, group.identified)

    // If already in front row, just return (shouldn't happen)
    if (group.formation === 'front') {
      return {
        newState: state,
        messages: [`${displayName} is already in the front row!`],
      }
    }

    // Count alive monsters in the group for the message
    const aliveCount = CombatHelpers.countAliveMonsters(group.monsters)

    // Move the entire group to front row
    const newMonsterGroups = state.monsterGroups.map(g =>
      g.id === group.id
        ? { ...g, formation: 'front' as const }
        : g
    )

    const message = aliveCount > 1
      ? `The ${displayName}s advance to the front row!`
      : `${displayName} advances to the front row!`

    return {
      newState: {
        ...state,
        monsterGroups: newMonsterGroups,
      },
      messages: [message],
    }
  }
}

// Register the action
combatActionRegistry.register(new AdvanceAction())
