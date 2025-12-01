import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  HostListener
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { Character } from '@models/Character'
import { SpellData, SpellCastingService } from '@services/SpellCastingService'
import { SpellDataLoader } from '@services/SpellDataLoader'

type CasterType = 'mage' | 'priest'
type SpellLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * SpellPanelComponent - Unified spell panel for casting and viewing spells.
 *
 * Features:
 * - Two-level tab navigation: Caster Type (Mage/Priest) + Spell Level (L1-L7)
 * - SP display per caster type + level combination
 * - Mode support: 'casting' (with [Cast] buttons) or 'viewing' (read-only)
 * - Context filtering for castable spells (combat, dungeon, camp)
 * - 1-2 column layout based on spell count
 * - Modern Retro-Fantasy styling with gold accents
 * - Auto-selects first available spell type/level when opened
 *
 * @example
 * <!-- Casting mode in dungeon -->
 * <app-spell-panel
 *   [visible]="showSpellDialog()"
 *   [character]="selectedCaster()!"
 *   [mode]="'casting'"
 *   [context]="'dungeon'"
 *   [title]="'SELECT SPELL'"
 *   (spellSelected)="onSpellSelected($event)"
 *   (closed)="onSpellDialogCancelled()"
 * />
 *
 * <!-- Viewing mode for spell book -->
 * <app-spell-panel
 *   [visible]="showSpellBook()"
 *   [character]="char"
 *   [mode]="'viewing'"
 *   [title]="char.name + '\\'s Spell Book'"
 *   (closed)="closeSpellBook()"
 * />
 */
@Component({
  selector: 'app-spell-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spell-panel.component.html',
  styleUrls: ['./spell-panel.component.scss']
})
export class SpellPanelComponent {
  // Signal-based inputs
  readonly visible = input(false)
  readonly character = input.required<Character>()
  readonly mode = input<'casting' | 'viewing'>('viewing')
  readonly context = input<'dungeon' | 'combat' | 'camp'>('dungeon')
  readonly title = input('SPELL BOOK')

  // Outputs
  readonly spellSelected = output<SpellData>()
  readonly closed = output<void>()

  // State
  readonly activeCasterType = signal<CasterType>('mage')
  readonly activeLevel = signal<SpellLevel>(1)

  // Spell levels array for iteration
  readonly spellLevels: SpellLevel[] = [1, 2, 3, 4, 5, 6, 7]

  constructor() {
    // Auto-select first available caster type and level when panel opens
    effect(() => {
      const isVisible = this.visible()
      const char = this.character()
      if (isVisible && char) {
        this.selectFirstAvailableTab()
      }
    })
  }

  /**
   * Select the first available caster type and spell level
   */
  private selectFirstAvailableTab(): void {
    const hasMage = this.hasMageSpells()
    const hasPriest = this.hasPriestSpells()

    if (hasMage) {
      this.activeCasterType.set('mage')
    } else if (hasPriest) {
      this.activeCasterType.set('priest')
    }

    // Select first level that has spells
    for (const level of this.spellLevels) {
      if (this.hasSpellsAtLevel(level)) {
        this.activeLevel.set(level)
        break
      }
    }
  }

  /**
   * Check if character has any mage spells
   */
  hasMageSpells(): boolean {
    return this.getKnownSpellsForCasterType('mage').length > 0
  }

  /**
   * Check if character has any priest spells
   */
  hasPriestSpells(): boolean {
    return this.getKnownSpellsForCasterType('priest').length > 0
  }

  /**
   * Get all known spells for a caster type
   */
  private getKnownSpellsForCasterType(casterType: CasterType): SpellData[] {
    const char = this.character()
    if (!char?.knownSpells) return []

    const allSpells = SpellDataLoader.getAllSpells()
    const knownSpells: SpellData[] = []

    for (const spellId of char.knownSpells) {
      const spell = allSpells.get(spellId.toLowerCase())
      if (spell && spell.casterType === casterType) {
        knownSpells.push(spell)
      }
    }

    return knownSpells
  }

