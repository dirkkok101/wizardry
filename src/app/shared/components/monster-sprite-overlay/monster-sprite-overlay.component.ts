import {
  Component,
  input,
  output,
  computed,
  signal,
  effect
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { MonsterGroup } from '@models/Combat'
import { getGroupDisplayText } from '@utils/MonsterNameUtils'

export interface SpriteAnimationState {
  groupId: 'A' | 'B' | 'C' | 'D'
  monsterIndex: number
  animation: 'damage-flash' | 'dying' | 'heal'
}

/**
 * MonsterSpriteOverlayComponent - Renders monster sprites with positioning and animations.
 *
 * This component handles the visual representation of monster groups during combat,
 * positioning them in a classic Wizardry-style front/back row formation.
 *
 * Features:
 * - CSS placeholder sprites with monster initials
 * - Front row (larger, lower) and back row (smaller, higher) positioning
 * - Color-coded group badges (A=red, B=teal, C=yellow, D=green)
 * - Selection highlighting for targeting
 * - Damage flash and death animations
 * - Staggered reveal animations on combat start
 *
 * @example
 * <app-monster-sprite-overlay
 *   [monsterGroups]="combatState()?.monsterGroups ?? []"
 *   [selectedGroupId]="selectedTarget()"
 *   [isTargetingMode]="needsTarget()"
 *   [animationQueue]="damageAnimations()"
 *   (groupClicked)="onSelectGroup($event)"
 *   (animationComplete)="onAnimationDone($event)"
 * />
 */
@Component({
  selector: 'app-monster-sprite-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monster-sprite-overlay.component.html',
  styleUrls: ['./monster-sprite-overlay.component.scss']
})
export class MonsterSpriteOverlayComponent {
  // Inputs
  readonly monsterGroups = input<MonsterGroup[]>([])
  readonly selectedGroupId = input<'A' | 'B' | 'C' | 'D' | null>(null)
  readonly isTargetingMode = input(false)
  readonly animationQueue = input<SpriteAnimationState[]>([])

  // Outputs
  readonly groupClicked = output<'A' | 'B' | 'C' | 'D'>()
  readonly animationComplete = output<SpriteAnimationState>()

  // Internal animation tracking
  private readonly activeAnimations = signal<Map<string, SpriteAnimationState>>(new Map())

  // Computed: Front row groups (A, B typically)
  readonly frontRowGroups = computed(() =>
    this.monsterGroups().filter(g => g.formation === 'front')
  )

  // Computed: Back row groups (C, D typically)
  readonly backRowGroups = computed(() =>
    this.monsterGroups().filter(g => g.formation === 'back')
  )

  // Effect: Process animation queue
  constructor() {
    effect(() => {
      const queue = this.animationQueue()
      if (queue.length > 0) {
        this.processAnimationQueue(queue)
      }
    })
  }

  /**
   * Handle click on a monster group for targeting
   */
  onGroupClick(groupId: 'A' | 'B' | 'C' | 'D'): void {
    if (this.isTargetingMode()) {
      this.groupClicked.emit(groupId)
    }
  }

  /**
   * Get display name for a monster group
   * Shows alive count and properly pluralized monster name (or ??? if unidentified)
   * Format: "3 ORCS" or "1 ORC" or "2 ???"
   */
  getGroupDisplayName(group: MonsterGroup): string {
    const aliveCount = group.monsters.filter(m => m.hp > 0).length
    const monsterName = group.identified
      ? group.monsters[0]?.name ?? 'Unknown'
      : '???'

    // Use utility for proper pluralization (handles irregular plurals like WEREWOLVES)
    return getGroupDisplayText(aliveCount, monsterName)
  }

  /**
   * Get color for group badge based on group ID (theater stage aesthetic)
   */
  getGroupColor(groupId: 'A' | 'B' | 'C' | 'D'): string {
    const colors = {
      A: '#ff6b6b', // Dramatic red
      B: '#4ecdc4', // Mysterious teal
      C: '#ffe66d', // Warning yellow
      D: '#a8e6cf'  // Ethereal green
    }
    return colors[groupId]
  }

  /**
   * Get sprite initial (first letter of monster name, or ?)
   */
  getSpriteInitial(group: MonsterGroup): string {
    const monster = group.monsters[0]
    if (!monster) return '?'
    if (!group.identified) return '?'
    return monster.name.charAt(0).toUpperCase()
  }

  /**
   * Check if group has any alive monsters
   */
  hasAliveMonsters(group: MonsterGroup): boolean {
    return group.monsters.some(m => m.hp > 0)
  }

  /**
   * Check if a specific monster sprite should show an animation
   */
  getSpriteAnimation(groupId: 'A' | 'B' | 'C' | 'D', monsterIndex: number): string {
    const key = `${groupId}-${monsterIndex}`
    const state = this.activeAnimations().get(key)
    return state?.animation ?? ''
  }

  /**
   * Handle animation end event for a sprite
   */
  onSpriteAnimationEnd(groupId: 'A' | 'B' | 'C' | 'D', monsterIndex: number): void {
    const key = `${groupId}-${monsterIndex}`
    const state = this.activeAnimations().get(key)
    if (state) {
      const newMap = new Map(this.activeAnimations())
      newMap.delete(key)
      this.activeAnimations.set(newMap)
      this.animationComplete.emit(state)
    }
  }

  /**
   * Process incoming animation queue
   */
  private processAnimationQueue(queue: SpriteAnimationState[]): void {
    const newMap = new Map(this.activeAnimations())
    for (const anim of queue) {
      const key = `${anim.groupId}-${anim.monsterIndex}`
      newMap.set(key, anim)
    }
    this.activeAnimations.set(newMap)
  }

  /**
   * Calculate reveal animation delay for staggered entrance
   */
  getRevealDelay(rowIndex: number, isBackRow: boolean): string {
    const baseDelay = isBackRow ? 300 : 0
    return `${baseDelay + rowIndex * 100}ms`
  }
}
