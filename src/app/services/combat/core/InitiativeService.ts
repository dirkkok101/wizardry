/**
 * Initiative Service
 *
 * Handles initiative calculation for combat turn order.
 * Based on authentic Wizardry 1 Apple II mechanics.
 *
 * Formula:
 * - Characters: 1d10 + agility modifier (clamped 1-10)
 * - Monsters: 1d8 + 1 (range 2-9)
 *
 * Lower initiative = faster action
 *
 * @see docs/research/combat-formulas.md
 */

import { Combatant, MonsterInstance } from '@models/Combat'
import { RandomService } from '@services/RandomService'
import { AGILITY_MODIFIERS, INITIATIVE } from '../CombatConstants'

/**
 * Get agility-to-initiative modifier from lookup table
 * Lower values = act sooner
 *
 * @param agility - Character's agility stat (3-18)
 * @returns Initiative modifier (-5 to +2)
 */
export function getAgilityModifier(agility: number): number {
  // Find the appropriate threshold
  for (const [threshold, modifier] of AGILITY_MODIFIERS) {
    if (agility <= threshold) {
      return modifier
    }
  }
  // AGI 18+ = fastest (-5)
  return -5
}

/**
 * Calculate initiative for a character
 *
 * Formula: 1d10 + agility modifier (clamped 1-10)
 *
 * @param agility - Character's agility stat
 * @returns Initiative value (1-10, lower = faster)
 */
export function calculateCharacterInitiative(agility: number): number {
  const baseRoll = RandomService.random(
    INITIATIVE.CHARACTER_DICE_MIN,
    INITIATIVE.CHARACTER_DICE_MAX
  )
  const agilityMod = getAgilityModifier(agility)

  return Math.max(
    INITIATIVE.MIN_INITIATIVE,
    Math.min(INITIATIVE.MAX_INITIATIVE, baseRoll + agilityMod)
  )
}

/**
 * Calculate initiative for a monster
 *
 * Formula: 1d8 + 1 (range 2-9)
 *
 * @returns Initiative value (2-9)
 */
export function calculateMonsterInitiative(): number {
  return RandomService.random(
    INITIATIVE.MONSTER_DICE_MIN,
    INITIATIVE.MONSTER_DICE_MAX
  ) + INITIATIVE.MONSTER_BONUS
}

/**
 * Calculate initiative for any combatant
 *
 * @param combatant - Character or Monster
 * @returns Initiative value (lower = acts sooner)
 */
export function calculateInitiative(combatant: Combatant): number {
  // Check if combatant is a monster (has monsterId property)
  const isMonster = 'monsterId' in combatant

  if (isMonster) {
    return calculateMonsterInitiative()
  }

  // Character: use agility for initiative
  const agility = combatant.agility ?? 10
  return calculateCharacterInitiative(agility)
}

/**
 * Type guard to check if combatant is a monster
 */
export function isMonsterCombatant(combatant: Combatant): combatant is MonsterInstance {
  return 'monsterId' in combatant
}

/**
 * Initiative Service class (static methods for backward compatibility)
 */
export class InitiativeService {
  static getAgilityModifier = getAgilityModifier
  static calculateCharacterInitiative = calculateCharacterInitiative
  static calculateMonsterInitiative = calculateMonsterInitiative
  static calculateInitiative = calculateInitiative
  static isMonsterCombatant = isMonsterCombatant
}
