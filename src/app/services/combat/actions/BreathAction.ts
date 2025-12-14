/**
 * Breath Action
 *
 * Handles monster breath weapon attacks.
 * Per Apple II reference:
 * - Damage = monster's current HP / 2 (rounded down)
 * - Hits all party members
 * - Resistance AND save = ~25% damage (multiplicative)
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { CommandExecutionResult, MonsterInstance } from '@models/Combat'
import { CharacterResistanceService } from '@services/CharacterResistanceService'
import { ItemProtectionService } from '@services/ItemProtectionService'
import { RandomService } from '@services/RandomService'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'

/**
 * Breath Action Handler
 *
 * Executes a breath weapon attack from a monster.
 * Breath attacks hit all party members and can be reduced by:
 * - Elemental resistance (halves damage)
 * - Saving throw (halves damage)
 * These stack multiplicatively for ~25% damage if both succeed.
 */
export class BreathAction extends BaseCombatAction {
  readonly actionType = 'BREATH' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command, existingCharacterUpdates } = ctx
    const monster = command.actor as MonsterInstance
    const breathType = command.data?.breathType || 'fire'
    const baseDamage = command.data?.damage || Math.floor(monster.hp / 2)
    const targets = Array.isArray(command.target) ? command.target : [command.target]
    const messages: string[] = []
    const characterUpdates = new Map<string, Character>(existingCharacterUpdates)

    messages.push(`${this.getCombatantName(monster, ctx)} breathes ${breathType}!`)

    for (const target of targets) {
      if (!target || !('id' in target)) continue
      if ('monsterId' in target) continue // Breath doesn't hit monsters

      const char = target as Character
      let finalDamage = baseDamage

      // Check for elemental resistance (halves damage, rounded up)
      const hasResistance = ItemProtectionService.hasElementalResistance(char, breathType)
      if (hasResistance) {
        finalDamage = Math.ceil(finalDamage / 2)
      }

      // Check for save vs breath (halves damage, rounded up)
      const resistResult = CharacterResistanceService.calculateResistance(char, 'breath')
      const madeSave = RandomService.chance(resistResult.resistChance)
      if (madeSave) {
        finalDamage = Math.ceil(finalDamage / 2)
      }

      // Apply damage
      const currentChar = characterUpdates.get(char.id) || char
      const newHp = Math.max(0, currentChar.hp - finalDamage)
      const isDead = newHp <= 0

      const updatedChar: Character = {
        ...currentChar,
        hp: newHp,
        status: isDead ? CharacterStatus.DEAD : currentChar.status,
      }
      characterUpdates.set(char.id, updatedChar)

      // Build result message
      let resultMsg = `${char.name} takes ${finalDamage} damage`
      if (hasResistance) resultMsg += ' (resisted)'
      if (madeSave) resultMsg += ' (saved)'
      if (isDead) resultMsg += ' - KILLED!'
      messages.push(this.resultMessage(resultMsg))
    }

    return { newState: state, messages, characterUpdates }
  }
}

// Register the action
combatActionRegistry.register(new BreathAction())
