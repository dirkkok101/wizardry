/**
 * MazeStateStore - Single source of truth for all maze UI state
 *
 * Consolidates signals from:
 * - CombatFlowController
 * - ChestFlowController
 * - SpellFlowController
 * - TileMessageController
 *
 * Design principles:
 * - All UI state lives here (no duplicate signals elsewhere)
 * - Components inject this directly (no callbacks)
 * - State transitions via action methods
 * - Computed selectors for derived state
 */

import { Injectable, signal, computed } from '@angular/core'
import { Character } from '@models/Character'
import { Chest } from '@models/Chest'
import { Item } from '@models/Item'
import { CharacterStatus } from '@models/CharacterStatus'
import { ScrambledTrapState, TrapId } from '@models/Trap'
import { CombatState, MonsterGroup, CombatCommand, CombatRoundEvent, CombatRoundAudit } from '@models/Combat'
import { VictoryRewards } from '@services/VictoryService'
import { SpellData } from '@services/SpellCastingService'
import { MenuItem } from '@shared/components/menu/menu.component'
import { CharacterOption } from '@shared/components/character-selection-dialog/character-selection-dialog.component'
import { FixedEncounterConfig } from '@services/EncounterTriggerService'
import { Destination, MessageStyle } from '@models/Dungeon'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Primary maze mode */
export type MazeMode = 'exploration' | 'combat' | 'chest' | 'tile_message'

/** Combat phase */
export type CombatPhase = 'idle' | 'encounter' | 'action_select' | 'executing' | 'victory' | 'defeat'

/** Letterbox type for combat cinematics */
export type CombatLetterboxType = 'encounter' | 'ambush' | 'surprise' | null

/** Chest phase */
export type ChestPhase =
  | 'idle'
  | 'reveal'
  | 'action_select'
  | 'caster_select'
  | 'trap_display'
  | 'trap_input'
  | 'inventory_warning'
  | 'trap_triggered'
  | 'opening'
  | 'result'

/** Chest letterbox type */
export type ChestLetterboxType = 'treasure' | 'trap_detected' | 'disarm_attempt' | 'trap_triggered' | null

/** Tile message phase */
export type TileMessagePhase = 'idle' | 'message' | 'item_reward'

/** Chest summary for result display */
export interface ChestSummary {
  goldObtained: number
  itemsObtained: Item[]
  itemsLost: Item[]
  recipientName: string
  trapTriggered: boolean
  trapName: string | null
  damageDealt: Map<string, number>
  statusEffects: Map<string, CharacterStatus>
}

/** Pending trap info for damage visualization */
export interface PendingTrapInfo {
  trapTriggered: boolean
  trapId: TrapId | null
  trapMessage: string | null
  damageDealt: Map<string, number>
  statusEffects: Map<string, CharacterStatus>
}

/** Damage indicator for character panels */
export interface DamageIndicator {
  characterId: string
  damage: number
  status?: string
}

/** Tile message item display */
export interface TileMessageItem {
  name: string
  icon?: string
}

/** Pending combat result stored during arena playback */
export interface PendingCombatResult {
  finalState: CombatState
  finalCharacterUpdates: Map<string, Character>
  spellCasters: Map<string, { character: Character; spellId: string }>
  victory: boolean
  defeat: boolean
}

// ============================================================================
// STATE STORE
// ============================================================================

@Injectable({
  providedIn: 'root'
})
export class MazeStateStore {
  // ============================================================
  // GLOBAL STATE
  // ============================================================

  /** Message log */
  readonly messages = signal<string[]>([])

  /** Error message */
  readonly errorMessage = signal<string | null>(null)

  /** Loading state */
  readonly isLoadingLevel = signal<boolean>(false)

  // ============================================================
  // COMBAT STATE (from CombatFlowController)
  // ============================================================

  /** Current combat phase */
  readonly combatPhase = signal<CombatPhase>('idle')

  /** Letterbox type for cinematics */
  readonly combatLetterboxType = signal<CombatLetterboxType>(null)

