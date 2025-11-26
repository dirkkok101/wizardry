/**
 * TrapService - Pure function service for trap mechanics
 *
 * Implements original Wizardry 1 trap inspection and disarm formulas:
 * - Inspection: AGI × class multiplier (6 for Thief, 4 for Ninja, 1 for others)
 * - Disarm: (EffectiveLevel - MazeLevel) / 70, with +50 bonus for Thief/Ninja
 * - Failed disarm avoidance: AGI × 5%
 */

import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Chest } from '@models/Chest'
import {
  TrapType,
  TrapEffect,
  TrapInspectionResult,
  TrapDisarmResult,
  TrapTriggerResult,
  trapNameMatches
} from '@models/Trap'
import { RandomService } from './RandomService'
import { TrapDataLoader } from './TrapDataLoader'

/**
 * Inspection chance multiplier by class
 */
const INSPECT_MULTIPLIER: Record<CharacterClass, number> = {
  [CharacterClass.THIEF]: 6,
  [CharacterClass.NINJA]: 4,
  [CharacterClass.FIGHTER]: 1,
  [CharacterClass.MAGE]: 1,
  [CharacterClass.PRIEST]: 1,
  [CharacterClass.BISHOP]: 1,
  [CharacterClass.SAMURAI]: 1,
  [CharacterClass.LORD]: 1
}

/**
 * Classes that get the +50 disarm bonus
 */
const DISARM_BONUS_CLASSES = new Set([CharacterClass.THIEF, CharacterClass.NINJA])

/**
 * Maximum inspection/disarm chance (95%)
 */
const MAX_SUCCESS_CHANCE = 95

/**
 * Critical failure chance during inspection (1-2%)
 */
const INSPECT_CRITICAL_FAILURE_CHANCE = 2

/**
 * Get trap effect from TrapDataLoader
 * Trap data must be loaded via TrapDataLoader.loadAllTraps() before use
 * @throws Error if traps are not loaded or trap type is not found
 */
function getTrapEffect(trapType: TrapType): TrapEffect {
  if (!TrapDataLoader.isLoaded()) {
    throw new Error('Trap data not loaded. Call TrapDataLoader.loadAllTraps() first.')
  }

  const effect = TrapDataLoader.getTrapEffect(trapType)
  if (!effect) {
    throw new Error(`Unknown trap type: ${trapType}`)
  }

  return effect
}

/**
 * Calculate trap inspection success chance
 *
 * Formula: AGI × class multiplier (capped at 95%)
 * - Thieves: AGI × 6 (e.g., AGI 16 = 96% → capped to 95%)
 * - Ninjas: AGI × 4 (e.g., AGI 18 = 72%)
 * - Others: AGI × 1 (e.g., AGI 12 = 12%)
 */
function calculateInspectChance(character: Character): number {
  const multiplier = INSPECT_MULTIPLIER[character.class]
  const chance = character.agility * multiplier
  return Math.min(chance, MAX_SUCCESS_CHANCE)
}

/**
 * Attempt to inspect a chest for traps
 *
 * @returns InspectionResult with success status, identified trap, and trigger status
 */
