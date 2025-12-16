/**
 * TrapDisarmService - Handles trap disarming mechanics
 *
 * Implements original Wizardry 1 trap disarm formulas:
 * - Disarm: (EffectiveLevel - MazeLevel) / 70, with +50 bonus for Thief/Ninja
 * - Failed disarm avoidance: AGI × 5%
 * - Wrong trap name: Character level × 0.1% to avoid trigger
 *
 * @see docs/research/combat-formulas.md
 */

import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { Chest } from '@models/Chest'
import {
  TrapDisarmResult,
  trapNameMatches,
} from '@models/Trap'
import { RandomService } from '../RandomService'
import { getTrapEffect } from './TrapEffectService'

/**
 * Classes that get the +50 disarm bonus
 */
const DISARM_BONUS_CLASSES = new Set([CharacterClass.THIEF, CharacterClass.NINJA])

/**
 * Maximum disarm success chance (95%)
 */
const MAX_SUCCESS_CHANCE = 95

/**
 * Calculate trap disarm success chance
 *
 * Formula: (EffectiveLevel - MazeLevel) / 70
 * - Thieves/Ninjas get +50 effective level bonus
 * - Capped at 0% minimum, 95% maximum
 *
 * Examples (Maze Level 1):
 * - Level 1 Thief: (1+50-1)/70 = 71%
 * - Level 10 Thief: (10+50-1)/70 = 84%
 * - Level 1 Fighter: (1+0-1)/70 = 0%
 * - Level 51 Fighter: (51+0-1)/70 = 71%
 */
export function calculateDisarmChance(character: Character, mazeLevel: number): number {
  const levelBonus = DISARM_BONUS_CLASSES.has(character.class) ? 50 : 0
  const effectiveLevel = character.level + levelBonus

  // Original formula
  const chance = ((effectiveLevel - mazeLevel) / 70) * 100
  return Math.max(0, Math.min(chance, MAX_SUCCESS_CHANCE))
}

/**
 * Calculate chance to avoid triggering trap after failed disarm
 *
 * Formula: AGI × 5%
 * This gives the character another chance to retry if they fail to disarm
 */
export function calculateTriggerAvoidance(character: Character): number {
  return character.agility * 5
}

/**
 * Calculate trigger chance when entering wrong trap name
 *
 * Original formula from Wizardry 1 source code:
 * - Character level × 0.1% chance to NOT trigger
 * - This means ~99%+ trigger rate at any reasonable level
 *
 * @param characterLevel The level of the character attempting disarm
 * @returns Percentage chance to trigger trap (0-100)
 */
export function calculateWrongNameTriggerChance(characterLevel: number): number {
  // Chance to NOT trigger = level × 0.1%
  // Chance to TRIGGER = 100 - (level × 0.1)
  return Math.max(0, 100 - (characterLevel * 0.1))
}

/**
 * Attempt to disarm a trap
 *
 * @param character Character attempting disarm
 * @param chest The chest being disarmed
 * @param enteredTrapName The trap name entered by player
 * @returns DisarmResult with success, trigger, and wrongName status
 */
export function attemptDisarm(
  character: Character,
  chest: Chest,
  enteredTrapName: string
): TrapDisarmResult {
  console.log(`[CHEST] Disarm attempt: ${character.name} (${character.class} L${character.level})`)

  // Get the actual trap name from loaded data
  if (!chest.trapId) {
    console.log(`[CHEST]   Error: Chest has no trapId!`)
    return {
      success: false,
      triggered: false,
      wrongName: true
    }
  }

  const trapEffect = getTrapEffect(chest.trapId)
  const actualTrapName = trapEffect.name

  // Check if trap name matches
  const nameMatches = trapNameMatches(enteredTrapName, actualTrapName)
  console.log(`[CHEST]   Name match: "${enteredTrapName}" vs "${actualTrapName}" → ${nameMatches ? 'Match' : 'MISMATCH'}`)

  if (!nameMatches) {
    // Wrong trap name - check if it triggers
    // Original formula uses character level (higher level = tiny chance to avoid trigger)
    const triggerChance = calculateWrongNameTriggerChance(character.level)
    const triggerRoll = RandomService.nextRandom() * 100
    const triggered = triggerRoll < triggerChance
    console.log(`[CHEST]   Wrong name penalty: L${character.level} → ${(100 - triggerChance).toFixed(1)}% avoid chance`)
    console.log(`[CHEST]   Trigger roll: ${triggerRoll.toFixed(1)}% vs ${triggerChance.toFixed(1)}% → ${triggered ? 'TRIGGERED!' : 'Avoided'}`)
    return {
      success: false,
      triggered,
      wrongName: true
    }
  }

  // Correct trap name - attempt disarm
  // Formula: (EffectiveLevel - MazeLevel) / 70, Thief/Ninja get +50 level bonus
  const disarmChance = calculateDisarmChance(character, chest.mazeLevel)
  const levelBonus = DISARM_BONUS_CLASSES.has(character.class) ? 50 : 0
  const effectiveLevel = character.level + levelBonus
  console.log(`[CHEST]   Disarm chance: (EffLvl ${effectiveLevel} - MazeLvl ${chest.mazeLevel}) / 70 = ${disarmChance.toFixed(1)}%`)

  const disarmRoll = RandomService.nextRandom() * 100
  const success = disarmRoll < disarmChance
  console.log(`[CHEST]   Disarm roll: ${disarmRoll.toFixed(1)}% vs ${disarmChance.toFixed(1)}% → ${success ? 'Success!' : 'Fail'}`)

  if (success) {
    console.log(`[CHEST]   Result: Trap disarmed!`)
    return {
      success: true,
      triggered: false,
      wrongName: false
    }
  }

  // Failed disarm - check AGI save to avoid triggering
  // Formula: AGI × 5%
  const avoidChance = calculateTriggerAvoidance(character)
  const avoidRoll = RandomService.nextRandom() * 100
  const avoided = avoidRoll < avoidChance
  console.log(`[CHEST]   AGI save (failed disarm): AGI ${character.agility} × 5% = ${avoidChance}%`)
  console.log(`[CHEST]   Save roll: ${avoidRoll.toFixed(1)}% vs ${avoidChance}% → ${avoided ? 'Saved' : 'TRIGGERED!'}`)

  return {
    success: false,
    triggered: !avoided,
    wrongName: false
  }
}

export const TrapDisarmService = {
  calculateDisarmChance,
  calculateTriggerAvoidance,
  calculateWrongNameTriggerChance,
  attemptDisarm,
}
