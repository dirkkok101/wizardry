/**
 * Attack Resolution Service
 *
 * Handles hit chance calculation, damage rolls, and attack resolution.
 * Based on authentic Wizardry 1 Apple II mechanics.
 *
 * @see docs/research/combat-formulas.md
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { Combatant, MonsterInstance, AttackResult, AttackRollDetails, CombatantStatus } from '@models/Combat'
import { RandomService } from '@services/RandomService'
import { StatModifierService } from '@services/StatModifierService'
import { ItemProtectionService } from '@services/ItemProtectionService'
import { MonsterResistanceService } from '@services/MonsterResistanceService'
import {
  HIT_CHANCE,
  HIT_CALC_MOD,
  STRONG_COMBAT_CLASSES,
  CRITICAL_HIT,
  DAMAGE,
  UNARMED_DAMAGE,
  ATTACKS_PER_ROUND,
} from '../CombatConstants'

// ============================================================================
// Hit Calculation
// ============================================================================

/**
 * Calculate class-based hit modifier (HPCALCMD) - Authentic Wizardry 1
 *
 * Formula from Thomas William Ewers' reverse-engineered Apple II source:
 * - Fighter/Priest/Samurai/Lord/Ninja: 2 + floor(Level/3)
 * - Mage/Thief/Bishop: floor(Level/5)
 */
export function getHitCalcMod(combatant: Combatant): number {
  const level = combatant.level || 1

  // Check if this is a character with a class
  if ('class' in combatant && combatant.class) {
    if (STRONG_COMBAT_CLASSES.includes(combatant.class as typeof STRONG_COMBAT_CLASSES[number])) {
      // Strong classes: 2 + floor(Level/3)
      return HIT_CALC_MOD.STRONG_CLASS_BASE + Math.floor(level / HIT_CALC_MOD.STRONG_CLASS_LEVEL_DIVISOR)
    }
    // Weak classes (Mage/Thief/Bishop): floor(Level/5)
    return Math.floor(level / HIT_CALC_MOD.WEAK_CLASS_LEVEL_DIVISOR)
  }

  // Monsters use their level directly
  return level
}

/**
 * Calculate attack bonus for a combatant
 *
 * Formula: HitCalcMod + STR modifier + weapon hitMod
 */
export function getAttackBonus(combatant: Combatant): number {
  const hitCalcMod = getHitCalcMod(combatant)

  // For characters: add STR hit modifier + weapon hitMod
  if ('class' in combatant && combatant.class) {
    const character = combatant as Character
    const strHitPercent = StatModifierService.getStrengthHitModifier(character.strength)
    // Convert percentage to attack bonus (each +1 attack bonus = +5% hit)
    const strMod = strHitPercent / HIT_CHANCE.BASE_MULTIPLIER

    // Add weapon hitMod if character has a weapon equipped
    const weapon = character.equippedWeapon
    const weaponHitMod = weapon?.hitMod ?? 0

    // Cursed weapons apply -2 hit penalty
    const cursedPenalty = weapon?.cursedForOwner ? -2 : 0

    return hitCalcMod + strMod + weaponHitMod + cursedPenalty
  }

  // For monsters: just HitCalcMod (which is their level)
  return hitCalcMod
}

/**
 * Calculate hit chance percentage
 *
 * Formula: (attackBonus + defenderAC + 10) × 5% + (3 × victimPosition)
 * Clamped between 5% and 95%
 *
 * @param attacker - The attacking combatant
 * @param defender - The defending combatant
 * @param defenderAcModifier - AC modifier (negative = better defense)
 * @param attackerPenalty - Attack penalty (e.g., -4 for BLIND)
 * @param victimPosition - Position in monster group (0-indexed)
 */
export function calculateHitChance(
  attacker: Combatant,
  defender: Combatant,
  defenderAcModifier: number = 0,
  attackerPenalty: number = 0,
  victimPosition: number = 0
): number {
  const attackBonus = getAttackBonus(attacker) + attackerPenalty
  const effectiveAc = defender.ac + defenderAcModifier

  // Base chance formula
  let rawChance = (attackBonus + effectiveAc + HIT_CHANCE.BASE_OFFSET) * HIT_CHANCE.BASE_MULTIPLIER

  // Authentic Wizardry 1: +3% per victim position (monsters in back are easier to hit)
  rawChance += HIT_CHANCE.POSITION_MODIFIER * victimPosition

  return Math.max(HIT_CHANCE.MIN_CHANCE, Math.min(HIT_CHANCE.MAX_CHANCE, rawChance))
}

// ============================================================================
// Damage Calculation
// ============================================================================

/**
 * Roll damage for a character's unarmed attack
 */
function rollUnarmedDamage(character: Character): number {
  const charClass = character.class

  if (charClass === 'NINJA') {
    // Ninja: 1d4 + floor(level/3)
    const baseDamage = RandomService.rollDie(UNARMED_DAMAGE.NINJA_DIE)
    const levelBonus = Math.floor(character.level / UNARMED_DAMAGE.NINJA_LEVEL_DIVISOR)
    return baseDamage + levelBonus
  }

  // All other classes: 1d2
  return RandomService.rollDie(UNARMED_DAMAGE.DEFAULT_DIE)
}

