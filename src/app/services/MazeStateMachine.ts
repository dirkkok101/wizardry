/**
 * MazeStateMachine - Centralized state management for maze scene
 *
 * Replaces 48+ individual signals with a single discriminated union state.
 * Provides validated transitions to prevent impossible states.
 *
 * Design Principles:
 * - Single source of truth for maze UI state
 * - Validated state transitions
 * - Immutable state updates
 * - Clear separation from game state (GameStateService handles persistence)
 */

import { Injectable, signal, computed, Signal } from '@angular/core'
import { Character } from '@models/Character'
import { Chest } from '@models/Chest'
import { Item } from '@models/Item'
import { MessageStyle, Position, ConditionResult, Destination } from '@models/Dungeon'
import { CombatState, MonsterGroup, CombatCommand, CombatRoundEvent, CombatRoundAudit, VictoryRewards } from '@models/Combat'
import { ScrambledTrapState, TrapId } from '@models/Trap'
import { CharacterStatus } from '@models/CharacterStatus'
import { FixedEncounterConfig } from '@services/EncounterTriggerService'
import { SpellData } from '@services/SpellCastingService'

// ============================================================================
// Phase Types - Discriminated Union for Maze State
// ============================================================================

/**
 * Exploration phase - Normal dungeon navigation
 */
export interface ExplorationPhase {
  type: 'exploration'
  // Elevator dialog state (shown when on elevator tile)
  showElevatorDialog: boolean
  elevatorDestinations: Destination[]
}

/**
 * Tile message phase - Letterbox overlay for tile messages
 */
export interface TileMessagePhase {
  type: 'tile_message'
  message: string
  style: MessageStyle
  autoDismiss: boolean
  autoDismissDelay: number
  item: TileMessageItem | null
  onDismiss: (() => void) | null
  // Pending actions after message dismissal
  pendingEncounter: FixedEncounterConfig | null
  pendingConditionCallback: (() => void) | null
}

export interface TileMessageItem {
  name: string
  icon?: string
}

/**
 * Combat phases
 */
export type CombatSubPhase =
  | 'letterbox_intro'   // ENCOUNTER/AMBUSH/SURPRISE letterbox
  | 'action_select'     // Selecting party actions
  | 'targeting'         // Selecting target for attack/spell
  | 'executing'         // Round execution (cinematic playback)
  | 'victory'           // Victory overlay
  | 'defeat'            // Defeat overlay

export type LetterboxType = 'encounter' | 'ambush' | 'surprise'

export interface CombatPhase {
  type: 'combat'
  subPhase: CombatSubPhase
  // Letterbox intro state
  letterboxType: LetterboxType | null
  // Action selection state
  selectedActions: Map<string, CombatCommand>
  isTargetingCharacterId: string | null
  pendingSpell: SpellData | null
  // Execution state
  showCinematicArena: boolean
  arenaEvents: CombatRoundEvent[]
  arenaAudit: CombatRoundAudit | null
  // Result state
  victoryRewards: VictoryRewards | null
  // Combat metadata
  canFlee: boolean
  dungeonLevel: number
}

/**
 * Chest interaction phases
 */
export type ChestSubPhase =
  | 'discovered'        // Chest found, showing letterbox
  | 'handler_select'    // Selecting who handles the chest
  | 'action_select'     // Selecting action (open/inspect/disarm/calfo)
  | 'trap_inspect'      // Showing trap inspection result
  | 'trap_disarm'       // Disarm attempt result
  | 'trap_triggered'    // Trap went off
  | 'opening'           // Opening animation
  | 'contents_reveal'   // Showing chest contents
  | 'item_distribution' // Distributing items to party

export type ChestLetterboxType = 'found' | 'trap_triggered' | null

