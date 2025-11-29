import {
  Component,
  input,
  output,
  computed,
  HostListener
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { CharacterClass } from '@models/CharacterClass'

export interface CharacterOption {
  character: Character
  index: number  // 1-6 for keyboard shortcuts
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
 * CharacterSelectionDialogComponent - Card-based character picker for spell targeting.
 *
 * Features:
 * - Card grid layout (1-2 columns based on character count)
 * - Inline [Select] button for each enabled character
 * - 1-6 keyboard shortcuts for character selection
 * - ESC to cancel
 * - Backdrop click to cancel
 * - Shows character name, class, level, HP, status badge
 * - Design system styling (Cinzel/JetBrains Mono fonts, gold theme)
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
export class CharacterSelectionDialogComponent {
  // Signal-based inputs
  readonly visible = input(false)
  readonly characters = input<CharacterOption[]>([])
  readonly prompt = input('SELECT TARGET')

  // Outputs
  readonly characterSelected = output<Character>()
  readonly cancelled = output<void>()

  /**
   * Convert CharacterOption[] to CharacterSelectableOption[] with id for tracking.
   */
  readonly selectableCharacters = computed((): CharacterSelectableOption[] => {
    return this.characters().map(option => ({
      ...option,
      id: option.character.id,
      shortcut: option.index.toString()
    }))
  })

  /**
   * Handle keyboard events for 1-6 selection and ESC cancel.
   */
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.visible()) return

    if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelled.emit()
      return
    }

    // Handle 1-6 keys for selection
    const num = parseInt(event.key, 10)
    if (num >= 1 && num <= 6) {
      const option = this.selectableCharacters().find(o => o.index === num)
      if (option?.enabled) {
        event.preventDefault()
        this.characterSelected.emit(option.character)
      }
    }
  }

  /**
   * Handle character card or button click.
   */
  onCharacterClick(option: CharacterSelectableOption): void {
    if (option.enabled) {
      this.characterSelected.emit(option.character)
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
   * Get 3-character class abbreviation.
   */
  getClassAbbr(char: Character): string {
    const abbrevs: Record<string, string> = {
      [CharacterClass.FIGHTER]: 'FIG',
      [CharacterClass.MAGE]: 'MAG',
      [CharacterClass.PRIEST]: 'PRI',
      [CharacterClass.THIEF]: 'THI',
      [CharacterClass.BISHOP]: 'BIS',
      [CharacterClass.SAMURAI]: 'SAM',
      [CharacterClass.LORD]: 'LOR',
      [CharacterClass.NINJA]: 'NIN'
    }
    return abbrevs[char.class] || char.class.slice(0, 3).toUpperCase()
  }

  /**
   * Get HP percentage for bar display.
   */
  getHpPercent(char: Character): number {
    if (char.maxHp <= 0) return 0
    return Math.max(0, Math.min(100, Math.round((char.hp / char.maxHp) * 100)))
  }

  /**
   * Check if HP is critical (<25%).
   */
  isCritical(char: Character): boolean {
    return this.getHpPercent(char) < 25
  }

  /**
   * Check if character is dead or ashes.
   */
  isDead(char: Character): boolean {
    return char.status === CharacterStatus.DEAD || char.status === CharacterStatus.ASHES
  }

  /**
   * Get status badge text if not OK or INJURED.
   */
  getStatusBadge(char: Character): string | null {
    if (char.status === CharacterStatus.OK || char.status === CharacterStatus.INJURED) {
      return null
    }
    return char.status
  }
}
