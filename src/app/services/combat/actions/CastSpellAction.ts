/**
 * Cast Spell Action
 *
 * Handles spell casting for both characters and monsters.
 * Supports damage spells, healing spells, status effects, buffs,
 * instant death, resurrection, and special effects.
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import {
  CombatState,
  CommandExecutionResult,
  Combatant,
  MonsterInstance,
  DamageResult,
  CombatantStatus,
} from '@models/Combat'
import { SpellCastingService } from '@services/SpellCastingService'
import { RandomService } from '@services/RandomService'
import {
  BaseCombatAction,
  ActionExecutionContext,
  combatActionRegistry,
} from './CombatAction'
import {
  applyStatusEffect,
  applyAsleepToMonster,
  applyParalyzedToMonster,
  applyAcBuff,
  applyCureStatus,
  setStatusDuration,
  hasStatusEffect,
} from '../core/StatusEffectService'
import {
  applyDamage,
  applyHealingToCharacter,
  applyInstantDeathToMonster,
  getAllAliveMonsters,
} from '../core/DamageApplicationService'
import { SPELL_DEGRADATION } from '../CombatConstants'

/**
 * Cast Spell Action Handler
 *
 * Executes spell casting including:
 * - Validation (spell points, known spells, silenced check)
 * - Target resolution based on spell type
 * - Damage/healing application
 * - Status effect application
 * - AC buffs
 * - Instant death effects
 * - Resurrection
 * - Monster identification
 * - Random effects (HAMAN/MAHAMAN)
 * - Spell degradation for monster mage spells
 */
export class CastSpellAction extends BaseCombatAction {
  readonly actionType = 'CAST_SPELL' as const

