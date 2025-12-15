/**
 * CombatFlowController - Coordinates combat UI flow and state
 *
 * Extracted from MazeComponent to provide composition and reduce god-class.
 * Owns all combat-related signals and handles phase transitions.
 *
 * Responsibilities:
 * - Combat phase management (idle, encounter, action_select, executing, victory, defeat)
 * - Action selection and targeting
 * - Letterbox/intro cinematics
 * - Victory/defeat overlays
 * - Cinematic arena coordination
 *
 * Dependencies:
 * - MazeStateMachine: Source of truth for state transitions
 * - CombatOrchestrationService: Round execution logic
 * - SpellFlowController: Spell targeting coordination
 *
 * Outputs (callbacks set by MazeComponent):
 * - onAddMessage: Log messages to game console
 */

import { Injectable, signal, computed } from '@angular/core'
import { Character } from '@models/Character'
import { CombatState, MonsterGroup, CombatCommand, CombatRoundEvent, CombatRoundAudit } from '@models/Combat'
import { VictoryRewards } from '@services/VictoryService'
import { CombatService } from '@services/CombatService'
import { RandomService } from '@services/RandomService'

/**
 * Combat phase types
 */
export type CombatPhase = 'idle' | 'encounter' | 'action_select' | 'executing' | 'victory' | 'defeat'

/**
 * Letterbox types for combat cinematics
 */
export type LetterboxType = 'encounter' | 'ambush' | 'surprise' | null

/**
 * Callbacks for MazeComponent integration
 */
export interface CombatFlowCallbacks {
  // Message output
  addMessage: (message: string) => void

  // Party state
  partyCharacters: () => Character[]

  // Combat state from GameStateService
  combatState: () => CombatState | undefined
  monsterGroups: () => MonsterGroup[]

  // Spell flow coordination
  getPendingCombatSpell: () => { id: string; name: string } | null
  confirmCombatSpellTarget: (groupId: string) => void
  resetSpellFlow: () => void

  // State machine coordination
  startRoundExecution: (events: CombatRoundEvent[], audit: CombatRoundAudit | null) => void
  completeRoundExecution: () => void
  endCombatInStateMachine: () => void
}

/**
 * Pending combat result stored during arena playback
 */
export interface PendingCombatResult {
  finalState: CombatState
  finalCharacterUpdates: Map<string, Character>
  spellCasters: Map<string, { character: Character; spellId: string }>
  victory: boolean
  defeat: boolean
}

@Injectable({
  providedIn: 'root'
})
export class CombatFlowController {
  // ============================================================
  // COMBAT PHASE SIGNALS
  // ============================================================

  /** Current combat phase */
  readonly combatPhase = signal<CombatPhase>('idle')

  /** Letterbox type for cinematics */
  readonly letterboxType = signal<LetterboxType>(null)

  /** Whether combat intro is active (hides monster cards) */
  readonly combatIntroActive = signal<boolean>(false)

  // ============================================================
  // ACTION SELECTION SIGNALS
  // ============================================================

