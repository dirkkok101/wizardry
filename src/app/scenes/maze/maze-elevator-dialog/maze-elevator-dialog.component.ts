/**
 * MazeElevatorDialogComponent - Elevator level selection dialog
 *
 * Displays when party steps on an elevator tile.
 * Allows selecting destination level or cancelling.
 */

import { Component, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'

export interface ElevatorDestination {
  level?: number
  label?: string
}

@Component({
  selector: 'app-maze-elevator-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="elevator-dialog-overlay">
        <div class="elevator-dialog">
          <h2>ELEVATOR</h2>
          <p>Select destination level:</p>
          <div class="elevator-buttons">
            @for (dest of destinations(); track dest.level) {
              <button
                (click)="selectLevel(dest.level!)"
                class="elevator-button"
              >
                Level {{ dest.level }}
              </button>
            }
          </div>
          <button (click)="cancel()" class="elevator-cancel">
            Cancel (ESC)
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .elevator-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .elevator-dialog {
      background: var(--color-bg-card, #1a1a1a);
      border: 2px solid var(--color-gold-primary, #d4a574);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      min-width: 300px;
    }

    .elevator-dialog h2 {
      font-family: var(--font-display, 'Cinzel', serif);
      color: var(--color-gold-primary, #d4a574);
      margin: 0 0 16px 0;
    }

    .elevator-dialog p {
      color: var(--color-text-secondary, #a0a0a0);
      margin: 0 0 16px 0;
    }

    .elevator-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }

    .elevator-button {
      background: var(--color-bg-darkest, #0a0a0a);
      border: 1px solid var(--color-gold-primary, #d4a574);
      color: var(--color-text-gold, #d4a574);
      padding: 12px 24px;
      font-family: var(--font-body, monospace);
      cursor: pointer;
      transition: all 0.2s;
    }

    .elevator-button:hover {
      background: var(--color-gold-primary, #d4a574);
      color: var(--color-bg-darkest, #0a0a0a);
    }

    .elevator-cancel {
      background: transparent;
      border: 1px solid var(--color-text-secondary, #a0a0a0);
      color: var(--color-text-secondary, #a0a0a0);
      padding: 8px 16px;
      font-family: var(--font-body, monospace);
      cursor: pointer;
    }

    .elevator-cancel:hover {
      border-color: var(--color-text-primary, #e0e0e0);
      color: var(--color-text-primary, #e0e0e0);
    }
  `]
})
export class MazeElevatorDialogComponent {
  // Inputs
  visible = input.required<boolean>()
  destinations = input.required<ElevatorDestination[]>()

  // Outputs
  levelSelected = output<number>()
  cancelled = output<void>()

  selectLevel(level: number): void {
    this.levelSelected.emit(level)
  }

  cancel(): void {
    this.cancelled.emit()
  }
}
