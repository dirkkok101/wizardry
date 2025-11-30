// src/app/types/CharacterResistance.ts

/**
 * All resistance types for characters
 * Based on Wizardry 1 trap and combat mechanics
 */
export type ResistanceType =
  // Trap-specific resistances
  | 'poisonGasTrap'   // Gas Bomb trap (Dwarf +20%, Thief/Ninja +15%)
  | 'antiMageTrap'    // Anti-Mage trap (Hobbit +15%, Mage +15%, Bishop +10%)
  | 'antiPriestTrap'  // Anti-Priest trap (Hobbit +15%, Bishop +10%)
  // Status effect resistances
  | 'poison'          // Poison status (Human +5%, Fighter +15%, Ninja +15%)
  | 'paralysis'       // Paralysis status (Human +5%, Fighter +15%, Ninja +15%)
  | 'stoning'         // Petrification (Gnome +10%, Priest +15%, Bishop +10%)
  | 'silence'         // Silence status (Hobbit +15%, Mage +15%)
  // Combat resistances
  | 'critical'        // Critical hits (Human +5%, Fighter +15%, Ninja +15%)
  | 'breath'          // Breath attacks - half damage (Elf +10%, Ninja +20%)

/**
 * Breakdown of resistance sources
 */
export interface ResistanceBreakdown {
  classBonus: number
  raceBonus: number
  levelBonus: number
  luckBonus: number
  total: number
}

/**
 * Result of a character resistance check
 */
export interface CharacterResistanceResult {
  /** Whether the effect was resisted (always false for breath - use damageMultiplier) */
  resisted: boolean
  /** Calculated resistance percentage (0-95) */
  resistChance: number
  /** Damage multiplier: 1.0 normal, 0.5 for halved breath attacks */
  damageMultiplier: number
  /** Breakdown of resistance sources for debugging/display */
  breakdown: ResistanceBreakdown
}

/**
 * Typed resistance bonuses for race/class JSON files
 * All values are percentages (0-100)
 */
export interface CharacterResistances {
  // Trap-specific
  poisonGasTrap?: number
  antiMageTrap?: number
  antiPriestTrap?: number
  // Status effects
  poison?: number
  paralysis?: number
  stoning?: number
  silence?: number
  // Combat
  critical?: number
  breath?: number
  // Optional notes field for JSON documentation
  notes?: string
}
