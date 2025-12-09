import {
  Component,
  input,
  output,
  signal,
  computed,
  HostListener
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { MonsterGroup } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { VictoryRewards, ItemDrop } from '@services/VictoryService'
import {
  MonsterSpriteOverlayComponent,
  SpriteAnimationState
} from '../monster-sprite-overlay/monster-sprite-overlay.component'
import {
  FloatingDamageComponent,
  FloatingDamageEntry,
  createFloatingDamage,
  DamageType
} from '../floating-damage/floating-damage.component'

/**
 * CombatOverlayComponent - Container for combat visuals overlaid on the maze canvas.
 *
 * This component provides the "Theater Stage" experience where combat happens
 * within the maze view rather than navigating to a separate scene.
 *
 * Features:
 * - Positioned absolutely over the WebGL canvas
 * - Contains monster sprite overlays and floating damage numbers
 * - Provides vignette effect for combat mode ambiance
 * - Handles combat-specific keyboard events
 * - Delegates monster rendering to MonsterSpriteOverlayComponent
 * - Displays victory rewards (XP, gold, items) after combat
 *
 * @example
 * <app-combat-overlay
 *   [visible]="inCombat()"
 *   [monsterGroups]="combatState()?.monsterGroups ?? []"
 *   [roundNumber]="combatState()?.roundNumber ?? 1"
 *   [selectedGroupId]="selectedTargetGroup()"
 *   [isTargetingMode]="needsTargetSelection()"
 *   [showVictoryOverlay]="combatPhase() === 'victory'"
 *   [showDefeatOverlay]="combatPhase() === 'defeat'"
 *   [victoryRewards]="victoryRewards()"
 *   (groupClicked)="onGroupClicked($event)"
 * />
 */
@Component({
  selector: 'app-combat-overlay',
  standalone: true,
  imports: [CommonModule, MonsterSpriteOverlayComponent, FloatingDamageComponent],
  templateUrl: './combat-overlay.component.html',
  styleUrls: ['./combat-overlay.component.scss']
})
export class CombatOverlayComponent {
  // Inputs
  readonly visible = input(false)
  readonly monsterGroups = input<MonsterGroup[]>([])
  readonly roundNumber = input(1)
  readonly selectedGroupId = input<'A' | 'B' | 'C' | 'D' | null>(null)
  readonly isTargetingMode = input(false)
  readonly letterboxType = input<'encounter' | 'ambush' | 'surprise' | null>(null)
  readonly showVictoryOverlay = input(false)
  readonly showDefeatOverlay = input(false)
  readonly victoryRewards = input<VictoryRewards | null>(null)
  readonly partyCharacters = input<Character[]>([])
  readonly showMonsterCards = input<boolean>(true)
  readonly sleepIndicator = input<{ groupId: string } | null>(null)

  // Pyrrhic victory detection - statuses that indicate costly victory
  private readonly PYRRHIC_STATUSES = [
    CharacterStatus.DEAD,
    CharacterStatus.ASHES,
    CharacterStatus.LOST,
    CharacterStatus.STONED
  ]

  // Computed: is this a pyrrhic victory (party member dead/stoned/ashes/lost)?
  readonly isPyrrhicVictory = computed(() => {
    return this.partyCharacters().some(char =>
      this.PYRRHIC_STATUSES.includes(char.status)
    )
  })

  // Computed: sprite path based on victory type
  // Note: Angular serves data/ as /assets/ (configured in angular.json)
  readonly victorySpriteUrl = computed(() => {
    return this.isPyrrhicVictory()
      ? '/assets/sprites/combat/victory-pyrrhic.png'
      : '/assets/sprites/combat/victory-clean.png'
  })

  // Outputs
  readonly groupClicked = output<'A' | 'B' | 'C' | 'D'>()

  // Animation state
  readonly isAnimatingIn = signal(false)
  readonly isAnimatingOut = signal(false)
  readonly spriteAnimations = signal<SpriteAnimationState[]>([])
  readonly damageEntries = signal<FloatingDamageEntry[]>([])
  readonly victorySpriteError = signal(false)

  // Computed states
  readonly hasMonsters = computed(() => this.monsterGroups().length > 0)

  /**
   * Handle group click from MonsterSpriteOverlayComponent
   */
  onGroupClick(groupId: 'A' | 'B' | 'C' | 'D'): void {
    this.groupClicked.emit(groupId)
  }

  /**
   * Handle victory sprite load error - shows fallback icon
   */
  onVictorySpriteError(): void {
    this.victorySpriteError.set(true)
  }

  /**
   * Handle animation completion from sprite overlay
   */
  onAnimationComplete(state: SpriteAnimationState): void {
    // Remove completed animation from queue
    this.spriteAnimations.update(current =>
      current.filter(a =>
        a.groupId !== state.groupId || a.monsterIndex !== state.monsterIndex
      )
    )
  }

  /**
   * Queue a damage flash animation for a specific monster
   */
  triggerDamageFlash(groupId: 'A' | 'B' | 'C' | 'D', monsterIndex: number): void {
    this.spriteAnimations.update(current => [
      ...current,
      { groupId, monsterIndex, animation: 'damage-flash' as const }
    ])
  }

  /**
   * Queue a death animation for a specific monster
   */
  triggerDeathAnimation(groupId: 'A' | 'B' | 'C' | 'D', monsterIndex: number): void {
    this.spriteAnimations.update(current => [
      ...current,
      { groupId, monsterIndex, animation: 'dying' as const }
    ])
  }

  /**
   * Add a floating damage number at a position
   */
  addFloatingDamage(text: string, type: DamageType, x: number, y: number): void {
    const entry = createFloatingDamage(text, type, x, y)
    this.damageEntries.update(current => [...current, entry])
  }

  /**
   * Remove a completed floating damage entry
   */
  onDamageComplete(entryId: string): void {
    this.damageEntries.update(current =>
      current.filter(e => e.id !== entryId)
    )
  }

  /**
   * Get approximate position for a monster group
   * Returns {x, y} as percentages for overlay positioning
   */
  getGroupPosition(groupId: 'A' | 'B' | 'C' | 'D'): { x: number; y: number } {
    const groups = this.monsterGroups()
    const group = groups.find(g => g.id === groupId)
    if (!group) return { x: 50, y: 50 }

    const isBackRow = group.formation === 'back'
    const frontGroups = groups.filter(g => g.formation === 'front')
    const backGroups = groups.filter(g => g.formation === 'back')

    // Y position based on row
    const y = isBackRow ? 35 : 60

    // X position based on index within row
    const rowGroups = isBackRow ? backGroups : frontGroups
    const index = rowGroups.findIndex(g => g.id === groupId)
    const count = rowGroups.length

    // Spread groups evenly across width
    const spacing = 100 / (count + 1)
    const x = spacing * (index + 1)

    return { x, y }
  }

  /**
   * Handle keyboard shortcuts for quick group targeting (1-4)
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.visible() || !this.isTargetingMode()) return

    const groups = this.monsterGroups()
    const key = event.key

    // Number keys 1-4 for quick group selection
    if (key >= '1' && key <= '4') {
      const index = parseInt(key) - 1
      if (index < groups.length) {
        this.groupClicked.emit(groups[index].id)
        event.preventDefault()
      }
    }

    // Letter keys A-D for direct group selection
    if (['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'].includes(key)) {
      const groupId = key.toUpperCase() as 'A' | 'B' | 'C' | 'D'
      const group = groups.find(g => g.id === groupId)
      if (group) {
        this.groupClicked.emit(groupId)
        event.preventDefault()
      }
    }
  }
}
