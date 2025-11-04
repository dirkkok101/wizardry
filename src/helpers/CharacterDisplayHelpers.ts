import { CharacterStatus } from '../types/CharacterStatus';
import { Character } from '../types/Character';
import { CharacterField } from '../types/CharacterCardTypes';

export function formatHP(current: number, max: number): string {
  return `${current}/${max}`;
}

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
