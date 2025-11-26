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
import { SpellData } from '@services/SpellCastingService'
import { SelectionListComponent, SelectableOption } from '../selection-list/selection-list.component'

export interface SpellOption {
  spell: SpellData
  index: number  // 1-9 for keyboard shortcuts
  enabled: boolean
  spellPoints: { current: number; max: number }
}

/**
 * Extended SpellOption with SelectableOption fields for SelectionListComponent.
 */
export interface SpellSelectableOption extends SpellOption, SelectableOption {
  id: string
  shortcut: string
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
 * - Sorted by spell level then alphabetically
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
  imports: [CommonModule, SelectionListComponent],
  templateUrl: './spell-selection-dialog.component.html',
  styleUrls: ['./spell-selection-dialog.component.scss']
})
export class SpellSelectionDialogComponent implements AfterViewChecked {
  // Signal-based inputs
  readonly visible = input(false)
  readonly spells = input<SpellOption[]>([])
  readonly caster = input<Character | null>(null)
  readonly prompt = input('SELECT SPELL')

  // Outputs
  readonly spellSelected = output<SpellData>()
  readonly cancelled = output<void>()

  // View reference for focus management
  @ViewChild('dialogContent') dialogContent?: ElementRef<HTMLDivElement>

  // Track focus state
  private needsFocus = signal(false)

  /**
   * Convert SpellOption[] to SpellSelectableOption[] for SelectionListComponent.
   * Maps index to shortcut string ('1', '2', etc.).
   */
  readonly selectableSpells = computed((): SpellSelectableOption[] => {
    return this.spells().map(option => ({
      ...option,
      id: option.spell.id,
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
  onOptionSelected(option: SpellSelectableOption): void {
    this.spellSelected.emit(option.spell)
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
