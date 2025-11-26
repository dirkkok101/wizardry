import { Component, input, output, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SelectionDialogComponent } from '../selection-dialog/selection-dialog.component'
import { SelectableOption } from '../selection-list/selection-list.component'

export interface MonsterGroupOption {
  id: 'A' | 'B' | 'C' | 'D'
  displayName: string // e.g., "3 ORCS"
  enabled: boolean
}

/**
 * Extended MonsterGroupOption with SelectableOption compatibility
 */
interface MonsterGroupSelectableOption extends MonsterGroupOption, SelectableOption {
  shortcut: string
}

/**
 * MonsterGroupSelectionDialogComponent - Keyboard-driven monster group picker for combat.
 *
 * Now uses SelectionDialogComponent for consistent keyboard/mouse handling.
 *
 * Features:
 * - A/B/C/D keyboard shortcuts for group selection
 * - ESC to cancel
 * - Auto-focus on open
 * - Backdrop click to cancel
 * - Filters out defeated groups
 * - Color-coded borders matching combat display
 *
 * @example
 * <app-monster-group-selection-dialog
 *   [visible]="showDialog"
 *   [groups]="groupOptions"
 *   [prompt]="'SELECT TARGET GROUP'"
 *   (groupSelected)="onGroupSelected($event)"
 *   (cancelled)="onCancel()">
 * </app-monster-group-selection-dialog>
 */
@Component({
  selector: 'app-monster-group-selection-dialog',
  standalone: true,
  imports: [CommonModule, SelectionDialogComponent],
  templateUrl: './monster-group-selection-dialog.component.html',
  styleUrl: './monster-group-selection-dialog.component.scss'
})
export class MonsterGroupSelectionDialogComponent {
  // Signal-based inputs
  readonly visible = input(false)
  readonly groups = input<MonsterGroupOption[]>([])
  readonly prompt = input('SELECT TARGET GROUP')

  // Outputs
  readonly groupSelected = output<'A' | 'B' | 'C' | 'D'>()
  readonly cancelled = output<void>()

  /**
   * Convert MonsterGroupOption to SelectableOption for SelectionDialogComponent
   */
  readonly selectableGroups = computed((): MonsterGroupSelectableOption[] => {
    return this.groups().map(group => ({
      ...group,
      shortcut: group.id // Use group ID as shortcut (A, B, C, D)
    }))
  })

  /**
   * Handle option selection from SelectionDialogComponent
   */
  onOptionSelected(option: MonsterGroupSelectableOption): void {
    this.groupSelected.emit(option.id)
  }

  /**
   * Handle cancellation
   */
  onCancelled(): void {
    this.cancelled.emit()
  }
}
