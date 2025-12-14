/**
 * Monster AI Service
 *
 * Handles monster decision-making during combat, including:
 * - Action selection (attack, spell, breath, flee, call for help)
 * - Target selection based on monster intelligence level
 * - Advancement for back-row melee monsters
 *
 * AI Priority (Apple II Reference):
 * -1. Flee (if demoralized with Run ability, 65% chance)
 *  0. Call for Help (if can call and group < 5, 75% chance)
 *  1. Mage spell (75% chance if has mage spells)
 *  2. Priest spell (75% chance if has priest spells)
 *  3. Breath weapon (60% chance if has breath)
 *  4. Melee attack (fallback)
 */

import { Character } from '@models/Character'
import {
  CombatCommand,
  CombatActionType,
  Combatant,
  MonsterInstance,
  MonsterGroup,
} from '@models/Combat'
import { MonsterDataLoader } from '@services/MonsterDataLoader'
import { MonsterService } from '@services/MonsterService'
import { RandomService } from '@services/RandomService'
import {
  selectMonsterMageSpell,
  selectMonsterPriestSpell,
} from '@config/MonsterSpellTables'
import { v4 as uuidv4 } from 'uuid'
import { calculateInitiative } from './InitiativeService'
import { calculateDemoralization } from './FleeService'
import { canCombatantAct } from './DamageApplicationService'
import { MONSTER_AI } from '../CombatConstants'

// Re-export for backward compatibility
export { MonsterAIService }

/**
 * Options for creating a combat command
 */
export interface CommandOptions {
  spellId?: string
  groupId?: string
  spellType?: 'mage' | 'priest'
  monsterId?: string
  monsterLevel?: number
  breathType?: string
  damage?: number
}

/**
 * Context for monster AI decision-making
 */
export interface MonsterAIContext {
  monster: MonsterInstance
  party: Character[]
  frontRow: string[]
  monsterGroup?: MonsterGroup
  allGroups?: MonsterGroup[]
  debugMode?: boolean
}

/**
 * Monster AI Service
 *
 * Encapsulates all monster decision-making logic.
 */
class MonsterAIService {
  /**
   * Create a combat command for an actor
   */
  static createCommand(
    actor: Combatant,
    actionType: CombatActionType,
    target?: Combatant | Combatant[],
    data?: CommandOptions
  ): CombatCommand {
    const targetGroupId = data?.groupId as 'A' | 'B' | 'C' | 'D' | undefined

    return {
      id: uuidv4(),
      actor,
      type: actionType,
      initiative: calculateInitiative(actor),
      target,
      targetGroupId,
      data,
    }
  }

  /**
   * Select an action for a monster based on AI decision tree
   *
   * Priority:
   * -1. Flee (if demoralized with Run ability)
   *  0. Call for Help (if group is diminished)
   *  1. Mage spell (75% chance)
   *  2. Priest spell (75% chance)
   *  3. Breath weapon (60% chance)
   *  4. Melee attack (fallback)
   *
   * @param ctx - Monster AI context
   * @returns CombatCommand representing the monster's chosen action
   */
  static selectMonsterAction(ctx: MonsterAIContext): CombatCommand {
    const { monster, party, frontRow, monsterGroup, allGroups, debugMode } = ctx

    // Check if monster is in back row and needs to advance
    if (monsterGroup && allGroups && monsterGroup.formation === 'back') {
      const advanceCommand = this.checkAdvanceNeeded(monster, monsterGroup, allGroups)
      if (advanceCommand) return advanceCommand
    }

    // Get alive party members for targeting
    const targetPool = this.getTargetPool(party, frontRow)

    // If no valid targets, return a do-nothing command
    if (targetPool.length === 0) {
      return this.createCommand(monster, 'PARRY')
    }

    // -1. Flee check (for demoralized monsters with Run ability)
    if (monster.canFlee && allGroups) {
      const fleeCommand = this.checkFlee(monster, party, monsterGroup, allGroups, debugMode)
      if (fleeCommand) return fleeCommand
    }

    // 0. Call for Help check
    if (monster.canCall && monsterGroup) {
      const callCommand = this.checkCallForHelp(monster, monsterGroup, debugMode)
      if (callCommand) return callCommand
    }

    // 1. Mage spell check (75% chance if has mage spells)
    if (monsterGroup) {
      const mageCommand = this.checkMageSpell(monster, monsterGroup, targetPool, debugMode)
      if (mageCommand) return mageCommand
    }

    // 2. Priest spell check (75% chance if has priest spells)
    const priestCommand = this.checkPriestSpell(monster, monsterGroup, targetPool, debugMode)
    if (priestCommand) return priestCommand

    // 3. Breath weapon check (60% chance if has breath)
    const breathCommand = this.checkBreathWeapon(monster, party, debugMode)
    if (breathCommand) return breathCommand

    // 4. Fall back to melee attack
    const target = this.selectMonsterTarget(monster, targetPool)
    return this.createCommand(monster, 'ATTACK', target)
  }

