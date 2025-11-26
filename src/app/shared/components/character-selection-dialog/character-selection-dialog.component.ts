import {
  Component,
  input,
  output,
  computed,
  signal,
  effect,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { SelectionListComponent, SelectableOption } from '../selection-list/selection-list.component'

export interface CharacterOption {
  character: Character
  index: number  // 1-6 for keyboard shortcuts
  enabled: boolean
}

/**
 * Extended CharacterOption with SelectableOption fields for SelectionListComponent.
 */
export interface CharacterSelectableOption extends CharacterOption, SelectableOption {
  id: string
  shortcut: string
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
  imports: [CommonModule, SelectionListComponent],
  templateUrl: './character-selection-dialog.component.html',
  styleUrls: ['./character-selection-dialog.component.scss']
})
export class CharacterSelectionDialogComponent implements AfterViewChecked {
  // Signal-based inputs
  readonly visible = input(false)
  readonly characters = input<CharacterOption[]>([])
  readonly prompt = input('SELECT TARGET')

  // Outputs
  readonly characterSelected = output<Character>()
  readonly cancelled = output<void>()

  // View reference for focus management
  @ViewChild('dialogContent') dialogContent?: ElementRef<HTMLDivElement>

  // Track focus state
  private needsFocus = signal(false)

  /**
   * Convert CharacterOption[] to CharacterSelectableOption[] for SelectionListComponent.
   * Maps index to shortcut string ('1', '2', etc.).
   */
  readonly selectableCharacters = computed((): CharacterSelectableOption[] => {
    return this.characters().map(option => ({
      ...option,
      id: option.character.id,
      shortcut: option.index.toString()
    }))
  })

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
   * Handle option selection from SelectionListComponent.
   */
  onOptionSelected(option: CharacterSelectableOption): void {
    this.characterSelected.emit(option.character)
  }

  /**
   * Handle cancellation from SelectionListComponent.
   */
  onCancelled(): void {
    this.cancelled.emit()
  }

  /**
   * Handle backdrop click to cancel.
   */
  onBackdropClick(event: MouseEvent): void {
    // Only cancel if clicking the backdrop itself
    if (event.target === event.currentTarget) {
      this.cancelled.emit()
    }
  }

  /**
   * Prevent clicks inside dialog from propagating to backdrop.
   */
  onDialogClick(event: MouseEvent): void {
    event.stopPropagation()
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
