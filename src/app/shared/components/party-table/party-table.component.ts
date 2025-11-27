import { Component, Input, Output, EventEmitter, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';

import { CharacterClass } from '@models/CharacterClass';

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
};

/**
 * Status codes for compact display
 */
const STATUS_CODES: Record<CharacterStatus, string> = {
  [CharacterStatus.OK]: 'OK',
  [CharacterStatus.INJURED]: 'INJ',
  [CharacterStatus.POISONED]: 'PSN',
  [CharacterStatus.PARALYZED]: 'PAR',
  [CharacterStatus.STONED]: 'STN',
  [CharacterStatus.DEAD]: 'DED',
  [CharacterStatus.ASHES]: 'ASH',
  [CharacterStatus.LOST]: 'LST',
  [CharacterStatus.ASLEEP]: 'SLP'
};

/**
 * Status colors for visual distinction
 */
const STATUS_COLORS: Record<CharacterStatus, string> = {
  [CharacterStatus.OK]: 'var(--crt-green)',
  [CharacterStatus.INJURED]: '#eab308',
  [CharacterStatus.POISONED]: '#a855f7',
  [CharacterStatus.PARALYZED]: '#eab308',
  [CharacterStatus.STONED]: '#6b7280',
  [CharacterStatus.DEAD]: '#ef4444',
  [CharacterStatus.ASHES]: '#4b5563',
  [CharacterStatus.LOST]: '#374151',
  [CharacterStatus.ASLEEP]: '#3b82f6'
};

/**
 * PartyTableComponent - Compact table display for party members
 *
 * Displays all party members in a dense table format with:
 * - Abbreviated class names (FIG, MAG, etc.)
 * - Inline HP display (current/max)
 * - Status codes with color coding
 * - Icon buttons for actions
 *
 * Designed for space-constrained layouts like the maze scene on laptops.
 */
@Component({
  selector: 'app-party-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './party-table.component.html',
  styleUrls: ['./party-table.component.scss']
})
export class PartyTableComponent {
  private readonly gameState = inject(GameStateService);

  /**
   * Actions to display on each character row
   * Can be a static array or a function that returns actions per character
   */
  @Input() actions: CharacterAction[] | ((char: Character) => CharacterAction[]) = [{ type: 'inspect' }];

  /**
   * Event emitted when an action is clicked on a character row
   */
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  /**
   * Front row characters
   */
  readonly frontRowCharacters = computed(() =>
    GameStateQueries.frontRowCharacters(this.gameState.state())
  );

  /**
   * Back row characters
   */
  readonly backRowCharacters = computed(() =>
    GameStateQueries.backRowCharacters(this.gameState.state())
  );

  /**
   * Check if party is completely empty
   */
  readonly isPartyEmpty = computed(() =>
    this.frontRowCharacters().length === 0 && this.backRowCharacters().length === 0
  );

  /**
   * Get abbreviated class name
   */
  getClassAbbr(charClass: CharacterClass): string {
    return CLASS_ABBREVIATIONS[charClass] || charClass.substring(0, 3).toUpperCase();
  }

  /**
   * Get status code
   */
  getStatusCode(status: CharacterStatus): string {
    return STATUS_CODES[status] || 'UNK';
  }

  /**
   * Get status color
   */
  getStatusColor(status: CharacterStatus): string {
    return STATUS_COLORS[status] || 'var(--crt-green)';
  }

  /**
   * Format HP display
   */
  formatHP(char: Character): string {
    return `${char.hp}/${char.maxHp}`;
  }

  /**
   * Get actions for a specific character
   */
  getActionsForCharacter(char: Character): CharacterAction[] {
    if (typeof this.actions === 'function') {
      return this.actions(char);
    }
    return this.actions;
  }

  /**
   * Get icon for action type
   */
  getActionIcon(actionType: string): string {
    switch (actionType) {
      case 'inspect': return 'I';
      case 'cast-spell': return 'C';
      case 'moveUp': return '↑';
      case 'moveDown': return '↓';
      default: return actionType.charAt(0).toUpperCase();
    }
  }

  /**
   * Get tooltip for action type
   */
  getActionTooltip(actionType: string): string {
    switch (actionType) {
      case 'inspect': return 'Inspect character';
      case 'cast-spell': return 'Cast spell';
      case 'moveUp': return 'Move to front row';
      case 'moveDown': return 'Move to back row';
      default: return actionType;
    }
  }

  /**
   * Handle action button click
   */
  onActionClick(char: Character, actionType: string): void {
    this.actionClick.emit({
      characterId: char.id,
      actionType
    });
  }

  /**
   * Check if character is dead/incapacitated
   */
  isIncapacitated(char: Character): boolean {
    return char.status === CharacterStatus.DEAD ||
           char.status === CharacterStatus.ASHES ||
           char.status === CharacterStatus.LOST;
  }
}
