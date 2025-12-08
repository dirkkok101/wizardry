import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MenuItem {
  id: string;
  label: string;
  enabled: boolean;
  shortcut?: string; // Keyboard shortcut (e.g., "1", "E", "Q")
}

/**
 * MenuComponent - Reusable menu with keyboard navigation.
 *
 * Implements UI Pattern 1: Menu Selection.
 *
 * Features:
 * - Arrow key navigation
 * - Explicit keyboard shortcuts (defined in MenuItem.shortcut)
 * - Enter to select
 * - Disabled items support
 * - Modal-aware: Ignores keyboard input when a modal dialog is active
 *
 * @example
 * <app-menu
 *   title="Castle Menu"
 *   [items]="menuItems"
 *   (select)="onMenuSelect($event)">
 * </app-menu>
 */
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit, OnChanges {
  @Input() title: string = '';
  @Input() items: MenuItem[] = [];
  @Output() select = new EventEmitter<string>();

  selectedIndex: number = 0;

  ngOnInit() {
    this.updateSelectedIndex();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items']) {
      this.updateSelectedIndex();
    }
  }

  /**
   * Update selected index to point to the most appropriate menu item.
   * Prioritizes items with ENTER shortcut, then falls back to first enabled item.
   * This ensures Enter key triggers the primary action (e.g., "Continue") rather
   * than secondary actions (e.g., "Cancel").
   */
  private updateSelectedIndex() {
    // First try to select item with ENTER shortcut
    const enterItemIndex = this.items.findIndex(
      item => item.shortcut?.toUpperCase() === 'ENTER' && item.enabled
    );

    if (enterItemIndex !== -1) {
      this.selectedIndex = enterItemIndex;
    } else {
      // Fallback: select first enabled item
      this.selectedIndex = this.items.findIndex(item => item.enabled);
      if (this.selectedIndex === -1) {
        this.selectedIndex = 0;
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    // Don't handle keys if a modal dialog is active (defense-in-depth)
    if (this.isModalActive()) {
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        this.moveToPreviousItem();
        event.preventDefault();
        break;

      case 'ArrowDown':
        this.moveToNextItem();
        event.preventDefault();
        break;

      case 'Enter':
        this.selectCurrentItem();
        event.preventDefault();
        break;

      default:
        // Check for explicit shortcuts only (no automatic number mapping)
        const item = this.items.find(item =>
          item.shortcut?.toUpperCase() === event.key.toUpperCase()
        );
        if (item && item.enabled) {
          this.select.emit(item.id);
          event.preventDefault();
        }
        break;
    }
  }

  private moveToNextItem() {
    let nextIndex = this.selectedIndex;

    do {
      nextIndex = (nextIndex + 1) % this.items.length;
    } while (!this.items[nextIndex].enabled && nextIndex !== this.selectedIndex);

    this.selectedIndex = nextIndex;
  }

  private moveToPreviousItem() {
    let prevIndex = this.selectedIndex;

    do {
      prevIndex = (prevIndex - 1 + this.items.length) % this.items.length;
    } while (!this.items[prevIndex].enabled && prevIndex !== this.selectedIndex);

    this.selectedIndex = prevIndex;
  }

  private selectCurrentItem() {
    const item = this.items[this.selectedIndex];
    if (item && item.enabled) {
      this.select.emit(item.id);
    }
  }

  selectItemByIndex(index: number) {
    if (index >= 0 && index < this.items.length) {
      const item = this.items[index];
      if (item.enabled) {
        this.selectedIndex = index;
        this.select.emit(item.id);
      }
    }
  }

  /**
   * Check if a modal dialog is currently active.
   * This provides defense-in-depth against modal dialogs that don't
   * properly stop event propagation.
   *
   * Checks for multiple modal types:
   * - .dialog-overlay: ConfirmationDialogComponent
   * - .modal-backdrop: NameModalComponent and other modals
   * - .name-modal: NameModalComponent
   *
   * @returns true if any modal overlay is present in the DOM
   */
  private isModalActive(): boolean {
    // Check for various modal overlay selectors
    const modalSelectors = [
      '.dialog-overlay',   // ConfirmationDialogComponent
      '.modal-backdrop',   // NameModalComponent
      '.name-modal',       // NameModalComponent inner
      '.chest-overlay'     // ChestOverlayComponent (has its own keyboard handler)
    ];

    return modalSelectors.some(selector =>
      document.querySelector(selector) !== null
    );
  }
}
