/**
 * Call For Help Action
 *
 * Handles monster calling for reinforcements.
 * Per Apple II reference: Monsters with Call ability have 75% chance to call
 * if group count < 5. Help arrives with (MonsterLevel × 5)% chance.
 */

import { CommandExecutionResult, MonsterInstance } from '@models/Combat'
import { MonsterDataLoader } from '@services/MonsterDataLoader'
import { MonsterService } from '@services/MonsterService'
import { RandomService } from '@services/RandomService'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'
import { MONSTER_AI } from '../CombatConstants'

/**
 * Call For Help Action Handler
 *
 * When a monster with the Call ability executes this action:
 * 1. There's a (MonsterLevel × 5)% chance help arrives
 * 2. If help arrives, 1-4 new monsters of the same type join the group
 */
export class CallForHelpAction extends BaseCombatAction {
  readonly actionType = 'CALL_FOR_HELP' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command } = ctx
    const monster = command.actor as MonsterInstance
    const { monsterId, monsterLevel, groupId } = command.data

    const messages: string[] = []
    messages.push(`${this.getCombatantName(monster, ctx)} calls for help!`)

    // Roll for help to actually arrive: (Level × 5)%
    const successChance = Math.min(monsterLevel * MONSTER_AI.HELP_ARRIVAL_LEVEL_MULTIPLIER, 100)
    const helpArrives = RandomService.chance(successChance)

    if (!helpArrives) {
      messages.push(this.resultMessage('No help arrives!'))
      return { newState: state, messages }
    }

    // Help arrives! Generate 1-4 new monsters of the same type
    const template = MonsterDataLoader.getMonster(monsterId)
    if (!template) {
      messages.push(this.resultMessage('Help arrives, but something went wrong!'))
      return { newState: state, messages }
    }

    // Generate reinforcements
    const reinforcementCount = RandomService.random(
      MONSTER_AI.REINFORCEMENT_MIN,
      MONSTER_AI.REINFORCEMENT_MAX
    )
    const newMonsters: MonsterInstance[] = []

    for (let i = 0; i < reinforcementCount; i++) {
      const newMonster = MonsterService.createMonsterInstanceFromTemplate(template)
      newMonsters.push(newMonster)
    }

    // Find the target group and add monsters
    const newMonsterGroups = state.monsterGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          monsters: [...g.monsters, ...newMonsters],
        }
      }
      return g
    })

    const reinforcementMsg = reinforcementCount === 1
      ? `A ${template.name} joins the battle!`
      : `${reinforcementCount} ${template.name}s join the battle!`
    messages.push(this.resultMessage(reinforcementMsg))

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
combatActionRegistry.register(new CallForHelpAction())
