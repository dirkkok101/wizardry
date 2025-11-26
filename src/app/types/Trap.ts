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
  ALARM = 'ALARM'
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
 * Configuration for a trap type's effect
 */
export interface TrapEffect {
  type: TrapType
  targetMode: TrapTargetMode
  targetClasses?: CharacterClass[]  // For class_specific traps
  damageFormula?: string            // e.g., "2d6", "3d8"
  statusEffect?: CharacterStatus    // Status to apply (POISONED, PARALYZED)
  specialEffect?: TrapSpecialEffect // For TELEPORTER and ALARM
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
 * Default trap effects configuration
 * Maps each trap type to its effect
 */
export const TRAP_EFFECTS: Record<TrapType, TrapEffect> = {
  [TrapType.POISON_NEEDLE]: {
    type: TrapType.POISON_NEEDLE,
    targetMode: 'opener',
    damageFormula: '1d6',
    statusEffect: CharacterStatus.POISONED,
    description: 'Poisons the opener'
  },
  [TrapType.GAS_BOMB]: {
    type: TrapType.GAS_BOMB,
    targetMode: 'party',
    damageFormula: '2d6',
    statusEffect: CharacterStatus.POISONED,
    description: 'Poison gas affects entire party'
  },
  [TrapType.CROSSBOW_BOLT]: {
    type: TrapType.CROSSBOW_BOLT,
    targetMode: 'opener',
    damageFormula: '2d8',
    description: 'Fires a crossbow bolt at the opener'
  },
  [TrapType.EXPLODING_BOX]: {
    type: TrapType.EXPLODING_BOX,
    targetMode: 'party',
    damageFormula: '3d6',
    description: 'Explodes, damaging entire party'
  },
  [TrapType.STUNNER]: {
    type: TrapType.STUNNER,
    targetMode: 'opener',
    damageFormula: '1d4',
    statusEffect: CharacterStatus.PARALYZED,
    description: 'Paralyzes the opener'
  },
  [TrapType.TELEPORTER]: {
    type: TrapType.TELEPORTER,
    targetMode: 'special',
    specialEffect: 'teleport',
    description: 'Teleports party to random location'
  },
  [TrapType.MAGE_BLASTER]: {
    type: TrapType.MAGE_BLASTER,
    targetMode: 'class_specific',
    targetClasses: [CharacterClass.MAGE, CharacterClass.BISHOP],
    damageFormula: '4d6',
    description: 'Damages all Mages and Bishops'
  },
  [TrapType.PRIEST_BLASTER]: {
    type: TrapType.PRIEST_BLASTER,
    targetMode: 'class_specific',
    targetClasses: [CharacterClass.PRIEST, CharacterClass.BISHOP, CharacterClass.LORD],
    damageFormula: '4d6',
    description: 'Damages all Priests, Bishops, and Lords'
  },
  [TrapType.ALARM]: {
    type: TrapType.ALARM,
    targetMode: 'special',
    specialEffect: 'combat',
    description: 'Triggers monster encounter'
  }
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