export interface ChestPhaseState {
  type: 'chest'
  subPhase: ChestSubPhase
  chest: Chest
  letterboxType: ChestLetterboxType
  // Handler state
  selectedHandler: Character | null
  calfoCharacter: Character | null
  // Trap state
  scrambledTrapState: ScrambledTrapState | null
  trapInput: string
  trapIdentified: boolean
  // Trap trigger state
  trapLetterboxName: string
  hitCharacterIds: string[]
  pendingTrapInfo: TrapTriggerInfo | null
  currentDamageIndicator: DamageIndicator | null
  // Contents state
  chestSprite: 'closed' | 'open'
  summary: ChestSummary | null
  lastMessage: string
  inventoryWarning: string | null
  preSelectedRecipient: Character | null
}

export interface TrapTriggerInfo {
  trapTriggered: boolean
  trapId: TrapId | null
  trapMessage: string | null
  damageDealt: Map<string, number>
  statusEffects: Map<string, CharacterStatus>
}

export interface DamageIndicator {
  characterId: string
  damage: number
  status?: string
}

export interface ChestSummary {
  gold: number
  items: Item[]
  recipientName: string
}

/**
 * Spell casting phase (dungeon utility spells)
 */
export interface SpellCastingPhase {
  type: 'spell_casting'
  context: 'dungeon' | 'combat'
  showSpellDialog: boolean
  showTargetDialog: boolean
  selectedCaster: Character | null
  selectedSpell: SpellData | null
  targetOptions: SpellTargetOption[]
}

export interface SpellTargetOption {
  id: string
  name: string
  enabled: boolean
  character?: Character
}

/**
 * Condition fail phase - Showing condition failure message before action
 */
export interface ConditionFailPhase {
  type: 'condition_fail'
  conditionResult: ConditionResult
  previousPosition: Position
}

/**
 * Union type for all maze phases
 */
export type MazePhase =
  | ExplorationPhase
  | TileMessagePhase
  | CombatPhase
  | ChestPhaseState
  | SpellCastingPhase
  | ConditionFailPhase

// ============================================================================
// State Machine Service
// ============================================================================

@Injectable({
  providedIn: 'root'
})
export class MazeStateMachine {
  // Core state signal
  private readonly _state = signal<MazePhase>(this.createExplorationPhase())

  // Public read-only state
  readonly state: Signal<MazePhase> = this._state.asReadonly()

  // Computed convenience accessors
  readonly isExploring = computed(() => this._state().type === 'exploration')
  readonly isInCombat = computed(() => this._state().type === 'combat')
  readonly isInteractingWithChest = computed(() => this._state().type === 'chest')
  readonly isShowingTileMessage = computed(() => this._state().type === 'tile_message')
  readonly isCastingSpell = computed(() => this._state().type === 'spell_casting')

  // Combat-specific computed values
  readonly combatSubPhase = computed(() => {
    const state = this._state()
    return state.type === 'combat' ? state.subPhase : null
  })

  readonly combatSelectedActions = computed(() => {
    const state = this._state()
    return state.type === 'combat' ? state.selectedActions : new Map()
  })

  readonly isTargetingMode = computed(() => {
    const state = this._state()
    return state.type === 'combat' && state.isTargetingCharacterId !== null
  })

  readonly showCinematicArena = computed(() => {
    const state = this._state()
    return state.type === 'combat' && state.showCinematicArena
  })

  readonly showVictoryOverlay = computed(() => {
    const state = this._state()
    return state.type === 'combat' && state.subPhase === 'victory'
  })

  readonly showDefeatOverlay = computed(() => {
    const state = this._state()
    return state.type === 'combat' && state.subPhase === 'defeat'
  })

  // Chest-specific computed values
  readonly chestSubPhase = computed(() => {
    const state = this._state()
    return state.type === 'chest' ? state.subPhase : null
  })

  readonly showChestOverlay = computed(() => this._state().type === 'chest')

  // Elevator dialog computed
  readonly showElevatorDialog = computed(() => {
    const state = this._state()
    return state.type === 'exploration' && state.showElevatorDialog
  })

  // ============================================================================
  // Factory Methods for Initial States
  // ============================================================================

