/**
 * Combat Round Orchestrator
 *
 * Coordinates the execution of a combat round, handling:
 * - Command sorting by initiative
 * - Surprise mechanics filtering
 * - Sequential command execution with skip checks
 * - Victory/defeat/flee detection
 * - End-of-round processing (status recovery, regeneration, etc.)
 *
 * This orchestrator uses focused services for specific concerns while
 * providing the overall coordination logic.
 */

import { Character } from '@models/Character'
import {
  CombatState,
  CombatCommand,
  CombatRoundEvent,
  CombatRoundResult,
  CombatRoundAudit,
  ActionAuditEntry,
  ActionSkipReason,
  CommandExecutionResult,
  MonsterGroup,
} from '@models/Combat'
import { CharacterStatus } from '@models/CharacterStatus'
import { RandomService } from '@services/RandomService'
import {
  areAllMonstersDead,
  areAllCharactersDead,
  canCombatantAct,
} from '../core/DamageApplicationService'
import {
  calculateFleeChance,
  executeFleeFailurePenalty,
} from '../core/FleeService'
import { executeCommand } from './CommandExecutor'
import { applyPoisonDamage } from '../support/PoisonService'
import { processMonsterRegeneration } from '../support/RegenerationService'
import { processCharacterStatusRecovery } from '../support/CharacterRecoveryService'
import { repositionPartyAfterCasualties } from '../support/PartyFormationService'
import { processMonsterStatusRecovery, tickStatusDurations } from '../core/StatusEffectService'

// Re-export for convenience
export { CombatRoundOrchestrator }

/**
 * Context that tracks round-level state during execution
 */
export interface RoundContext {
  /** Characters that have taken damage this round */
  damagedCharacters: Map<string, Character>
  /** Characters who cast spells this round */
  spellCasters: Map<string, { character: Character; spellId: string }>
  /** Characters whose status changed (sleep/paralysis wore off) */
  curedCharacters: Map<string, Character>
  /** Combatant IDs that are parrying this round */
  parryingCombatants: Set<string>
  /** Character IDs attempting to flee */
  fleeingCharacters: Set<string>
  /** Current combat state */
  state: CombatState
  /** Generated events for animation */
  events: CombatRoundEvent[]
  /** All messages from this round */
  messages: string[]
}

/**
 * Audit context for tracking command execution
 */
export interface AuditContext {
  enabled: boolean
  entries: ActionAuditEntry[]
  skipReasonCounts: Record<ActionSkipReason | 'NONE', number>
}

/**
 * Result of checking if combat should end
 */
export interface CombatEndCheck {
  ended: boolean
  victory: boolean
  defeat: boolean
  fled: boolean
}

/**
 * Combat Round Orchestrator
 *
 * Provides coordination logic for combat round execution.
 */
class CombatRoundOrchestrator {
  /**
   * Create a new round context for tracking round state
   */
  static createRoundContext(initialState: CombatState): RoundContext {
    return {
      damagedCharacters: new Map(),
      spellCasters: new Map(),
      curedCharacters: new Map(),
      parryingCombatants: new Set(),
      fleeingCharacters: new Set(),
      state: { ...initialState, commandQueue: [] },
      events: [],
      messages: [],
    }
  }

  /**
   * Create a new audit context for tracking command execution
   */
  static createAuditContext(enabled: boolean = true): AuditContext {
    return {
      enabled,
      entries: [],
      skipReasonCounts: this.createEmptySkipReasonCounts(),
    }
  }

  /**
   * Create empty skip reason counts
   */
  static createEmptySkipReasonCounts(): Record<ActionSkipReason | 'NONE', number> {
    return {
      DEAD: 0,
      ASLEEP: 0,
      PARALYZED: 0,
      STONED: 0,
      SURPRISED: 0,
      FLED: 0,
      TARGET_DEAD: 0,
      NONE: 0,
    }
  }