function attemptInspection(character: Character, chest: Chest): TrapInspectionResult {
  // Check for critical failure first (1-2% chance to trigger trap during inspection)
  if (RandomService.chance(INSPECT_CRITICAL_FAILURE_CHANCE)) {
    return {
      success: false,
      trapIdentified: null,
      triggered: chest.trapped  // Only triggers if actually trapped
    }
  }

  // Roll for inspection success
  const chance = calculateInspectChance(character)
  const success = RandomService.chance(chance)

  if (success && chest.trapped) {
    return {
      success: true,
      trapIdentified: chest.trapType,
      triggered: false
    }
  }

  // Failed inspection - may return false positive or nothing
  // Original game behavior: failed roll returns no information
  return {
    success: false,
    trapIdentified: null,
    triggered: false
  }
}

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
function calculateDisarmChance(character: Character, mazeLevel: number): number {
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
function calculateTriggerAvoidance(character: Character): number {
  return character.agility * 5
}

/**
 * Determine trigger chance when entering wrong trap name
 * Based on maze level - deeper levels are less forgiving
 */
function calculateWrongNameTriggerChance(mazeLevel: number): number {
  // Easy levels (1-4): ~20% trigger chance
  // Deep levels (5+): ~80% trigger chance
  return mazeLevel <= 4 ? 20 : 80
}

/**
 * Attempt to disarm a trap
 *
 * @param character Character attempting disarm
 * @param chest The chest being disarmed
 * @param enteredTrapName The trap name entered by player
 * @returns DisarmResult with success, trigger, and wrongName status
 */
function attemptDisarm(
  character: Character,
  chest: Chest,
  enteredTrapName: string
): TrapDisarmResult {
  // Check if trap name matches
  if (!chest.trapType || !trapNameMatches(enteredTrapName, chest.trapType)) {
    // Wrong trap name - check if it triggers
    const triggerChance = calculateWrongNameTriggerChance(chest.mazeLevel)
    const triggered = RandomService.chance(triggerChance)
    return {
      success: false,
      triggered,
      wrongName: true
    }
  }

  // Correct trap name - attempt disarm
  const disarmChance = calculateDisarmChance(character, chest.mazeLevel)
  const success = RandomService.chance(disarmChance)

  if (success) {
    return {
      success: true,
      triggered: false,
      wrongName: false
    }
  }

  // Failed disarm - check AGI save to avoid triggering
  const avoidChance = calculateTriggerAvoidance(character)
  const avoided = RandomService.chance(avoidChance)

  return {
    success: false,
    triggered: !avoided,
    wrongName: false
  }
}

/**
 * Apply trap effects when triggered
 *
 * @param trapType The type of trap that triggered
 * @param opener The character who triggered the trap
 * @param partyMembers The party members (resolved Character objects)
 * @returns TrapTriggerResult with damage, status effects, and special outcomes
 */
function applyTrapEffects(
  trapType: TrapType,
  opener: Character,
  partyMembers: Character[]
): TrapTriggerResult {
  const effect = getTrapEffect(trapType)
  const damageDealt = new Map<string, number>()
  const statusApplied = new Map<string, CharacterStatus>()
  const messages: string[] = []

  // Determine targets based on target mode
  let targets: Character[] = []
  switch (effect.targetMode) {
    case 'opener':
      targets = [opener]
      break
    case 'party':
      targets = partyMembers
      break
    case 'class_specific':
      targets = partyMembers.filter(m =>
        effect.targetClasses?.includes(m.class)
      )
      break
    case 'special':
      // Special effects handled separately
      break
  }

  // Apply damage if applicable
  if (effect.damageFormula && targets.length > 0) {
    for (const target of targets) {
      const damage = RandomService.rollDiceNotation(effect.damageFormula)
      damageDealt.set(target.id, damage)
      messages.push(`${target.name} takes ${damage} damage!`)
    }
  }

  // Apply status effect if applicable
  if (effect.statusEffect && targets.length > 0) {
    for (const target of targets) {
      statusApplied.set(target.id, effect.statusEffect)
      messages.push(`${target.name} is ${effect.statusEffect.toLowerCase()}!`)
    }
  }

  // Handle special effects
  if (effect.specialEffect) {
    switch (effect.specialEffect) {
      case 'teleport':
        messages.push('The party is teleported to a random location!')
        break
      case 'combat':
        messages.push('An alarm sounds! Monsters approach!')
        break
    }
  }

  return {
    trapType,
    damageDealt,
    statusApplied,
    specialEffect: effect.specialEffect,
    message: messages.join(' ')
  }
}

/**
 * Check if a character can cast CALFO spell
 */
function canCastCalfo(character: Character): boolean {
  // CALFO is a priest level 2 spell
  // Available to Priest, Bishop, Lord
  const calfoClasses = new Set([
    CharacterClass.PRIEST,
    CharacterClass.BISHOP,
    CharacterClass.LORD
  ])

  if (!calfoClasses.has(character.class)) {
    return false
  }

  // Check if character knows CALFO
  if (!character.knownSpells.includes('calfo')) {
    return false
  }

  // Check if character has spell points at level 2
  if (!character.spellPoints?.priest?.level2 || character.spellPoints.priest.level2.current < 1) {
    return false
  }

  return true
}

/**
 * Cast CALFO spell to identify trap
 *
 * @returns InspectionResult (95% success rate, never triggers trap)
 */
function castCalfo(caster: Character, chest: Chest): TrapInspectionResult {
  // CALFO has 95% success rate
  const success = RandomService.chance(95)

  if (success && chest.trapped) {
    return {
      success: true,
      trapIdentified: chest.trapType,
      triggered: false
    }
  }

  // Failed CALFO - no information revealed
  return {
    success: false,
    trapIdentified: null,
    triggered: false  // CALFO never triggers traps
  }
}

/**
 * Get recommended character for trap handling
 * Based on inspect chance (for identification) and disarm chance
 *
 * @param partyMembers Resolved Character objects for party members
 * @param mazeLevel Current dungeon level
 */
function getRecommendedHandler(
  partyMembers: Character[],
  mazeLevel: number
): { character: Character; inspectChance: number; disarmChance: number } | null {
  let best: { character: Character; inspectChance: number; disarmChance: number } | null = null

  for (const member of partyMembers) {
    // Skip dead/incapacitated characters
    if (member.status === CharacterStatus.DEAD ||
        member.status === CharacterStatus.ASHES ||
        member.status === CharacterStatus.LOST ||
        member.status === CharacterStatus.PARALYZED ||
        member.status === CharacterStatus.STONED) {
      continue
    }

    const inspectChance = calculateInspectChance(member)
    const disarmChance = calculateDisarmChance(member, mazeLevel)

    // Score based on both abilities (weighted towards inspect since it comes first)
    const score = inspectChance * 0.6 + disarmChance * 0.4

    if (!best || score > (best.inspectChance * 0.6 + best.disarmChance * 0.4)) {
      best = { character: member, inspectChance, disarmChance }
    }
  }

  return best
}

export const TrapService = {
  // Calculation functions
  calculateInspectChance,
  calculateDisarmChance,
  calculateTriggerAvoidance,
  calculateWrongNameTriggerChance,

  // Action functions
  attemptInspection,
  attemptDisarm,
  applyTrapEffects,

  // CALFO spell
  canCastCalfo,
  castCalfo,

  // Utility
  getRecommendedHandler
}