  private createExplorationPhase(showElevator = false, destinations: Destination[] = []): ExplorationPhase {
    return {
      type: 'exploration',
      showElevatorDialog: showElevator,
      elevatorDestinations: destinations
    }
  }

  private createCombatPhase(canFlee: boolean, dungeonLevel: number): CombatPhase {
    return {
      type: 'combat',
      subPhase: 'letterbox_intro',
      letterboxType: 'encounter',
      selectedActions: new Map(),
      isTargetingCharacterId: null,
      pendingSpell: null,
      showCinematicArena: false,
      arenaEvents: [],
      arenaAudit: null,
      victoryRewards: null,
      canFlee,
      dungeonLevel
    }
  }

  private createChestPhase(chest: Chest): ChestPhaseState {
    return {
      type: 'chest',
      subPhase: 'discovered',
      chest,
      letterboxType: 'found',
      selectedHandler: null,
      calfoCharacter: null,
      scrambledTrapState: null,
      trapInput: '',
      trapIdentified: false,
      trapLetterboxName: '',
      hitCharacterIds: [],
      pendingTrapInfo: null,
      currentDamageIndicator: null,
      chestSprite: 'closed',
      summary: null,
      lastMessage: '',
      inventoryWarning: null,
      preSelectedRecipient: null
    }
  }

  // ============================================================================
  // Transition Methods - Validated State Changes
  // ============================================================================

  /**
   * Reset to exploration mode
   */
  toExploration(): void {
    this._state.set(this.createExplorationPhase())
  }

  /**
   * Show elevator dialog
   */
  showElevator(destinations: Destination[]): void {
    this._state.set(this.createExplorationPhase(true, destinations))
  }

  /**
   * Dismiss elevator dialog
   */
  dismissElevator(): void {
    const state = this._state()
    if (state.type === 'exploration') {
      this._state.set(this.createExplorationPhase(false, []))
    }
  }

  /**
   * Show tile message in letterbox overlay
   */
  showTileMessage(
    message: string,
    style: MessageStyle = 'letterbox',
    options: {
      autoDismiss?: boolean
      autoDismissDelay?: number
      item?: TileMessageItem
      onDismiss?: () => void
      pendingEncounter?: FixedEncounterConfig
      pendingConditionCallback?: () => void
    } = {}
  ): void {
    this._state.set({
      type: 'tile_message',
      message,
      style,
      autoDismiss: options.autoDismiss ?? false,
      autoDismissDelay: options.autoDismissDelay ?? 2500,
      item: options.item ?? null,
      onDismiss: options.onDismiss ?? null,
      pendingEncounter: options.pendingEncounter ?? null,
      pendingConditionCallback: options.pendingConditionCallback ?? null
    })
  }

  /**
   * Dismiss tile message and return to exploration (or execute callback)
   */
  dismissTileMessage(): { pendingEncounter: FixedEncounterConfig | null; callback: (() => void) | null } {
    const state = this._state()
    if (state.type !== 'tile_message') {
      return { pendingEncounter: null, callback: null }
    }

    const result = {
      pendingEncounter: state.pendingEncounter,
      callback: state.onDismiss
    }

    this._state.set(this.createExplorationPhase())
    return result
  }

  // ============================================================================
  // Combat Transitions
  // ============================================================================

  /**
   * Start combat encounter
   */
  startCombat(canFlee: boolean, dungeonLevel: number, letterboxType: LetterboxType = 'encounter'): void {
    const phase = this.createCombatPhase(canFlee, dungeonLevel)
    phase.letterboxType = letterboxType
    this._state.set(phase)
  }

  /**
   * Complete combat intro letterbox, transition to action selection
   */
  completeCombatIntro(): void {
    const state = this._state()
    if (state.type !== 'combat') return

    this._state.set({
      ...state,
      subPhase: 'action_select',
      letterboxType: null
    })
  }

  /**
   * Set action for a character
   */
  setCombatAction(characterId: string, command: CombatCommand): void {
    const state = this._state()
    if (state.type !== 'combat') return

    const newActions = new Map(state.selectedActions)
    newActions.set(characterId, command)

    this._state.set({
      ...state,
      selectedActions: newActions,
      isTargetingCharacterId: null,
      pendingSpell: null
    })
  }