  execute(ctx: ActionExecutionContext): CommandExecutionResult {
    const { state, command, existingCharacterUpdates } = ctx
    const isMonsterCaster = 'monsterId' in command.actor
    const actorName = this.getCombatantName(command.actor, ctx)
    const spellId = command.data?.spellId
    const characterUpdates = new Map<string, Character>()

    if (!spellId) {
      return { newState: state, messages: [`${actorName} casts nothing!`] }
    }

    // Check if silenced
    if (hasStatusEffect(state, command.actor.id, 'SILENCED')) {
      return {
        newState: state,
        messages: [`${actorName} is silenced and cannot cast spells!`],
      }
    }

    // Character-only validation: spell points and known spells
    if (!isMonsterCaster) {
      const caster = command.actor as Character
      const canCastResult = SpellCastingService.canCastSpell(caster, spellId)
      if (!canCastResult.canCast) {
        return {
          newState: state,
          messages: [`${actorName} cannot cast spell: ${canCastResult.reason}`],
        }
      }
    }

    // Get spell definition to check target type
    const spell = SpellCastingService.getSpell(spellId)

    // Determine targets based on spell type and command
    const targets = this.resolveTargets(state, command, spell, isMonsterCaster)

    // Resolve spell effect
    const spellCaster = isMonsterCaster
      ? (command.actor as unknown as Character)
      : (command.actor as Character)
    const spellEffect = SpellCastingService.resolveSpellEffect(spellId, spellCaster, targets)

    // Apply all spell effects
    let newState = state
    const damageResults: DamageResult[] = []

    // Apply damage
    if (spellEffect.damage && spellEffect.damage.length > 0) {
      const result = this.applySpellDamage(
        newState,
        targets,
        spellEffect.damage,
        ctx
      )
      newState = result.state
      damageResults.push(...result.damageResults)
    }

    // Apply status effects
    if (spellEffect.statusEffects && spellEffect.statusEffects.length > 0) {
      newState = this.applySpellStatusEffects(newState, spellEffect.statusEffects)
    }

    // Apply healing
    if (spellEffect.healing && spellEffect.healing.length > 0) {
      this.applySpellHealing(
        targets,
        spellEffect.healing,
        existingCharacterUpdates,
        characterUpdates,
        damageResults
      )
    }

    // Apply AC buffs
    if (spellEffect.acBuffs && spellEffect.acBuffs.length > 0) {
      for (const acBuff of spellEffect.acBuffs) {
        newState = applyAcBuff(newState, acBuff.target, acBuff.acModifier)
      }
    }

    // Apply full healing (MALIKTO)
    if (spellEffect.fullHeal && spellEffect.fullHeal.length > 0) {
      this.applyFullHealing(targets, spellEffect.fullHeal, existingCharacterUpdates, characterUpdates)
    }

    // Apply instant death (MAKANITO)
    if (spellEffect.instantDeath && spellEffect.instantDeath.length > 0) {
      for (const targetId of spellEffect.instantDeath) {
        newState = applyInstantDeathToMonster(newState, targetId)
      }
    }

    // Apply resurrection (KADORTO)
    if (spellEffect.resurrection && spellEffect.resurrection.length > 0) {
      this.applyResurrection(targets, spellEffect.resurrection, existingCharacterUpdates, characterUpdates)
    }

    // Apply status cures (LITOKAN, LATUMOFIS)
    if (spellEffect.statusCures) {
      newState = applyCureStatus(
        newState,
        spellEffect.statusCures.targetIds,
        spellEffect.statusCures.cureType as any
      )
      this.trackCuredCharacters(targets, spellEffect.statusCures.targetIds, existingCharacterUpdates, characterUpdates)
    }

    // Apply monster identification (LATUMAPIC)
    if (spellEffect.monsterIdentification) {
      newState = {
        ...newState,
        monsterGroups: newState.monsterGroups.map(group => ({
          ...group,
          identified: spellEffect.monsterIdentification!.groupIds.includes(group.id) || group.identified,
        })),
      }
    }

    // Handle HAMAN/MAHAMAN random effects
    if (spellEffect.randomEffect) {
      const result = this.applyRandomEffect(
        newState,
        targets,
        spellEffect.randomEffect,
        command.actor as Character,
        existingCharacterUpdates,
        characterUpdates
      )
      newState = result.state
    }

    // Build action message
    let actionMessage = `${actorName} casts ${spellId.toUpperCase()}`
    if (spell && spell.target === 'group' && command.targetGroupId) {
      actionMessage += ` on Group ${command.targetGroupId}`
    } else if (spell && spell.target === 'all_enemies') {
      actionMessage += ` on all enemies`
    } else if (spell && spell.target === 'single' && targets.length > 0) {
      const targetName = 'name' in targets[0] ? targets[0].name : (targets[0] as MonsterInstance).monsterId
      actionMessage += ` on ${targetName}`
    }

    // Monster mage spell degradation
    if (isMonsterCaster && command.data?.spellType === 'mage' && command.data?.groupId) {
      newState = this.applySpellDegradation(newState, command.data.groupId)
    }

    return {
      newState,
      messages: [actionMessage, this.resultMessage(spellEffect.message)],
      characterUpdates: characterUpdates.size > 0 ? characterUpdates : undefined,
      damageResults: damageResults.length > 0 ? damageResults : undefined,
      statusEffects: spellEffect.statusEffects?.length ? spellEffect.statusEffects : undefined,
      acBuffs: spellEffect.acBuffs?.length ? spellEffect.acBuffs : undefined,
    }
  }

  private resolveTargets(
    state: CombatState,
    command: any,
    spell: any,
    isMonsterCaster: boolean
  ): Combatant[] {
    if (spell && spell.target === 'group') {
      if (isMonsterCaster) {
        return Array.isArray(command.target) ? command.target : command.target ? [command.target] : []
      } else if (command.targetGroupId) {
        const group = state.monsterGroups.find(g => g.id === command.targetGroupId)
        return group ? group.monsters.filter(m => m.hp > 0) : []
      }
    } else if (spell && spell.target === 'all_enemies') {
      return getAllAliveMonsters(state)
    } else if (spell && spell.target === 'caster') {
      return [command.actor]
    }
    return Array.isArray(command.target) ? command.target : command.target ? [command.target] : []
  }