  /**
   * Sort commands by initiative (higher initiative acts first)
   */
  static sortCommandsByInitiative(commands: CombatCommand[]): CombatCommand[] {
    return [...commands].sort((a, b) => b.initiative - a.initiative)
  }

  /**
   * Filter commands based on surprise state
   *
   * @param commands - Sorted command queue
   * @param surpriseState - Current surprise state
   * @param auditCtx - Audit context for tracking skipped commands
   * @returns Filtered commands that can act this round
   */
  static applySurpriseFilter(
    commands: CombatCommand[],
    surpriseState: 'party' | 'monsters' | 'none' | undefined,
    auditCtx?: AuditContext
  ): CombatCommand[] {
    if (!surpriseState || surpriseState === 'none') {
      return commands
    }

    const isMonster = (cmd: CombatCommand) => 'monsterId' in cmd.actor

    if (surpriseState === 'party') {
      // Party surprised monsters - skip monster actions
      if (auditCtx?.enabled) {
        for (const cmd of commands) {
          if (isMonster(cmd)) {
            auditCtx.entries.push(this.createSkippedAuditEntry(cmd, 'SURPRISED'))
            auditCtx.skipReasonCounts['SURPRISED']++
          }
        }
      }
      return commands.filter(cmd => !isMonster(cmd))
    } else {
      // Monsters surprised party - skip party actions
      if (auditCtx?.enabled) {
        for (const cmd of commands) {
          if (!isMonster(cmd)) {
            auditCtx.entries.push(this.createSkippedAuditEntry(cmd, 'SURPRISED'))
            auditCtx.skipReasonCounts['SURPRISED']++
          }
        }
      }
      return commands.filter(cmd => isMonster(cmd))
    }
  }

  /**
   * Create an audit entry for a skipped command
   */
  static createSkippedAuditEntry(
    cmd: CombatCommand,
    reason: ActionSkipReason
  ): ActionAuditEntry {
    return {
      commandId: cmd.id,
      actorId: cmd.actor.id,
      actorName: cmd.actor.name,
      actionType: cmd.type,
      initiative: cmd.initiative,
      status: 'skipped',
      skipReason: reason,
    }
  }

  /**
   * Create an audit entry for an executed command
   */
  static createExecutedAuditEntry(cmd: CombatCommand): ActionAuditEntry {
    return {
      commandId: cmd.id,
      actorId: cmd.actor.id,
      actorName: cmd.actor.name,
      actionType: cmd.type,
      initiative: cmd.initiative,
      targetId: this.getTargetId(cmd),
      status: 'executed',
    }
  }

  /**
   * Get target ID from a command
   */
  private static getTargetId(cmd: CombatCommand): string | undefined {
    if (!cmd.target) return undefined
    if (Array.isArray(cmd.target)) {
      return cmd.target[0]?.id
    }
    return cmd.target.id
  }

  /**
   * Check if an actor can currently act (not dead, asleep, paralyzed, etc.)
   * Takes into account damage dealt this round that may have killed them.
   */
  static canActorAct(
    cmd: CombatCommand,
    state: CombatState,
    damagedCharacters: Map<string, Character>
  ): boolean {
    const actor = cmd.actor

    // For characters, check if they died this round
    if (!('monsterId' in actor)) {
      const updated = damagedCharacters.get(actor.id)
      if (updated) {
        return canCombatantAct(updated)
      }
    }

    // For monsters, check current state in monster groups
    if ('monsterId' in actor) {
      for (const group of state.monsterGroups) {
        const monster = group.monsters.find(m => m.id === actor.id)
        if (monster) {
          return canCombatantAct(monster)
        }
      }
    }

    return canCombatantAct(actor)
  }

