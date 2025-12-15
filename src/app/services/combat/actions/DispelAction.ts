/**
 * Dispel Action (Turn Undead)
 *
 * Handles the DISPEL command for turning undead monsters.
 *
 * Apple II Wizardry 1 mechanics:
 * - Only works on UNDEAD monsters
 * - Rolls INDIVIDUALLY for each monster: ((50 + 5×CharLevel) - (10×MonsterLevel))%
 * - Class penalties: Bishop -20%, Lord -40%
 * - Dispelled monsters grant NO XP
 */

import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CommandExecutionResult } from '@models/Combat'
import { RandomService } from '@services/RandomService'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'
import { DISPEL } from '../CombatConstants'
import { CombatHelpers } from '../CombatHelpers'

/**
 * Dispel Action Handler
 *
 * When a Priest, Bishop, or Lord uses DISPEL:
 * 1. Target group must contain undead monsters
 * 2. Each undead is rolled individually with the dispel formula
 * 3. Successful dispels instantly kill the undead (no XP granted)
 */
export class DispelAction extends BaseCombatAction {
  readonly actionType = 'DISPEL' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command } = ctx
    const caster = command.actor as Character
    const actorName = this.getCombatantName(caster, ctx)

    // Must have a target group specified
    const groupId = command.targetGroupId
    if (!groupId) {
      return {
        newState: state,
        messages: [`${actorName} attempts to DISPEL but no group targeted!`],
      }
    }

    const group = state.monsterGroups.find(g => g.id === groupId)
    if (!group || group.monsters.length === 0) {
      return {
        newState: state,
        messages: [
          `${actorName} attempts to DISPEL Group ${groupId}`,
          this.resultMessage('The group is empty!'),
        ],
      }
    }

    // Get alive monsters
    const aliveMonsters = CombatHelpers.getAliveMonsters(group.monsters)
    if (aliveMonsters.length === 0) {
      return {
        newState: state,
        messages: [
          `${actorName} attempts to DISPEL Group ${groupId}`,
          this.resultMessage('All monsters already dead!'),
        ],
      }
    }

    // Action message
    const actionMessage = `${actorName} attempts to DISPEL Group ${groupId}`

    // Check if any monsters are undead
    const undeadMonsters = aliveMonsters.filter(m => m.undead === true)
    if (undeadMonsters.length === 0) {
      return {
        newState: state,
        messages: [actionMessage, this.resultMessage('Dispel has no effect on non-undead!')],
      }
    }

    // Calculate base dispel chance
    const casterLevel = caster.level || 1

    // Apply class penalties (Priest: none, Bishop: -20%, Lord: -40%)
    let classPenalty = 0
    if (caster.class === CharacterClass.BISHOP) {
      classPenalty = DISPEL.BISHOP_PENALTY
    } else if (caster.class === CharacterClass.LORD) {
      classPenalty = DISPEL.LORD_PENALTY
    }

    // Roll individually for each eligible undead
    let dispelledCount = 0
    const newMonsterGroups = state.monsterGroups.map(g => {
      if (g.id !== groupId) return g

      return {
        ...g,
        monsters: g.monsters.map(m => {
          // Skip dead or non-undead monsters
          // BUG FIX: All undead can be dispelled regardless of status (not like original)
          if (m.hp <= 0 || !m.undead || m.status === 'DEAD') {
            return m
          }

          // Calculate per-monster dispel chance
          // Formula: ((50 + 5×CharLevel) - (10×MonsterLevel))% - ClassPenalty
          const monsterLevel = m.level || 1
          const rawChance =
            DISPEL.BASE_CHANCE +
            DISPEL.CASTER_LEVEL_MULTIPLIER * casterLevel -
            DISPEL.MONSTER_LEVEL_MULTIPLIER * monsterLevel -
            classPenalty

          // Clamp to 5-95% range
          const dispelChance = Math.max(DISPEL.MIN_CHANCE, Math.min(DISPEL.MAX_CHANCE, rawChance))

          // Roll for this monster
          if (RandomService.chance(dispelChance)) {
            dispelledCount++
            return {
              ...m,
              hp: 0,
              status: 'DEAD' as const,
            }
          }
          return m
        }),
      }
    })

    // Build result message
    let resultMessage: string
    if (dispelledCount > 0) {
      resultMessage =
        dispelledCount === 1 ? '1 undead dispelled!' : `${dispelledCount} undead dispelled!`
    } else {
      resultMessage = 'The undead resist!'
    }

    return {
      newState: { ...state, monsterGroups: newMonsterGroups },
      messages: [actionMessage, this.resultMessage(resultMessage)],
    }
  }
}

// Register the action
combatActionRegistry.register(new DispelAction())
