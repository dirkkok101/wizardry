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
import { Character } from '@types/Character'
import { CharacterStatus } from '@types/CharacterStatus'

export interface CharacterOption {
  character: Character
  index: number  // 1-6 for keyboard shortcuts
  enabled: boolean
}

/**
 * CharacterSelectionDialogComponent - Keyboard-driven character picker for spell targeting.
 *
 * Features:
 * - 1-6 keyboard shortcuts for character selection
 * - ESC to cancel
 * - Auto-focus on open
 * - Backdrop click to cancel
 * - Shows character name, class, level, HP, and status
 *
 * @example
 * <app-character-selection-dialog
 *   [visible]="showDialog"
 *   [characters]="characterOptions"
 *   [prompt]="'SELECT TARGET'"
 *   (characterSelected)="onCharacterSelected($event)"
 *   (cancelled)="onCancel()">
 * </app-character-selection-dialog>
 */
@Component({
  selector: 'app-character-selection-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-selection-dialog.component.html',
  styleUrls: ['./character-selection-dialog.component.scss']
})
export class CharacterSelectionDialogComponent implements AfterViewChecked {
  @Input() visible: boolean = false
  @Input() characters: CharacterOption[] = []
  @Input() prompt: string = 'SELECT TARGET'

  @Output() characterSelected = new EventEmitter<Character>()
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

    const key = event.key

    // Check for number shortcuts (1-6)
    if (['1', '2', '3', '4', '5', '6'].includes(key)) {
      const index = parseInt(key, 10)
      const option = this.characters.find(c => c.index === index && c.enabled)
      if (option) {
        this.characterSelected.emit(option.character)
        event.preventDefault()
        event.stopPropagation()
      }
      // Even if character disabled/not found, prevent propagation
      event.preventDefault()
      event.stopPropagation()
      return
    }

    // ESC to cancel
    if (key === 'Escape') {
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

  onCharacterClick(option: CharacterOption): void {
    if (option.enabled) {
      this.characterSelected.emit(option.character)
    }
  }

  getHpPercent(char: Character): number {
    if (char.maxHp <= 0) return 0
    return Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100))
  }

  /**
   * Check if the character has a status that should be displayed
   * (i.e., not OK or INJURED which are normal states)
   */
  shouldShowStatus(char: Character): boolean {
    return char.status !== CharacterStatus.OK && char.status !== CharacterStatus.INJURED
  }
}
