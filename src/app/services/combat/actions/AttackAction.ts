/**
 * Attack Action
 *
 * Handles physical attack execution including hit resolution,
 * damage calculation, critical hits, and status infliction.
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import {
  CombatState,
  CommandExecutionResult,
  Combatant,
  MonsterInstance,
  CombatantStatus,
} from '@models/Combat'
import { MonsterDataLoader } from '@services/MonsterDataLoader'
import { ItemProtectionService } from '@services/ItemProtectionService'
import { CharacterResistanceService } from '@services/CharacterResistanceService'
import { RandomService } from '@services/RandomService'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'
import {
  resolveAttack,
  AttackResolutionOptions,
} from '../core/AttackResolutionService'
import {
  hasStatusEffect,
} from '../core/StatusEffectService'
import {
  applyDamageToMonster,
  applyDamageToCharacter,
} from '../core/DamageApplicationService'
import { HIT_CHANCE, ITEM_PROTECTION } from '../CombatConstants'

/**
 * Attack Action Handler
 *
 * Executes physical attacks from characters or monsters.
 * Handles:
 * - Hit/miss resolution
 * - Damage calculation with modifiers
 * - Critical hits (instant kill for monsters, resistance check for characters)
 * - Purposed weapon bonus damage
 * - Class protection (items that nullify monster attacks)
 * - Status effect infliction (poison, paralyze, petrify, level drain)
 */