  /**
   * Check if monster needs to advance from back row
   */
  private static checkAdvanceNeeded(
    monster: MonsterInstance,
    monsterGroup: MonsterGroup,
    allGroups: MonsterGroup[]
  ): CombatCommand | null {
    const template = MonsterDataLoader.getMonster(monster.monsterId)

    // If melee-only monster in back row, need to advance to attack
    if (template && !MonsterService.canAttackFromBackRow(template)) {
      // Check if front row has room
      const frontGroups = allGroups.filter(
        g => g.formation === 'front' && g.monsters.some(m => m.hp > 0)
      )

      // Allow advancement if front row has room
      const maxFrontRowGroups = 2
      if (frontGroups.length < maxFrontRowGroups) {
        return this.createCommand(monster, 'ADVANCE')
      }

      // Can't advance, front row is full - just parry/wait
      return this.createCommand(monster, 'PARRY')
    }

    return null
  }

  /**
   * Get valid target pool based on party formation
   */
  private static getTargetPool(party: Character[], frontRow: string[]): Character[] {
    const aliveFront = party.filter(
      c => frontRow.includes(c.id) && canCombatantAct(c)
    )
    return aliveFront.length > 0
      ? aliveFront
      : party.filter(c => canCombatantAct(c))
  }

  /**
   * Check if monster should flee
   */
  private static checkFlee(
    monster: MonsterInstance,
    party: Character[],
    monsterGroup: MonsterGroup | undefined,
    allGroups: MonsterGroup[],
    debugMode?: boolean
  ): CombatCommand | null {
    const isDemoralized = calculateDemoralization(party, allGroups)
    if (isDemoralized && RandomService.chance(MONSTER_AI.FLEE_CHANCE)) {
      if (debugMode) {
        console.debug(`[Monster AI] ${monster.name} flees! (demoralized)`)
      }
      return this.createCommand(monster, 'MONSTER_FLEE', undefined, {
        groupId: monsterGroup?.id,
      })
    }
    return null
  }

  /**
   * Check if monster should call for help
   */
  private static checkCallForHelp(
    monster: MonsterInstance,
    monsterGroup: MonsterGroup,
    debugMode?: boolean
  ): CombatCommand | null {
    const aliveInGroup = monsterGroup.monsters.filter(
      m => m.hp > 0 && m.status !== 'DEAD'
    ).length

    if (aliveInGroup < MONSTER_AI.CALL_HELP_THRESHOLD && RandomService.chance(MONSTER_AI.CALL_HELP_CHANCE)) {
      if (debugMode) {
        console.debug(
          `[Monster AI] ${monster.name} calls for help! (group has ${aliveInGroup} alive)`
        )
      }
      return this.createCommand(monster, 'CALL_FOR_HELP', undefined, {
        monsterId: monster.monsterId,
        monsterLevel: monster.level,
        groupId: monsterGroup.id,
      })
    }
    return null
  }

  /**
   * Check if monster should cast a mage spell
   */
  private static checkMageSpell(
    monster: MonsterInstance,
    monsterGroup: MonsterGroup,
    targetPool: Character[],
    debugMode?: boolean
  ): CombatCommand | null {
    const groupMageLevel = monsterGroup.currentMageLevel ?? monster.mageLevel ?? 0

    if (groupMageLevel > 0 && RandomService.chance(MONSTER_AI.MAGE_SPELL_CHANCE)) {
      const spellChoice = RandomService.nextRandom()
      const spellId = selectMonsterMageSpell(groupMageLevel, spellChoice)

      if (debugMode) {
        console.debug(
          `[Monster AI] ${monster.name} casts mage spell ${spellId} (group level ${groupMageLevel})`
        )
      }

      return this.createCommand(monster, 'CAST_SPELL', targetPool, {
        spellId,
        groupId: monsterGroup.id,
        spellType: 'mage',
      })
    }
    return null
  }