  /**
   * Get the skip reason for an actor that can't act
   */
  static getSkipReason(
    cmd: CombatCommand,
    state: CombatState,
    damagedCharacters: Map<string, Character>
  ): ActionSkipReason {
    const actor = cmd.actor

    // Check character status
    if (!('monsterId' in actor)) {
      const updated = damagedCharacters.get(actor.id) || actor
      const char = updated as Character
      if (char.hp <= 0 || char.status === CharacterStatus.DEAD) return 'DEAD'
      if (char.status === CharacterStatus.ASLEEP) return 'ASLEEP'
      if (char.status === CharacterStatus.PARALYZED) return 'PARALYZED'
      if (char.status === CharacterStatus.STONED) return 'STONED'
    }

    // Check monster status
    if ('monsterId' in actor) {
      for (const group of state.monsterGroups) {
        const monster = group.monsters.find(m => m.id === actor.id)
        if (monster) {
          if (monster.hp <= 0 || monster.status === 'DEAD') return 'DEAD'
          if (monster.status === 'ASLEEP') return 'ASLEEP'
          if (monster.status === 'PARALYZED') return 'PARALYZED'
        }
      }
    }

    return 'DEAD' // Default fallback
  }

  /**
   * Check if combat should end (victory, defeat, or flee)
   */
  static checkCombatEnd(
    state: CombatState,
    party: Character[],
    damagedCharacters: Map<string, Character>
  ): CombatEndCheck {
    const victory = areAllMonstersDead(state)
    const defeat = areAllCharactersDead(party, damagedCharacters)

    return {
      ended: victory || defeat,
      victory,
      defeat,
      fled: false,
    }
  }

  /**
   * Process flee attempt at end of round
   *
   * @param roundCtx - Round context with current state
   * @param party - Party characters
   * @param frontRow - Front row character IDs
   * @returns Updated round context and flee success flag
   */
  static processFleeAttempt(
    roundCtx: RoundContext,
    party: Character[],
    frontRow: string[]
  ): { success: boolean; roundCtx: RoundContext } {
    const { state, damagedCharacters, fleeingCharacters, messages } = roundCtx

    // Check if all alive characters are fleeing
    const aliveCharacters = party.filter(c => {
      const updated = damagedCharacters.get(c.id) || c
      return updated.status !== CharacterStatus.DEAD && updated.hp > 0
    })

    const allFleeing =
      aliveCharacters.length > 0 &&
      aliveCharacters.every(c => fleeingCharacters.has(c.id))

    if (!allFleeing) {
      return { success: false, roundCtx }
    }

    const fleeChance = calculateFleeChance(
      state,
      party,
      fleeingCharacters,
      damagedCharacters
    )
    const fleeSuccess = RandomService.chance(fleeChance)

    if (fleeSuccess) {
      messages.push(`The party successfully flees from combat!`)
      return { success: true, roundCtx }
    }

    // Flee failed - monsters get free attacks
    messages.push(`The party fails to escape!`)

    const penaltyResult = executeFleeFailurePenalty(state, party, frontRow)
    roundCtx.state = penaltyResult.newState
    messages.push(...penaltyResult.messages)

    // Merge penalty damage
    for (const [charId, char] of penaltyResult.damagedCharacters.entries()) {
      damagedCharacters.set(charId, char)
    }

    return { success: false, roundCtx }
  }