export class AttackAction extends BaseCombatAction {
  readonly actionType = 'ATTACK' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command, parryingCombatants } = ctx
    const target = command.target as Combatant

    if (!target) {
      return this.createMessageResult(state, ['No target specified'])
    }

    // Check for class protection (monster → character attacks only)
    const protectionResult = this.checkClassProtection(ctx, target)
    if (protectionResult) {
      return protectionResult
    }

    // Calculate AC modifier for defender
    const acModifier = this.calculateDefenderAcModifier(ctx, target, parryingCombatants)

    // Check if attacker is blind
    const isBlind = hasStatusEffect(state, command.actor.id, 'BLIND')
    const attackerPenalty = isBlind ? HIT_CHANCE.BLIND_PENALTY : 0

    // Calculate victim position for hit modifier
    const victimPosition = this.getVictimPosition(state, target)

    // Get monster class for purposed weapon check
    const defenderMonsterClass = 'monsterId' in target
      ? MonsterDataLoader.getMonster((target as MonsterInstance).monsterId)?.monsterClass
      : undefined

    // Resolve attack
    const attackResult = resolveAttack(command.actor, target, {
      defenderAcModifier: acModifier,
      attackerPenalty,
      victimPosition,
      attackIndex: command.attackIndex ?? 0,
      defenderMonsterClass,
    })

    const actorName = this.getCombatantName(command.actor, ctx)
    const targetName = this.getCombatantName(target, ctx)
    const actionMessage = `${actorName} attacks ${targetName}`

    // Handle miss
    if (!attackResult.hit) {
      return {
        newState: state,
        messages: [actionMessage, this.resultMessage(`${actorName} misses!`)],
      }
    }

    // Handle instant kill on monster
    if (attackResult.instantKill && 'monsterId' in target) {
      return this.handleMonsterInstantKill(ctx, target, actionMessage, attackResult.message)
    }

    // Handle character critical hit resistance
    if (attackResult.instantKill && 'class' in target) {
      const critResult = this.handleCharacterCritical(ctx, target as Character, actorName, actionMessage)
      if (critResult) {
        return critResult
      }
      // If null, critical was resisted - continue with normal damage
    }

    // Apply normal damage
    return this.applyDamage(ctx, target, attackResult.damage, attackResult.critical, actorName, targetName, actionMessage)
  }

  /**
   * Check if class protection nullifies the attack
   */
  private checkClassProtection(
    ctx: ActionExecutionContext,
    target: Combatant
  ): CommandExecutionResult | null {
    const { state, command } = ctx

    if (!('monsterId' in command.actor) || !('class' in target)) {
      return null
    }

    const monster = command.actor as MonsterInstance
    const character = target as Character
    const monsterTemplate = MonsterDataLoader.getMonster(monster.monsterId)

    if (!monsterTemplate?.monsterClass) {
      return null
    }

    const hasProtection = ItemProtectionService.hasClassProtection(character, monsterTemplate.monsterClass)
    if (hasProtection && RandomService.chance(ITEM_PROTECTION.CLASS_PROTECTION_CHANCE)) {
      const actorName = this.getCombatantName(command.actor, ctx)
      const targetName = this.getCombatantName(target, ctx)
      return {
        newState: state,
        messages: [
          `${actorName} attacks ${targetName}`,
          this.resultMessage(`${targetName}'s protection nullifies the attack!`),
        ],
      }
    }

    return null
  }

  /**
   * Calculate total AC modifier for defender
   */
  private calculateDefenderAcModifier(
    ctx: ActionExecutionContext,
    target: Combatant,
    parryingCombatants: Set<string>
  ): number {
    const { state } = ctx

    const isParrying = parryingCombatants.has(target.id)
    const parryBonus = isParrying ? HIT_CHANCE.PARRY_AC_BONUS : 0
    const combatBuff = state.acModifiers.get(target.id) ?? 0

    // Expedition buff only applies to party members
    const isPartyMember = !('monsterId' in target)
    const expeditionBuff = isPartyMember ? (state.expeditionAcBuff ?? 0) : 0

    return parryBonus + combatBuff + expeditionBuff
  }

  /**
   * Get victim position in monster group for hit modifier
   */
  private getVictimPosition(state: CombatState, target: Combatant): number {
    if (!('monsterId' in target)) {
      return 0
    }

    const group = state.monsterGroups.find(g =>
      g.monsters.some(m => m.id === target.id)
    )
    if (!group) {
      return 0
    }

    return group.monsters.findIndex(m => m.id === target.id)
  }

  /**
   * Handle instant kill on monster
   */
  private handleMonsterInstantKill(
    ctx: ActionExecutionContext,
    target: MonsterInstance,
    actionMessage: string,
    critMessage: string
  ): CommandExecutionResult {
    const { state } = ctx

    const newMonsterGroups = state.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(m => {
        if (m.id !== target.id) return m
        return { ...m, hp: 0, status: 'DEAD' as const }
      }),
    }))

    return {
      newState: { ...state, monsterGroups: newMonsterGroups },
      messages: [actionMessage, this.resultMessage(critMessage)],
      targetDamage: {
        targetId: target.id,
        damage: target.hp,
        newHp: 0,
        newStatus: 'DEAD',
      },
    }
  }

  /**
   * Handle character critical hit with resistance check
   * Returns null if critical was resisted
   */
  private handleCharacterCritical(
    ctx: ActionExecutionContext,
    character: Character,
    actorName: string,
    actionMessage: string
  ): CommandExecutionResult | null {
    const { state } = ctx

    // Physical protection grants immunity to critical hits
    if (ItemProtectionService.hasPhysicalProtection(character)) {
      return null // Critical resisted
    }

    // Normal resistance check
    const resistResult = CharacterResistanceService.checkResistance(character, 'critical')
    if (resistResult.resisted) {
      return null // Critical resisted
    }

    // Critical hit kills character
    return {
      newState: state,
      messages: [
        actionMessage,
        this.resultMessage(`${actorName} decapitates ${character.name}!`),
      ],
      characterUpdates: new Map([
        [character.id, { ...character, hp: 0, status: CharacterStatus.DEAD }],
      ]),
    }
  }

  /**
   * Apply damage to target and handle status infliction
   */
  private applyDamage(
    ctx: ActionExecutionContext,
    target: Combatant,
    damage: number,
    wasCritical: boolean,
    actorName: string,
    targetName: string,
    actionMessage: string
  ): CommandExecutionResult {
    const { state, command } = ctx

    // Check if target is helpless for 2x damage
    const isHelpless = this.isTargetHelpless(target)
    const finalDamage = isHelpless ? damage * 2 : damage

    // Calculate new HP
    const newHp = Math.max(0, target.hp - finalDamage)
    const newStatus: CombatantStatus = newHp === 0 ? 'DEAD' : 'ALIVE'

    // Apply damage to state (for monsters)
    let newState = state
    if ('monsterId' in target) {
      newState = applyDamageToMonster(state, target.id, finalDamage)
    }

    // Check for status infliction (monster → character)
    const statusResult = this.checkStatusInfliction(ctx, target, newHp)

    // Build result message
    let resultText: string
    if (wasCritical) {
      resultText = `${actorName} scores a critical hit, but ${targetName} resists! ${finalDamage} damage!`
    } else {
      resultText = `${actorName} hits for ${finalDamage} damage!`
    }

    if (isHelpless) {
      resultText += ' (HELPLESS: 2x damage!)'
    }

    if (statusResult.inflictedStatus) {
      resultText += ` - ${targetName} is ${statusResult.inflictedStatus}!`
    }

    if (statusResult.levelDrainResult) {
      const ldr = statusResult.levelDrainResult
      resultText += ` - ${targetName} loses ${ldr.drainAmount} level(s)! (Now level ${ldr.newLevel})`
    }

    // Build character updates if needed
    let characterUpdates: Map<string, Character> | undefined
    if ('class' in target) {
      const character = target as Character
      let updatedChar = applyDamageToCharacter(character, finalDamage)

      // Apply status infliction
      if (statusResult.inflictedStatus) {
        const statusMap: Record<string, CharacterStatus> = {
          'STONED': CharacterStatus.STONED,
          'PARALYZED': CharacterStatus.PARALYZED,
          'POISONED': CharacterStatus.POISONED,
          'LOST': CharacterStatus.LOST,
        }
        updatedChar = { ...updatedChar, status: statusMap[statusResult.inflictedStatus] ?? updatedChar.status }
      }

      // Apply level drain
      if (statusResult.levelDrainResult) {
        const ldr = statusResult.levelDrainResult
        updatedChar = {
          ...updatedChar,
          level: ldr.newLevel,
          maxHp: ldr.newMaxHp,
          hp: Math.min(updatedChar.hp, ldr.newMaxHp),
        }
      }

      characterUpdates = new Map([[character.id, updatedChar]])
    }

    return {
      newState,
      messages: [actionMessage, this.resultMessage(resultText)],
      targetDamage: {
        targetId: target.id,
        damage: finalDamage,
        newHp,
        newStatus,
      },
      characterUpdates,
    }
  }

  /**
   * Check if target is helpless (sleeping/paralyzed/stoned)
   */
  private isTargetHelpless(combatant: Combatant): boolean {
    if ('status' in combatant) {
      const status = combatant.status
      if (typeof status === 'string') {
        const statusStr = status.toUpperCase()
        return statusStr === 'ASLEEP' || statusStr === 'PARALYZED' || statusStr === 'STONED'
      }
      return status === CharacterStatus.ASLEEP ||
             status === CharacterStatus.PARALYZED ||
             status === CharacterStatus.STONED
    }
    return false
  }

  /**
   * Check for status effect infliction from monster attack
   */
  private checkStatusInfliction(
    ctx: ActionExecutionContext,
    target: Combatant,
    newHp: number
  ): {
    inflictedStatus: string | null
    levelDrainResult: { newLevel: number; newMaxHp: number; drainAmount: number } | null
  } {
    const { command } = ctx
    const result = {
      inflictedStatus: null as string | null,
      levelDrainResult: null as { newLevel: number; newMaxHp: number; drainAmount: number } | null,
    }

    // Only monster → character attacks can inflict status
    if (!('monsterId' in command.actor) || !('class' in target) || newHp <= 0) {
      return result
    }

    const monster = command.actor as MonsterInstance
    const character = target as Character
    const monsterTemplate = MonsterDataLoader.getMonster(monster.monsterId)

    if (!monsterTemplate) {
      return result
    }

    // Check special abilities in priority order
    if (monsterTemplate.specialAbilities.includes('petrify')) {
      const resistResult = CharacterResistanceService.checkResistance(character, 'stoning')
      if (!resistResult.resisted) {
        result.inflictedStatus = 'STONED'
      }
    } else if (monsterTemplate.specialAbilities.includes('paralyze')) {
      const resistResult = CharacterResistanceService.checkResistance(character, 'paralysis')
      if (!resistResult.resisted) {
        result.inflictedStatus = 'PARALYZED'
      }
    } else if (monsterTemplate.specialAbilities.includes('poison')) {
      const resistResult = CharacterResistanceService.checkResistance(character, 'poison')
      if (!resistResult.resisted) {
        result.inflictedStatus = 'POISONED'
      }
    } else if (monsterTemplate.specialAbilities.includes('level_drain') && monsterTemplate.levelDrain) {
      // Level drain has no saving throw
      const drainAmount = monsterTemplate.levelDrain
      const newLevel = Math.max(0, character.level - drainAmount)

      if (newLevel <= 0) {
        result.inflictedStatus = 'LOST'
      } else {
        const newMaxHp = Math.max(1, Math.floor(character.maxHp * (newLevel / character.level)))
        result.levelDrainResult = { newLevel, newMaxHp, drainAmount }
      }
    }

    return result
  }
}

// Register the action
combatActionRegistry.register(new AttackAction())
