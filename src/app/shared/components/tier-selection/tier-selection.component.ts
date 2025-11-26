import {
  Component,
  input,
  Output,
  EventEmitter,
  HostListener,
  computed,
  signal
} from '@angular/core'
import { CommonModule } from '@angular/common'

/**
 * TierOption - Represents a selectable tier/option with cost and benefit info
 */
export interface TierOption {
  id: string
  name: string
  cost: number
  costUnit?: string        // e.g., "gp/week", "gp", "tithe"
  benefit: string          // e.g., "10 HP/week", "Heal to full"
  shortcut: string         // Keyboard shortcut (single key)
  description?: string     // Optional longer description
}

/**
 * TierSelectionComponent - Reusable component for selecting from tiered options
 *
 * Features:
 * - Shows options with cost/benefit info
 * - Visual affordability indication (disabled styling when can't afford)
 * - Keyboard shortcuts for each option
 * - Arrow key navigation
 * - ESC to cancel
 *
 * Use cases:
 * - Inn room selection
 * - Temple service selection
 * - Any tiered cost/benefit selection
 *
 * @example
 * <app-tier-selection
 *   title="SELECT ROOM TYPE"
 *   [options]="roomOptions"
 *   [availableFunds]="partyGold()"
 *   fundsLabel="Party Gold"
 *   (optionSelected)="onRoomSelected($event)"
 *   (cancelled)="onCancel()"
 * />
 */
@Component({
  selector: 'app-tier-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tier-selection.component.html',
  styleUrls: ['./tier-selection.component.scss']
})
export class TierSelectionComponent {
  // Signal-based inputs for reactive updates
  readonly title = input('SELECT OPTION')
  readonly options = input<TierOption[]>([])
  readonly availableFunds = input(0)
  readonly fundsLabel = input('Gold')
  readonly showBackOption = input(true)

  @Output() optionSelected = new EventEmitter<TierOption>()
  @Output() cancelled = new EventEmitter<void>()

  readonly selectedIndex = signal(0)

  /**
   * Options with affordability computed
   */
  readonly optionsWithAffordability = computed(() => {
    return this.options().map(option => ({
      ...option,
      affordable: option.cost <= this.availableFunds()
    }))
  })

  /**
   * Get the first affordable option index, or 0 if none
   */
  private getFirstAffordableIndex(): number {
    const index = this.optionsWithAffordability().findIndex(o => o.affordable)
    return index >= 0 ? index : 0
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    const key = event.key

    // Arrow navigation
    if (key === 'ArrowUp') {
      this.moveToPrevious()
      event.preventDefault()
      return
    }

    if (key === 'ArrowDown') {
      this.moveToNext()
      event.preventDefault()
      return
    }

    // Enter to select
    if (key === 'Enter') {
      this.selectCurrent()
      event.preventDefault()
      return
    }

    // ESC to cancel
    if (key === 'Escape') {
      this.cancelled.emit()
      event.preventDefault()
      return
    }

    // Check for option shortcuts
    const upperKey = key.toUpperCase()
    const option = this.optionsWithAffordability().find(
      o => o.shortcut.toUpperCase() === upperKey
    )

    if (option) {
      if (option.affordable) {
        this.optionSelected.emit(option)
      }
      // Even if not affordable, consume the key
      event.preventDefault()
    }
  }

  private moveToPrevious(): void {
    const options = this.optionsWithAffordability()
    let newIndex = this.selectedIndex()

    do {
      newIndex = (newIndex - 1 + options.length) % options.length
    } while (!options[newIndex].affordable && newIndex !== this.selectedIndex())

    this.selectedIndex.set(newIndex)
  }

  private moveToNext(): void {
    const options = this.optionsWithAffordability()
    let newIndex = this.selectedIndex()

    do {
      newIndex = (newIndex + 1) % options.length
    } while (!options[newIndex].affordable && newIndex !== this.selectedIndex())

    this.selectedIndex.set(newIndex)
  }

  private selectCurrent(): void {
    const options = this.optionsWithAffordability()
    const option = options[this.selectedIndex()]

    if (option && option.affordable) {
      this.optionSelected.emit(option)
    }
  }

  selectOption(option: TierOption & { affordable: boolean }, index: number): void {
    if (option.affordable) {
      this.selectedIndex.set(index)
      this.optionSelected.emit(option)
    }
  }

  onBackClick(): void {
    this.cancelled.emit()
  }
}
