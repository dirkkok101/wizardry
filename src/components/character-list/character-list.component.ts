import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';

/**
 * CharacterListComponent - Reusable character roster display and selection.
 *
 * Implements UI Pattern 2: Character Selection.
 *
 * Features:
 * - Display mode: Shows character list with stats
 * - Selection mode: Allows character picking with keyboard/mouse
 * - Filtering: Custom filter function for conditional display
 * - Empty state: Shows message when no characters available
 *
 * Keyboard Navigation:
 * - Arrow Up/Down: Move selection between characters
 * - Enter: Select current character
 * - Note: Component must be focused for keyboard navigation to work
 *   (component is automatically focusable when selectable=true via tabindex)
 *
 * @example
 * // Basic usage - component auto-focuses on user interaction
 * <app-character-list
 *   [characters]="roster"
 *   [selectable]="true"
 *   [selectedId]="currentCharId"
 *   (characterSelected)="onSelectChar($event)">
 * </app-character-list>
 *
 * @example
 * // Programmatic focus (if needed)
 * <app-character-list
 *   #charList
 *   [characters]="roster"
 *   [selectable]="true"
 *   (characterSelected)="onSelectChar($event)">
 * </app-character-list>
 * // In component:
 * @ViewChild('charList', { read: ElementRef }) charList!: ElementRef;
 * ngAfterViewInit() {
 *   this.charList.nativeElement.focus();
 * }
 */
@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-list.component.html',
  styleUrls: ['./character-list.component.scss']
})
export class CharacterListComponent {
  @Input() characters: Character[] = [];
  @Input() selectable: boolean = false;
  @Input() selectedId: string | null = null;
  @Input() filterFn: ((char: Character) => boolean) | null = null;
  @Input() emptyMessage: string = 'No characters available';

  @Output() characterSelected = new EventEmitter<string>();

  selectedIndex: number = 0;

  /**
   * Get filtered characters list.
   */
  get filteredCharacters(): Character[] {
    if (this.filterFn) {
      return this.characters.filter(this.filterFn);
    }
    return this.characters;
  }

  /**
   * Handle character selection (click).
   */
  selectCharacter(charId: string): void {
    if (!this.selectable) return;
    this.characterSelected.emit(charId);
  }

  /**
   * Check if character is selected.
   */
  isSelected(charId: string): boolean {
    return this.selectedId === charId;
  }

  /**
   * Handle keyboard navigation (component-level to prevent memory leaks).
   * Note: Component must be focused for keyboard navigation to work.
   */
  @HostListener('keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    if (!this.selectable || this.filteredCharacters.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredCharacters.length;
        event.preventDefault();
        break;

      case 'ArrowUp':
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredCharacters.length) % this.filteredCharacters.length;
        event.preventDefault();
        break;

      case 'Enter':
        const selectedChar = this.filteredCharacters[this.selectedIndex];
        if (selectedChar) {
          this.characterSelected.emit(selectedChar.id);
        }
        event.preventDefault();
        break;
    }
  }

  /**
   * Format HP display.
   */
  formatHP(char: Character): string {
    return `${char.hp}/${char.maxHp}`;
  }
}