/**
 * Roll damage for a character's weapon attack
 */
function rollWeaponDamage(character: Character): number {
  const weapon = character.equippedWeapon
  if (!weapon) {
    return rollUnarmedDamage(character)
  }

  // Use damageRoll if available (has min/max), otherwise fall back to damage
  if (weapon.damageRoll) {
    const baseDamage = RandomService.random(weapon.damageRoll.min, weapon.damageRoll.max)
    const enhancement = weapon.enhancement || 0
    return baseDamage + enhancement
  } else if (weapon.damage) {
    const enhancement = weapon.enhancement || 0
    return RandomService.rollDie(weapon.damage) + enhancement
  }

  return rollUnarmedDamage(character)
}

/**
 * Roll damage for a monster attack
 */
function rollMonsterDamage(monster: MonsterInstance, attackIndex: number = 0): number {
  if (monster.damage && monster.damage.length > 0) {
    // Use attackIndex to select damage entry, with fallback to last entry
    const damageIndex = Math.min(attackIndex, monster.damage.length - 1)
    const dice = monster.damage[damageIndex]
    return RandomService.random(dice.min, dice.max)
  }
  return 1
}

/**
 * Roll damage for any combatant
 *
 * @param combatant - Character or Monster
 * @param attackIndex - For multi-attack monsters: which attack (0-based)
 */
export function rollDamage(combatant: Combatant, attackIndex: number = 0): number {
  if ('class' in combatant) {
    return rollWeaponDamage(combatant as Character)
  }

  if ('monsterId' in combatant) {
    return rollMonsterDamage(combatant as MonsterInstance, attackIndex)
  }

  return 1
}

// ============================================================================
// Helpless Target Check
// ============================================================================

/**
 * Check if target is helpless (sleeping, paralyzed, or stoned)
 * Helpless targets take 2× damage from physical attacks
 */
export function isHelplessTarget(combatant: Combatant): boolean {
  if ('status' in combatant) {
    const status = combatant.status

    // Check for string status values
    if (typeof status === 'string') {
      const statusStr = status.toUpperCase()
      return statusStr === 'ASLEEP' || statusStr === 'PARALYZED' || statusStr === 'STONED'
    }

    // For numeric enum values (CharacterStatus)
    return status === CharacterStatus.ASLEEP ||
           status === CharacterStatus.PARALYZED ||
           status === CharacterStatus.STONED
  }
  return false
}

// ============================================================================
// Critical Hit Logic
// ============================================================================

/**
 * Calculate critical hit chance
 *
 * Formula: (2 × Level)%, max 50%
 */
export function calculateCriticalChance(attackerLevel: number): number {
  return Math.min(CRITICAL_HIT.MAX_CHANCE, attackerLevel * CRITICAL_HIT.LEVEL_MULTIPLIER)
}

/**
 * Result of monster critical resistance check
 */
export interface MonsterCritResistResult {
  resisted: boolean
  roll: number
  threshold: number
}

/**
 * Check if monster resists a critical hit (decapitation)
 *
 * Formula: (MonsterLevel + 10) must be >= random(0, 34) to resist
 * Level 24+ always resists (threshold 34 >= any roll 0-34)
 */
export function monsterResistsCritical(monsterLevel: number): MonsterCritResistResult {
  const roll = RandomService.random(0, CRITICAL_HIT.RESISTANCE_ROLL_MAX)
  const threshold = monsterLevel + CRITICAL_HIT.RESISTANCE_LEVEL_OFFSET
  return {
    resisted: threshold >= roll,
    roll,
    threshold,
  }
}

// ============================================================================
// Attacks Per Round
// ============================================================================

/**
 * Get number of attacks per round for a combatant
 *
 * Formula:
 * - Fighter/Lord/Samurai: 1 + floor(level/5)
 * - Ninja: 2 + floor(level/5)
 * - Others: 1
 * - Weapon Swings: Use max(class attacks, weapon swings)
 * - Max: 10 attacks
 */
export function getAttacksPerRound(combatant: Combatant): number {
  // Monsters: attack count = length of damage array
  if ('monsterId' in combatant) {
    return (combatant as MonsterInstance).damage?.length || 1
  }

  // Characters: check class and weapon
  if ('class' in combatant) {
    const character = combatant as Character
    const level = character.level || 1
    const levelBonus = Math.floor(level / ATTACKS_PER_ROUND.LEVEL_DIVISOR)
    let classAttacks: number

    switch (character.class) {
      case 'FIGHTER':
      case 'LORD':
      case 'SAMURAI':
        classAttacks = ATTACKS_PER_ROUND.FIGHTER_BASE + levelBonus
        break
      case 'NINJA':
        classAttacks = ATTACKS_PER_ROUND.NINJA_BASE + levelBonus
        break
      default:
        classAttacks = ATTACKS_PER_ROUND.OTHER_BASE
    }

    // Check weapon swings - use maximum of class attacks or weapon swings
    const weaponSwings = character.equippedWeapon?.swings ?? 0
    const totalAttacks = Math.max(classAttacks, weaponSwings)

    // Cap at max attacks
    return Math.min(ATTACKS_PER_ROUND.MAX_ATTACKS, totalAttacks)
  }

  return 1
}

