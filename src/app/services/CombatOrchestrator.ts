/**
 * CombatOrchestrator - Coordinates async combat flows
 *
 * Part of the Pure Services Architecture refactoring.
 * This orchestrator:
 * - Coordinates between MazeStateStore and pure services
 * - Handles async flows (intro sequences, round execution, arena playback)
 * - Does NOT own any signals (state lives in MazeStateStore)
 * - Uses pure services for calculations (CombatOrchestrationService)
 *
 * Replaces the async coordination logic from CombatFlowController.
 */

import { Injectable, inject } from '@angular/core'
import { Character } from '@models/Character'
import { CombatState, CombatRoundEvent, CombatRoundAudit, CombatCommand } from '@models/Combat'
import { VictoryRewards, VictoryService } from '@services/VictoryService'
import { GameStateService } from '@services/GameStateService'
import { MazeStateStore } from '@services/MazeStateStore'
import { CombatOrchestrationService } from '@services/CombatOrchestrationService'
import { SpellCastingService } from '@services/SpellCastingService'
import { reorderPartyAfterCasualties } from '@services/PartyService'
import { selectMonsterAction, executeRound, createCommand } from '@services/combat'

/**
 * Pending combat result stored during arena playback
 */
export interface PendingCombatResult {
  finalState: CombatState
  finalCharacterUpdates: Map<string, Character>
  spellCasters: Map<string, { character: Character; spellId: string }>
  victory: boolean
  defeat: boolean
  fled: boolean
}

@Injectable({
  providedIn: 'root'
})
export class CombatOrchestrator {
  private readonly stateStore = inject(MazeStateStore)
  private readonly gameState = inject(GameStateService)
  private readonly combatOrchestration = inject(CombatOrchestrationService)

  /** Pending result stored during arena playback */
  private pendingResult: PendingCombatResult | null = null

  // ============================================================
  // COMBAT INITIATION
  // ============================================================

  /**
   * Start combat encounter - initializes combat state
   */
  startCombat(): void {
    this.stateStore.startCombat()
  }

  /**
   * Show combat intro sequence with letterbox banners
   * Returns true if party was surprised (caller should execute surprise round)
   */
  async showCombatIntro(combatState: CombatState): Promise<boolean> {
    this.stateStore.setCombatIntroActive(true)

    // 1. Always show ENCOUNTER! first
    await this.showLetterbox('encounter', 1800)

    // 2. Check for surprise
    if (combatState.surpriseState === 'monsters') {
      // Party is surprised - show AMBUSHED!
      await this.showLetterbox('ambush', 2000)
      this.stateStore.addMessage('Your party is AMBUSHED!')

      // Complete intro before surprise round - show monster cards
      this.stateStore.setCombatIntroActive(false)

      // Return true to indicate caller should execute surprise round
      return true
    } else if (combatState.surpriseState === 'party') {
      // Monsters are surprised - show SURPRISE!
      await this.showLetterbox('surprise', 1800)
      this.stateStore.addMessage('You surprised the monsters!')

      // Complete intro and go to action selection
      this.stateStore.setCombatIntroActive(false)
      this.stateStore.setCombatPhase('action_select')
    } else {
      // Normal combat - proceed to action selection
      this.stateStore.setCombatIntroActive(false)
      this.stateStore.setCombatPhase('action_select')
    }

    return false
  }

  /**
   * Show a letterbox cinematic banner
   */
  private async showLetterbox(
    type: 'encounter' | 'ambush' | 'surprise',
    durationMs = 1800
  ): Promise<void> {
    this.stateStore.setLetterbox(type)
    await this.delay(durationMs)
    this.stateStore.clearLetterbox()
  }

  // ============================================================
  // SURPRISE ROUND
  // ============================================================

  /**
   * Execute a surprise round where only monsters act
   * Called when party is ambushed
   */
  executeSurpriseRound(): void {
    const combat = this.gameState.state().combat
    if (!combat) return

    // Set phase to executing
    this.stateStore.setCombatPhase('executing')
    this.stateStore.setIsExecutingRound(true)

    // Get party info
    const state = this.gameState.state()
    const frontRow = state.party.formation.frontRow
    const chars = this.getActivePartyCharacters()

    // Create monster commands (party is surprised, only monsters act)
    const aliveMonsters = combat.monsterGroups
      .flatMap(g => g.monsters)
      .filter(m => m.hp > 0)

    const monsterCommands = aliveMonsters.map(m =>
      selectMonsterAction({ monster: m, party: chars, frontRow })
    )

    // Execute monster-only round
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: monsterCommands
    }

    const result = executeRound(stateWithCommands, chars, frontRow)

    // Create pending result
    this.pendingResult = {
      finalState: result.newState,
      finalCharacterUpdates: result.damagedCharacters,
      spellCasters: result.spellCasters,
      victory: result.victory,
      defeat: result.defeat,
      fled: result.fled
    }

