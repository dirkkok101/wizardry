import {
  Component,
  input,
  output,
  computed,
  HostListener
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { Character } from '@models/Character'
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes'
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component'

export interface CharacterOption {
  character: Character
  index: number  // Index for ordering (1-based)
  enabled: boolean
}

/**
 * Extended CharacterOption with id for tracking.
 */
export interface CharacterSelectableOption extends CharacterOption {
  id: string
  shortcut: string
}

/**
 * CharacterSelectionDialogComponent - Card-based character picker with sprites.
 *
 * Uses CharacterPanelComponent for consistent card rendering across the app.
 *
 * Features:
 * - Scrollable card grid (supports 20+ characters)
 * - Consistent 72×72 character sprites
 * - Full card info (name, class+level, alignment, HP, spell points)
 * - [Select] button for enabled characters
 * - ESC to cancel, backdrop click to cancel
 *
 * @example
 * <app-character-selection-dialog
 *   [visible]="showDialog"
 *   [characters]="characterOptions"
 *   [prompt]="'SELECT CHARACTER TO ADD'"
 *   (characterSelected)="onCharacterSelected($event)"
 *   (cancelled)="onCancel()">
 * </app-character-selection-dialog>
 */
@Component({
  selector: 'app-character-selection-dialog',
  standalone: true,
  imports: [CommonModule, CharacterPanelComponent],
  templateUrl: './character-selection-dialog.component.html',
  styleUrls: ['./character-selection-dialog.component.scss']
})
export class CharacterSelectionDialogComponent {
  // Signal-based inputs
  readonly visible = input(false)
  readonly characters = input<CharacterOption[]>([])
  readonly prompt = input('SELECT TARGET')

  // Outputs
  readonly characterSelected = output<Character>()
  readonly cancelled = output<void>()

  /** Visible action types for the CharacterPanel */
  readonly visibleActionTypes = ['select']

  /**
   * Extract enabled characters for CharacterPanel display.
   */
  readonly enabledCharacters = computed((): Character[] => {
    return this.characters()
      .filter(option => option.enabled)
      .map(option => option.character)
  })

  /**
   * Handle keyboard events for ESC cancel.
   */
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.visible()) return

    if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelled.emit()
    }
  }

  /**
   * Handle backdrop click to cancel.
   */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancelled.emit()
    }
  }

  /**
   * Get actions for a character (just Select).
   */
  getActionsForCharacter = (_char: Character): CharacterAction[] => {
    return [{ type: 'select' }]
  }

  /**
   * Handle CharacterPanel action click events.
   */
  handleActionClick(event: CharacterActionEvent): void {
    if (event.actionType === 'select') {
      const char = this.enabledCharacters().find(c => c.id === event.characterId)
      if (char) {
        this.characterSelected.emit(char)
      }
    }
  }
}
