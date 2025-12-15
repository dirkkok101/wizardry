/**
 * MazeKeyboardDirective - Keyboard input handling for maze scene
 *
 * Captures keyboard events and emits action signals.
 * Parent component handles the actual logic based on current state.
 *
 * Key bindings:
 * - Arrow keys / WASD: Movement
 * - Enter: Confirm / Dismiss
 * - Escape: Cancel / Close dialogs
 * - Number keys 1-4: Quick actions (elevator levels, targeting)
 * - Ctrl+E: Toggle encounters (debug)
 */

import { Directive, HostListener, output, input, computed } from '@angular/core'

export type MazeKeyAction =
  | 'move-forward'
  | 'move-backward'
  | 'turn-left'
  | 'turn-right'
  | 'confirm'
  | 'cancel'
  | 'select-1'
  | 'select-2'
  | 'select-3'
  | 'select-4'
  | 'toggle-encounters'

export interface MazeKeyEvent {
  action: MazeKeyAction
  originalEvent: KeyboardEvent
}

@Directive({
  selector: '[appMazeKeyboard]',
  standalone: true
})
export class MazeKeyboardDirective {
  // Input: whether movement is currently locked
  movementLocked = input<boolean>(false)

  // Input: whether any dialog is open
  dialogOpen = input<boolean>(false)

  // Output: emitted when a recognized key is pressed
  keyAction = output<MazeKeyEvent>()

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const action = this.mapKeyToAction(event)
    if (action) {
      this.keyAction.emit({ action, originalEvent: event })
    }
  }

  private mapKeyToAction(event: KeyboardEvent): MazeKeyAction | null {
    const key = event.key.toLowerCase()

    // Movement keys (only if not locked)
    if (!this.movementLocked()) {
      switch (key) {
        case 'arrowup':
        case 'w':
          return 'move-forward'
        case 'arrowdown':
        case 's':
          return 'move-backward'
        case 'arrowleft':
        case 'a':
          return 'turn-left'
        case 'arrowright':
        case 'd':
          return 'turn-right'
      }
    }

    // Dialog/confirm keys
    switch (key) {
      case 'enter':
        return 'confirm'
      case 'escape':
        return 'cancel'
    }

    // Number keys for quick selection
    if (!this.dialogOpen()) {
      switch (key) {
        case '1':
          return 'select-1'
        case '2':
          return 'select-2'
        case '3':
          return 'select-3'
        case '4':
          return 'select-4'
      }
    }

    // Debug keys
    if (event.ctrlKey && key === 'e') {
      return 'toggle-encounters'
    }

    return null
  }
}
