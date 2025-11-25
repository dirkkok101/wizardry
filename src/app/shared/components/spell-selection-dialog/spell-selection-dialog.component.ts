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
import { Character } from '../../../../types/Character'
import { SpellData } from '../../../../services/SpellCastingService'

export interface SpellOption {
  spell: SpellData
  index: number  // 1-9 for keyboard shortcuts
  enabled: boolean
  spellPoints: { current: number; max: number }
}

/**
 * SpellSelectionDialogComponent - Keyboard-driven spell picker for dungeon spell casting.
 *
 * Features:
 * - 1-9 keyboard shortcuts for spell selection
 * - ESC to cancel
 * - Auto-focus on open
 * - Backdrop click to cancel
 * - Shows spell name, level, SP cost, and effect description
 * - Grouped by spell level
 *
 * @example
 * <app-spell-selection-dialog
 *   [visible]="showDialog"
 *   [spells]="spellOptions"
 *   [caster]="selectedCaster"
 *   [prompt]="'SELECT SPELL'"
 *   (spellSelected)="onSpellSelected($event)"
 *   (cancelled)="onCancel()">
 * </app-spell-selection-dialog>
 */
@Component({
  selector: 'app-spell-selection-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spell-selection-dialog.component.html',
  styleUrls: ['./spell-selection-dialog.component.scss']
})
export class SpellSelectionDialogComponent implements AfterViewChecked {
  @Input() visible: boolean = false
  @Input() spells: SpellOption[] = []
  @Input() caster: Character | null = null
  @Input() prompt: string = 'SELECT SPELL'

  @Output() spellSelected = new EventEmitter<SpellData>()
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

    // Check for number shortcuts (1-9)
    if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
      const index = parseInt(key, 10)
      const option = this.spells.find(s => s.index === index && s.enabled)
      if (option) {
        this.spellSelected.emit(option.spell)
        event.preventDefault()
        event.stopPropagation()
      }
      // Even if spell disabled/not found, prevent propagation
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

  onSpellClick(option: SpellOption): void {
    if (option.enabled) {
      this.spellSelected.emit(option.spell)
    }
  }

  /**
   * Get spell effect description for display
   */
  getSpellEffect(spell: SpellData): string {
    if (spell.healing?.dice) {
      return `Heal ${spell.healing.dice}`
    }
    if (spell.damage?.dice) {
      return `${spell.damage.dice} ${spell.damage.type}`
    }
    if (spell.statusCure) {
      return `Cure ${spell.statusCure}`
    }
    if (spell.utility) {
      return this.getUtilityDescription(spell.utility)
    }
    if (spell.resurrection) {
      const rate = spell.resurrectionSuccessRate
        ? `${Math.round(spell.resurrectionSuccessRate * 100)}%`
        : 'varies'
      return `Resurrect (${rate})`
    }
    if (spell.acModifier) {
      return `AC ${spell.acModifier}`
    }
    return spell.description
  }

  /**
   * Get human-readable utility description
   */
  private getUtilityDescription(utility: string): string {
    const descriptions: Record<string, string> = {
      'show_coordinates': 'Show position',
      'extended_light': 'Light',
      'teleport': 'Teleport',
      'recall': 'Return to town',
      'identify_trap': 'Identify trap',
      'locate_person': 'Locate body'
    }
    return descriptions[utility] || utility
  }

  /**
   * Get target type description
   */
  getTargetDescription(spell: SpellData): string {
    const targets: Record<string, string> = {
      'single': 'Single',
      'party': 'Party',
      'self': 'Self',
      'all_allies': 'All allies',
      'dead_body': 'Dead',
      'ashes': 'Ashes'
    }
    return targets[spell.target] || spell.target
  }

  /**
   * Get caster type badge (M for Mage, P for Priest)
   */
  getCasterTypeBadge(spell: SpellData): string {
    return spell.casterType === 'mage' ? 'M' : 'P'
  }
}
