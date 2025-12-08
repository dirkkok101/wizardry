import {
  Component,
  input,
  output,
  HostListener
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { Character } from '@models/Character'
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes'
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component'
import { ClassChangeService } from '@services/ClassChangeService'

export type RosterAction = 'inspect' | 'changeClass' | 'delete'

export interface RosterActionEvent {
  character: Character
  action: RosterAction
}

/**
 * RosterManagementDialog - Full roster management with action buttons.
 *
 * Features:
 * - Scrollable card grid with character sprites (supports 20+ characters)
 * - Action buttons per card: [Inspect] [Class] [Delete]
 * - Class button only shown if character has available class changes
 * - ESC to close
 *
 * @example
 * <app-roster-management-dialog
 *   [visible]="showDialog"
 *   [characters]="rosterCharacters"
 *   [prompt]="'CHARACTER ROSTER'"
 *   (actionClick)="handleAction($event)"
 *   (cancelled)="closeDialog()">
 * </app-roster-management-dialog>
 */
@Component({
  selector: 'app-roster-management-dialog',
  standalone: true,
  imports: [CommonModule, CharacterPanelComponent],
  templateUrl: './roster-management-dialog.component.html',
  styleUrls: ['./roster-management-dialog.component.scss']
})
export class RosterManagementDialogComponent {
  readonly visible = input(false)
  readonly characters = input<Character[]>([])
  readonly prompt = input('CHARACTER ROSTER')

  readonly actionClick = output<RosterActionEvent>()
  readonly cancelled = output<void>()

  /** Visible action types for the CharacterPanel */
  readonly visibleActionTypes = ['inspect', 'changeClass', 'delete']

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
   * Get actions for a character.
   * Returns inspect, changeClass (if available), and delete actions.
   */
  getActionsForCharacter = (char: Character): CharacterAction[] => {
    const actions: CharacterAction[] = [
      { type: 'inspect' }
    ]
    if (this.hasAvailableClasses(char)) {
      actions.push({ type: 'changeClass' })
    }
    actions.push({ type: 'delete', variant: 'danger' })
    return actions
  }

  /**
   * Handle CharacterPanel action click events.
   */
  handleActionClick(event: CharacterActionEvent): void {
    const char = this.characters().find(c => c.id === event.characterId)
    if (char) {
      this.actionClick.emit({
        character: char,
        action: event.actionType as RosterAction
      })
    }
  }

  /**
   * Check if character has available class changes.
   * Returns false if ClassDataLoader is not initialized (e.g., in tests).
   */
  private hasAvailableClasses(char: Character): boolean {
    try {
      const available = ClassChangeService.getAvailableClasses(char)
      return available.length > 0
    } catch {
      // ClassDataLoader not initialized - return false in tests
      return false
    }
  }
}