    // Start arena playback
    this.stateStore.startArenaPlayback(result.events, result.audit ?? null)
  }

  // ============================================================
  // ROUND EXECUTION
  // ============================================================

  /**
   * Execute a combat round - orchestrates the full round execution
   * Returns true if execution started, false if blocked
   */
  executeRound(): boolean {
    const party = this.getPartyCharacters()
    const selectedActions = this.stateStore.selectedActions()

    if (!this.allActionsSelected(party, selectedActions)) {
      return false
    }

    if (this.stateStore.isExecutingRound()) {
      return false
    }

    const combat = this.gameState.state().combat
    if (!combat) return false

    const state = this.gameState.state()
    const frontRow = state.party.formation.frontRow

    try {
      // Use CombatOrchestrationService for round execution
      const result = this.combatOrchestration.executeRound(
        combat,
        selectedActions,
        party,
        frontRow
      )

      // Create pending result for use after arena playback
      this.pendingResult = {
        finalState: result.finalState,
        finalCharacterUpdates: result.characterUpdates,
        spellCasters: result.spellCasters,
        victory: result.victory,
        defeat: result.defeat,
        fled: result.fled
      }

      // Update state store for arena playback
      this.stateStore.setCombatPhase('executing')
      this.stateStore.setIsExecutingRound(true)
      this.stateStore.startArenaPlayback(result.events, result.audit)

      return true
    } catch (error) {
      console.error('[CombatOrchestrator] Combat execution error:', error)
      this.stateStore.addMessage('Error executing combat round!')
      this.resetForNextRound()
      return false
    }
  }

  /**
   * Get pending combat result (for arena completion handling)
   */
  getPendingResult(): PendingCombatResult | null {
    return this.pendingResult
  }

  /**
   * Handle arena playback completion - applies results and determines next phase
   * Returns the combat outcome for caller to handle
   */
  onArenaPlaybackComplete(): { victory: boolean; defeat: boolean; fled: boolean; finalState: CombatState | null } {
    // Hide arena
    this.stateStore.stopArenaPlayback()

    const result = this.pendingResult
    if (!result) {
      console.error('[CombatOrchestrator] No pending combat result!')
      this.resetForNextRound()
      return { victory: false, defeat: false, fled: false, finalState: null }
    }

    // Apply final state to GameState
    this.applyResultToGameState(result)

    // Clear pending result
    this.pendingResult = null

    // Return status for caller to handle victory/defeat/fled
    return {
      victory: result.victory,
      defeat: result.defeat,
      fled: result.fled,
      finalState: result.finalState
    }
  }

  /**
   * Apply pending result to game state
   */
  private applyResultToGameState(result: PendingCombatResult): void {
    this.gameState.updateState(state => {
      let newRoster = VictoryService.updateRosterFromCombat(state.roster, result.finalCharacterUpdates)

      // Apply spell point deductions for characters who cast spells
      for (const [charId, { spellId }] of result.spellCasters) {
        const caster = newRoster.get(charId)
        if (caster) {
          const updatedCaster = SpellCastingService.deductSpellPoints(caster, spellId)
          newRoster = new Map(newRoster).set(charId, updatedCaster)
        }
      }

      const newMembers = reorderPartyAfterCasualties(state.party.members, newRoster)

      return {
        ...state,
        combat: result.finalState,
        roster: newRoster,
        party: {
          ...state.party,
          members: newMembers
        }
      }
    })
  }

  /**
   * Reset state for next round
   */
  resetForNextRound(): void {
    this.stateStore.resetForNextRound()
  }

  // ============================================================
  // VICTORY/DEFEAT
  // ============================================================

  /**
   * Show victory state with rewards
   */
  showVictory(rewards: VictoryRewards): void {
    this.stateStore.showVictory(rewards)
  }

  /**
   * Show defeat state
   */
  showDefeat(): void {
    this.stateStore.showDefeat()
  }

  /**
   * End combat and reset all state
   */
  endCombat(): void {
    this.stateStore.endCombat()
    this.pendingResult = null
  }

  // ============================================================
  // TARGET SELECTION
  // ============================================================

  /**
   * Handle monster group click during targeting
   */
  onCombatGroupClicked(groupId: 'A' | 'B' | 'C' | 'D'): void {
    if (!this.stateStore.isTargetingMode()) return
    this.onCombatTargetSelected(groupId)
  }

  /**
   * Handle target selection for attack or spell
   */
  onCombatTargetSelected(groupId: 'A' | 'B' | 'C' | 'D'): void {
    const charId = this.stateStore.targetingCharacterId()
    const party = this.getPartyCharacters()
    const char = charId ? party.find(c => c.id === charId) : null
    if (!char) return

    const combat = this.gameState.state().combat
    if (!combat) return

    const group = combat.monsterGroups.find(g => g.id === groupId)
    if (!group || !group.monsters.some(m => m.hp > 0)) return

    // Check if targeting for a spell
    const pendingSpell = this.stateStore.pendingCombatSpell()
    if (pendingSpell) {
      // Create spell command targeting the group
      const command = createCommand(char, 'CAST', undefined, {
        spellId: pendingSpell.id,
        targetGroupId: groupId
      })
      this.stateStore.selectAction(char.id, command)
      this.stateStore.addMessage(`${char.name}: CAST ${pendingSpell.name} -> Group ${groupId}`)
      this.stateStore.setPendingCombatSpell(null)
      this.clearTargetingState()
      return
    }

    // Attack targeting - pick random alive monster from group
    const aliveMonsters = group.monsters.filter(m => m.hp > 0)
    const targetIndex = Math.floor(Math.random() * aliveMonsters.length)
    const target = aliveMonsters[targetIndex]

    // Clear targeting state
    this.clearTargetingState()

    // Create attack command
    const command = createCommand(char, 'ATTACK', target, { groupId })
    this.stateStore.selectAction(char.id, command)

    this.stateStore.addMessage(`${char.name}: ATTACK -> Group ${groupId}`)
  }

  /**
   * Start attack targeting for a character
   */
  startAttackTargeting(characterId: string): void {
    const party = this.getPartyCharacters()
    const char = party.find(c => c.id === characterId)
    if (!char || this.stateStore.isExecutingRound()) return

    this.stateStore.startTargeting(characterId)
    this.stateStore.addMessage(`${char.name} prepares to attack... Select a target.`)
  }

  /**
   * Cancel targeting mode
   */
  cancelTargeting(): void {
    this.clearTargetingState()
    this.stateStore.resetSpellState()
  }

  /**
   * Clear targeting state
   */
  private clearTargetingState(): void {
    this.stateStore.cancelTargeting()
  }

  /**
   * Select parry action for a character
   */
  selectParryAction(characterId: string): void {
    const party = this.getPartyCharacters()
    const char = party.find(c => c.id === characterId)
    if (!char || this.stateStore.isExecutingRound()) return

    const command = createCommand(char, 'PARRY', undefined)
    this.stateStore.selectAction(char.id, command)

    this.stateStore.addMessage(`${char.name} will PARRY.`)
  }

  /**
   * Reset all selected actions
   */
  resetAllActions(): void {
    this.stateStore.resetActions()
    this.stateStore.resetSpellState()
    this.stateStore.addMessage('Actions reset. Select new actions for all characters.')
  }

  // ============================================================
  // FLEE HANDLING
  // ============================================================

  /**
   * Set flee action for all non-incapacitated characters
   * Returns true if actions were set (caller should start round execution)
   */
  selectFleeForAll(): boolean {
    if (this.stateStore.isExecutingRound()) return false

    const party = this.getPartyCharacters()
    let anySelected = false

    for (const char of party) {
      if (!this.isCharacterIncapacitated(char)) {
        // Create proper RUN command using combat API
        const command = createCommand(char, 'RUN', undefined)
        this.stateStore.selectAction(char.id, command)
        anySelected = true
      }
    }

    if (anySelected) {
      this.stateStore.addMessage('The party attempts to flee!')
    }

    return anySelected
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Check if all required actions are selected
   */
  private allActionsSelected(
    partyCharacters: Character[],
    selectedActions: Map<string, CombatCommand>
  ): boolean {
    const activeChars = partyCharacters.filter(c =>
      c.hp > 0 && !['DEAD', 'ASHES', 'PARALYZED', 'ASLEEP', 'STONED'].includes(c.status)
    )
    return activeChars.every(c => selectedActions.has(c.id))
  }

  /**
   * Get party characters from game state
   */
  private getPartyCharacters(): Character[] {
    const state = this.gameState.state()
    return state.party.members
      .map(id => state.roster.get(id))
      .filter((c): c is Character => !!c)
  }

  /**
   * Get active (alive, non-incapacitated) party characters
   */
  private getActivePartyCharacters(): Character[] {
    return this.getPartyCharacters().filter(c =>
      c.hp > 0 && !['DEAD', 'ASHES'].includes(c.status)
    )
  }

  /**
   * Check if character is incapacitated
   */
  private isCharacterIncapacitated(char: Character): boolean {
    return char.hp <= 0 || ['DEAD', 'ASHES', 'PARALYZED', 'ASLEEP', 'STONED'].includes(char.status)
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Reset all state (e.g., when leaving maze)
   */
  reset(): void {
    this.pendingResult = null
    // State store reset is handled by MazeStateStore.reset()
  }
}
