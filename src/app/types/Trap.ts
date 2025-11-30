import { CharacterClass } from './CharacterClass'
import { CharacterStatus } from './CharacterStatus'

/**
 * All trap types that can be found on treasure chests in Wizardry 1
 * Names must match exactly for disarm mechanics (player types trap name)
 */
export enum TrapType {
  POISON_NEEDLE = 'POISON NEEDLE',
  GAS_BOMB = 'GAS BOMB',
  CROSSBOW_BOLT = 'CROSSBOW BOLT',
  EXPLODING_BOX = 'EXPLODING BOX',
  STUNNER = 'STUNNER',
  TELEPORTER = 'TELEPORTER',
  MAGE_BLASTER = 'MAGE BLASTER',
  PRIEST_BLASTER = 'PRIEST BLASTER',
  ALARM = 'ALARM',
  SPLINTERS = 'SPLINTERS',
  BLADES = 'BLADES'
}

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
  actualTrapType: TrapType        // The real trap (hidden from player)
  fullyRevealed: boolean          // True if CALFO used (all green)
  inspectionCount: number         // How many inspections performed
}

/**
 * Configuration for a trap type's effect
 */
export interface TrapEffect {
  type: TrapType
  name: string                    // Display name for scrambled letters (from JSON data)
  targetMode: TrapTargetMode
  targetClasses?: CharacterClass[]  // For class_specific traps
  damageFormula?: string            // e.g., "2d6", "3d8"
  statusEffect?: CharacterStatus    // Status to apply (POISONED, PARALYZED)
  specialEffect?: TrapSpecialEffect // For TELEPORTER and ALARM
  hitChance?: number                // 0-1 probability (default 1.0 = always hits)
  description: string               // Human-readable description
}

/**
 * Result of a trap inspection attempt
 */
export interface TrapInspectionResult {
  success: boolean
  trapIdentified: TrapType | null  // null if failed or no trap present
  triggered: boolean               // true if critical failure triggered trap
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
  trapType: TrapType
  damageDealt: Map<string, number>  // characterId -> damage
  statusApplied: Map<string, CharacterStatus>  // characterId -> status
  specialEffect?: TrapSpecialEffect
  message: string
}

/**
 * Parse a trap name string to TrapType enum
 * Handles variations in spacing and case
 */
export function parseTrapType(input: string): TrapType | null {
  const normalized = input.trim().toUpperCase().replace(/[\s\-_]+/g, ' ')

  for (const trapType of Object.values(TrapType)) {
    if (trapType === normalized) {
      return trapType
    }
    // Also check without spaces
    if (trapType.replace(/\s/g, '') === normalized.replace(/\s/g, '')) {
      return trapType
    }
  }

  return null
}

/**
 * Check if a trap name input matches the actual trap
 * Used for disarm mechanic where player must type trap name
 */
export function trapNameMatches(input: string, actual: TrapType): boolean {
  const normalizedInput = input.trim().toUpperCase().replace(/[\s\-_]+/g, '')
  const normalizedActual = actual.replace(/[\s\-_]+/g, '')

  return normalizedInput === normalizedActual
}
