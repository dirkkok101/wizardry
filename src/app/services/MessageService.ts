import { Injectable, signal, computed } from '@angular/core';

/**
 * Message types for different feedback scenarios
 */
export type MessageType = 'error' | 'success' | 'info' | 'warning';

/**
 * Message structure for display
 */
export interface Message {
  text: string;
  type: MessageType;
}

/**
 * MessageService - Centralized user feedback messaging
 *
 * This service eliminates duplicate error/success message handling across scenes.
 * Previously, each scene had its own:
 * - errorMessage signal
 * - successMessage signal
 * - showError() method with setTimeout
 * - showSuccess() method with setTimeout
 *
 * Now scenes can inject MessageService and use:
 * - messageService.showError('message')
 * - messageService.showSuccess('message')
 * - messageService.message() in templates
 *
 * Benefits:
 * - Consistent auto-dismiss timing (3 seconds default)
 * - Single message display (no overlapping messages)
 * - Type-safe message types
 * - Centralized styling/behavior changes
 */
@Injectable({
  providedIn: 'root'
})
export class MessageService {
  /**
   * Current message (null when no message to display)
   */
  readonly message = signal<Message | null>(null);

  /**
   * Computed helpers for templates
   */
  readonly hasMessage = computed(() => this.message() !== null);
  readonly isError = computed(() => this.message()?.type === 'error');
  readonly isSuccess = computed(() => this.message()?.type === 'success');
  readonly messageText = computed(() => this.message()?.text || '');

  private dismissTimer?: ReturnType<typeof setTimeout>;

  /**
   * Show an error message (auto-dismisses after duration)
   */
  showError(text: string, duration = 3000): void {
    this.show({ text, type: 'error' }, duration);
  }

  /**
   * Show a success message (auto-dismisses after duration)
   */
  showSuccess(text: string, duration = 3000): void {
    this.show({ text, type: 'success' }, duration);
  }

  /**
   * Show an info message (auto-dismisses after duration)
   */
  showInfo(text: string, duration = 3000): void {
    this.show({ text, type: 'info' }, duration);
  }

  /**
   * Show a warning message (auto-dismisses after duration)
   */
  showWarning(text: string, duration = 3000): void {
    this.show({ text, type: 'warning' }, duration);
  }

  /**
   * Clear current message immediately
   */
  clear(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }
    this.message.set(null);
  }

  /**
   * Show message and set up auto-dismiss
   */
  private show(message: Message, duration: number): void {
    // Clear any existing timer
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }

    // Set the message
    this.message.set(message);

    // Set up auto-dismiss (0 or negative duration means no auto-dismiss)
    if (duration > 0) {
      this.dismissTimer = setTimeout(() => {
        this.message.set(null);
        this.dismissTimer = undefined;
      }, duration);
    }
  }
}
