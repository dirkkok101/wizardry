import { Injectable, signal, computed } from '@angular/core';

/**
 * MessageLogService - Shared message log that persists across maze scenes.
 *
 * This service maintains a single message log that carries messages between
 * scene transitions (exploration → combat planning → playback → victory/defeat).
 *
 * Messages are preserved until explicitly cleared (e.g., when leaving the maze
 * or starting a new dungeon expedition).
 */
@Injectable({
  providedIn: 'root'
})
export class MessageLogService {
  private readonly messagesSignal = signal<string[]>([]);

  /** Read-only access to messages for components */
  readonly messages = computed(() => this.messagesSignal());

  /**
   * Add a message to the log
   */
  addMessage(message: string): void {
    this.messagesSignal.update(msgs => [...msgs, message]);
  }

  /**
   * Add multiple messages at once
   */
  addMessages(messages: string[]): void {
    this.messagesSignal.update(msgs => [...msgs, ...messages]);
  }

  /**
   * Clear all messages (call when leaving maze or starting new expedition)
   */
  clear(): void {
    this.messagesSignal.set([]);
  }

  /**
   * Get current message count
   */
  get count(): number {
    return this.messagesSignal().length;
  }
}