// ============================================================================
// Attack Resolution
// ============================================================================

export interface AttackResolutionOptions {
  defenderAcModifier?: number
  attackerPenalty?: number
  victimPosition?: number
  attackIndex?: number
  defenderMonsterClass?: string
}

/**
 * Resolve a physical attack
 *
 * @returns AttackResult with hit, damage, critical, instantKill, message, and rollDetails
 */
export function resolveAttack(
  attacker: Combatant,
  defender: Combatant,
  options: AttackResolutionOptions = {}
): AttackResult {
  const {
    defenderAcModifier = 0,
    attackerPenalty = 0,
    victimPosition = 0,
    attackIndex = 0,
    defenderMonsterClass,
  } = options

  const hitChance = calculateHitChance(attacker, defender, defenderAcModifier, attackerPenalty, victimPosition)
  const hitRoll = RandomService.randomFloat(0, 100)
  const attackerLevel = attacker.level || 1
  const critChance = calculateCriticalChance(attackerLevel)

  // Build base rollDetails (populated even on miss for debugging)
  const rollDetails: AttackRollDetails = {
    hitChance,
    hitRoll,
    damageBase: 0,
    damageStrMod: 0,
    damagePurposedMult: false,
    damageHelplessMult: false,
    critChance,
  }

  if (hitRoll >= hitChance) {
    return {
      hit: false,
      damage: 0,
      critical: false,
      instantKill: false,
      message: 'Miss!',
      rollDetails,
    }
  }

  // Roll damage
  const baseDamage = rollDamage(attacker, attackIndex)
  rollDetails.damageBase = baseDamage

  // Apply STR damage modifier for characters
  let strDamageMod = 0
  if ('strength' in attacker) {
    strDamageMod = StatModifierService.getStrengthDamageModifier((attacker as Character).strength)
  }
  rollDetails.damageStrMod = strDamageMod
  let damage = Math.max(DAMAGE.MINIMUM_DAMAGE, baseDamage + strDamageMod)

  // Check for double damage conditions
  // Per authentic Wizardry 1: these do NOT stack multiplicatively
  // Sleep + Purposed weapon = 2× (not 4×)
  // See docs/research/combat-formulas.md
  let purposedApplied = false
  if ('equippedWeapon' in attacker && defenderMonsterClass) {
    const weapon = (attacker as Character).equippedWeapon
    if (ItemProtectionService.isPurposedAgainst(weapon, defenderMonsterClass)) {
      purposedApplied = true
    }
  }
  rollDetails.damagePurposedMult = purposedApplied

  const isHelpless = isHelplessTarget(defender)
  rollDetails.damageHelplessMult = isHelpless

  // Apply double damage if EITHER condition is true (but only 2x, not 4x)
  if (purposedApplied || isHelpless) {
    damage *= DAMAGE.PURPOSED_WEAPON_MULTIPLIER // Both use same 2x multiplier
  }

  // Critical hit check - use randomFloat so we can capture the roll value
  const critRoll = RandomService.randomFloat(0, 100)
  rollDetails.critRoll = critRoll
  let critical = critRoll < critChance
  let instantKill = false

  // Monster resistance to critical hits
  if (critical && 'monsterId' in defender) {
    const monsterLevel = defender.level || 1
    const resistResult = monsterResistsCritical(monsterLevel)
    rollDetails.monsterResistRoll = resistResult.roll
    rollDetails.monsterResistThreshold = resistResult.threshold
    if (resistResult.resisted) {
      critical = false // Monster resists decapitation
    } else {
      instantKill = true // Critical = instant kill
    }
  }

  // Character critical (checked elsewhere via CharacterResistanceService)
  if (critical && !('monsterId' in defender)) {
    instantKill = true
  }

  const finalDamage = damage

  // Build message
  let message = `${finalDamage} damage!`
  if (instantKill) {
    message = `Critical hit! Target is slain!`
  } else if (isHelpless) {
    message = `Strikes helpless target! ${finalDamage} damage!`
  }

  return {
    hit: true,
    damage: finalDamage,
    critical,
    instantKill,
    message,
    rollDetails,
  }
}

/**
 * Attack Resolution Service class (static methods for backward compatibility)
 */
export class AttackResolutionService {
  static getHitCalcMod = getHitCalcMod
  static getAttackBonus = getAttackBonus
  static calculateHitChance = calculateHitChance
  static rollDamage = rollDamage
  static isHelplessTarget = isHelplessTarget
  static calculateCriticalChance = calculateCriticalChance
  static monsterResistsCritical = monsterResistsCritical
  static getAttacksPerRound = getAttacksPerRound
  static resolveAttack = resolveAttack
}
