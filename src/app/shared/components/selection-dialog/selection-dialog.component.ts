import {
  Component,
  input,
  output,
  signal,
  effect,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  TemplateRef,
  ContentChild
} from '@angular/core'
import { CommonModule } from '@angular/common'
import {
  SelectionListComponent,
  SelectableOption,
  SelectionItemContext
} from '../selection-list/selection-list.component'

/**
 * SelectionDialogComponent
 *
 * A modal dialog wrapper around SelectionListComponent.
 * Provides overlay, backdrop, focus management, and dialog styling.
 *
 * Features:
 * - Full-screen backdrop with click-to-cancel
 * - Auto-focus when dialog becomes visible
 * - Consistent z-index (950) for layering
 * - Header with title
 * - Footer with keyboard hints
 * - Scrollable content area for long lists
 *
 * Usage:
 * ```html
 * <app-selection-dialog
 *   [visible]="showDialog()"
 *   [options]="monsterGroups"
 *   title="SELECT TARGET"
 *   keyboardHint="Press A-D to select, ESC to cancel"
 *   (optionSelected)="onGroupSelected($event)"
 *   (cancelled)="onCancel()">
 *   <ng-template #itemTemplate let-group let-selected="selected">
 *     <span [class.selected]="selected">{{ group.displayName }}</span>
 *   </ng-template>
 * </app-selection-dialog>
 * ```
 */
@Component({
  selector: 'app-selection-dialog',
  standalone: true,
  imports: [CommonModule, SelectionListComponent],
  templateUrl: './selection-dialog.component.html',
  styleUrls: ['./selection-dialog.component.scss']
})
export class SelectionDialogComponent<T extends SelectableOption> implements AfterViewChecked {
  // Inputs
  readonly visible = input(false)
  readonly options = input<T[]>([])
  readonly title = input('SELECT OPTION')
  readonly keyboardHint = input('Press shortcut key to select, ESC to cancel')
  readonly allowArrowNavigation = input(false) // Dialogs typically use direct keys
  readonly showShortcuts = input(true)
  readonly maxHeight = input('400px')

  // Outputs
  readonly optionSelected = output<T>()
  readonly cancelled = output<void>()

  // Content projection - capture external template to pass to SelectionListComponent
  // Named differently to avoid conflict with inner template reference
  @ContentChild('itemTemplate') externalItemTemplate!: TemplateRef<SelectionItemContext<T>>

  // For focus management
  @ViewChild('dialogContent') dialogContent!: ElementRef<HTMLDivElement>

  // Track if we need to focus
  private needsFocus = signal(false)

  constructor() {
    // Watch visibility changes to trigger focus
    effect(() => {
      if (this.visible()) {
        this.needsFocus.set(true)
      }
    })
  }

  ngAfterViewChecked(): void {
    // Focus the dialog content when it becomes visible
    if (this.needsFocus() && this.dialogContent?.nativeElement) {
      this.dialogContent.nativeElement.focus()
      this.needsFocus.set(false)
    }
  }

  /**
   * Handle backdrop click to cancel.
   */
  onBackdropClick(event: MouseEvent): void {
    // Only cancel if clicking the backdrop itself, not the dialog content
    if (event.target === event.currentTarget) {
      this.cancelled.emit()
    }
  }

  /**
   * Pass through option selection.
   */
  onOptionSelected(option: T): void {
    this.optionSelected.emit(option)
  }

  /**
   * Pass through cancellation.
   */
  onCancelled(): void {
    this.cancelled.emit()
  }

  /**
   * Prevent clicks inside dialog from propagating to backdrop.
   */
  onDialogClick(event: MouseEvent): void {
    event.stopPropagation()
  }
}