  private applySpellDamage(
    state: CombatState,
    targets: Combatant[],
    damage: number[],
    ctx: ActionExecutionContext
  ): { state: CombatState; damageResults: DamageResult[] } {
    let newState = state
    const damageResults: DamageResult[] = []

    for (let i = 0; i < targets.length && i < damage.length; i++) {
      const target = targets[i]
      const dmg = damage[i]
      newState = applyDamage(newState, target, dmg)

      if (dmg > 0) {
        damageResults.push({
          targetId: target.id,
          targetName: this.getCombatantName(target, ctx),
          value: dmg,
          type: 'damage',
          category: 'normal',
        })
      }
    }

    return { state: newState, damageResults }
  }

  private applySpellStatusEffects(
    state: CombatState,
    statusEffects: Array<{ target: string; effect: string }>
  ): CombatState {
    let newState = state

    for (const statusEffect of statusEffects) {
      let effect = statusEffect.effect.toUpperCase()
      if (effect === 'BLINDED') effect = 'BLIND'

      if (effect === 'BLIND' || effect === 'SILENCED') {
        newState = applyStatusEffect(newState, statusEffect.target, effect as 'BLIND' | 'SILENCED')
      } else if (effect === 'ASLEEP') {
        newState = applyAsleepToMonster(newState, statusEffect.target)
      } else if (effect === 'PARALYZED') {
        newState = applyParalyzedToMonster(newState, statusEffect.target)
      }
    }

    return newState
  }

  private applySpellHealing(
    targets: Combatant[],
    healing: number[],
    existingUpdates: Map<string, Character> | undefined,
    characterUpdates: Map<string, Character>,
    damageResults: DamageResult[]
  ): void {
    for (let i = 0; i < targets.length && i < healing.length; i++) {
      const target = targets[i]
      const healAmount = healing[i]

      if ('class' in target) {
        const currentChar = existingUpdates?.get(target.id) || characterUpdates.get(target.id) || (target as Character)
        const healed = applyHealingToCharacter(currentChar, healAmount)
        characterUpdates.set(target.id, healed)

        if (healAmount > 0) {
          damageResults.push({
            targetId: target.id,
            targetName: target.name,
            value: healAmount,
            type: 'healing',
            category: 'normal',
          })
        }
      }
    }
  }

  private applyFullHealing(
    targets: Combatant[],
    targetIds: string[],
    existingUpdates: Map<string, Character> | undefined,
    characterUpdates: Map<string, Character>
  ): void {
    for (const targetId of targetIds) {
      const target = targets.find(t => t.id === targetId)
      if (target && 'class' in target) {
        const currentChar = existingUpdates?.get(targetId) || characterUpdates.get(targetId) || (target as Character)
        characterUpdates.set(targetId, { ...currentChar, hp: currentChar.maxHp })
      }
    }
  }

  private applyResurrection(
    targets: Combatant[],
    resurrections: Array<{ targetId: string; success: boolean; resultStatus: string }>,
    existingUpdates: Map<string, Character> | undefined,
    characterUpdates: Map<string, Character>
  ): void {
    for (const resResult of resurrections) {
      if (!resResult.success || resResult.resultStatus !== 'OK') continue

      const target = targets.find(t => t.id === resResult.targetId)
      if (target && 'class' in target) {
        const currentChar = existingUpdates?.get(resResult.targetId) || characterUpdates.get(resResult.targetId) || (target as Character)
        characterUpdates.set(resResult.targetId, { ...currentChar, hp: 1, status: CharacterStatus.OK })
      }
    }
  }

  private trackCuredCharacters(
    targets: Combatant[],
    targetIds: string[],
    existingUpdates: Map<string, Character> | undefined,
    characterUpdates: Map<string, Character>
  ): void {
    for (const targetId of targetIds) {
      const target = targets.find(t => t.id === targetId)
      if (target && 'class' in target) {
        const currentChar = existingUpdates?.get(targetId) || characterUpdates.get(targetId) || (target as Character)
        characterUpdates.set(targetId, { ...currentChar, status: CharacterStatus.OK })
      }
    }
  }

