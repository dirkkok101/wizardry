/**
 * Combat Service Facade
 *
 * This facade provides backward-compatible static methods that delegate to
 * the refactored combat services. It allows gradual migration from the
 * monolithic CombatService to the new focused services.
 *
 * Usage:
 * ```typescript
 * // Old code (still works):
 * CombatService.calculateInitiative(combatant)
 *
 * // New code (preferred):
 * import { calculateInitiative } from '@services/combat'
 * calculateInitiative(combatant)
 * ```
 *
 * Migration path:
 * 1. Import from CombatServiceFacade (backward compatible)
 * 2. Gradually update imports to use specific services
 * 3. Eventually deprecate and remove the facade
 */

import { Character } from '@models/Character'
import {
  CombatState,
  CombatCommand,
  CommandExecutionResult,
  Combatant,
  AttackResult,
  MonsterInstance,
  MonsterGroup,
  CombatStatusEffect,
  DurationTrackedStatus,
} from '@models/Combat'

// Import from refactored services
import {
  // Initiative
  calculateInitiative as calcInit,
  getAgilityModifier as getAgiMod,

  // Attack Resolution
  calculateHitChance as calcHitChance,
  getAttackBonus as getAtkBonus,
  resolveAttack as resAtk,
  getAttacksPerRound as getAtksPerRound,
  isHelplessTarget as isHelpless,

  // Status Effects
  hasStatusEffect as hasStat,
  applyStatusEffect as applyStat,
  removeStatusEffect as removeStat,
  setStatusDuration as setStatDur,
  getStatusDuration as getStatDur,
  tickStatusDurations as tickStatDur,
  processMonsterStatusRecovery as procMonsterRecovery,
  applyAcBuff as applyAc,
  getAcModifier as getAcMod,
  applyCureStatus as applyCure,

  // Damage
  applyDamageToCharacter as applyDmgToChar,
  applyHealingToCharacter as applyHealToChar,
  applyDamage as applyDmg,
  areAllMonstersDead as allMonstersDead,
  areAllCharactersDead as allCharsDead,
  isCombatantDead as isCombDead,
  canCombatantAct as canAct,
  getAllMonsters as getMonsters,
  getAllAliveMonsters as getAliveMonsters,
  getAllActingMonsters as getActingMonsters,

  // Flee
  calculateDemoralization as calcDemor,
  calculateFleeChance as calcFlee,
  executeFleeFailurePenalty as execFleePenalty,

  // Constants
  RESULT_MARKER,
  SURPRISE,
} from './index'

import { RandomService } from '@services/RandomService'

/**
 * Combat Service Facade
 *
 * Provides backward-compatible static methods that delegate to the new services.
 * This allows the old CombatService API to continue working while using the
 * refactored implementation under the hood.
 */
export class CombatServiceFacade {
  // ============================================================================
  // Initiative (delegates to InitiativeService)
  // ============================================================================

  static calculateInitiative(combatant: Combatant): number {
    return calcInit(combatant)
  }

  // ============================================================================
  // Surprise (uses constants from CombatConstants)
  // ============================================================================

  static rollSurprise(): { partySurprises: boolean; monstersSurprise: boolean } {
    const partySurprises = RandomService.chance(SURPRISE.PARTY_SURPRISE_CHANCE)
    const monstersSurprise = !partySurprises && RandomService.chance(SURPRISE.MONSTER_SURPRISE_CHANCE)
    return { partySurprises, monstersSurprise }
  }

  // ============================================================================
  // Hit Chance (delegates to AttackResolutionService)
  // ============================================================================

  static calculateHitChance(
    attacker: Combatant,
    defender: Combatant,
    defenderAcModifier: number = 0,
    attackerPenalty: number = 0,
    victimPosition: number = 0
  ): number {
    return calcHitChance(attacker, defender, defenderAcModifier, attackerPenalty, victimPosition)
  }

  static getAttackBonus(combatant: Combatant): number {
    return getAtkBonus(combatant)
  }

  static resolveAttack(
    attacker: Combatant,
    defender: Combatant,
    defenderAcModifier: number = 0,
    attackerPenalty: number = 0,
    victimPosition: number = 0,
    attackIndex: number = 0
  ): AttackResult {
    return resAtk(attacker, defender, {
      defenderAcModifier,
      attackerPenalty,
      victimPosition,
      attackIndex,
    })
  }

