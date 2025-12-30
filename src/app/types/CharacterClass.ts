import { Alignment } from './Alignment';

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
  NINJA = 'NINJA',
}

/**
 * Stat requirements for a character class (JSON format)
 */
export interface ClassRequirements {
  str?: number;
  int?: number;
  pie?: number;
  vit?: number;
  agi?: number;
  luc?: number;
}

/**
 * Equipment restrictions for a class
 */
export interface EquipmentRestrictions {
  weapons: string[]; // "all" or specific weapon types
  armor: string[]; // "all", "none", or specific armor types
  shields: string[]; // Empty array = cannot use shields
  helmets: string[]; // Empty array = cannot use helmets
}

/**
 * Spell access definition (for caster classes)
 */
export interface SpellAccess {
  mage?: {
    minLevel: number; // Level when spells become available
    maxLevel: number; // Max spell level (1-7, Samurai/Lord capped at 6)
  };
  priest?: {
    minLevel: number;
    maxLevel: number;
  };
}

/**
 * Attacks per level - formula-based format
 */
export interface AttacksPerLevelFormula {
  formula: string; // e.g. "(level / 5) + 1"
  max: number; // Maximum attacks per round
}

/**
 * Attacks per level mapping (range-based)
 */
export interface AttacksPerLevelRange {
  [levelRange: string]: number; // e.g. "1-4": 1, "5-9": 2
}

/**
 * Attacks per level - supports both formula and range formats
 */
export type AttacksPerLevel = AttacksPerLevelFormula | AttacksPerLevelRange;

/**
 * Saving throw bonuses (negative modifiers = better saves)
 */
export interface SavingThrowBonuses {
  death?: number;
  wand?: number;
  breath?: number;
  petrify?: number;
  spell?: number;
}

/**
 * Resistances - percentage-based protection
 */
export interface Resistances {
  [key: string]: number | string; // numeric value or notes string
}

/**
 * Spell point formula entry
 * Formula: gain spell point at level (A + B*N) for spell level N
 */
export interface SpellPointFormulaEntry {
  A: number;
  B: number;
}

/**
 * Spell point formula for caster classes
 */
export interface SpellPointFormula {
  mage?: SpellPointFormulaEntry;
  priest?: SpellPointFormulaEntry;
}

/**
 * Spell level access - levels at which each spell level becomes available
 */
export interface SpellLevelAccess {
  mage?: number[]; // Array of 7 levels (spell levels 1-7)
  priest?: number[]; // Array of 7 levels (spell levels 1-7)
}

/**
 * Complete class data structure (matches JSON files)
 */
export interface ClassData {
  id: string;
  name: string;
  description: string;
  requirements: ClassRequirements;
  alignmentRestrictions: string[];
  equipmentRestrictions: EquipmentRestrictions;
  hitDice: string;
  hitDiceBonus?: string;
  spellAccess: SpellAccess | null;
  attacksPerLevel: AttacksPerLevel;
  xpTable: number[]; // XP required for levels 2-13+ (11-12 entries)
  xpPerLevelAfter13?: number; // XP per level after 13
  savingThrowBonuses?: SavingThrowBonuses;
  resistances?: Resistances;
  spellPointFormula?: SpellPointFormula;
  spellLevelAccess?: SpellLevelAccess;
  specialAbilities: string[];
  canIdentifyItems: boolean;
  canDispelUndead: boolean;
  dispelUndeadPenalty?: number;
  dispelUndeadMinLevel?: number;
  canCriticalHit: boolean;
  trapInspectionMultiplier?: number;
}

/**
 * Map class enum to lowercase ID for JSON loading
 */
export function getClassId(charClass: CharacterClass): string {
  return charClass.toLowerCase();
}

/**
 * Map lowercase ID to class enum
 */
export function parseClass(id: string): CharacterClass | null {
  const upperID = id.toUpperCase();
  if (upperID in CharacterClass) {
    return CharacterClass[upperID as keyof typeof CharacterClass];
  }
  return null;
}

/**
 * Parse alignment restrictions from JSON strings
 */
export function parseAlignmentRestrictions(restrictions: string[]): Alignment[] {
  return restrictions.map((r) => {
    const upper = r.toUpperCase();
    if (upper in Alignment) {
      return Alignment[upper as keyof typeof Alignment];
    }
    throw new Error(`Invalid alignment: ${r}`);
  });
}

/**
 * Type guard to check if attacksPerLevel is formula-based
 */
export function isFormulaBasedAttacks(
  attacksPerLevel: AttacksPerLevel,
): attacksPerLevel is AttacksPerLevelFormula {
  return 'formula' in attacksPerLevel && 'max' in attacksPerLevel;
}

/**
 * Get attacks per round for a given level
 * Supports both formula-based and range-based formats
 */
export function getAttacksForLevel(attacksPerLevel: AttacksPerLevel, level: number): number {
  // Handle formula-based format
  if (isFormulaBasedAttacks(attacksPerLevel)) {
    // Evaluate the formula safely (only supports simple formulas)
    const formula = attacksPerLevel.formula;
    // Parse "(level / N) + M" style formulas
    const match = formula.match(/\(level\s*\/\s*(\d+)\)\s*\+\s*(\d+)/);
    if (match) {
      const divisor = parseInt(match[1]);
      const base = parseInt(match[2]);
      const attacks = Math.floor(level / divisor) + base;
      return Math.min(attacks, attacksPerLevel.max);
    }
    // Fallback: just return 1 if formula not understood
    return 1;
  }

  // Handle range-based format
  for (const [range, attacks] of Object.entries(attacksPerLevel)) {
    if (range.includes('+')) {
      // "1+" means level 1 and up
      const minLevel = parseInt(range.replace('+', ''));
      if (level >= minLevel) {
        return attacks;
      }
    } else if (range.includes('-')) {
      // "1-4" means levels 1 through 4
      const [min, max] = range.split('-').map(Number);
      if (level >= min && level <= max) {
        return attacks;
      }
    }
  }

  // Default to 1 if no range found
  return 1;
}
