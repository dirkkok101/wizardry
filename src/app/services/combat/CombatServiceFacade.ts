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
  CombatRoundResult,
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

  // Monster AI
  selectMonsterAction as selMonsterAction,
  selectMonsterTarget as selMonsterTarget,
  createCommand as createCmd,
  type MonsterAIContext,

  // Support Services
  rollSurprise as rollSurp,
  determineSurpriseState as detSurpriseState,
  repositionPartyAfterCasualties as reposParty,
  applyPoisonDamage as applyPoison,
  processMonsterRegeneration as procMonsterRegen,
  processCharacterStatusRecovery as procCharRecovery,
  type PartyFormation,
  type PoisonDamageResult,
  type RegenerationResult,
  type CharacterRecoveryResult,

  // Command Executor
  executeCommand as execCmd,
  hasHandler as hasActionHandler,
  expandAttackCommands as expandAtks,

  // Round Orchestrator
  executeRound as execRound,

  // Combat Initialization
  initiateCombat as initCombat,
  type InitiateCombatOptions,

  // Monster Advancement
  checkAndAdvanceMonsters as checkAdvance,
  getCurrentMonsterState as getMonsterState,

  // Constants
  RESULT_MARKER,
} from './index'

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
  // Surprise (delegates to SurpriseService)
  // ============================================================================

  static rollSurprise(): { partySurprises: boolean; monstersSurprise: boolean } {
    return rollSurp()
  }

  static determineSurpriseState(forceAmbush: boolean = false): 'party' | 'monsters' | 'none' {
    return detSurpriseState(forceAmbush)
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
  // Monster AI (delegates to MonsterAIService)
  // ============================================================================

  /**
   * Select action for a monster during combat
   *
   * @param monster - The monster selecting an action
   * @param party - The party characters
   * @param frontRow - Array of character IDs in the front row
   * @param monsterGroup - The group this monster belongs to (optional)
   * @param allGroups - All monster groups in combat (optional)
   */
  static selectMonsterAction(
    monster: MonsterInstance,
    party: Character[],
    frontRow: string[],
    monsterGroup?: MonsterGroup,
    allGroups?: MonsterGroup[]
  ): CombatCommand {
    return selMonsterAction({
      monster,
      party,
      frontRow,
      monsterGroup,
      allGroups
    })
  }

  static selectMonsterTarget(monster: MonsterInstance, targets: Character[]): Character {
    return selMonsterTarget(monster, targets)
  }

  static createCommand(
    actor: Combatant,
    actionType: 'ATTACK' | 'PARRY' | 'RUN' | 'CAST_SPELL' | 'DISPEL' | 'USE_ITEM' | 'BREATH' | 'ADVANCE' | 'CALL_FOR_HELP' | 'MONSTER_FLEE',
    target?: Combatant | Combatant[],
    data?: any
  ): CombatCommand {
    return createCmd(actor, actionType, target, data)
  }

  // ============================================================================
  // Command Execution (delegates to CommandExecutor)
  // ============================================================================

  /**
   * Execute a combat command using the Command Pattern registry
   *
   * This is the new polymorphic execution path that replaces the switch-on-type
   * pattern in CombatService.executeCommand().
   *
   * @param state - Current combat state
   * @param command - The command to execute
   * @param parryingCombatants - Set of combatant IDs that are parrying
   * @param party - Party characters
   * @param frontRow - Front row character IDs
   * @param existingCharacterUpdates - Updates from previous commands
   * @param debug - Enable debug logging
   */
  static executeCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>,
    party: Character[],
    frontRow: string[],
    existingCharacterUpdates?: Map<string, Character>,
    debug?: boolean
  ): CommandExecutionResult {
    return execCmd(state, command, parryingCombatants, party, frontRow, existingCharacterUpdates, { debug })
  }

  /**
   * Check if an action type has a registered handler
   */
  static hasActionHandler(actionType: string): boolean {
    return hasActionHandler(actionType)
  }

  // ============================================================================
  // Party Formation (delegates to PartyFormationService)
  // ============================================================================

  static repositionPartyAfterCasualties(
    party: Character[],
    damagedCharacters: Map<string, Character>,
    formation: PartyFormation
  ): {
    newFormation: PartyFormation
    messages: string[]
    changedPositions: boolean
  } {
    return reposParty(party, damagedCharacters, formation)
  }

  // ============================================================================
  // Poison (delegates to PoisonService)
  // ============================================================================

  static applyPoisonDamage(
    state: CombatState,
    party: Character[]
  ): PoisonDamageResult {
    return applyPoison(state, party)
  }

  // ============================================================================
  // Regeneration (delegates to RegenerationService)
  // ============================================================================

  static processMonsterRegeneration(state: CombatState): RegenerationResult {
    return procMonsterRegen(state)
  }

  // ============================================================================
  // Character Recovery (delegates to CharacterRecoveryService)
  // ============================================================================

  static processCharacterStatusRecovery(
    party: Character[],
    state: CombatState
  ): CharacterRecoveryResult {
    return procCharRecovery(party, state)
  }

  // ============================================================================
  // Round Orchestration (delegates to CombatRoundOrchestrator)
  // ============================================================================

  /**
   * Execute a complete combat round
   *
   * This method orchestrates the full round execution using all the extracted services:
   * 1. Apply poison damage at start of round
   * 2. Sort commands by initiative
   * 3. Apply surprise filtering (round 1 only)
   * 4. Execute each command sequentially
   * 5. Check victory/defeat after each command
   * 6. Process flee attempts
   * 7. Process end-of-round effects (regeneration, status recovery)
   * 8. Reposition party after casualties
   *
   * @param state - Current combat state
   * @param party - Party characters
   * @param frontRow - Front row character IDs
   * @param options - Execution options
   * @returns Complete round result with events and state updates
   */
  static executeRound(
    state: CombatState,
    party: Character[],
    frontRow?: string[],
    options?: { debug?: boolean; enableAudit?: boolean }
  ): CombatRoundResult {
    return execRound(state, party, frontRow ?? [], options)
  }

  /**
   * Execute a complete combat round with events
   *
   * @deprecated Use executeRound instead
   * Alias for executeRound for backward compatibility with existing code.
   */
  static executeRoundWithEvents(
    state: CombatState,
    party: Character[],
    frontRow: string[] = []
  ): CombatRoundResult {
    return execRound(state, party, frontRow, { enableAudit: true })
  }

  // ============================================================================
  // Combat Initialization (delegates to CombatInitializationService)
  // ============================================================================

  /**
   * Create initial combat state
   *
   * Supports both old positional arguments and new options object for backward compatibility.
   *
   * Old signature (positional):
   * initiateCombat(dungeonLevel, party, canFlee, fixedEncounter, isFriendly, encounterReason, latumapicActive, forceAmbush, expeditionAcBuff)
   *
   * New signature (options object):
   * initiateCombat(dungeonLevel, party, options: InitiateCombatOptions)
   *
   * @param dungeonLevel - Current dungeon level
   * @param party - Party characters
   * @param optionsOrCanFlee - Either an options object or canFlee boolean (old API)
   * @param fixedEncounter - (old API) Fixed encounter config
   * @param isFriendly - (old API) Whether friendly encounter
   * @param encounterReason - (old API) Encounter reason
   * @param latumapicActive - (old API) LATUMAPIC spell active
   * @param forceAmbush - (old API) Force ambush
   * @param expeditionAcBuff - (old API) AC buff from MAPORFIC
   * @returns Initial combat state
   */
  static initiateCombat(
    dungeonLevel: number,
    party: Character[],
    optionsOrCanFlee: InitiateCombatOptions | boolean,
    fixedEncounter?: any,
    isFriendly?: boolean,
    encounterReason?: 'random' | 'door_kick' | 'treasure_room' | 'alarm' | 'fixed' | 'chest_trap',
    latumapicActive?: boolean,
    forceAmbush?: boolean,
    expeditionAcBuff?: number
  ): CombatState {
    // Check if using new options object or old positional arguments
    if (typeof optionsOrCanFlee === 'object') {
      // New API: options object
      return initCombat(dungeonLevel, party, optionsOrCanFlee)
    }

    // Old API: positional arguments - convert to options object
    const options: InitiateCombatOptions = {
      canFlee: optionsOrCanFlee,
      fixedEncounterConfig: fixedEncounter,
      isFriendlyEncounter: isFriendly,
      encounterReason,
      latumapicActive,
      forceAmbush,
      expeditionAcBuff
    }
    return initCombat(dungeonLevel, party, options)
  }

  // ============================================================================
  // Monster Advancement (delegates to MonsterAdvancementService)
  // ============================================================================

  /**
   * Check and advance monsters if front row is cleared
   */
  static checkAndAdvanceMonsters(state: CombatState): { newState: CombatState; message?: string } {
    const result = checkAdvance(state)
    return { newState: result.newState, message: result.message }
  }

  /**
   * Get current state of a specific monster
   */
  static getCurrentMonsterState(
    state: CombatState,
    monsterId: string
  ): MonsterInstance | undefined {
    return getMonsterState(state, monsterId)
  }

  // ============================================================================
  // Command Utilities (delegates to CommandExecutor)
  // ============================================================================

  /**
   * Expand attack commands for multi-attack combatants
   */
  static expandAttackCommands(commands: CombatCommand[]): CombatCommand[] {
    return expandAtks(commands)
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
