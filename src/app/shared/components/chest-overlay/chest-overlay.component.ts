import { Component, input, output, computed, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ScrambledLettersComponent } from '../scrambled-letters/scrambled-letters.component'
import { Character } from '@models/Character'
import { Chest } from '@models/Chest'
import { ScrambledTrapState } from '@models/Trap'
import { Item } from '@models/Item'
import { CharacterStatus } from '@models/CharacterStatus'

/**
 * Chest interaction phases
 */
export type ChestPhase =
  | 'idle'
  | 'reveal'
  | 'action_select'  // Main phase - actions are on character cards
  | 'caster_select'
  | 'trap_display'
  | 'trap_input'
  | 'inventory_warning'
  | 'trap_triggered'  // Dramatic trap trigger sequence
  | 'opening'
  | 'result'

/**
 * Letterbox banner types for dramatic reveals
 */
export type ChestLetterboxType = 'treasure' | 'trap_detected' | 'disarm_attempt' | 'trap_triggered' | null

/**
 * Summary of chest opening results
 */
export interface ChestSummary {
  goldObtained: number
  itemsObtained: Item[]
  itemsLost: Item[]
  recipientName: string
  trapTriggered: boolean
  trapName: string | null
  damageDealt: Map<string, number>
  statusEffects: Map<string, CharacterStatus>
}

/**
 * Recommended handler info from TrapService
 */
export interface RecommendedHandler {
  character: Character
  inspectChance: number
  disarmChance: number
}

/**
 * ChestOverlayComponent
 *
 * Immersive treasure chest interaction overlay following the "Theater Stage" pattern.
 * Appears over the maze canvas after combat victories or exploration discoveries.
 *
 * Features:
 * - Full-bleed sprite background (chest_closed → chest_open)
 * - Vignette effect for atmospheric depth
 * - Letterbox banners for dramatic reveals
 * - Complete trap interaction (inspect, CALFO, disarm)
 * - Victory-style reward display
 */
@Component({
  selector: 'app-chest-overlay',
  standalone: true,
  imports: [CommonModule, ScrambledLettersComponent],
  templateUrl: './chest-overlay.component.html',
  styleUrls: ['./chest-overlay.component.scss']
})
export class ChestOverlayComponent {
  // ============================================
  // INPUTS FROM MAZE COMPONENT
  // ============================================

  /** Whether overlay is visible */
  readonly visible = input(false)

  /** Current interaction phase */
  readonly phase = input<ChestPhase>('idle')

  /** The chest being interacted with */
  readonly chest = input<Chest | null>(null)

  /** Current sprite state */
  readonly spriteState = input<'closed' | 'open'>('closed')

  /** Scrambled trap state for letter puzzle */
  readonly scrambledState = input<ScrambledTrapState | null>(null)

  /** Current trap name input */
  readonly trapInput = input<string>('')

  /** Chest opening summary */
  readonly summary = input<ChestSummary | null>(null)

  /** Available characters for selection */
  readonly availableCharacters = input<Character[]>([])

  /** Characters who can cast CALFO */
  readonly calfoEligibleCasters = input<Character[]>([])

  /** Selected chest handler */
  readonly selectedOpener = input<Character | null>(null)

  /** Last action message */
  readonly lastMessage = input<string>('')

  /** Recommended handler for trap work */
  readonly recommendedHandler = input<RecommendedHandler | null>(null)

  /** Inventory warning message */
  readonly inventoryWarning = input<string | null>(null)

  /** Current letterbox banner type */
  readonly letterboxType = input<ChestLetterboxType>(null)

  /** Inspect chance for selected opener */
  readonly inspectChance = input<number>(0)

  /** Disarm chance for selected opener */
  readonly disarmChance = input<number>(0)

  /** Trap name for triggered letterbox display */
  readonly trapLetterboxName = input<string>('')

  // ============================================
  // OUTPUTS TO MAZE COMPONENT
  // ============================================

  /** Character selected for handling chest */
  readonly characterSelected = output<number>()

  /** Caster selected for CALFO */
  readonly casterSelected = output<number>()

  /** Action selected from menu */
  readonly actionSelected = output<string>()

  /** Key pressed during trap input */
  readonly keyPressed = output<string>()

  // ============================================
  // LOCAL STATE
  // ============================================

  /** Sprite load error tracking */
  readonly spriteError = signal(false)

  // ============================================
  // COMPUTED PROPERTIES
  // ============================================

  /** Sprite URL based on state */
  readonly spriteUrl = computed(() => {
    return this.spriteState() === 'open'
      ? '/assets/sprites/chest/chest_open.png'
      : '/assets/sprites/chest/chest_closed.png'
  })

  /** Whether to show sprite background */
  readonly showSprite = computed(() => {
    const phase = this.phase()
    return phase !== 'idle' && this.visible()
  })

  /** Damage entries for result display */
  readonly damageEntries = computed(() => {
    const summary = this.summary()
    if (!summary?.damageDealt || summary.damageDealt.size === 0) return []
    return Array.from(summary.damageDealt.entries()).map(([name, damage]) => ({
      name,
      damage
    }))
  })

  /** Status entries for result display */
  readonly statusEntries = computed(() => {
    const summary = this.summary()
    if (!summary?.statusEffects || summary.statusEffects.size === 0) return []
    return Array.from(summary.statusEffects.entries()).map(([name, status]) => ({
      name,
      status: this.formatStatus(status)
    }))
  })

  /** Whether trap is identified */
  readonly trapIdentified = computed(() => this.chest()?.trapIdentified ?? false)

  /** Whether trap is disarmed */
  readonly trapDisarmed = computed(() => this.chest()?.trapDisarmed ?? false)

  /** Whether chest is trapped */
  readonly isTrapped = computed(() => this.chest()?.trapped ?? false)

  // ============================================
  // METHODS
  // ============================================

  /** Handle sprite load error */
  onSpriteError(): void {
    this.spriteError.set(true)
  }

  /** Format status enum to display string */
  private formatStatus(status: CharacterStatus): string {
    const statusMap: Record<CharacterStatus, string> = {
      [CharacterStatus.OK]: 'OK',
      [CharacterStatus.POISONED]: 'Poisoned',
      [CharacterStatus.PARALYZED]: 'Paralyzed',
      [CharacterStatus.STONED]: 'Petrified',
      [CharacterStatus.DEAD]: 'Dead',
      [CharacterStatus.ASHES]: 'Ashes',
      [CharacterStatus.LOST]: 'Lost',
      [CharacterStatus.INJURED]: 'Injured',
      [CharacterStatus.ASLEEP]: 'Asleep'
    }
    return statusMap[status] ?? String(status)
  }

  /** Get trap status display text */
  getTrapStatusText(): string {
    const chest = this.chest()
    if (!chest) return ''

    if (chest.trapDisarmed) {
      return 'Trap disarmed - safe to open'
    }

    if (chest.trapIdentified) {
      if (chest.trapped && chest.trapId) {
        return 'Trap detected!'
      }
      return 'No trap detected'
    }

    return 'Trap status: Unknown'
  }

  /** Check if character is recommended handler */
  isRecommended(char: Character): boolean {
    return this.recommendedHandler()?.character?.id === char.id
  }

  /** Select character at index */
  selectCharacter(index: number): void {
    this.characterSelected.emit(index)
  }

  /** Select caster at index */
  selectCaster(index: number): void {
    this.casterSelected.emit(index)
  }
}