  static getAttacksPerRound(combatant: Combatant): number {
    return getAtksPerRound(combatant)
  }

  static isHelplessTarget(combatant: Combatant): boolean {
    return isHelpless(combatant)
  }

  // ============================================================================
  // Status Effects (delegates to StatusEffectService)
  // ============================================================================

  static hasStatusEffect(
    state: CombatState,
    combatantId: string,
    effect: CombatStatusEffect
  ): boolean {
    return hasStat(state, combatantId, effect)
  }

  static applyStatusEffect(
    state: CombatState,
    combatantId: string,
    effect: CombatStatusEffect
  ): CombatState {
    return applyStat(state, combatantId, effect)
  }

  static removeStatusEffect(
    state: CombatState,
    combatantId: string,
    effect: CombatStatusEffect
  ): CombatState {
    return removeStat(state, combatantId, effect)
  }

  static setStatusDuration(
    state: CombatState,
    combatantId: string,
    status: DurationTrackedStatus,
    duration: number
  ): CombatState {
    return setStatDur(state, combatantId, status, duration)
  }

  static getStatusDuration(
    state: CombatState,
    combatantId: string,
    status: DurationTrackedStatus
  ): number {
    return getStatDur(state, combatantId, status)
  }

  static tickStatusDurations(state: CombatState): CombatState {
    return tickStatDur(state)
  }

  static processMonsterStatusRecovery(
    state: CombatState
  ): { newState: CombatState; recoveredIds: string[] } {
    return procMonsterRecovery(state)
  }

  static applyAcBuff(
    state: CombatState,
    targetId: string,
    acModifier: number
  ): CombatState {
    return applyAc(state, targetId, acModifier)
  }

  static getAcModifier(state: CombatState, combatantId: string): number {
    return getAcMod(state, combatantId)
  }

  // ============================================================================
  // Damage (delegates to DamageApplicationService)
  // ============================================================================

  static applyDamageToCharacter(character: Character, damage: number): Character {
    return applyDmgToChar(character, damage)
  }

  static applyHealingToCharacter(character: Character, healing: number): Character {
    return applyHealToChar(character, healing)
  }

  static applyDamage(
    state: CombatState,
    target: Combatant,
    damage: number
  ): CombatState {
    return applyDmg(state, target, damage)
  }

  static areAllMonstersDead(state: CombatState): boolean {
    return allMonstersDead(state)
  }

  static areAllCharactersDead(
    party: Character[],
    characterUpdates?: Map<string, Character>
  ): boolean {
    return allCharsDead(party, characterUpdates)
  }

  static isCombatantDead(combatant: Combatant): boolean {
    return isCombDead(combatant)
  }

  static canCombatantAct(combatant: Combatant): boolean {
    return canAct(combatant)
  }

  static getAllMonsters(state: CombatState): MonsterInstance[] {
    return getMonsters(state)
  }

  static getAllAliveMonsters(state: CombatState): MonsterInstance[] {
    return getAliveMonsters(state)
  }

  static getAllActingMonsters(state: CombatState): MonsterInstance[] {
    return getActingMonsters(state)
  }

  // ============================================================================
  // Flee (delegates to FleeService)
  // ============================================================================

  static calculateDemoralization(
    party: Character[],
    monsterGroups: MonsterGroup[],
    characterUpdates?: Map<string, Character>
  ): boolean {
    return calcDemor(party, monsterGroups, characterUpdates)
  }

  static calculateFleeChance(
    state: CombatState,
    party: Character[],
    fleeingCharacterIds: Set<string>,
    characterUpdates?: Map<string, Character>
  ): number {
    return calcFlee(state, party, fleeingCharacterIds, characterUpdates)
  }

  static executeFleeFailurePenalty(
    state: CombatState,
    party: Character[],
    frontRow: string[]
  ): {
    newState: CombatState
    messages: string[]
    damagedCharacters: Map<string, Character>
  } {
    return execFleePenalty(state, party, frontRow)
  }

  // ============================================================================
  // Message Utilities
  // ============================================================================

  static readonly RESULT_MARKER = RESULT_MARKER

  static isResultMessage(message: string): boolean {
    return message.startsWith(RESULT_MARKER)
  }

  static stripResultMarker(message: string): string {
    return message.startsWith(RESULT_MARKER)
      ? message.substring(RESULT_MARKER.length)
      : message
  }
}
