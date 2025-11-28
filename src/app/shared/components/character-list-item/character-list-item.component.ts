import { Component, Input, ContentChild, TemplateRef } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'

/**
 * Abbreviated class names for compact display
 */
const CLASS_ABBREVIATIONS: Record<CharacterClass, string> = {
  [CharacterClass.FIGHTER]: 'FIG',
  [CharacterClass.MAGE]: 'MAG',
  [CharacterClass.PRIEST]: 'PRI',
  [CharacterClass.THIEF]: 'THI',
  [CharacterClass.BISHOP]: 'BIS',
  [CharacterClass.SAMURAI]: 'SAM',
  [CharacterClass.LORD]: 'LOR',
  [CharacterClass.NINJA]: 'NIN'
}

/**
 * Shared character list item component for compact character display.
 * Used by Tavern (available characters) and Training Grounds (roster management).
 *
 * Uses content projection for action buttons - each parent provides its own buttons.
 *
 * @example Tavern usage:
 * ```html
 * <app-character-list-item [character]="char">
 *   <ng-template #actions>
 *     <button (click)="onAdd(char.id)">Add</button>
 *     <button (click)="onInspect(char.id)">Inspect</button>
 *   </ng-template>
 * </app-character-list-item>
 * ```
 *
 * @example Training Grounds usage:
 * ```html
 * <app-character-list-item
 *   [character]="item.character"
 *   [showAlignment]="true"
 *   [showStatus]="true"
 *   [status]="item.status">
 *   <ng-template #actions>
 *     <button (click)="onInspect(item.character.id)">Inspect</button>
 *     <button (click)="onDelete(item.character.id)" class="danger">Delete</button>
 *   </ng-template>
 * </app-character-list-item>
 * ```
 */
@Component({
  selector: 'app-character-list-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-list-item.component.html',
  styleUrls: ['./character-list-item.component.scss']
})
export class CharacterListItemComponent {
  /** The character to display */
  @Input({ required: true }) character!: Character

  /** Whether to show alignment column (Training Grounds) */
  @Input() showAlignment = false

  /** Whether to show status column (Training Grounds) */
  @Input() showStatus = false

  /** Character status when showStatus is true */
  @Input() status?: CharacterStatus

  /** Template for action buttons - provided by parent */
  @ContentChild('actions') actionsTemplate?: TemplateRef<unknown>

  /**
   * Get abbreviated class name for compact display
   */
  getClassAbbr(charClass: CharacterClass): string {
    return CLASS_ABBREVIATIONS[charClass] || charClass.substring(0, 3).toUpperCase()
  }

  /**
   * CSS class for the list item based on displayed columns
   */
  get itemClass(): string {
    if (this.showAlignment && this.showStatus) {
      return 'list-item cols-6'  // Name, Class/Lv, Race, Alignment, Status, Actions
    } else if (this.showAlignment || this.showStatus) {
      return 'list-item cols-5'  // Name, Class/Lv, Race, (Alignment|Status), Actions
    }
    return 'list-item cols-4'    // Name, Class/Lv, Race, Actions
  }
}