  /**
   * Check if monster should cast a priest spell
   */
  private static checkPriestSpell(
    monster: MonsterInstance,
    monsterGroup: MonsterGroup | undefined,
    targetPool: Character[],
    debugMode?: boolean
  ): CombatCommand | null {
    if (monster.priestLevel && monster.priestLevel > 0 && RandomService.chance(MONSTER_AI.PRIEST_SPELL_CHANCE)) {
      const spellChoice = RandomService.nextRandom()
      const spellId = selectMonsterPriestSpell(monster.priestLevel, spellChoice)

      if (debugMode) {
        console.debug(
          `[Monster AI] ${monster.name} casts priest spell ${spellId} (level ${monster.priestLevel})`
        )
      }

      return this.createCommand(monster, 'CAST_SPELL', targetPool, {
        spellId,
        groupId: monsterGroup?.id,
        spellType: 'priest',
      })
    }
    return null
  }

  /**
   * Check if monster should use breath weapon
   */
  private static checkBreathWeapon(
    monster: MonsterInstance,
    party: Character[],
    debugMode?: boolean
  ): CombatCommand | null {
    if (monster.breathType && RandomService.chance(MONSTER_AI.BREATH_CHANCE)) {
      if (debugMode) {
        console.debug(`[Monster AI] ${monster.name} uses ${monster.breathType} breath`)
      }

      return this.createCommand(
        monster,
        'BREATH',
        party.filter(c => canCombatantAct(c)),
        {
          breathType: monster.breathType,
          damage: Math.floor(monster.hp / 2), // Damage = half current HP
        }
      )
    }
    return null
  }

  /**
   * Select best target for monster using AI strategy
   *
   * Strategy varies by monster level:
   * - Level 1-2: Random targeting (simple creatures)
   * - Level 3-5: Focus fire on weakest HP% (smart hunters)
   * - Level 6+: Target spellcasters preferentially (intelligent foes)
   *
   * @param monster - The attacking monster
   * @param targets - Valid target characters
   * @returns The selected target
   */
  static selectMonsterTarget(monster: MonsterInstance, targets: Character[]): Character {
    const level = monster.level || 1

    // Level 1-2: Random targeting
    if (level <= MONSTER_AI.RANDOM_TARGET_MAX_LEVEL) {
      return RandomService.pickRandom(targets)
    }

    // Level 3-5: Focus fire on weakest HP%
    if (level <= MONSTER_AI.SMART_TARGET_MAX_LEVEL) {
      return this.selectWeakestTarget(targets)
    }

    // Level 6+: Prefer spellcasters (MAGE > PRIEST > BISHOP > others)
    const spellcasters = targets.filter(
      c => c.class === 'MAGE' || c.class === 'PRIEST' || c.class === 'BISHOP'
    )

    if (spellcasters.length > 0) {
      // Among spellcasters, target the weakest HP%
      return this.selectWeakestTarget(spellcasters)
    }

    // If no spellcasters, fall back to weakest HP%
    return this.selectWeakestTarget(targets)
  }

  /**
   * Select target with lowest HP percentage
   */
  private static selectWeakestTarget(targets: Character[]): Character {
    return targets.reduce((weakest, current) => {
      const weakestPercent = weakest.hp / weakest.maxHp
      const currentPercent = current.hp / current.maxHp
      return currentPercent < weakestPercent ? current : weakest
    })
  }
}

// Standalone function exports for convenience
export const selectMonsterAction = (ctx: MonsterAIContext): CombatCommand =>
  MonsterAIService.selectMonsterAction(ctx)

export const selectMonsterTarget = (monster: MonsterInstance, targets: Character[]): Character =>
  MonsterAIService.selectMonsterTarget(monster, targets)

export const createCommand = (
  actor: Combatant,
  actionType: CombatActionType,
  target?: Combatant | Combatant[],
  data?: CommandOptions
): CombatCommand =>
  MonsterAIService.createCommand(actor, actionType, target, data)
