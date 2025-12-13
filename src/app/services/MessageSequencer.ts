/**
 * MessageSequencer - Async/await utilities for sequential message display
 *
 * Replaces callback hell patterns in MazeComponent with Promise-based
 * message sequencing. Allows clean async/await code flow for:
 * - Tile messages
 * - Condition messages
 * - Combat event messages
 * - Trap trigger animations
 *
 * Example transformation:
 *
 * BEFORE (callback hell):
 * ```
 * const showFailMessage = () => {
 *   if (conditionResult.message) {
 *     this.showConditionMessage(msg, style, executeFailAction);
 *   } else {
 *     executeFailAction();
 *   }
 * };
 * if (conditionResult.entryMessage) {
 *   this.showConditionMessage(entry, style, showFailMessage);
 * } else {
 *   showFailMessage();
 * }
 * ```
 *
 * AFTER (async/await):
 * ```
 * if (conditionResult.entryMessage) {
 *   await messageSequencer.showMessage(entryMessage, style);
 * }
 * if (conditionResult.message) {
 *   await messageSequencer.showMessage(message, style);
 * }
 * executeFailAction();
 * ```
 */

import { Injectable, signal, Signal } from '@angular/core'
import { MessageStyle } from '@models/Dungeon'

/**
 * Message item with optional attached data
 */
export interface SequencedMessage {
  id: string
  text: string
  style: MessageStyle
  autoDismiss: boolean
  autoDismissDelay: number
  item?: {
    name: string
    icon?: string
  }
}

/**
 * State of the message sequencer
 */
export interface MessageSequencerState {
  isShowing: boolean
  currentMessage: SequencedMessage | null
  pendingCount: number
}

@Injectable({
  providedIn: 'root'
})
export class MessageSequencer {
  private _state = signal<MessageSequencerState>({
    isShowing: false,
    currentMessage: null,
    pendingCount: 0
  })

  private resolveCurrentMessage: (() => void) | null = null
  private messageIdCounter = 0

  /** Read-only state signal */
  readonly state: Signal<MessageSequencerState> = this._state.asReadonly()

  /**
   * Show a message and wait for it to be dismissed
   * Returns a Promise that resolves when the message is dismissed
   */
  showMessage(
    text: string,
    style: MessageStyle = 'letterbox',
    options: {
      autoDismiss?: boolean
      autoDismissDelay?: number
      item?: { name: string; icon?: string }
    } = {}
  ): Promise<void> {
    return new Promise(resolve => {
      const message: SequencedMessage = {
        id: `msg-${++this.messageIdCounter}`,
        text,
        style,
        autoDismiss: options.autoDismiss ?? false,
        autoDismissDelay: options.autoDismissDelay ?? 2500,
        item: options.item
      }

      this.resolveCurrentMessage = resolve

      this._state.set({
        isShowing: true,
        currentMessage: message,
        pendingCount: 0
      })

      // Handle auto-dismiss
      if (message.autoDismiss) {
        setTimeout(() => {
          this.dismissMessage()
        }, message.autoDismissDelay)
      }
    })
  }

  /**
   * Show multiple messages in sequence
   * Returns when all messages have been dismissed
   */
  async showMessages(
    messages: Array<{
      text: string
      style?: MessageStyle
      autoDismiss?: boolean
      autoDismissDelay?: number
    }>
  ): Promise<void> {
    for (const msg of messages) {
      if (msg.text) {
        await this.showMessage(msg.text, msg.style ?? 'letterbox', {
          autoDismiss: msg.autoDismiss,
          autoDismissDelay: msg.autoDismissDelay
        })
      }
    }
  }

  /**
   * Dismiss the current message
   * Resolves the Promise returned by showMessage
   */
  dismissMessage(): void {
    if (this.resolveCurrentMessage) {
      const resolve = this.resolveCurrentMessage
      this.resolveCurrentMessage = null

      this._state.set({
        isShowing: false,
        currentMessage: null,
        pendingCount: 0
      })

      // Resolve after state update to allow UI to update
      queueMicrotask(resolve)
    }
  }

  /**
   * Check if a message is currently showing
   */
  isShowing(): boolean {
    return this._state().isShowing
  }

  /**
   * Get the current message text
   */
  getCurrentMessage(): string | null {
    return this._state().currentMessage?.text ?? null
  }

  /**
   * Clear any pending state (for cleanup)
   */
  clear(): void {
    if (this.resolveCurrentMessage) {
      this.resolveCurrentMessage()
      this.resolveCurrentMessage = null
    }

    this._state.set({
      isShowing: false,
      currentMessage: null,
      pendingCount: 0
    })
  }
}

/**
 * Standalone utility functions for message handling
 * Can be used without Angular injection
 */
export const MessageUtils = {
  /**
   * Create a Promise that resolves after a delay
   */
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  /**
   * Create a Promise that resolves on next animation frame
   */
  nextFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()))
  },

  /**
   * Create a cancelable delay
   */
  createCancelableDelay(ms: number): { promise: Promise<boolean>; cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout>
    let cancelled = false

    const promise = new Promise<boolean>(resolve => {
      timeoutId = setTimeout(() => {
        resolve(!cancelled)
      }, ms)
    })

    const cancel = () => {
      cancelled = true
      clearTimeout(timeoutId)
    }

    return { promise, cancel }
  },

  /**
   * Execute a function with animation frame timing
   * Useful for rendering updates during message sequences
   */
  async withRender(fn: () => void): Promise<void> {
    await this.nextFrame()
    fn()
    await this.nextFrame()
  },

  /**
   * Chain multiple async operations with render updates between them
   */
  async chainWithRenders(operations: Array<() => void | Promise<void>>): Promise<void> {
    for (const op of operations) {
      await this.nextFrame()
      await op()
    }
    await this.nextFrame()
  }
}