  /**
   * Start targeting mode for attack or spell
   */
  startTargeting(characterId: string, spell?: SpellData): void {
    const state = this._state()
    if (state.type !== 'combat') return

    this._state.set({
      ...state,
      subPhase: 'targeting',
      isTargetingCharacterId: characterId,
      pendingSpell: spell ?? null
    })
  }

  /**
   * Cancel targeting mode
   */
  cancelTargeting(): void {
    const state = this._state()
    if (state.type !== 'combat') return

    this._state.set({
      ...state,
      subPhase: 'action_select',
      isTargetingCharacterId: null,
      pendingSpell: null
    })
  }

  /**
   * Reset all selected actions
   */
  resetCombatActions(): void {
    const state = this._state()
    if (state.type !== 'combat') return

    this._state.set({
      ...state,
      selectedActions: new Map(),
      isTargetingCharacterId: null,
      pendingSpell: null
    })
  }

  /**
   * Start round execution with cinematic arena
   */
  startRoundExecution(events: CombatRoundEvent[], audit: CombatRoundAudit | null): void {
    const state = this._state()
    if (state.type !== 'combat') return

    this._state.set({
      ...state,
      subPhase: 'executing',
      showCinematicArena: true,
      arenaEvents: events,
      arenaAudit: audit
    })
  }

  /**
   * Complete round execution, return to action selection
   */
  completeRoundExecution(): void {
    const state = this._state()
    if (state.type !== 'combat') return

    this._state.set({
      ...state,
      subPhase: 'action_select',
      showCinematicArena: false,
      selectedActions: new Map(),
      arenaEvents: [],
      arenaAudit: null
    })
  }

  /**
   * Show victory overlay
   */
  showVictory(rewards: VictoryRewards): void {
    const state = this._state()
    if (state.type !== 'combat') return

    this._state.set({
      ...state,
      subPhase: 'victory',
      showCinematicArena: false,
      victoryRewards: rewards
    })
  }

  /**
   * Show defeat overlay
   */
  showDefeat(): void {
    const state = this._state()
    if (state.type !== 'combat') return

    this._state.set({
      ...state,
      subPhase: 'defeat',
      showCinematicArena: false
    })
  }

  /**
   * End combat and return to exploration
   */
  endCombat(): void {
    this._state.set(this.createExplorationPhase())
  }

  // ============================================================================
  // Chest Transitions
  // ============================================================================

  /**
   * Start chest interaction
   */
  startChestInteraction(chest: Chest): void {
    this._state.set(this.createChestPhase(chest))
  }

