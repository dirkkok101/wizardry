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
   * Event emitted when an action is clicked on a character card
   */
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

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
   * Get HP color based on percentage
   */
  getHPColor(char: Character): string {
    const percentage = char.hp / char.maxHp;
    if (percentage > 0.5) return 'var(--crt-green)';
    if (percentage > 0.25) return '#eab308';
    return '#ef4444';
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
   * Get visible actions (exclude moveUp/moveDown, only show inspect and cast-spell)
   */
  getVisibleActions(char: Character): CharacterAction[] {
    return this.getActionsForCharacter(char).filter(
      action => action.type === 'inspect' || action.type === 'cast-spell'
    );
  }

  /**
   * Get button label for action type
   */
  getActionLabel(actionType: string): string {
    switch (actionType) {
      case 'inspect': return 'Inspect';
      case 'cast-spell': return 'Cast';
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
        pool.level1.current,
        pool.level2.current,
        pool.level3.current,
        pool.level4.current,
        pool.level5.current,
        pool.level6.current,
        pool.level7.current
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