  private applyRandomEffect(
    state: CombatState,
    targets: Combatant[],
    randomEffect: any,
    caster: Character,
    existingUpdates: Map<string, Character> | undefined,
    characterUpdates: Map<string, Character>
  ): { state: CombatState } {
    let newState = state
    const re = randomEffect

    // Apply level drain cost
    if (re.levelDrain && re.levelDrain > 0) {
      const drainedLevel = Math.max(1, caster.level - re.levelDrain)
      const existing = existingUpdates?.get(caster.id)
      characterUpdates.set(caster.id, existing
        ? { ...existing, level: drainedLevel }
        : { ...caster, level: drainedLevel }
      )
    }

    const partyTargets = targets.filter(t => 'class' in t) as Character[]

    switch (re.effect) {
      case 'cure_and_heal':
        for (const char of partyTargets) {
          const healAmount = re.healDice
            ? RandomService.rollDiceNotation(re.healDice)
            : RandomService.rollDice(9, 8)
          const currentChar = existingUpdates?.get(char.id) || characterUpdates.get(char.id) || char
          if (currentChar.status !== CharacterStatus.DEAD && currentChar.status !== CharacterStatus.ASHES) {
            characterUpdates.set(char.id, {
              ...currentChar,
              hp: Math.min(currentChar.maxHp, currentChar.hp + healAmount),
              status: CharacterStatus.OK,
            })
          }
        }
        break

      case 'strip_resistance':
        newState = {
          ...newState,
          monsterGroups: newState.monsterGroups.map((group, idx) =>
            idx < 3
              ? { ...group, monsters: group.monsters.map(m => ({ ...m, level: 1 })) }
              : group
          ),
        }
        break

      case 'full_heal':
        for (const char of partyTargets) {
          const currentChar = existingUpdates?.get(char.id) || characterUpdates.get(char.id) || char
          if (currentChar.status !== CharacterStatus.DEAD && currentChar.status !== CharacterStatus.ASHES) {
            characterUpdates.set(char.id, { ...currentChar, hp: currentChar.maxHp, status: CharacterStatus.OK })
          }
        }
        break

      case 'set_party_ac':
        const acValue = re.acValue ?? -10
        for (const target of partyTargets) {
          newState = applyAcBuff(newState, target.id, acValue)
        }
        break

      case 'resurrect_and_heal':
        for (const char of partyTargets) {
          const currentChar = existingUpdates?.get(char.id) || characterUpdates.get(char.id) || char
          characterUpdates.set(char.id, { ...currentChar, hp: currentChar.maxHp, status: CharacterStatus.OK })
        }
        break

      case 'mass_silence':
        const duration = re.durationDice
          ? RandomService.rollDiceNotation(re.durationDice)
          : RandomService.random(5, 9)
        const affectedGroups = newState.monsterGroups.slice(0, 3)

        for (const group of affectedGroups) {
          for (const monster of group.monsters) {
            if (monster.hp > 0 && monster.status !== 'DEAD') {
              newState = applyStatusEffect(newState, monster.id, 'SILENCED')
              newState = setStatusDuration(newState, monster.id, 'SILENCED', duration)
            }
          }
        }
        break

      case 'instant_kill_all':
        newState = {
          ...newState,
          monsterGroups: newState.monsterGroups.map(group => ({
            ...group,
            monsters: group.monsters.map(m => ({ ...m, hp: 0, status: 'DEAD' as CombatantStatus })),
          })),
        }
        break
    }

    return { state: newState }
  }

  private applySpellDegradation(state: CombatState, groupId: 'A' | 'B' | 'C' | 'D'): CombatState {
    const group = state.monsterGroups.find(g => g.id === groupId)
    if (!group || !group.currentMageLevel || group.currentMageLevel <= 1) {
      return state
    }

    const aliveInGroup = group.monsters.filter(m => m.hp > 0 && m.status !== 'DEAD').length
    const degradeChance = SPELL_DEGRADATION.PERCENTAGE_MULTIPLIER / (aliveInGroup + SPELL_DEGRADATION.DIVISOR_OFFSET)

    if (RandomService.chance(degradeChance)) {
      return {
        ...state,
        monsterGroups: state.monsterGroups.map(g =>
          g.id === groupId ? { ...g, currentMageLevel: g.currentMageLevel! - 1 } : g
        ),
      }
    }

    return state
  }
}

// Register the action
combatActionRegistry.register(new CastSpellAction())