  /**
   * Merge command execution result into round context
   */
  static mergeCommandResult(
    roundCtx: RoundContext,
    result: CommandExecutionResult,
    command: CombatCommand,
    party: Character[]
  ): void {
    const { damagedCharacters, spellCasters, messages } = roundCtx

    // Update state
    roundCtx.state = result.newState
    messages.push(...result.messages)

    // Merge character updates from spell effects
    if (result.characterUpdates) {
      for (const [charId, char] of result.characterUpdates.entries()) {
        damagedCharacters.set(charId, char)
      }
    }

    // Track RUN commands
    if (command.type === 'RUN' && !('monsterId' in command.actor)) {
      roundCtx.fleeingCharacters.add(command.actor.id)
    }

    // Track CAST_SPELL commands
    if (
      command.type === 'CAST_SPELL' &&
      !('monsterId' in command.actor) &&
      command.data?.spellId
    ) {
      const caster = command.actor as Character
      spellCasters.set(caster.id, {
        character: caster,
        spellId: command.data.spellId,
      })
    }

    // Track character damage
    if (result.targetDamage && command.target && !('monsterId' in command.target)) {
      const target = command.target as Character

      // Skip if characterUpdates already handled this target
      if (!result.characterUpdates?.has(target.id)) {
        const partyChar = party.find(c => c.id === target.id)
        const existingChar = damagedCharacters.get(target.id) || partyChar || target
        // Apply damage immutably
        const newHp = Math.max(0, existingChar.hp - result.targetDamage.damage)
        const updated = {
          ...existingChar,
          hp: newHp,
          status: newHp <= 0 ? CharacterStatus.DEAD : existingChar.status,
        }
        damagedCharacters.set(target.id, updated)
      }
    }
  }

  /**
   * Build the final combat round result
   */
  static buildRoundResult(
    roundCtx: RoundContext,
    endCheck: CombatEndCheck,
    newFormation?: { frontRow: string[]; backRow: string[] },
    audit?: CombatRoundAudit
  ): CombatRoundResult {
    return {
      newState: {
        ...roundCtx.state,
        roundNumber: roundCtx.state.roundNumber + 1,
      },
      events: roundCtx.events,
      damagedCharacters: roundCtx.damagedCharacters,
      spellCasters: roundCtx.spellCasters,
      curedCharacters: roundCtx.curedCharacters,
      victory: endCheck.victory,
      defeat: endCheck.defeat,
      fled: endCheck.fled,
      newFormation,
      audit,
    }
  }

  /**
   * Build audit summary for the round
   */
  static buildAudit(
    auditCtx: AuditContext,
    roundNumber: number
  ): CombatRoundAudit | undefined {
    if (!auditCtx.enabled) return undefined

    return {
      roundNumber,
      totalCommands: auditCtx.entries.length,
      executedCount: auditCtx.entries.filter(e => e.status === 'executed').length,
      skippedCount: auditCtx.entries.filter(e => e.status === 'skipped').length,
      skipReasonCounts: auditCtx.skipReasonCounts,
      actions: auditCtx.entries,
    }
  }

  /**
   * Check if monster groups have changed (for event generation)
   */
  static monsterGroupsChanged(
    before: MonsterGroup[],
    after: MonsterGroup[]
  ): boolean {
    if (before.length !== after.length) return true

    for (let i = 0; i < before.length; i++) {
      const beforeGroup = before[i]
      const afterGroup = after[i]

      if (beforeGroup.monsters.length !== afterGroup.monsters.length) return true

      for (let j = 0; j < beforeGroup.monsters.length; j++) {
        const beforeMonster = beforeGroup.monsters[j]
        const afterMonster = afterGroup.monsters[j]

        if (
          beforeMonster.hp !== afterMonster.hp ||
          beforeMonster.status !== afterMonster.status
        ) {
          return true
        }
      }
    }

    return false
  }