  /**
   * Get known spells at a specific level for the active caster type
   */
  getSpellsAtLevel(level: SpellLevel): SpellData[] {
    const casterType = this.activeCasterType()
    const knownSpells = this.getKnownSpellsForCasterType(casterType)

    return knownSpells
      .filter(spell => spell.level === level)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get spells at the currently active level.
   * In casting mode, filters to only castable spells (has SP and valid context).
   * In viewing mode, returns all spells at the level.
   */
  spellsAtActiveLevel(): SpellData[] {
    const allSpells = this.getSpellsAtLevel(this.activeLevel())

    // In casting mode, filter to only castable spells
    if (this.mode() === 'casting') {
      return allSpells.filter(spell => this.canCast(spell))
    }

    // In viewing mode, show all spells
    return allSpells
  }

  /**
   * Check if there are spells at a given level
   */
  hasSpellsAtLevel(level: SpellLevel): boolean {
    return this.getSpellsAtLevel(level).length > 0
  }

  /**
   * Get current SP for active caster type + level
   */
  currentSPForActiveLevel(): number {
    return this.getSPForLevel(this.activeCasterType(), this.activeLevel()).current
  }

  /**
   * Get max SP for active caster type + level
   */
  maxSPForActiveLevel(): number {
    return this.getSPForLevel(this.activeCasterType(), this.activeLevel()).max
  }

  /**
   * Get SP for a specific caster type and level
   */
  private getSPForLevel(casterType: CasterType, level: SpellLevel): { current: number; max: number } {
    const char = this.character()
    if (!char?.spellPoints) {
      return { current: 0, max: 0 }
    }

    const pool = casterType === 'mage'
      ? char.spellPoints.mage
      : char.spellPoints.priest

    if (!pool) {
      return { current: 0, max: 0 }
    }

    const levelKey = `level${level}` as keyof typeof pool
    const points = pool[levelKey]

    return {
      current: points?.current ?? 0,
      max: points?.max ?? 0
    }
  }

  /**
   * Check if a spell can be cast (has sufficient SP and is castable in context)
   */
  canCast(spell: SpellData): boolean {
    if (this.mode() !== 'casting') return false

    // Check SP
    const sp = this.getSPForLevel(spell.casterType as CasterType, spell.level as SpellLevel)
    if (sp.current < 1) return false

    // Check context - map UI contexts to spell data contexts
    // Spell data uses 'combat' and 'camp', UI uses 'combat', 'dungeon', 'town'
    // Both 'dungeon' and 'town' map to 'camp' (non-combat spell casting)
    const ctx = this.context()
    const spellContext = ctx === 'combat' ? 'combat' : 'camp'
    if (!spell.castableIn.includes(spellContext)) {
      return false
    }

    return true
  }

  /**
   * Set the active caster type
   */
  setCasterType(type: CasterType): void {
    this.activeCasterType.set(type)

    // Select first level that has spells for this type
    for (const level of this.spellLevels) {
      if (this.hasSpellsAtLevel(level)) {
        this.activeLevel.set(level)
        break
      }
    }
  }

  /**
   * Set the active spell level
   */
  setLevel(level: SpellLevel): void {
    if (this.hasSpellsAtLevel(level)) {
      this.activeLevel.set(level)
    }
  }

  /**
   * Handle spell card click
   */
  onSpellClick(spell: SpellData): void {
    if (this.mode() === 'casting' && this.canCast(spell)) {
      this.spellSelected.emit(spell)
    }
  }

  /**
   * Handle backdrop click to close
   */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit()
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
    if (spell.instantDeath) {
      return 'Instant death'
    }
    if (spell.statusEffect) {
      // Type guard handles both string literals and object form { type: string }
      const effectStr = typeof spell.statusEffect === 'object' && spell.statusEffect !== null
        ? spell.statusEffect.type
        : spell.statusEffect
      return effectStr.toLowerCase()
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
      'locate_person': 'Locate body',
      'reveal_stats': 'Reveal stats',
      'identify_foe': 'Identify enemy'
    }
    return descriptions[utility] || utility
  }

  /**
   * Handle keyboard events
   */
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.visible()) return

    if (event.key === 'Escape') {
      event.preventDefault()
      this.closed.emit()
    }

    // In viewing mode, Enter and Space also close
    if (this.mode() === 'viewing' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      this.closed.emit()
    }
  }
}
