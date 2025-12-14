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
  AttackRollDetails,
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

  /**
   * Get fresh target state from combat state (avoids stale command snapshot)
   *
   * Commands store a snapshot of the target at round start. When spells like KATINO
   * update monster status mid-round, `command.target` still has the old status.
   * Similarly, when a character is killed earlier in the round, subsequent attacks
   * must use the fresh character state to avoid overwriting death with stale data.
   *
   * This method looks up the current state from `state.monsterGroups` for monsters
   * and from `existingCharacterUpdates` for characters.
   */
  private getFreshTarget(
    state: CombatState,
    staleTarget: Combatant,
    existingCharacterUpdates?: Map<string, Character>
  ): Combatant {
    // For monsters, look up current state from monsterGroups
    if ('monsterId' in staleTarget) {
      for (const group of state.monsterGroups) {
        const freshMonster = group.monsters.find(m => m.id === staleTarget.id)
        if (freshMonster) return freshMonster
      }
    }

    // For characters, look up from existingCharacterUpdates (if killed earlier in round)
    if (existingCharacterUpdates) {
      const freshChar = existingCharacterUpdates.get(staleTarget.id)
      if (freshChar) return freshChar
    }

    return staleTarget
  }

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command, parryingCombatants, existingCharacterUpdates } = ctx
    // Use fresh target state to see mid-round status changes (e.g., ASLEEP from KATINO,
    // or character killed by critical hit earlier in round)
    const staleTarget = command.target as Combatant
    const target = this.getFreshTarget(state, staleTarget, existingCharacterUpdates)

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
      const rollInfo = this.formatHitRoll(attackResult.rollDetails)
      return {
        newState: state,
        messages: [actionMessage, this.resultMessage(`${actorName} misses! ${rollInfo}`)],
      }
    }

    // Handle instant kill on monster
    if (attackResult.instantKill && 'monsterId' in target) {
      return this.handleMonsterInstantKill(ctx, target, actionMessage, attackResult.rollDetails)
    }

    // Handle character critical hit resistance
    if (attackResult.instantKill && 'class' in target) {
      const critResult = this.handleCharacterCritical(ctx, target as Character, actorName, actionMessage, attackResult.rollDetails)
      if (critResult) {
        return critResult
      }
      // If null, critical was resisted - continue with normal damage
    }

    // Apply normal damage
    return this.applyDamage(ctx, target, attackResult.damage, attackResult.critical, actorName, targetName, actionMessage, attackResult.rollDetails)
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
    rollDetails: AttackRollDetails
  ): CommandExecutionResult {
    const { state } = ctx

    const newMonsterGroups = state.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(m => {
        if (m.id !== target.id) return m
        return { ...m, hp: 0, status: 'DEAD' as const }
      }),
    }))

    // Format verbose message with roll details
    const hitInfo = this.formatHitRoll(rollDetails)
    const critInfo = this.formatCritRoll(rollDetails)
    const resistInfo = this.formatMonsterResist(rollDetails, false)
    const message = `Critical hit! ${target.name} is decapitated! ${hitInfo}, ${critInfo}, ${resistInfo}`

    return {
      newState: { ...state, monsterGroups: newMonsterGroups },
      messages: [actionMessage, this.resultMessage(message)],
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
    actionMessage: string,
    rollDetails: AttackRollDetails
  ): CommandExecutionResult | null {
    const { state } = ctx
    const hitInfo = this.formatHitRoll(rollDetails)
    const critInfo = this.formatCritRoll(rollDetails)

    // Physical protection grants immunity to critical hits
    if (ItemProtectionService.hasPhysicalProtection(character)) {
      return null // Critical resisted - physical protection (no message needed, continues to normal damage)
    }

    // Calculate resistance chance, then roll manually to capture the value
    const resistCalc = CharacterResistanceService.calculateResistance(character, 'critical')
    const resistRoll = RandomService.randomFloat(0, 100)
    const resisted = resistRoll < resistCalc.resistChance

    if (resisted) {
      return null // Critical resisted - continues to normal damage with crit resist info
    }

    // Critical hit kills character - format verbose message
    const resistInfo = `resist ${resistRoll.toFixed(1)}/${resistCalc.resistChance}% FAILED`
    const message = `${actorName} decapitates ${character.name}! ${hitInfo}, ${critInfo}, ${resistInfo}`

    return {
      newState: state,
      messages: [
        actionMessage,
        this.resultMessage(message),
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
    actionMessage: string,
    rollDetails: AttackRollDetails
  ): CommandExecutionResult {
    const { state, command } = ctx

    // Defensive check: If character target is already dead (killed earlier in round),
    // skip damage application and return early with a message
    if ('class' in target) {
      const character = target as Character
      if (character.hp <= 0 || character.status === CharacterStatus.DEAD) {
        return {
          newState: state,
          messages: [actionMessage, this.resultMessage(`${targetName} is already dead!`)],
          characterUpdates: new Map([[character.id, character]]),  // Preserve dead state
        }
      }
    }

    // Helpless multiplier already applied in resolveAttack() - use rollDetails flag for message
    const isHelpless = rollDetails.damageHelplessMult
    const finalDamage = damage

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

    // Build verbose result message with roll details
    const hitInfo = this.formatHitRoll(rollDetails)
    const dmgInfo = this.formatDamageRoll(rollDetails, finalDamage)

    let resultText: string
    if (wasCritical) {
      // Critical was triggered but monster/character resisted (still does normal damage)
      const critInfo = this.formatCritRoll(rollDetails)
      const resistInfo = rollDetails.monsterResistRoll !== undefined
        ? this.formatMonsterResist(rollDetails, true)
        : 'RESISTED'
      resultText = `${actorName} hits for ${finalDamage} damage! ${hitInfo}, ${dmgInfo}, ${critInfo} ${resistInfo}`
    } else {
      resultText = `${actorName} hits for ${finalDamage} damage! ${hitInfo}, ${dmgInfo}`
    }

    if (isHelpless) {
      resultText += ' (HELPLESS 2x!)'
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

  // ============================================================================
  // Roll Detail Formatting Helpers
  // ============================================================================

  /**
   * Format hit roll details: "hit: 23.4/45%"
   * Shows roll/threshold where roll < threshold means hit
   */
  private formatHitRoll(rollDetails: AttackRollDetails): string {
    return `hit: ${rollDetails.hitRoll.toFixed(1)}/${rollDetails.hitChance.toFixed(0)}%`
  }

  /**
   * Format damage breakdown: "dmg: 6+2=8" or "dmg: 2"
   * Shows base damage + STR modifier if modifier exists
   */
  private formatDamageRoll(rollDetails: AttackRollDetails, finalDamage: number): string {
    const { damageBase, damageStrMod, damagePurposedMult, damageHelplessMult } = rollDetails
    let parts: string[] = []

    if (damageStrMod !== 0) {
      const sign = damageStrMod > 0 ? '+' : ''
      parts.push(`${damageBase}${sign}${damageStrMod}`)
    } else {
      parts.push(`${damageBase}`)
    }

    // Note multipliers
    const mults: string[] = []
    if (damagePurposedMult) mults.push('2x purposed')
    if (damageHelplessMult) mults.push('2x helpless')

    if (mults.length > 0) {
      return `dmg: ${parts.join('')}×${mults.join('×')}=${finalDamage}`
    }

    // If damage differs from base+str (due to minimum damage), show final
    const basePlusMod = Math.max(1, damageBase + damageStrMod)
    if (basePlusMod !== finalDamage && !damagePurposedMult && !damageHelplessMult) {
      return `dmg: ${parts.join('')}=${finalDamage}`
    }

    return `dmg: ${parts.join('')}`
  }

  /**
   * Format critical roll details: "CRIT 15.2/20%"
   * Shows roll/threshold where roll < threshold means crit triggered
   */
  private formatCritRoll(rollDetails: AttackRollDetails): string {
    if (rollDetails.critRoll === undefined) {
      return 'CRIT'
    }
    return `CRIT ${rollDetails.critRoll.toFixed(1)}/${rollDetails.critChance}%`
  }

  /**
   * Format monster critical resistance: "resist d35: 18≤20 SAVED" or "resist d35: 22>11 FAILED"
   * Monster resists if threshold >= roll (threshold = level + 10)
   */
  private formatMonsterResist(rollDetails: AttackRollDetails, resisted: boolean): string {
    if (rollDetails.monsterResistRoll === undefined || rollDetails.monsterResistThreshold === undefined) {
      return resisted ? 'RESISTED' : 'FAILED'
    }
    const roll = rollDetails.monsterResistRoll
    const threshold = rollDetails.monsterResistThreshold
    if (resisted) {
      return `resist d35: ${roll}≤${threshold} SAVED`
    }
    return `resist d35: ${roll}>${threshold} FAILED`
  }
}

// Register the action
combatActionRegistry.register(new AttackAction())
