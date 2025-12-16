// src/app/utils/CombatDisplayUtils.ts

import { CombatCommand, MonsterGroup } from '@models/Combat';
import { getIdentifiedGroupDisplayText } from './MonsterNameUtils';

/**
 * Combat display formatting utilities
 * Pure functions for formatting combat actions and targets
 */

/**
 * Get display text for a combat command
 *
 * @param command - The combat command to format
 * @param monsterGroups - Monster groups for target name resolution
 * @returns Formatted display text (e.g., "Attack → 3 KOBOLDS")
 */
export function getCombatActionDisplayText(
  command: CombatCommand,
  monsterGroups: MonsterGroup[]
): string {
  const groupId = command.data?.groupId as 'A' | 'B' | 'C' | 'D' | undefined;
  const targetText = groupId
    ? ` → ${getTargetGroupDisplayName(groupId, monsterGroups)}`
    : '';

  switch (command.type) {
    case 'ATTACK':
      return `Attack${targetText}`;
    case 'PARRY':
      return 'Parry';
    case 'RUN':
      return 'Flee';
    case 'CAST_SPELL':
      const spellId = command.data?.spellId;
      if (spellId) return `${String(spellId).toUpperCase()}${targetText}`;
      return `Cast${targetText}`;
    default:
      return command.type;
  }
}

/**
 * Get display name for a target monster group
 *
 * @param groupId - Monster group identifier (A, B, C, D)
 * @param monsterGroups - All monster groups in combat
 * @returns Formatted name like "3 KOBOLDS" or fallback to group letter
 */
export function getTargetGroupDisplayName(
  groupId: 'A' | 'B' | 'C' | 'D',
  monsterGroups: MonsterGroup[]
): string {
  const group = monsterGroups.find(g => g.id === groupId);
  if (!group) return groupId;

  const aliveCount = group.monsters.filter(m => m.hp > 0).length;
  if (aliveCount === 0) return groupId;

  const firstMonster = group.monsters[0];
  return getIdentifiedGroupDisplayText(aliveCount, firstMonster, group.identified);
}