  /**
   * Dismiss chest letterbox
   */
  dismissChestLetterbox(): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      subPhase: 'handler_select',
      letterboxType: null
    })
  }

  /**
   * Select chest handler
   */
  selectChestHandler(character: Character): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      subPhase: 'action_select',
      selectedHandler: character
    })
  }

  /**
   * Show trap inspection result
   */
  showTrapInspection(scrambled: ScrambledTrapState | null, identified: boolean): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      subPhase: 'trap_inspect',
      scrambledTrapState: scrambled,
      trapIdentified: identified
    })
  }

  /**
   * Update trap input (player guessing trap name)
   */
  updateTrapInput(input: string): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      trapInput: input
    })
  }

  /**
   * Show trap trigger effects
   */
  showTrapTriggered(trapInfo: TrapTriggerInfo, trapName: string): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      subPhase: 'trap_triggered',
      letterboxType: 'trap_triggered',
      pendingTrapInfo: trapInfo,
      trapLetterboxName: trapName,
      hitCharacterIds: Array.from(trapInfo.damageDealt.keys())
    })
  }

  /**
   * Show damage indicator for trap effect
   */
  showDamageIndicator(indicator: DamageIndicator | null): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      currentDamageIndicator: indicator
    })
  }

  /**
   * Open chest and show contents
   */
  openChest(summary: ChestSummary): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      subPhase: 'contents_reveal',
      chestSprite: 'open',
      summary,
      letterboxType: null
    })
  }

  /**
   * Show inventory warning
   */
  showInventoryWarning(warning: string): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      inventoryWarning: warning
    })
  }

  /**
   * Pre-select item recipient
   */
  preSelectRecipient(character: Character | null): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      preSelectedRecipient: character
    })
  }

  /**
   * Update chest with new state (trap disarmed, etc.)
   */
  updateChest(updates: Partial<Chest>): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      chest: { ...state.chest, ...updates }
    })
  }

  /**
   * Set last message for chest interaction
   */
  setChestMessage(message: string): void {
    const state = this._state()
    if (state.type !== 'chest') return

    this._state.set({
      ...state,
      lastMessage: message
    })
  }

  /**
   * End chest interaction
   */
  endChestInteraction(): void {
    this._state.set(this.createExplorationPhase())
  }

  // ============================================================================
  // Spell Casting Transitions
  // ============================================================================

  /**
   * Open spell selection dialog
   */
  openSpellDialog(caster: Character, context: 'dungeon' | 'combat' = 'dungeon'): void {
    this._state.set({
      type: 'spell_casting',
      context,
      showSpellDialog: true,
      showTargetDialog: false,
      selectedCaster: caster,
      selectedSpell: null,
      targetOptions: []
    })
  }

  /**
   * Select spell and show target dialog if needed
   */
  selectSpell(spell: SpellData, targetOptions: SpellTargetOption[]): void {
    const state = this._state()
    if (state.type !== 'spell_casting') return

    if (targetOptions.length > 0) {
      this._state.set({
        ...state,
        showSpellDialog: false,
        showTargetDialog: true,
        selectedSpell: spell,
        targetOptions
      })
    } else {
      // No target needed, spell will be cast immediately
      this._state.set({
        ...state,
        selectedSpell: spell,
        targetOptions: []
      })
    }
  }

  /**
   * Cancel spell casting
   */
  cancelSpellCasting(): void {
    const state = this._state()
    if (state.type !== 'spell_casting') return

    // Return to previous state based on context
    if (state.context === 'combat') {
      // Return to combat action selection
      // Note: Combat state should be restored by the component
    }
    this._state.set(this.createExplorationPhase())
  }

  /**
   * Complete spell casting
   */
  completeSpellCasting(): void {
    this._state.set(this.createExplorationPhase())
  }

  // ============================================================================
  // Condition Fail Transitions
  // ============================================================================

  /**
   * Show condition failure state
   */
  showConditionFail(result: ConditionResult, previousPosition: Position): void {
    this._state.set({
      type: 'condition_fail',
      conditionResult: result,
      previousPosition
    })
  }

  /**
   * Complete condition fail handling
   */
  completeConditionFail(): void {
    this._state.set(this.createExplorationPhase())
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  /**
   * Check if transition to combat is valid
   */
  canStartCombat(): boolean {
    const state = this._state()
    return state.type === 'exploration' || state.type === 'tile_message'
  }

  /**
   * Check if transition to chest is valid
   */
  canStartChestInteraction(): boolean {
    const state = this._state()
    return state.type === 'exploration' || state.type === 'combat'
  }

  /**
   * Check if targeting is active
   */
  isTargeting(): boolean {
    const state = this._state()
    return state.type === 'combat' && state.isTargetingCharacterId !== null
  }

  /**
   * Get current targeting character ID
   */
  getTargetingCharacterId(): string | null {
    const state = this._state()
    return state.type === 'combat' ? state.isTargetingCharacterId : null
  }

  /**
   * Get pending spell for targeting
   */
  getPendingSpell(): SpellData | null {
    const state = this._state()
    return state.type === 'combat' ? state.pendingSpell : null
  }
}

// ============================================================================
// Re-export VictoryRewards for convenience
// ============================================================================
export { VictoryRewards } from '@services/VictoryService'
