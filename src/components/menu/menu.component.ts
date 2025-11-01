import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
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
 * - Number key shortcuts (1-9)
 * - Letter key shortcuts
 * - Enter to select
 * - Disabled items support
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
export class MenuComponent implements OnInit {
  @Input() title: string = '';
  @Input() items: MenuItem[] = [];
  @Output() select = new EventEmitter<string>();

  selectedIndex: number = 0;

  ngOnInit() {
    // Select first enabled item
    this.selectedIndex = this.items.findIndex(item => item.enabled);
    if (this.selectedIndex === -1) {
      this.selectedIndex = 0;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
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
        // Check for number shortcuts (1-9)
        const num = parseInt(event.key);
        if (num >= 1 && num <= 9) {
          this.selectItemByIndex(num - 1);
          event.preventDefault();
        }

        // Check for letter shortcuts
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

  private selectItemByIndex(index: number) {
    if (index >= 0 && index < this.items.length) {
      const item = this.items[index];
      if (item.enabled) {
        this.selectedIndex = index;
        this.select.emit(item.id);
      }
    }
  }
}