  /** Whether combat intro is active (hides monster cards) */
  readonly combatIntroActive = signal<boolean>(false)

  /** Selected actions for each character */
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())

  /** Whether round execution is in progress */
  readonly isExecutingRound = signal<boolean>(false)

  /** Currently selected target group */
  readonly selectedTargetGroupId = signal<'A' | 'B' | 'C' | 'D' | null>(null)

  /** Whether in targeting mode */
  readonly isTargetingMode = signal<boolean>(false)

  /** Character ID currently selecting a target */
  readonly targetingCharacterId = signal<string | null>(null)

  /** Show victory overlay */
  readonly showVictoryOverlay = signal<boolean>(false)

  /** Show defeat overlay */
  readonly showDefeatOverlay = signal<boolean>(false)

  /** Victory rewards to display */
  readonly victoryRewards = signal<VictoryRewards | null>(null)

  /** Show cinematic arena */
  readonly showCinematicArena = signal<boolean>(false)

  /** Arena events to play */
  readonly arenaEvents = signal<CombatRoundEvent[]>([])

  /** Arena audit data */
  readonly arenaAudit = signal<CombatRoundAudit | null>(null)

  /** Pending combat result (stored during arena playback) */
  private _pendingCombatResult: PendingCombatResult | null = null

  // ============================================================
  // CHEST STATE (from ChestFlowController)
  // ============================================================

  /** Current chest phase */
  readonly chestPhase = signal<ChestPhase>('idle')

  /** Chest letterbox type */
  readonly chestLetterboxType = signal<ChestLetterboxType>(null)

  /** Pending chest being interacted with */
  readonly pendingChest = signal<Chest | null>(null)

  /** Chest sprite state */
  readonly chestSprite = signal<'closed' | 'open'>('closed')

  /** Selected character to open/disarm chest */
  readonly chestOpener = signal<Character | null>(null)

  /** Selected caster for CALFO */
  readonly chestCaster = signal<Character | null>(null)

  /** Scrambled trap state for display */
  readonly scrambledTrapState = signal<ScrambledTrapState | null>(null)

  /** Trap name input for disarm attempt */
  readonly chestTrapInput = signal<string>('')

  /** Chest summary after opening */
  readonly chestSummary = signal<ChestSummary | null>(null)

  /** Last message to display in chest overlay */
  readonly chestLastMessage = signal<string>('')

  /** Inventory warning message */
  readonly chestInventoryWarning = signal<string | null>(null)

  /** Pre-selected recipient for item distribution */
  readonly preSelectedRecipient = signal<Character | null>(null)

  /** Pending trap info for damage visualization */
  readonly pendingTrapInfo = signal<PendingTrapInfo | null>(null)

  /** Trap letterbox name for effect visualization */
  readonly trapLetterboxName = signal<string>('')

  /** Character IDs affected by trap */
  readonly hitCharacterIds = signal<string[]>([])

  /** Current damage indicator */
  readonly currentDamageIndicator = signal<DamageIndicator | null>(null)

  // ============================================================
  // SPELL STATE (from SpellFlowController)
  // ============================================================

  /** Show spell selection dialog */
  readonly showSpellDialog = signal<boolean>(false)

  /** Show target selection dialog */
  readonly showTargetDialog = signal<boolean>(false)

  /** Selected caster for spell */
  readonly selectedCaster = signal<Character | null>(null)

  /** Selected spell */
  readonly selectedSpell = signal<SpellData | null>(null)

  /** Target options for spell */
  readonly targetOptions = signal<CharacterOption[]>([])

  /** Spell context (dungeon or combat) */
  readonly spellContext = signal<'dungeon' | 'combat'>('dungeon')

  /** Pending combat spell awaiting target */
  readonly pendingCombatSpell = signal<SpellData | null>(null)

  // ============================================================
  // TILE MESSAGE STATE (from TileMessageController)
  // ============================================================

  /** Current phase of the tile message overlay */
  readonly tileMessagePhase = signal<TileMessagePhase>('idle')

  /** Text to display in the overlay */
  readonly tileMessageText = signal<string>('')

  /** Optional item to display after message */
  readonly tileMessageItem = signal<TileMessageItem | null>(null)

  /** Whether to auto-dismiss the message */
  readonly tileMessageAutoDismiss = signal<boolean>(false)

  /** Pending fixed encounter to trigger after dismiss */
  readonly pendingFixedEncounter = signal<FixedEncounterConfig | null>(null)

  /** Callback to execute after dismiss */
  readonly pendingConditionCallback = signal<(() => void) | null>(null)

  // ============================================================
  // ELEVATOR STATE
  // ============================================================

  /** Show elevator dialog */
  readonly showElevatorDialog = signal<boolean>(false)

  /** Elevator destinations */
  readonly elevatorDestinations = signal<Destination[]>([])

  // ============================================================
  // COMPUTED SELECTORS - Mode
  // ============================================================

  /** Primary maze mode */
  readonly mode = computed<MazeMode>(() => {
    if (this.combatPhase() !== 'idle') return 'combat'
    if (this.chestPhase() !== 'idle') return 'chest'
    if (this.tileMessagePhase() !== 'idle') return 'tile_message'
    return 'exploration'
  })

  /** Whether in combat */
  readonly inCombat = computed(() => this.combatPhase() !== 'idle')

  /** Whether chest overlay is visible */
  readonly showChestOverlay = computed(() => this.chestPhase() !== 'idle')

  /** Whether tile message overlay is visible */
  readonly showTileMessageOverlay = computed(() => this.tileMessagePhase() !== 'idle')

  // ============================================================
  // COMPUTED SELECTORS - Combat
  // ============================================================

  /** Whether monster cards should be shown */
  readonly showMonsterCards = computed(() =>
    this.inCombat() && !this.combatIntroActive() && !this.showCinematicArena()
  )

  /** Whether panels should be dimmed (targeting active) */
  readonly shouldDimPanels = computed(() => this.targetingCharacterId() !== null)

  // ============================================================
  // COMPUTED SELECTORS - Spell
  // ============================================================

  /** Whether any spell dialog is active */
  readonly isSpellFlowActive = computed(() =>
    this.showSpellDialog() || this.showTargetDialog()
  )

  // ============================================================
  // ACTIONS - Messages
  // ============================================================

  /** Add a message to the log */
  addMessage(message: string): void {
    this.messages.update(msgs => [...msgs, message])
  }

  /** Clear all messages */
  clearMessages(): void {
    this.messages.set([])
  }

  /** Set error message */
  setError(error: string | null): void {
    this.errorMessage.set(error)
  }

  // ============================================================
  // ACTIONS - Combat
  // ============================================================

  /** Start combat encounter */
  startCombat(): void {
    this.combatPhase.set('encounter')
    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)
  }

  /** Set combat letterbox */
  setCombatLetterbox(type: CombatLetterboxType): void {
    this.combatLetterboxType.set(type)
  }

  /** Set letterbox (alias for combat) */
  setLetterbox(type: CombatLetterboxType): void {
    this.combatLetterboxType.set(type)
  }

  /** Clear letterbox */
  clearLetterbox(): void {
    this.combatLetterboxType.set(null)
  }

  /** Set combat intro active */
  setCombatIntroActive(active: boolean): void {
    this.combatIntroActive.set(active)
  }

  /** Set combat phase */
  setCombatPhase(phase: CombatPhase): void {
    this.combatPhase.set(phase)
  }

  /** Start targeting mode */
  startTargeting(characterId: string): void {
    this.targetingCharacterId.set(characterId)
    this.isTargetingMode.set(true)
  }

  /** Cancel targeting mode */
  cancelTargeting(): void {
    this.targetingCharacterId.set(null)
    this.isTargetingMode.set(false)
    this.selectedTargetGroupId.set(null)
  }

  /** Select action for a character */
  selectAction(characterId: string, command: CombatCommand): void {
    this.selectedActions.update(actions => {
      const newActions = new Map(actions)
      newActions.set(characterId, command)
      return newActions
    })
  }

  /** Reset all selected actions */
  resetActions(): void {
    this.selectedActions.set(new Map())
    this.cancelTargeting()
  }

  /** Select flee action for a character (stores placeholder command) */
  selectFleeAction(characterId: string): void {
    // Note: The actual RUN command is created by CombatOrchestrator
    // This is a placeholder to mark the character as having an action selected
    this.selectedActions.update(actions => {
      const newActions = new Map(actions)
      // Store a placeholder - the orchestrator will replace with proper command
      newActions.set(characterId, { type: 'RUN' } as CombatCommand)
      return newActions
    })
  }

  /** Start round execution */
  startRoundExecution(): void {
    this.isExecutingRound.set(true)
    this.combatPhase.set('executing')
  }

  /** Set is executing round */
  setIsExecutingRound(executing: boolean): void {
    this.isExecutingRound.set(executing)
  }

  /** Start arena playback */
  startArenaPlayback(events: CombatRoundEvent[], audit: CombatRoundAudit | null): void {
    this.arenaEvents.set(events)
    this.arenaAudit.set(audit)
    this.showCinematicArena.set(true)
  }

  /** End arena playback */
  endArenaPlayback(): void {
    this.showCinematicArena.set(false)
    this.arenaEvents.set([])
    this.arenaAudit.set(null)
  }

  /** Stop arena playback (alias for endArenaPlayback) */
  stopArenaPlayback(): void {
    this.endArenaPlayback()
  }

  /** Store pending combat result */
  setPendingCombatResult(result: PendingCombatResult): void {
    this._pendingCombatResult = result
  }

  /** Get pending combat result */
  getPendingCombatResult(): PendingCombatResult | null {
    return this._pendingCombatResult
  }

  /** Clear pending combat result */
  clearPendingCombatResult(): void {
    this._pendingCombatResult = null
  }

  /** Reset for next round */
  resetForNextRound(): void {
    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)
    this.combatPhase.set('action_select')
    this.cancelTargeting()
  }

  /** Show victory */
  showVictory(rewards: VictoryRewards): void {
    this.combatPhase.set('victory')
    this.showVictoryOverlay.set(true)
    this.victoryRewards.set(rewards)
  }

  /** Show defeat */
  showDefeat(): void {
    this.combatPhase.set('defeat')
    this.showDefeatOverlay.set(true)
  }

  /** End combat */
  endCombat(): void {
    this.combatPhase.set('idle')
    this.combatLetterboxType.set(null)
    this.combatIntroActive.set(false)
    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)
    this.cancelTargeting()
    this.showVictoryOverlay.set(false)
    this.showDefeatOverlay.set(false)
    this.victoryRewards.set(null)
    this.showCinematicArena.set(false)
    this.arenaEvents.set([])
    this.arenaAudit.set(null)
    this._pendingCombatResult = null
  }

  // ============================================================
  // ACTIONS - Chest
  // ============================================================

  /** Start chest interaction */
  startChest(chest: Chest): void {
    this.pendingChest.set(chest)
    this.chestSprite.set('closed')
    this.chestPhase.set('action_select')
    this.chestLastMessage.set('Choose an action from a character card.')
  }

  /** Set chest phase */
  setChestPhase(phase: ChestPhase): void {
    this.chestPhase.set(phase)
  }

  /** Set chest opener */
  setChestOpener(character: Character | null): void {
    this.chestOpener.set(character)
  }

  /** Select chest opener (alias for setChestOpener) */
  selectChestOpener(character: Character): void {
    this.chestOpener.set(character)
  }

  /** Set chest message */
  setChestMessage(message: string): void {
    this.chestLastMessage.set(message)
  }

  /** Set chest last message (alias) */
  setChestLastMessage(message: string): void {
    this.chestLastMessage.set(message)
  }

  /** Set scrambled trap state */
  setScrambledTrapState(state: ScrambledTrapState | null): void {
    this.scrambledTrapState.set(state)
  }

  /** Update chest trap input */
  updateChestTrapInput(input: string): void {
    this.chestTrapInput.set(input)
  }

  /** Set chest trap input (alias) */
  setChestTrapInput(input: string): void {
    this.chestTrapInput.set(input)
  }

  /** Set chest inventory warning */
  setChestInventoryWarning(warning: string | null): void {
    this.chestInventoryWarning.set(warning)
  }

  /** Set chest letterbox */
  setChestLetterbox(type: ChestLetterboxType): void {
    this.chestLetterboxType.set(type)
  }

  /** Set trap letterbox name */
  setTrapLetterboxName(name: string): void {
    this.trapLetterboxName.set(name)
  }

  /** Open chest sprite */
  openChestSprite(): void {
    this.chestSprite.set('open')
  }

  /** Set chest sprite */
  setChestSprite(sprite: 'closed' | 'open'): void {
    this.chestSprite.set(sprite)
  }

  /** Set chest caster */
  setChestCaster(caster: Character | null): void {
    this.chestCaster.set(caster)
  }

  /** Set pre-selected recipient */
  setPreSelectedRecipient(recipient: Character | null): void {
    this.preSelectedRecipient.set(recipient)
  }

  /** Set pending chest directly */
  setPendingChest(chest: Chest | null): void {
    this.pendingChest.set(chest)
  }

  /** Clear chest letterbox */
  clearChestLetterbox(): void {
    this.chestLetterboxType.set(null)
  }

  /** Set current damage indicator */
  setCurrentDamageIndicator(indicator: DamageIndicator | null): void {
    this.currentDamageIndicator.set(indicator)
  }

  /** Clear current damage indicator */
  clearCurrentDamageIndicator(): void {
    this.currentDamageIndicator.set(null)
  }

  /** Set hit character IDs */
  setHitCharacterIds(ids: string[]): void {
    this.hitCharacterIds.set(ids)
  }

  /** Set damage indicator */
  setDamageIndicator(indicator: DamageIndicator | null): void {
    this.currentDamageIndicator.set(indicator)
  }

  /** Set pending trap info */
  setPendingTrapInfo(info: PendingTrapInfo | null): void {
    this.pendingTrapInfo.set(info)
  }

  /** Set chest summary */
  setChestSummary(summary: ChestSummary | null): void {
    this.chestSummary.set(summary)
  }

  /** Update pending chest */
  updatePendingChest(updater: (chest: Chest | null) => Chest | null): void {
    this.pendingChest.update(updater)
  }

  /** Close chest overlay */
  closeChest(): void {
    this.chestPhase.set('idle')
    this.chestLetterboxType.set(null)
    this.pendingChest.set(null)
    this.chestOpener.set(null)
    this.chestCaster.set(null)
    this.scrambledTrapState.set(null)
    this.chestTrapInput.set('')
    this.chestSummary.set(null)
    this.chestLastMessage.set('')
    this.chestInventoryWarning.set(null)
    this.preSelectedRecipient.set(null)
    this.pendingTrapInfo.set(null)
    this.trapLetterboxName.set('')
    this.hitCharacterIds.set([])
    this.currentDamageIndicator.set(null)
    this.chestSprite.set('closed')
  }

  // ============================================================
  // ACTIONS - Spell
  // ============================================================

  /** Open spell dialog */
  openSpellDialog(caster: Character, context: 'dungeon' | 'combat'): void {
    this.selectedCaster.set(caster)
    this.spellContext.set(context)
    this.showSpellDialog.set(true)
  }

  /** Close spell dialog */
  closeSpellDialog(): void {
    this.showSpellDialog.set(false)
  }

  /** Set selected spell */
  setSelectedSpell(spell: SpellData | null): void {
    this.selectedSpell.set(spell)
  }

  /** Set pending combat spell */
  setPendingCombatSpell(spell: SpellData | null): void {
    this.pendingCombatSpell.set(spell)
  }

  /** Open target dialog */
  openTargetDialog(options: CharacterOption[]): void {
    this.targetOptions.set(options)
    this.showTargetDialog.set(true)
  }

  /** Close target dialog */
  closeTargetDialog(): void {
    this.showTargetDialog.set(false)
    this.targetOptions.set([])
  }

  /** Reset spell state */
  resetSpellState(): void {
    this.showSpellDialog.set(false)
    this.showTargetDialog.set(false)
    this.selectedCaster.set(null)
    this.selectedSpell.set(null)
    this.pendingCombatSpell.set(null)
    this.spellContext.set('dungeon')
    this.targetOptions.set([])
  }

  // ============================================================
  // ACTIONS - Tile Message
  // ============================================================

  /** Show tile message */
  showTileMessage(
    message: string,
    autoDismiss: boolean = false,
    item?: TileMessageItem | null,
    onDismiss?: () => void
  ): void {
    this.tileMessagePhase.set('message')
    this.tileMessageText.set(message)
    this.tileMessageItem.set(item ?? null)
    this.tileMessageAutoDismiss.set(autoDismiss)
    if (onDismiss) {
      this.pendingConditionCallback.set(onDismiss)
    }
  }

  /** Show item reward phase */
  showItemReward(item: TileMessageItem): void {
    this.tileMessageItem.set(item)
    this.tileMessagePhase.set('item_reward')
  }

  /** Set pending encounter */
  setPendingEncounter(config: FixedEncounterConfig | null): void {
    this.pendingFixedEncounter.set(config)
  }

  /** Dismiss tile message */
  dismissTileMessage(): { pendingEncounter: FixedEncounterConfig | null; callback: (() => void) | null } {
    const pendingEncounter = this.pendingFixedEncounter()
    const callback = this.pendingConditionCallback()

    this.tileMessagePhase.set('idle')
    this.tileMessageText.set('')
    this.tileMessageItem.set(null)
    this.tileMessageAutoDismiss.set(false)
    this.pendingFixedEncounter.set(null)
    this.pendingConditionCallback.set(null)

    return { pendingEncounter, callback }
  }

  /**
   * Handle tile message dismissal (Enter key press)
   * Returns pending data if overlay was fully dismissed
   */
  handleTileMessageDismiss(): { pendingEncounter: FixedEncounterConfig | null; callback: (() => void) | null } | null {
    const phase = this.tileMessagePhase()
    const item = this.tileMessageItem()

    if (phase === 'message' && item) {
      // Transition to item reward phase
      this.tileMessagePhase.set('item_reward')
      return null
    }

    // Dismiss overlay completely
    return this.dismissTileMessage()
  }

  /**
   * Show condition message (letterbox or log style)
   * Letterbox shows overlay, log just adds to message list
   */
  showConditionMessage(message: string, style: MessageStyle, onDismiss: () => void): void {
    if (style === 'letterbox') {
      this.pendingConditionCallback.set(onDismiss)
      this.tileMessageText.set(message)
      this.tileMessageAutoDismiss.set(false)
      this.tileMessagePhase.set('message')
    } else {
      // 'log' style - just add to message log and call callback immediately
      this.addMessage(message)
      onDismiss()
    }
  }

  /**
   * Show a message and return a Promise that resolves when dismissed
   */
  showMessageAsync(message: string): Promise<void> {
    return new Promise(resolve => {
      this.showTileMessage(message, false, null, resolve)
    })
  }

  // ============================================================
  // ACTIONS - Elevator
  // ============================================================

  /** Show elevator dialog */
  showElevator(destinations: Destination[]): void {
    this.elevatorDestinations.set(destinations)
    this.showElevatorDialog.set(true)
  }

  /** Close elevator dialog */
  closeElevator(): void {
    this.showElevatorDialog.set(false)
    this.elevatorDestinations.set([])
  }

  // ============================================================
  // GLOBAL RESET
  // ============================================================

  /** Reset all state (e.g., when leaving maze) */
  reset(): void {
    this.messages.set([])
    this.errorMessage.set(null)
    this.isLoadingLevel.set(false)

    this.endCombat()
    this.closeChest()
    this.resetSpellState()
    this.dismissTileMessage()
    this.closeElevator()
  }
}
