import { Component, input, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ScrambledTrapState } from '@models/Trap'

/**
 * ScrambledLettersComponent
 *
 * Displays scrambled trap letters with color-coded revelation states.
 * Used in ChestOverlayComponent for trap identification puzzle.
 *
 * Letter states:
 * - green: Confirmed correct position
 * - red: Uncertain (may or may not be correct)
 * - hidden: Not yet revealed (shows underscore)
 * - excluded: Confirmed not in trap name (shows asterisk)
 */
@Component({
  selector: 'app-scrambled-letters',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scrambled-container">
      <div class="scrambled-letters">
        @for (letter of state()?.letters; track $index) {
          <span
            class="letter"
            [class.green]="letter.state === 'green'"
            [class.red]="letter.state === 'red'"
            [class.hidden]="letter.state === 'hidden'"
            [class.excluded]="letter.state === 'excluded'"
            [class.space]="letter.char === ' '"
          >
            @switch (letter.state) {
              @case ('hidden') { _ }
              @case ('excluded') { * }
              @default { {{ letter.char }} }
            }
          </span>
        }
      </div>

      <div class="inspection-info">
        <span class="inspection-count">
          Inspections: {{ state()?.inspectionCount ?? 0 }}
        </span>
        @if (state()?.fullyRevealed) {
          <span class="fully-revealed">All letters revealed!</span>
        }
      </div>
    </div>
  `,
  styleUrls: ['./scrambled-letters.component.scss']
})
export class ScrambledLettersComponent {
  /** Scrambled trap state from parent */
  readonly state = input<ScrambledTrapState | null>(null)

  /** Whether all letters are revealed */
  readonly isFullyRevealed = computed(() => this.state()?.fullyRevealed ?? false)
}
