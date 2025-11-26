import { Component, input, output, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SelectionListComponent, SelectableOption } from '../selection-list/selection-list.component'

/**
 * TierOption - Represents a selectable tier/option with cost and benefit info
 */
export interface TierOption {
  id: string
  name: string
  cost: number
  costUnit?: string // e.g., "gp/week", "gp", "tithe"
  benefit: string // e.g., "10 HP/week", "Heal to full"
  shortcut: string // Keyboard shortcut (single key)
  description?: string // Optional longer description
}

/**
 * Extended TierOption with affordability and SelectableOption compatibility
 */
export interface TierOptionWithAffordability extends TierOption, SelectableOption {
  affordable: boolean
  enabled: boolean // Alias for affordable, required by SelectableOption
}

/**
 * TierSelectionComponent - Reusable component for selecting from tiered options
 *
 * Now uses SelectionListComponent for consistent keyboard/mouse handling.
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
  imports: [CommonModule, SelectionListComponent],
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

  // Outputs using new output() API
  readonly optionSelected = output<TierOption>()
  readonly cancelled = output<void>()

  /**
   * Options with affordability computed, compatible with SelectableOption
   */
  readonly optionsWithAffordability = computed((): TierOptionWithAffordability[] => {
    return this.options().map(option => {
      const affordable = option.cost <= this.availableFunds()
      return {
        ...option,
        affordable,
        enabled: affordable // SelectableOption compatibility
      }
    })
  })

  /**
   * Handle option selection from SelectionListComponent
   */
  onOptionSelected(option: TierOptionWithAffordability): void {
    // Emit the original TierOption shape (without enabled field)
    const tierOption: TierOption = {
      id: option.id,
      name: option.name,
      cost: option.cost,
      costUnit: option.costUnit,
      benefit: option.benefit,
      shortcut: option.shortcut,
      description: option.description
    }
    this.optionSelected.emit(tierOption)
  }

  /**
   * Handle cancellation
   */
  onCancelled(): void {
    this.cancelled.emit()
  }

  /**
   * Handle back button click
   */
  onBackClick(): void {
    this.cancelled.emit()
  }
}
