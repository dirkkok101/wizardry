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
import { LoadedSpell } from '@types/SpellDefinition'
import { SpellDataLoader } from '@services/SpellDataLoader'

export interface SpellBookEntry {
  spell: LoadedSpell
  level: number
  casterType: 'mage' | 'priest'
}

/**
 * SpellBookDialogComponent - Displays character's known spells
 *
 * Features:
 * - Groups spells by caster type (Mage/Priest) and level
 * - Shows spell name and description
 * - Closes on ESC, Enter, Space, or backdrop click
 * - Auto-focuses when opened
 *
 * @example
 * <app-spell-book-dialog
 *   [visible]="showDialog"
 *   [character]="selectedCharacter"
 *   (closed)="onDialogClosed()">
 * </app-spell-book-dialog>
 */
@Component({
  selector: 'app-spell-book-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spell-book-dialog.component.html',
  styleUrls: ['./spell-book-dialog.component.scss']
})
export class SpellBookDialogComponent implements AfterViewChecked {
  @Input() visible: boolean = false
  @Input() character: Character | null = null

  @Output() closed = new EventEmitter<void>()

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

    // Close on ESC, Enter, or Space
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      this.closed.emit()
      event.preventDefault()
      event.stopPropagation()
    }
  }

  onBackdropClick(): void {
    this.closed.emit()
  }

  onDialogClick(event: Event): void {
    // Prevent backdrop click when clicking inside dialog
    event.stopPropagation()
  }

  /**
   * Get all known spells grouped by caster type
   */
  get spellEntries(): SpellBookEntry[] {
    if (!this.character || !this.character.knownSpells) {
      return []
    }

    const entries: SpellBookEntry[] = []

    for (const spellId of this.character.knownSpells) {
      const spell = SpellDataLoader.getSpell(spellId)
      if (spell) {
        entries.push({
          spell,
          level: spell.level,
          casterType: spell.casterType
        })
      }
    }

    // Sort by caster type (mage first), then by level, then by name
    return entries.sort((a, b) => {
      if (a.casterType !== b.casterType) {
        return a.casterType === 'mage' ? -1 : 1
      }
      if (a.level !== b.level) {
        return a.level - b.level
      }
      return a.spell.name.localeCompare(b.spell.name)
    })
  }

  /**
   * Get mage spells grouped by level
   */
  get mageSpellsByLevel(): Map<number, SpellBookEntry[]> {
    return this.groupByLevel(this.spellEntries.filter(e => e.casterType === 'mage'))
  }

  /**
   * Get priest spells grouped by level
   */
  get priestSpellsByLevel(): Map<number, SpellBookEntry[]> {
    return this.groupByLevel(this.spellEntries.filter(e => e.casterType === 'priest'))
  }

  /**
   * Check if character has any mage spells
   */
  get hasMageSpells(): boolean {
    return this.mageSpellsByLevel.size > 0
  }

  /**
   * Check if character has any priest spells
   */
  get hasPriestSpells(): boolean {
    return this.priestSpellsByLevel.size > 0
  }

  /**
   * Check if character has any spells at all
   */
  get hasAnySpells(): boolean {
    return this.hasMageSpells || this.hasPriestSpells
  }

  private groupByLevel(entries: SpellBookEntry[]): Map<number, SpellBookEntry[]> {
    const map = new Map<number, SpellBookEntry[]>()

    for (const entry of entries) {
      const list = map.get(entry.level) || []
      list.push(entry)
      map.set(entry.level, list)
    }

    return map
  }

  /**
   * Convert Map to array for template iteration
   */
  mapToArray(map: Map<number, SpellBookEntry[]>): Array<{ level: number; spells: SpellBookEntry[] }> {
    const arr: Array<{ level: number; spells: SpellBookEntry[] }> = []
    map.forEach((spells, level) => {
      arr.push({ level, spells })
    })
    return arr.sort((a, b) => a.level - b.level)
  }
}
