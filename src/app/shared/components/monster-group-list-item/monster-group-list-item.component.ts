import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MonsterGroup } from '@models/Combat'
import { getIdentifiedGroupDisplayText } from '@utils/MonsterNameUtils'

/**
 * Color mapping for monster group IDs (A, B, C, D)
 * Matches the original Wizardry color scheme
 */
const GROUP_COLORS: Record<string, string> = {
  'A': '#ff6b6b',  // Red
  'B': '#4ecdc4',  // Teal
  'C': '#ffe66d',  // Yellow
  'D': '#a8e6cf'   // Green
}

/**
 * Compact monster group list item for combat display.
 * Follows the CharacterListItemComponent pattern.
 *
 * Displays: [GroupID] [Count] [Monster Name]
 * Example: "A   3/3   BUBBLY SLIMES"
 *
 * @example
 * <app-monster-group-list-item
 *   [group]="monsterGroup"
 *   [selected]="selectedGroupId() === monsterGroup.id"
 *   [selectable]="true"
 *   (groupClick)="onGroupSelected($event)"
 * />
 */
@Component({
  selector: 'app-monster-group-list-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monster-group-list-item.component.html',
  styleUrls: ['./monster-group-list-item.component.scss']
})
export class MonsterGroupListItemComponent {
  /** The monster group to display */
  @Input({ required: true }) group!: MonsterGroup

  /** Whether this group is currently selected as a target */
  @Input() selected = false

  /** Whether this group can be selected (clickable) */
  @Input() selectable = false

  /** Emitted when the group is clicked (only if selectable) */
  @Output() groupClick = new EventEmitter<'A' | 'B' | 'C' | 'D'>()

  /**
   * Get the count of alive monsters in the group
   */
  get aliveCount(): number {
    return this.group.monsters.filter(m => m.hp > 0).length
  }

  /**
   * Get the total count of monsters in the group
   */
  get totalCount(): number {
    return this.group.monsters.length
  }

  /**
   * Check if all monsters in the group are defeated
   */
  get isDefeated(): boolean {
    return this.aliveCount === 0
  }

  /**
   * Get the display name for the monster group
   * Before LATUMAPIC: Uses unidentifiedName (e.g., "3 SMALL HUMANOIDS")
   * After LATUMAPIC: Uses real name (e.g., "3 KOBOLDS")
   */
  get displayName(): string {
    if (this.isDefeated || this.totalCount === 0) {
      return 'DEFEATED'
    }
    const firstMonster = this.group.monsters[0]
    if (!firstMonster) return 'UNKNOWN'
    return getIdentifiedGroupDisplayText(this.aliveCount, firstMonster, this.group.identified)
  }

  /**
   * Get the color for the group ID indicator
   */
  getGroupColor(): string {
    return GROUP_COLORS[this.group.id] || 'var(--color-gold-primary)'
  }

  /**
   * Handle click on the group
   */
  onClick(): void {
    if (this.selectable && !this.isDefeated) {
      this.groupClick.emit(this.group.id)
    }
  }
}