  /** Selected actions for each character */
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())

  /** Whether round execution is in progress */
  readonly isExecutingRound = signal<boolean>(false)

  /** Currently selected target group */
  readonly selectedTargetGroupId = signal<'A' | 'B' | 'C' | 'D' | null>(null)

  /** Whether in targeting mode */
  readonly isTargetingMode = signal<boolean>(false)

  /** Character ID currently selecting a target */
  readonly isTargetingCharacterId = signal<string | null>(null)

  // ============================================================
  // VICTORY/DEFEAT SIGNALS
  // ============================================================

  /** Show victory overlay */
  readonly showVictoryOverlay = signal<boolean>(false)

  /** Show defeat overlay */
  readonly showDefeatOverlay = signal<boolean>(false)

  /** Victory rewards to display */
  readonly victoryRewards = signal<VictoryRewards | null>(null)

  // ============================================================
  // CINEMATIC ARENA SIGNALS
  // ============================================================

  /** Show cinematic arena */
  readonly showCinematicArena = signal<boolean>(false)

  /** Arena events to play */
  readonly arenaEvents = signal<CombatRoundEvent[]>([])

  /** Arena audit data */
  readonly arenaAudit = signal<CombatRoundAudit | null>(null)

  /** Pending combat result (stored during arena playback) */
  private pendingCombatResult: PendingCombatResult | null = null

  // ============================================================
  // CALLBACKS
  // ============================================================

  private callbacks: CombatFlowCallbacks | null = null

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  /** Whether in combat (phase is not idle) */
  readonly inCombat = computed(() => this.combatPhase() !== 'idle')

  /** Whether left/right panels should be dimmed (targeting active) */
  readonly shouldDimPanels = computed(() => this.isTargetingCharacterId() !== null)

  /** Whether monster cards should be shown */
  readonly showMonsterCards = computed(() =>
    this.inCombat() && !this.combatIntroActive() && !this.showCinematicArena()
  )

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Set callbacks for MazeComponent integration
   */
  setCallbacks(callbacks: CombatFlowCallbacks): void {
    this.callbacks = callbacks
  }

  // ============================================================
  // COMBAT INITIATION
  // ============================================================

  /**
   * Start combat encounter
   */
  startCombat(): void {
    this.combatPhase.set('encounter')
    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)
  }

  /**
   * Show combat intro sequence with letterbox banners
   */
  async showCombatIntro(combatState: CombatState): Promise<void> {
    if (!this.callbacks) return

    this.combatIntroActive.set(true)

    // 1. Always show ENCOUNTER! first
    await this.showLetterbox('encounter', 1800)

    // 2. Check for surprise
    if (combatState.surpriseState === 'monsters') {
      // Party is surprised - show AMBUSHED!
      await this.showLetterbox('ambush', 2000)
      this.callbacks.addMessage('Your party is AMBUSHED!')
      this.combatIntroActive.set(false)
      // Note: Caller handles surprise round execution
    } else if (combatState.surpriseState === 'party') {
      // Monsters are surprised - show SURPRISE!
      await this.showLetterbox('surprise', 1800)
      this.callbacks.addMessage('You surprised the monsters!')
      this.combatIntroActive.set(false)
      this.combatPhase.set('action_select')
    } else {
      // Normal combat - proceed to action selection
      this.combatIntroActive.set(false)
      this.combatPhase.set('action_select')
    }
  }

  /**
   * Show a letterbox cinematic banner
   */
  private async showLetterbox(type: LetterboxType, durationMs = 1800): Promise<void> {
    this.letterboxType.set(type)
    await this.delay(durationMs)
    this.letterboxType.set(null)
  }

  // ============================================================
  // ACTION SELECTION
  // ============================================================

  /**
   * Start attack targeting for a character
   */
  startAttackTargeting(characterId: string): void {
    if (!this.callbacks) return

    const char = this.callbacks.partyCharacters().find(c => c.id === characterId)
    if (!char || this.isExecutingRound()) return

    this.isTargetingCharacterId.set(characterId)
    this.isTargetingMode.set(true)
    this.callbacks.addMessage(`${char.name} prepares to attack... Select a target.`)
  }

  /**
   * Select parry action for a character
   */
  selectParryAction(characterId: string): void {
    if (!this.callbacks) return

    const char = this.callbacks.partyCharacters().find(c => c.id === characterId)
    if (!char || this.isExecutingRound()) return

    const command = CombatService.createCommand(char, 'PARRY', undefined)
    this.selectedActions.update(actions => {
      const newActions = new Map(actions)
      newActions.set(char.id, command)
      return newActions
    })

    this.callbacks.addMessage(`${char.name} will PARRY.`)
  }

  /**
   * Select flee action for a character
   */
  selectFleeAction(characterId: string): void {
    if (!this.callbacks) return

    const char = this.callbacks.partyCharacters().find(c => c.id === characterId)
    if (!char || this.isExecutingRound()) return

    const command = CombatService.createCommand(char, 'RUN', undefined)
    this.selectedActions.update(actions => {
      const newActions = new Map(actions)
      newActions.set(char.id, command)
      return newActions
    })

    this.callbacks.addMessage(`${char.name} will attempt to FLEE.`)
  }

  /**
   * Handle monster group click during targeting
   */
  onCombatGroupClicked(groupId: 'A' | 'B' | 'C' | 'D'): void {
    if (!this.isTargetingMode()) return
    this.onCombatTargetSelected(groupId)
  }

  /**
   * Handle target selection for attack or spell
   */
  onCombatTargetSelected(groupId: 'A' | 'B' | 'C' | 'D'): void {
    if (!this.callbacks) return

    const charId = this.isTargetingCharacterId()
    const char = charId ? this.callbacks.partyCharacters().find(c => c.id === charId) : null
    if (!char) return

    const group = this.callbacks.monsterGroups().find(g => g.id === groupId)
    if (!group || !group.monsters.some(m => m.hp > 0)) return

    // Check if targeting for a spell
    const pendingSpell = this.callbacks.getPendingCombatSpell()
    if (pendingSpell) {
      this.callbacks.confirmCombatSpellTarget(groupId)
      this.clearTargetingState()
      return
    }

    // Attack targeting - pick random alive monster from group
    const aliveMonsters = group.monsters.filter(m => m.hp > 0)
    const target = aliveMonsters[RandomService.random(0, aliveMonsters.length - 1)]

    // Clear targeting state
    this.clearTargetingState()

    // Create attack command
    const command = CombatService.createCommand(char, 'ATTACK', target, { groupId })
    this.selectedActions.update(actions => {
      const newActions = new Map(actions)
      newActions.set(char.id, command)
      return newActions
    })

    this.callbacks.addMessage(`${char.name}: ATTACK -> Group ${groupId}`)
  }

  /**
   * Cancel targeting mode
   */
  cancelTargeting(): void {
    this.clearTargetingState()
    this.callbacks?.resetSpellFlow()
  }

  /**
   * Clear targeting state
   */
  private clearTargetingState(): void {
    this.isTargetingMode.set(false)
    this.isTargetingCharacterId.set(null)
    this.selectedTargetGroupId.set(null)
  }

  /**
   * Reset all selected actions
   */
  resetAllActions(): void {
    if (!this.callbacks) return

    this.selectedActions.set(new Map())
    this.clearTargetingState()
    this.callbacks.resetSpellFlow()
    this.callbacks.addMessage('Actions reset. Select new actions for all characters.')
  }

  // ============================================================
  // ROUND EXECUTION
  // ============================================================

  /**
   * Start round execution with arena playback
   */
  startRoundExecution(
    result: PendingCombatResult,
    events: CombatRoundEvent[],
    audit: CombatRoundAudit | null
  ): void {
    if (!this.callbacks) return

    this.isExecutingRound.set(true)
    this.combatPhase.set('executing')

    // Store result for after arena playback
    this.pendingCombatResult = result

    // Update arena state
    this.arenaEvents.set(events)
    this.arenaAudit.set(audit)
    this.showCinematicArena.set(true)

    // Notify state machine
    this.callbacks.startRoundExecution(events, audit)
  }

  /**
   * Get pending combat result (for arena completion handling)
   */
  getPendingCombatResult(): PendingCombatResult | null {
    return this.pendingCombatResult
  }

  /**
   * Clear pending combat result
   */
  clearPendingCombatResult(): void {
    this.pendingCombatResult = null
  }

  /**
   * Handle arena playback completion
   */
  onArenaComplete(): void {
    // Hide arena
    this.showCinematicArena.set(false)
    this.arenaEvents.set([])
    this.arenaAudit.set(null)
  }

  /**
   * Reset state for next round
   */
  resetForNextRound(): void {
    if (!this.callbacks) return

    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)
    this.combatPhase.set('action_select')
    this.clearTargetingState()
    this.callbacks.resetSpellFlow()
    this.callbacks.completeRoundExecution()
  }

  // ============================================================
  // VICTORY/DEFEAT
  // ============================================================

  /**
   * Show victory state
   */
  showVictory(rewards: VictoryRewards): void {
    this.combatPhase.set('victory')
    this.showVictoryOverlay.set(true)
    this.victoryRewards.set(rewards)
  }

  /**
   * Show defeat state
   */
  showDefeat(): void {
    this.combatPhase.set('defeat')
    this.showDefeatOverlay.set(true)
  }

  /**
   * End combat and reset all state
   */
  endCombat(): void {
    if (!this.callbacks) return

    this.combatPhase.set('idle')
    this.showVictoryOverlay.set(false)
    this.showDefeatOverlay.set(false)
    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)
    this.clearTargetingState()
    this.victoryRewards.set(null)
    this.pendingCombatResult = null

    this.callbacks.resetSpellFlow()
    this.callbacks.endCombatInStateMachine()
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Check if all required actions are selected
   */
  allActionsSelected(partyCharacters: Character[]): boolean {
    const actions = this.selectedActions()
    const activeChars = partyCharacters.filter(c =>
      c.hp > 0 && !['DEAD', 'ASHES', 'PARALYZED', 'ASLEEP', 'STONED'].includes(c.status)
    )
    return activeChars.every(c => actions.has(c.id))
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
    this.combatPhase.set('idle')
    this.letterboxType.set(null)
    this.combatIntroActive.set(false)
    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)
    this.clearTargetingState()
    this.showVictoryOverlay.set(false)
    this.showDefeatOverlay.set(false)
    this.victoryRewards.set(null)
    this.showCinematicArena.set(false)
    this.arenaEvents.set([])
    this.arenaAudit.set(null)
    this.pendingCombatResult = null
  }
}
