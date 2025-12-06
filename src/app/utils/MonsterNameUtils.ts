// src/utils/MonsterNameUtils.ts

import { MonsterInstance } from '@models/Combat'

/**
 * Utility functions for monster name formatting
 * Follows original Wizardry (1981) naming conventions
 */

/**
 * Get the appropriate monster name based on identification status
 *
 * Before LATUMAPIC: Returns unidentifiedName (e.g., "Small Humanoid")
 * After LATUMAPIC: Returns true name (e.g., "Kobold")
 *
 * @param monster - Monster instance with both name fields
 * @param identified - Whether the monster group is identified (LATUMAPIC active)
 * @returns Display name based on identification status
 */
export function getMonsterDisplayName(
  monster: MonsterInstance,
  identified: boolean
): string {
  return identified ? monster.name : monster.unidentifiedName
}

/**
 * Get formatted group display text with identification support
 *
 * Uses unidentifiedName or real name based on LATUMAPIC status,
 * then formats with count and pluralization.
 *
 * @param count - Number of alive monsters in group
 * @param monster - Monster instance (for name access)
 * @param identified - Whether the group is identified
 * @returns Formatted display (e.g., "3 ORCS" or "3 SMALL HUMANOIDS")
 */
export function getIdentifiedGroupDisplayText(
  count: number,
  monster: MonsterInstance,
  identified: boolean
): string {
  const displayName = getMonsterDisplayName(monster, identified)
  return getGroupDisplayText(count, displayName)
}

/**
 * Convert singular monster name to plural form (uppercase)
 * Based on original Wizardry monster naming patterns
 *
 * @param name - Singular monster name (e.g., "Kobold", "Orc")
 * @returns Plural form in uppercase (e.g., "KOBOLDS", "ORCS")
 *
 * @example
 * getPluralMonsterName("Orc") // "ORCS"
 * getPluralMonsterName("Zombie") // "ZOMBIES"
 * getPluralMonsterName("Gas Dragon") // "GAS DRAGONS"
 */
export function getPluralMonsterName(name: string): string {
  const upperName = name.toUpperCase()

  // Special cases for irregular plurals
  const irregularPlurals: Record<string, string> = {
    'WEREWOLF': 'WEREWOLVES',
    'WOLF': 'WOLVES',
    'ELF': 'ELVES',
    'DWARF': 'DWARVES',
    'HALF-ELF': 'HALF-ELVES',
    'HALF-DWARF': 'HALF-DWARVES'
  }

  // Check for exact match in irregular plurals
  if (irregularPlurals[upperName]) {
    return irregularPlurals[upperName]
  }

  // Handle names ending in 'Y' (preceded by consonant) → 'IES'
  if (upperName.endsWith('Y') && upperName.length > 1) {
    const beforeY = upperName[upperName.length - 2]
    // Check if letter before Y is a consonant
    if (!/[AEIOU]/.test(beforeY)) {
      return upperName.slice(0, -1) + 'IES'
    }
  }

  // Handle names ending in 'S', 'X', 'Z', 'CH', 'SH' → 'ES'
  if (upperName.endsWith('S') || upperName.endsWith('X') || upperName.endsWith('Z')) {
    return upperName + 'ES'
  }
  if (upperName.endsWith('CH') || upperName.endsWith('SH')) {
    return upperName + 'ES'
  }

  // Default: add 'S'
  return upperName + 'S'
}

/**
 * Get formatted group display text matching original Wizardry format
 * Format: "{count} {PLURAL_NAME}"
 *
 * @param count - Number of monsters in group
 * @param monsterName - Singular monster name
 * @returns Formatted display text (e.g., "3 ORCS", "5 ZOMBIES")
 *
 * @example
 * getGroupDisplayText(3, "Orc") // "3 ORCS"
 * getGroupDisplayText(1, "Zombie") // "1 ZOMBIE"
 * getGroupDisplayText(5, "Gas Dragon") // "5 GAS DRAGONS"
 */
export function getGroupDisplayText(count: number, monsterName: string): string {
  if (count === 1) {
    return `1 ${monsterName.toUpperCase()}`
  }
  return `${count} ${getPluralMonsterName(monsterName)}`
}
