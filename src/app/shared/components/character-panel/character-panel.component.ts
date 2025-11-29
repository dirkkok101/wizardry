import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterClass } from '@models/CharacterClass';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';

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
 * Status CSS classes for visual distinction
 */
const STATUS_CLASSES: Record<CharacterStatus, string> = {
  [CharacterStatus.OK]: 'status-ok',
  [CharacterStatus.INJURED]: 'status-ok',  // Injured uses OK styling but different code
  [CharacterStatus.POISONED]: 'status-poisoned',
  [CharacterStatus.PARALYZED]: 'status-paralyzed',
  [CharacterStatus.STONED]: 'status-stoned',
  [CharacterStatus.DEAD]: 'status-dead',
  [CharacterStatus.ASHES]: 'status-ashes',
  [CharacterStatus.LOST]: 'status-lost',
  [CharacterStatus.ASLEEP]: 'status-asleep'
};

/**
 * CharacterPanelComponent - Vertical stack of character cards
 *
 * Displays characters in a compact vertical format with:
 * - Name + Status code
 * - Class abbreviation + Level + HP text
 * - Action buttons ([Inspect], [Cast])
 *
 * Used in the Wizardry 7-style 3-column maze layout.
 */
@Component({
  selector: 'app-character-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './character-panel.component.html',
  styleUrls: ['./character-panel.component.scss']
})
export class CharacterPanelComponent {
  /**
   * Characters to display in this panel
   */
  @Input() characters: Character[] = [];

  /**
   * Panel title (e.g., "LEFT" or "RIGHT")
   */
  @Input() title: string = '';

  /**
   * Actions to display on each character card
   * Can be a static array or a function that returns actions per character
   */
  @Input() actions: CharacterAction[] | ((char: Character) => CharacterAction[]) = [{ type: 'inspect' }];

  /**
   * Which action types to show as visible buttons
   * Defaults to maze-style (inspect, cast-spell)
   * For tavern, use ['remove', 'inspect', 'moveUp', 'moveDown']
   */
  @Input() visibleActionTypes: string[] = ['inspect', 'cast-spell'];

  /**
   * Status text to display on each character card (e.g., selected combat action)
   * Map from character ID to status text
   */
  @Input() statusTexts: Map<string, string> = new Map();

  /**
   * ID of the currently highlighted/active character
   */
  @Input() highlightedCharacterId: string | null = null;

  /**
   * Event emitted when an action is clicked on a character card
   */
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  /**
   * Get status text for a character
   */
  getStatusText(char: Character): string | undefined {
    return this.statusTexts.get(char.id);
  }

  /**
   * Check if character is highlighted/active
   */
  isHighlighted(char: Character): boolean {
    return this.highlightedCharacterId === char.id;
  }

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
   * Get status CSS class
   */
  getStatusClass(status: CharacterStatus): string {
    return STATUS_CLASSES[status] || 'status-ok';
  }

  /**
   * Get HP CSS class based on percentage
   */
  getHPClass(char: Character): string {
    const percentage = char.hp / char.maxHp;
    if (percentage > 0.5) return 'hp-healthy';
    if (percentage > 0.25) return 'hp-warning';
    return 'hp-critical';
  }

  /**
   * Format HP display
   */
  formatHP(char: Character): string {
    return `${char.hp}/${char.maxHp} HP`;
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
   * Get visible actions based on visibleActionTypes input
   */
  getVisibleActions(char: Character): CharacterAction[] {
    return this.getActionsForCharacter(char).filter(
      action => this.visibleActionTypes.includes(action.type)
    );
  }

  /**
   * Get button label for action type
   */
  getActionLabel(actionType: string): string {
    switch (actionType) {
      case 'inspect': return 'Inspect';
      case 'cast-spell': return 'Cast';
      case 'remove': return 'Remove';
      case 'moveUp': return '↑';
      case 'moveDown': return '↓';
      case 'add': return 'Add';
      case 'buy': return 'Buy';
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

  /**
   * Get HP as a percentage (0-100) for the HP bar
   */
  getHPPercentage(char: Character): number {
    if (char.maxHp === 0) return 0;
    return Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100));
  }

  /**
   * Get equipped weapon name or "Unarmed"
   */
  getEquippedWeapon(char: Character): string {
    return char.equippedWeapon?.name || 'Unarmed';
  }

  /**
   * Get spell points display string (e.g., "3/2/1" for levels with points)
   * Returns null if character has no spell points
   */
  getSpellPointsDisplay(char: Character): string | null {
    if (!char.spellPoints) return null;

    const magePool = char.spellPoints.mage;
    const priestPool = char.spellPoints.priest;

    // Extract current points from pool (level1-level7)
    const extractPoints = (pool: typeof magePool): number[] => {
      if (!pool) return [];
      return [
        pool.level1?.current ?? 0,
        pool.level2?.current ?? 0,
        pool.level3?.current ?? 0,
        pool.level4?.current ?? 0,
        pool.level5?.current ?? 0,
        pool.level6?.current ?? 0,
        pool.level7?.current ?? 0
      ];
    };

    const magePoints = extractPoints(magePool);
    const priestPoints = extractPoints(priestPool);

    const hasMagePoints = magePoints.some(p => p > 0);
    const hasPriestPoints = priestPoints.some(p => p > 0);

    if (!hasMagePoints && !hasPriestPoints) return null;

    // Format: show non-zero levels, separated by /
    const formatPoints = (points: number[]): string => {
      const nonZero = points.filter(p => p > 0);
      return nonZero.length > 0 ? nonZero.join('/') : '';
    };

    const mageStr = formatPoints(magePoints);
    const priestStr = formatPoints(priestPoints);

    if (mageStr && priestStr) {
      return `M:${mageStr} P:${priestStr}`;
    }
    return mageStr || priestStr || null;
  }

  /**
   * Check if character is a spellcaster (has any spell points)
   */
  isCaster(char: Character): boolean {
    return this.getSpellPointsDisplay(char) !== null;
  }
}
