import {
  Component,
  input,
  output,
  computed,
  signal,
  effect
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { MonsterGroup, MonsterInstance } from '@models/Combat'
import { getIdentifiedGroupDisplayText, getMonsterDisplayName } from '@utils/MonsterNameUtils'

export type SpriteAnimationType = 'damage-flash' | 'dying'

export interface SpriteAnimationState {
  groupId: 'A' | 'B' | 'C' | 'D'
  monsterIndex: number
  animation: SpriteAnimationType
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

  // Track sprites that failed to load (show fallback letter instead)
  private readonly spriteErrors = signal<Set<string>>(new Set())

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
   * Shows alive count and properly pluralized monster name
   * Before LATUMAPIC: Uses unidentifiedName (e.g., "3 SMALL HUMANOIDS")
   * After LATUMAPIC: Uses real name (e.g., "3 KOBOLDS")
   */
  getGroupDisplayName(group: MonsterGroup): string {
    const aliveCount = group.monsters.filter(m => m.hp > 0).length
    const firstMonster = group.monsters[0]
    if (!firstMonster) return '???'

    return getIdentifiedGroupDisplayText(aliveCount, firstMonster, group.identified)
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
   * Get sprite initial (first letter of display name)
   * Uses unidentifiedName if not identified, real name if identified
   */
  getSpriteInitial(group: MonsterGroup): string {
    const monster = group.monsters[0]
    if (!monster) return '?'
    const displayName = getMonsterDisplayName(monster, group.identified)
    return displayName.charAt(0).toUpperCase()
  }

  /**
   * Get the first monster in a group safely
   * Returns undefined if group has no monsters
   */
  getFirstMonster(group: MonsterGroup): MonsterInstance | undefined {
    return group.monsters[0]
  }

  /**
   * Get sprite image URL for a monster
   * Maps monsterId to sprite file path (e.g., 'kobold' → '/assets/sprites/monsters/kobold.png')
   */
  getSpriteUrl(monster: MonsterInstance | undefined): string {
    if (!monster) return '/assets/sprites/monsters/unknown.png'
    return `/assets/sprites/monsters/${monster.monsterId}.png`
  }

  /**
   * Handle sprite image load error - fall back to letter initial
   * Tracks by monsterId to prevent duplicate load attempts across groups
   */
  onSpriteError(monsterId: string): void {
    this.spriteErrors.update(errors => new Set(errors).add(monsterId))
  }

  /**
   * Check if sprite failed to load (show fallback instead)
   * Uses monsterId for efficient caching across groups
   */
  hasSpriteError(monsterId: string | undefined): boolean {
    if (!monsterId) return true
    return this.spriteErrors().has(monsterId)
  }

  /**
   * Get count of alive monsters in a group
   */
  getAliveCount(group: MonsterGroup): number {
    return group.monsters.filter(m => m.hp > 0).length
  }

  /**
   * Check if group has any alive monsters
   */
  hasAliveMonsters(group: MonsterGroup): boolean {
    return group.monsters.some(m => m.hp > 0)
  }

  /**
   * Check if a group has an active animation (any monster in group)
   * Used for single-card-per-group display
   */
  hasGroupAnimation(groupId: 'A' | 'B' | 'C' | 'D', animationType: SpriteAnimationType): boolean {
    const animations = this.activeAnimations()
    for (const [key, state] of animations) {
      if (key.startsWith(groupId) && state.animation === animationType) {
        return true
      }
    }
    return false
  }

  /**
   * Handle animation end event for a group card
   * Clears all animations for monsters in this group and emits completion events
   */
  onGroupAnimationEnd(groupId: 'A' | 'B' | 'C' | 'D'): void {
    const animations = this.activeAnimations()
    const toRemove: string[] = []
    const toEmit: SpriteAnimationState[] = []

    for (const [key, state] of animations) {
      if (key.startsWith(groupId)) {
        toRemove.push(key)
        toEmit.push(state)
      }
    }

    if (toRemove.length > 0) {
      const newMap = new Map(animations)
      for (const key of toRemove) {
        newMap.delete(key)
      }
      this.activeAnimations.set(newMap)

      // Emit completion for all animations in the group
      for (const anim of toEmit) {
        this.animationComplete.emit(anim)
      }
    }
  }

  /**
   * Get ARIA label for a monster group for accessibility
   */
  getGroupAriaLabel(group: MonsterGroup): string {
    const name = this.getGroupDisplayName(group)
    const status = this.hasAliveMonsters(group) ? '' : '(defeated)'
    const selected = this.selectedGroupId() === group.id ? '(selected)' : ''
    return `Group ${group.id}: ${name} ${status} ${selected}`.replace(/\s+/g, ' ').trim()
  }

  /**
   * Get alt text for sprite image
   */
  getSpriteAltText(group: MonsterGroup): string {
    return `Group ${group.id}: ${this.getGroupDisplayName(group)}`
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
