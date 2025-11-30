import { CharacterClass } from './CharacterClass'
import { CharacterStatus } from './CharacterStatus'

/**
 * Trap ID type - string identifier for traps
 * IDs are loaded from JSON files in data/traps/
 * Validated at runtime by Zod schema
 */
export type TrapId = string

/**
 * @deprecated Use TrapId instead. Kept for backward compatibility during migration.
 */
export type TrapType = TrapId

/**
 * Re-export TrapEffectType from schema for convenience
 */
export type { TrapEffectType, ValidatedTrap } from '@validation/trap-schema'

/**
 * Who a trap affects when triggered
 */
export type TrapTargetMode =
  | 'opener'         // Only the character opening the chest
  | 'party'          // Entire party
  | 'class_specific' // Only specific classes (mages, priests, etc.)
  | 'special'        // Special effect (teleport, combat, etc.)

/**
 * Special effects that traps can have beyond damage/status
 */
export type TrapSpecialEffect =
  | 'teleport'  // TELEPORTER - moves party to random location
  | 'combat'    // ALARM - triggers monster encounter

/**
 * Letter revelation states for scrambled trap identification
 */
export type LetterState = 'green' | 'red' | 'hidden' | 'excluded'

/**
 * A single letter in the scrambled trap display
 */
export interface ScrambledLetter {
  char: string           // The letter character (A-Z or space)
  state: LetterState     // Revelation state
  position: number       // Original position in actual trap name (for matching)
}

/**
 * Complete scrambled trap state for UI display
 */
export interface ScrambledTrapState {
  letters: ScrambledLetter[]      // Scrambled letters with states
  actualTrapId: TrapId            // The real trap ID (hidden from player)
  trapName: string                // Display name for the trap
  fullyRevealed: boolean          // True if CALFO used (all green)
  inspectionCount: number         // How many inspections performed
}

/**
 * Configuration for a trap type's effect
 * This is the runtime format after loading from JSON
 */
export interface TrapEffect {
  id: TrapId                        // Trap identifier (e.g., "POISON_NEEDLE")
  name: string                      // Display name for scrambled letters (e.g., "POISON NEEDLE")
  targetMode: TrapTargetMode
  targetClasses?: CharacterClass[]  // For class_specific traps
  damageFormula?: string            // e.g., "2d6", "3d8"
  statusEffect?: CharacterStatus    // Status to apply (POISONED, PARALYZED)
  specialEffect?: TrapSpecialEffect // For TELEPORTER and ALARM
  hitChance?: number                // 0-1 probability (default 1.0 = always hits)
  description: string               // Human-readable description
  effectType: string                // Effect type for routing (damage, condition, teleport, alarm)
  tiers: number[]                   // Which reward tiers this trap can appear in
}

/**
 * Result of a trap inspection attempt
 */
export interface TrapInspectionResult {
  success: boolean
  trapIdentified: TrapId | null  // null if failed or no trap present
  triggered: boolean             // true if critical failure triggered trap
}

/**
 * Result of a trap disarm attempt
 */
export interface TrapDisarmResult {
  success: boolean
  triggered: boolean
  wrongName: boolean               // true if player entered wrong trap name
}

/**
 * Result of a trap being triggered
 */
export interface TrapTriggerResult {
  trapId: TrapId
  trapName: string
  damageDealt: Map<string, number>  // characterId -> damage
  statusApplied: Map<string, CharacterStatus>  // characterId -> status
  specialEffect?: TrapSpecialEffect
  message: string
}

/**
 * Check if a trap name input matches the actual trap name
 * Used for disarm mechanic where player must type trap name
 *
 * @param input - User's input string
 * @param actualName - The trap's display name (from TrapEffect.name)
 * @returns true if the names match (case-insensitive, ignoring spaces/hyphens)
 */
export function trapNameMatches(input: string, actualName: string): boolean {
  const normalizedInput = input.trim().toUpperCase().replace(/[\s\-_]+/g, '')
  const normalizedActual = actualName.trim().toUpperCase().replace(/[\s\-_]+/g, '')

  return normalizedInput === normalizedActual
}
