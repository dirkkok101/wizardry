import { CharacterStatus } from '../types/CharacterStatus';
import { Character } from '../types/Character';
import { CharacterField } from '../types/CharacterCardTypes';

/**
 * Formats character hit points as "current/max" string.
 * @param current - Current hit points
 * @param max - Maximum hit points
 * @returns Formatted string (e.g., "25/40")
 */
export function formatHP(current: number, max: number): string {
  return `${current}/${max}`;
}

/**
 * Maps character status to CSS class name for styling.
 *
 * Afflicted statuses (POISONED, ASLEEP, PARALYZED, INJURED) map to 'status-afflicted'.
 * Death-related statuses (DEAD, ASHES, LOST, STONED) each have unique classes.
 *
 * @param status - Character status enum value
 * @returns CSS class name for status styling (e.g., 'status-ok', 'status-afflicted')
 */
export function getStatusColorClass(status: CharacterStatus): string {
  const statusMap: Record<CharacterStatus, string> = {
    [CharacterStatus.OK]: 'status-ok',
    [CharacterStatus.INJURED]: 'status-afflicted',
    [CharacterStatus.DEAD]: 'status-dead',
    [CharacterStatus.ASHES]: 'status-ashes',
    [CharacterStatus.LOST]: 'status-lost',
    [CharacterStatus.PARALYZED]: 'status-afflicted',
    [CharacterStatus.ASLEEP]: 'status-afflicted',
    [CharacterStatus.POISONED]: 'status-afflicted',
    [CharacterStatus.STONED]: 'status-ashes'
  };

  return statusMap[status] || 'status-ok';
}

/**
 * Provides default button labels for character card actions.
 *
 * Returns predefined labels for common action types (inspect, add, remove, delete, moveUp, moveDown).
 * For unknown action types, capitalizes the first letter of the type string.
 *
 * @param type - Action type identifier (e.g., 'inspect', 'add', 'custom-action')
 * @returns Human-readable button label (e.g., 'Inspect', 'Add', 'Custom-action')
 */
export function getDefaultActionLabel(type: string): string {
  const labels: Record<string, string> = {
    inspect: 'Inspect',
    add: 'Add',
    remove: 'Remove',
    delete: 'Delete',
    moveUp: '↑',
    moveDown: '↓'
  };

  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Extracts and formats character stat values for display.
 *
 * Handles different field types with appropriate formatting:
 * - hp: Formatted as "current/max" (e.g., "25/40")
 * - level, ac: Converted to string
 * - race, class, alignment: Used directly
 *
 * @param field - The stat field to format (e.g., 'hp', 'level', 'race')
 * @param character - Character object containing the stat values
 * @returns Formatted stat value as string
 */
export function formatStatValue(field: CharacterField, character: Character): string {
  switch (field) {
    case 'race':
      return character.race;
    case 'class':
      return character.class;
    case 'level':
      return character.level.toString();
    case 'hp':
      return formatHP(character.hp, character.maxHp);
    case 'ac':
      return character.ac.toString();
    case 'alignment':
      return character.alignment;
    default:
      return '';
  }
}