  // ============================================================================
  // Main Round Execution
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
    frontRow: string[] = [],
    options: { debug?: boolean; enableAudit?: boolean } = {}
  ): CombatRoundResult {
    const { debug = false, enableAudit = true } = options

    console.log('[CombatOrchestrator] executeRound starting', {
      roundNumber: state.roundNumber,
      commandCount: state.commandQueue.length,
      partySize: party.length,
      monsterGroupCount: state.monsterGroups.length
    })

    // Initialize contexts
    const roundCtx = this.createRoundContext(state)
    const auditCtx = this.createAuditContext(enableAudit)

    // 1. Apply poison damage at start of round
    const poisonResult = applyPoisonDamage(roundCtx.state, party)
    roundCtx.state = poisonResult.newState
    roundCtx.messages.push(...poisonResult.messages)
    for (const [charId, char] of poisonResult.damagedCharacters.entries()) {
      roundCtx.damagedCharacters.set(charId, char)
    }

    // Check for defeat from poison damage
    let endCheck = this.checkCombatEnd(roundCtx.state, party, roundCtx.damagedCharacters)
    if (endCheck.defeat) {
      return this.buildRoundResult(roundCtx, endCheck, undefined, this.buildAudit(auditCtx, state.roundNumber))
    }

    // 2. Sort commands by initiative
    let sortedQueue = this.sortCommandsByInitiative(state.commandQueue)

    // 3. Apply surprise filtering (round 1 only)
    if (state.roundNumber === 1 && state.surpriseState) {
      sortedQueue = this.applySurpriseFilter(sortedQueue, state.surpriseState, auditCtx)
    }

    // 4. Execute each command sequentially
    for (const command of sortedQueue) {
      // Skip if actor cannot act
      if (!this.canActorAct(command, roundCtx.state, roundCtx.damagedCharacters)) {
        if (auditCtx.enabled) {
          const reason = this.getSkipReason(command, roundCtx.state, roundCtx.damagedCharacters)
          auditCtx.entries.push(this.createSkippedAuditEntry(command, reason))
          auditCtx.skipReasonCounts[reason]++
        }
        continue
      }

      // Execute command using CommandExecutor
      const result = executeCommand(
        roundCtx.state,
        command,
        roundCtx.parryingCombatants,
        party,
        frontRow,
        roundCtx.damagedCharacters,
        { debug }
      )

      // Track audit
      if (auditCtx.enabled) {
        auditCtx.entries.push(this.createExecutedAuditEntry(command))
        auditCtx.skipReasonCounts['NONE']++
      }

      // Merge result into round context
      this.mergeCommandResult(roundCtx, result, command, party)

      // Create event for cinematic arena playback
      const event: CombatRoundEvent = {
        type: command.type as unknown as CombatRoundEvent['type'],
        messages: result.messages,
        // Snapshot monster state after this action for live count updates
        monsterGroupsSnapshot: structuredClone(result.newState.monsterGroups),
        characterUpdates: result.characterUpdates,
        damageResults: result.damageResults,
        statusEffects: result.statusEffects,
        acBuffs: result.acBuffs,
        spellCast: command.type === 'CAST_SPELL' && command.data?.spellId
          ? { characterId: command.actor.id, spellId: command.data.spellId }
          : undefined
      }
      roundCtx.events.push(event)

      if (debug) {
        console.log('[CombatOrchestrator] Created event', {
          type: command.type,
          actor: command.actor.name,
          messageCount: result.messages.length,
          hasMonsterSnapshot: !!event.monsterGroupsSnapshot,
          hasDamageResults: !!event.damageResults
        })
      }

      // Track PARRY commands
      if (command.type === 'PARRY') {
        roundCtx.parryingCombatants.add(command.actor.id)
      }

      // 5. Check victory after each command
      endCheck = this.checkCombatEnd(roundCtx.state, party, roundCtx.damagedCharacters)
      if (endCheck.victory) {
        return this.buildRoundResult(roundCtx, endCheck, undefined, this.buildAudit(auditCtx, state.roundNumber))
      }

      // Check defeat after each command
      if (endCheck.defeat) {
        return this.buildRoundResult(roundCtx, endCheck, undefined, this.buildAudit(auditCtx, state.roundNumber))
      }
    }

    // 6. Process flee attempts
    const fleeResult = this.processFleeAttempt(roundCtx, party, frontRow)
    if (fleeResult.success) {
      const fledCheck: CombatEndCheck = { ended: true, victory: false, defeat: false, fled: true }
      return this.buildRoundResult(fleeResult.roundCtx, fledCheck, undefined, this.buildAudit(auditCtx, state.roundNumber))
    }

    // Check defeat after flee failure penalty
    endCheck = this.checkCombatEnd(roundCtx.state, party, roundCtx.damagedCharacters)
    if (endCheck.defeat) {
      return this.buildRoundResult(roundCtx, endCheck, undefined, this.buildAudit(auditCtx, state.roundNumber))
    }

    // 7. Process end-of-round effects

    // Monster status recovery (wake from sleep, etc.)
    const monsterRecoveryResult = processMonsterStatusRecovery(roundCtx.state)
    roundCtx.state = monsterRecoveryResult.newState
    // Add recovery messages if any monsters recovered
    if (monsterRecoveryResult.recoveredIds.length > 0) {
      for (const monsterId of monsterRecoveryResult.recoveredIds) {
        // Find monster name for message
        for (const group of roundCtx.state.monsterGroups) {
          const monster = group.monsters.find(m => m.id === monsterId)
          if (monster) {
            const displayName = group.identified ? monster.name : monster.unidentifiedName
            roundCtx.messages.push(`${displayName} wakes up!`)
            break
          }
        }
      }
    }

    // Monster regeneration
    const regenResult = processMonsterRegeneration(roundCtx.state)
    roundCtx.state = regenResult.newState
    roundCtx.messages.push(...regenResult.messages)

    // Character status recovery
    const charRecoveryResult = processCharacterStatusRecovery(party, roundCtx.state)
    roundCtx.messages.push(...charRecoveryResult.messages)
    for (const [id, curedChar] of charRecoveryResult.curedCharacters) {
      roundCtx.curedCharacters.set(id, curedChar)
    }

    // Tick status effect durations
    const durationResult = tickStatusDurations(roundCtx.state)
    roundCtx.state = durationResult

    // 8. Reposition party after casualties
    const backRow = party.map(c => c.id).filter(id => !frontRow.includes(id))
    const repositionResult = repositionPartyAfterCasualties(
      party,
      roundCtx.damagedCharacters,
      { frontRow, backRow }
    )
    if (repositionResult.changedPositions) {
      roundCtx.messages.push(...repositionResult.messages)
    }

    // Build final result
    const finalEndCheck: CombatEndCheck = { ended: false, victory: false, defeat: false, fled: false }
    const result = this.buildRoundResult(
      roundCtx,
      finalEndCheck,
      repositionResult.changedPositions ? repositionResult.newFormation : undefined,
      this.buildAudit(auditCtx, state.roundNumber)
    )

    console.log('[CombatOrchestrator] executeRound complete', {
      eventsCount: result.events.length,
      victory: result.victory,
      defeat: result.defeat,
      fled: result.fled,
      messagesCount: roundCtx.messages.length
    })

    return result
  }
}

// Standalone function exports
// Note: Methods that use `this` internally need .bind() to work as standalone functions
export const createRoundContext = CombatRoundOrchestrator.createRoundContext
export const createAuditContext = CombatRoundOrchestrator.createAuditContext.bind(CombatRoundOrchestrator)
export const sortCommandsByInitiative = CombatRoundOrchestrator.sortCommandsByInitiative
export const applySurpriseFilter = CombatRoundOrchestrator.applySurpriseFilter.bind(CombatRoundOrchestrator)
export const canActorAct = CombatRoundOrchestrator.canActorAct
export const getSkipReason = CombatRoundOrchestrator.getSkipReason
export const checkCombatEnd = CombatRoundOrchestrator.checkCombatEnd
export const processFleeAttempt = CombatRoundOrchestrator.processFleeAttempt
export const mergeCommandResult = CombatRoundOrchestrator.mergeCommandResult
export const buildRoundResult = CombatRoundOrchestrator.buildRoundResult
export const buildAudit = CombatRoundOrchestrator.buildAudit
export const monsterGroupsChanged = CombatRoundOrchestrator.monsterGroupsChanged
export const executeRound = CombatRoundOrchestrator.executeRound.bind(CombatRoundOrchestrator)
