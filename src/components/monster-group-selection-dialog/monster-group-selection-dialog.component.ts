import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core'
import { CommonModule } from '@angular/common'

export interface MonsterGroupOption {
  id: 'A' | 'B' | 'C' | 'D'
  displayName: string // e.g., "3 ORCS"
  enabled: boolean
}

/**
 * MonsterGroupSelectionDialogComponent - Keyboard-driven monster group picker for combat.
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
  imports: [CommonModule],
  templateUrl: './monster-group-selection-dialog.component.html',
  styleUrl: './monster-group-selection-dialog.component.scss'
})
export class MonsterGroupSelectionDialogComponent implements AfterViewChecked {
  @Input() visible: boolean = false
  @Input() groups: MonsterGroupOption[] = []
  @Input() prompt: string = 'SELECT TARGET GROUP'

  @Output() groupSelected = new EventEmitter<'A' | 'B' | 'C' | 'D'>()
  @Output() cancelled = new EventEmitter<void>()

  @ViewChild('dialogContent') dialogContent?: ElementRef<HTMLDivElement>

  private hasFocused = false

  ngAfterViewChecked(): void {
    // Auto-focus the dialog when it becomes visible
    if (this.visible && !this.hasFocused && this.dialogContent) {
      this.dialogContent.nativeElement.focus()
      this.hasFocused = true
    } else if (!this.visible && this.hasFocused) {
      this.hasFocused = false
    }
  }

  @HostListener('keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (!this.visible) return

    const key = event.key.toUpperCase()

    // Check for group shortcuts (A, B, C, D)
    if (['A', 'B', 'C', 'D'].includes(key)) {
      const group = this.groups.find(g => g.id === key && g.enabled)
      if (group) {
        this.groupSelected.emit(group.id as 'A' | 'B' | 'C' | 'D')
        event.preventDefault()
        event.stopPropagation()
      }
      // Even if group disabled/not found, prevent propagation
      event.preventDefault()
      event.stopPropagation()
      return
    }

    // ESC to cancel
    if (key === 'ESCAPE') {
      this.cancelled.emit()
      event.preventDefault()
      event.stopPropagation()
      return
    }

    // Stop all other key events from propagating when dialog is visible
    event.preventDefault()
    event.stopPropagation()
  }

  onBackdropClick(): void {
    this.cancelled.emit()
  }

  onDialogClick(event: Event): void {
    // Prevent backdrop click when clicking inside dialog
    event.stopPropagation()
  }
}
