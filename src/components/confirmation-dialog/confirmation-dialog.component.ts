import { Component, Input, Output, EventEmitter, HostListener, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ConfirmationDialogComponent - Reusable yes/no confirmation modal.
 *
 * Implements UI Pattern 5: Confirmation Dialog.
 *
 * Features:
 * - Modal overlay (blocks interaction with background)
 * - Keyboard shortcuts (Y/N/Escape)
 * - Click handlers for buttons
 * - Customizable labels
 * - Emits confirmed or cancelled events
 *
 * @example
 * <app-confirmation-dialog
 *   [visible]="showDialog"
 *   [message]="'Delete character?'"
 *   (confirmed)="onConfirm()"
 *   (cancelled)="onCancel()">
 * </app-confirmation-dialog>
 */
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss']
})
export class ConfirmationDialogComponent implements AfterViewChecked {
  @Input() visible: boolean = false;
  @Input() message: string = 'Are you sure?';
  @Input() yesLabel: string = '(Y)es';
  @Input() noLabel: string = '(N)o';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('dialogOverlay') dialogOverlay?: ElementRef<HTMLDivElement>;
  private hasFocused = false;

  /**
   * Handle keyboard shortcuts (component-level to prevent memory leaks).
   * The overlay element is made focusable for keyboard event capture.
   */
  @HostListener('keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (!this.visible) return;

    const key = event.key.toLowerCase();

    if (key === 'y') {
      this.confirm();
      event.preventDefault();
    } else if (key === 'n' || key === 'escape') {
      this.cancel();
      event.preventDefault();
    }
  }

  /**
   * Emit confirmed event.
   */
  confirm(): void {
    this.confirmed.emit();
    this.hasFocused = false; // Reset for next time
  }

  /**
   * Emit cancelled event.
   */
  cancel(): void {
    this.cancelled.emit();
    this.hasFocused = false; // Reset for next time
  }

  /**
   * Auto-focus the dialog overlay when it becomes visible.
   */
  ngAfterViewChecked(): void {
    if (this.visible && this.dialogOverlay && !this.hasFocused) {
      this.dialogOverlay.nativeElement.focus();
      this.hasFocused = true;
    } else if (!this.visible) {
      this.hasFocused = false;
    }
  }
}
