import { Alignment } from './Alignment'

/**
 * All available character classes in Wizardry 1
 */
export enum CharacterClass {
  FIGHTER = 'FIGHTER',
  MAGE = 'MAGE',
  PRIEST = 'PRIEST',
  THIEF = 'THIEF',
  BISHOP = 'BISHOP',
  SAMURAI = 'SAMURAI',
  LORD = 'LORD',
  NINJA = 'NINJA'
}

/**
 * Stat requirements for a character class (JSON format)
 */
export interface ClassRequirements {
  str?: number
  int?: number
  pie?: number
  vit?: number
  agi?: number
  luc?: number
}

/**
 * Equipment restrictions for a class
 */
export interface EquipmentRestrictions {
  weapons: string[]      // "all" or specific weapon types
  armor: string[]        // "all", "none", or specific armor types
  shields: string[]      // Empty array = cannot use shields
  helmets: string[]      // Empty array = cannot use helmets
}

/**
 * Spell access definition (for caster classes)
 */
export interface SpellAccess {
  mage?: {
    minLevel: number    // Level when spells become available
    maxLevel: number    // Max spell level (1-7, Samurai/Lord capped at 6)
  }
  priest?: {
    minLevel: number
    maxLevel: number
  }
}

/**
 * Attacks per level mapping (range-based)
 */
export interface AttacksPerLevel {
  [levelRange: string]: number  // e.g. "1-4": 1, "5-9": 2
}

/**
 * Complete class data structure (matches JSON files)
 */
export interface ClassData {
  id: string
  name: string
  description: string
  requirements: ClassRequirements
  alignmentRestrictions: string[]  // "good", "neutral", "evil" (empty = any)
  equipmentRestrictions: EquipmentRestrictions
  hitDice: string                  // "1d4", "1d6", "1d8", "1d10"
  spellAccess: SpellAccess | null
  attacksPerLevel: AttacksPerLevel
  xpTable: number[]                // XP required for levels 2-13 (11 entries)
  specialAbilities: string[]
  canIdentifyItems: boolean
  canDispelUndead: boolean
  canCriticalHit: boolean
}

/**
 * Map class enum to lowercase ID for JSON loading
 */
export function getClassId(charClass: CharacterClass): string {
  return charClass.toLowerCase()
}

/**
 * Map lowercase ID to class enum
 */
export function parseClass(id: string): CharacterClass | null {
  const upperID = id.toUpperCase()
  if (upperID in CharacterClass) {
    return CharacterClass[upperID as keyof typeof CharacterClass]
  }
  return null
}

/**
 * Parse alignment restrictions from JSON strings
 */
export function parseAlignmentRestrictions(restrictions: string[]): Alignment[] {
  return restrictions.map(r => {
    const upper = r.toUpperCase()
    if (upper in Alignment) {
      return Alignment[upper as keyof typeof Alignment]
    }
    throw new Error(`Invalid alignment: ${r}`)
  })
}

/**
 * Get attacks per round for a given level
 */
export function getAttacksForLevel(attacksPerLevel: AttacksPerLevel, level: number): number {
  // Find matching range
  for (const [range, attacks] of Object.entries(attacksPerLevel)) {
    if (range.includes('+')) {
      // "1+" means level 1 and up
      const minLevel = parseInt(range.replace('+', ''))
      if (level >= minLevel) {
        return attacks
      }
    } else if (range.includes('-')) {
      // "1-4" means levels 1 through 4
      const [min, max] = range.split('-').map(Number)
      if (level >= min && level <= max) {
        return attacks
      }
    }
  }

  // Default to 1 if no range found
  return 1
}

// DEPRECATED: Old CLASS_REQUIREMENTS interface and mapping will be removed after migration
// TODO: Remove after all services migrated to ClassData
/**
 * @deprecated Use ClassData interface from JSON files instead
 */
export interface OldClassRequirements {
  strength?: number
  intelligence?: number
  piety?: number
  vitality?: number
  agility?: number
  luck?: number
  alignment?: Alignment[]
}

/**
 * @deprecated Use ClassData interface from JSON files instead
 */
export const CLASS_REQUIREMENTS: Record<CharacterClass, OldClassRequirements> = {
  [CharacterClass.FIGHTER]: {},
  [CharacterClass.MAGE]: {},
  [CharacterClass.PRIEST]: {},
  [CharacterClass.THIEF]: {},
  [CharacterClass.BISHOP]: {
    intelligence: 12,
    piety: 12
  },
  [CharacterClass.SAMURAI]: {
    strength: 15,
    intelligence: 11,
    piety: 10,
    vitality: 14,
    agility: 10,
    alignment: [Alignment.GOOD]
  },
  [CharacterClass.LORD]: {
    strength: 15,
    intelligence: 12,
    piety: 12,
    vitality: 15,
    agility: 14,
    alignment: [Alignment.GOOD]
  },
  [CharacterClass.NINJA]: {
    strength: 17,
    intelligence: 17,
    piety: 17,
    vitality: 17,
    agility: 17,
    alignment: [Alignment.EVIL]
  }
}
