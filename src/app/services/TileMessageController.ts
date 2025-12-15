import { Injectable, signal, computed } from '@angular/core'
import { TileMessagePhase, TileMessageItem } from '@shared/components/tile-message-overlay/tile-message-overlay.component'
import { FixedEncounterConfig } from '@services/EncounterTriggerService'
import { MessageStyle } from '@models/Dungeon'
import { MazeStateMachine } from '@services/MazeStateMachine'

/**
 * Callbacks provided by MazeComponent for TileMessageController
 * Uses callback-based DI to avoid circular dependencies
 */
export interface TileMessageCallbacks {
  addMessage: (message: string) => void
  initiateEncounter: (level: number, canFlee: boolean, config: FixedEncounterConfig, reason: string) => void
  currentLevel: () => number
  getMazeStateMachine: () => MazeStateMachine
  activateRetreatCooldown: () => void
}

/**
 * TileMessageController - Manages tile message overlay state and display
 *
 * Extracted from MazeComponent to reduce complexity.
 * Handles:
 * - Tile message overlay display (letterbox style)
 * - Item reward display after messages
 * - Condition messages with callbacks
 * - Pending fixed encounter triggering after dismissal
 *
 * Uses callback-based dependency injection pattern for MazeComponent integration.
 */
@Injectable({ providedIn: 'root' })
export class TileMessageController {
  private callbacks: TileMessageCallbacks | null = null

  // ============================================================
  // SIGNALS (single source of truth for tile message state)
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

  /** Callback to execute after dismiss (from conditional tiles) */
  readonly pendingConditionCallback = signal<(() => void) | null>(null)

  // ============================================================
  // COMPUTED
  // ============================================================

  /** Whether the tile message overlay should be shown */
  readonly showOverlay = computed(() => this.tileMessagePhase() !== 'idle')

  // ============================================================
  // INITIALIZATION
  // ============================================================

  /**
   * Set callbacks from MazeComponent
   * Must be called during component initialization
   */
  setCallbacks(callbacks: TileMessageCallbacks): void {
    this.callbacks = callbacks
  }

  // ============================================================
  // PUBLIC METHODS
  // ============================================================

  /**
   * Show tile message overlay with optional item reward
   * Delegates to MazeStateMachine for state management
   */
  showMessage(
    message: string,
    autoDismiss: boolean,
    onDismiss: (() => void) | null,
    item?: TileMessageItem | null
  ): void {
    if (!this.callbacks) return

    // Update state machine (source of truth)
    this.callbacks.getMazeStateMachine().showTileMessage(message, 'letterbox', {
      autoDismiss,
      item: item ?? undefined,
      onDismiss: onDismiss ?? undefined
    })

    // Also update local signals during migration (Phase 4.1)
    this.tileMessagePhase.set('message')
    this.tileMessageText.set(message)
    this.tileMessageItem.set(item ?? null)
    this.tileMessageAutoDismiss.set(autoDismiss)

    // Store onDismiss callback if provided
    if (onDismiss) {
      this.pendingConditionCallback.set(onDismiss)
    }
  }

  /**
   * Show a message and return a Promise that resolves when dismissed
   * Uses the existing tile message overlay mechanism with Promise wrapper
   */
  showMessageAsync(message: string): Promise<void> {
    return new Promise(resolve => {
      this.showMessage(message, false, resolve)
    })
  }

  /**
   * Handle tile message overlay dismissal (Enter key press)
   */
  handleDismiss(): void {
    const phase = this.tileMessagePhase()
    const item = this.tileMessageItem()

    if (phase === 'message' && item) {
      // Transition to item reward phase
      this.tileMessagePhase.set('item_reward')
    } else {
      // Dismiss overlay completely
      this.dismissOverlay()
    }
  }

  /**
   * Show a condition message (letterbox style) with a callback for when dismissed
   */
  showConditionMessage(message: string, style: MessageStyle, onDismiss: () => void): void {
    if (!this.callbacks) return

    console.log(`[TileMessageController] showConditionMessage called, style=${style}`)

    if (style === 'letterbox') {
      this.pendingConditionCallback.set(onDismiss)
      this.tileMessageText.set(message)
      this.tileMessageAutoDismiss.set(false)
      this.tileMessagePhase.set('message')
    } else {
      // 'log' style - just add to message log and call callback immediately
      this.callbacks.addMessage(message)
      onDismiss()
    }
  }

  /**
   * Show item reward directly (skip message phase)
   * Used when item was already announced on entry
   */
  showItemReward(item: TileMessageItem): void {
    this.tileMessageItem.set(item)
    this.tileMessagePhase.set('item_reward')
  }

  /**
   * Set pending fixed encounter to trigger after overlay dismissal
   */
  setPendingEncounter(config: FixedEncounterConfig): void {
    this.pendingFixedEncounter.set(config)
  }

  /**
   * Reset all tile message state
   */
  reset(): void {
    this.tileMessagePhase.set('idle')
    this.tileMessageText.set('')
    this.tileMessageItem.set(null)
    this.tileMessageAutoDismiss.set(false)
    this.pendingFixedEncounter.set(null)
    this.pendingConditionCallback.set(null)
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Fully dismiss the tile message overlay and check for pending encounters
   * Delegates to MazeStateMachine for state transition
   */
  private dismissOverlay(): void {
    if (!this.callbacks) return

    console.log(`[TileMessageController] dismissOverlay called`)

    // Use state machine for state transition - returns pending data
    const { pendingEncounter, callback } = this.callbacks.getMazeStateMachine().dismissTileMessage()

    // Clear local signals
    this.tileMessagePhase.set('idle')
    this.tileMessageText.set('')
    this.tileMessageItem.set(null)
    this.tileMessageAutoDismiss.set(false)

    // Activate brief input cooldown to prevent keyboard repeat
    this.callbacks.activateRetreatCooldown()

    // Check for pending condition callback first (from conditional tiles)
    const conditionCallback = callback ?? this.pendingConditionCallback()
    console.log(`[TileMessageController] Pending condition callback: ${conditionCallback ? 'EXISTS' : 'NULL'}`)
    if (conditionCallback) {
      this.pendingConditionCallback.set(null)
      console.log(`[TileMessageController] Executing pending condition callback`)
      conditionCallback()
      return
    }

    // Check for pending fixed encounter
    const pending = pendingEncounter ?? this.pendingFixedEncounter()
    if (pending) {
      this.pendingFixedEncounter.set(null)
      // Trigger the encounter now that message is dismissed
      this.triggerPendingEncounter(pending)
    }
  }

  /**
   * Trigger a pending fixed encounter after message overlay dismissal
   */
  private triggerPendingEncounter(config: FixedEncounterConfig): void {
    if (!this.callbacks) return

    // Use the existing initiateEncounter method which handles everything correctly
    this.callbacks.initiateEncounter(
      this.callbacks.currentLevel(),
      !config.cannotFlee,
      config,
      'fixed'
    )
  }
}
