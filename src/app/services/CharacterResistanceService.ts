// src/services/CharacterResistanceService.ts

import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { Race } from '@models/Race'
import {
  ResistanceType,
  CharacterResistanceResult,
  CharacterResistances
} from '@models/CharacterResistance'
import { ClassDataLoader } from './ClassDataLoader'
import { RaceService } from './RaceService'
import { RandomService } from './RandomService'

/**
 * CharacterResistanceService - Implements Wizardry 1 character resistance mechanics
 *
 * Authentic formula from original source code:
 * Total Resistance = ClassBonus + RaceBonus + LevelBonus + LuckBonus
 *
 * Where:
 * - ClassBonus: From class JSON resistances field (0-20%)
 * - RaceBonus: From race JSON resistances field (0-20%)
 * - LevelBonus: +5% per 5 character levels = floor(level / 5) * 5
 * - LuckBonus: +5% (Luck >= 6), +10% (Luck >= 12), +15% (Luck = 18)
 * - Maximum: 95% (always 5% chance to fail)
 *
 * Special case - Breath attacks:
 * - Successful resistance = half damage (0.5x multiplier)
 * - Never fully resisted (always takes some damage)
 *
 * See: docs/research/spell-reference.md for full documentation
 */
export class CharacterResistanceService {
  /**
   * Calculate total resistance percentage for a character (does NOT roll)
   *
   * @param character - Character to calculate resistance for
   * @param resistanceType - Type of resistance to check
   * @returns Resistance result with calculated chance and breakdown
   */
  static calculateResistance(
    character: Character,
    resistanceType: ResistanceType
  ): CharacterResistanceResult {
    const classBonus = this.getClassResistance(character.class, resistanceType)
    const raceBonus = this.getRaceResistance(character.race, resistanceType)
    const levelBonus = this.getLevelBonus(character.level)
    const luckBonus = this.getLuckBonus(character.luck)

    // Total capped at 95% (always 5% chance to fail)
    const total = Math.min(95, classBonus + raceBonus + levelBonus + luckBonus)

    return {
      resisted: false,  // Not rolled yet
      resistChance: total,
      damageMultiplier: 1.0,
      breakdown: {
        classBonus,
        raceBonus,
        levelBonus,
        luckBonus,
        total
      }
    }
  }

  /**
   * Check if character resists an effect (rolls against calculated resistance)
   *
   * @param character - Character to check resistance for
   * @param resistanceType - Type of resistance to check
   * @returns Resistance result with roll outcome
   */
  static checkResistance(
    character: Character,
    resistanceType: ResistanceType
  ): CharacterResistanceResult {
    const result = this.calculateResistance(character, resistanceType)

    // Breath attacks: half damage on success, never full resist
    if (resistanceType === 'breath') {
      const halved = RandomService.chance(result.resistChance)
      return {
        ...result,
        resisted: false,  // Breath is never fully resisted
        damageMultiplier: halved ? 0.5 : 1.0
      }
    }

    // Binary resistance check for all other types
    const resisted = RandomService.chance(result.resistChance)
    return {
      ...result,
      resisted
    }
  }

  /**
   * Get class resistance bonus for a specific type
   *
   * @param characterClass - Character's class
   * @param resistanceType - Type of resistance to check
   * @returns Resistance bonus (0-100, typically 0-20)
   */
  private static getClassResistance(
    characterClass: CharacterClass,
    resistanceType: ResistanceType
  ): number {
    const classData = ClassDataLoader.getClass(characterClass)
    if (!classData?.resistances) return 0

    return this.getResistanceValue(classData.resistances, resistanceType)
  }

  /**
   * Get race resistance bonus for a specific type
   *
   * @param race - Character's race
   * @param resistanceType - Type of resistance to check
   * @returns Resistance bonus (0-100, typically 0-20)
   */
  private static getRaceResistance(
    race: Race,
    resistanceType: ResistanceType
  ): number {
    const raceData = RaceService.getRaceData(race)
    if (!raceData?.resistances) return 0

    return this.getResistanceValue(
      raceData.resistances as CharacterResistances,
      resistanceType
    )
  }

  /**
   * Extract numeric resistance value from resistance object
   * Handles both number values and ignores string notes
   */
  private static getResistanceValue(
    resistances: CharacterResistances | Record<string, number | string>,
    type: ResistanceType
  ): number {
    const value = resistances[type]
    if (typeof value === 'number') {
      return value
    }
    return 0
  }

  /**
   * Calculate level-based resistance bonus
   * Formula: +5% per 5 character levels
   *
   * Examples:
   * - Level 1-4: +0%
   * - Level 5-9: +5%
   * - Level 10-14: +10%
   * - Level 15-19: +15%
   * - Level 20+: +20%
   */
  private static getLevelBonus(level: number): number {
    return Math.floor(level / 5) * 5
  }

  /**
   * Calculate luck-based resistance bonus
   * Formula (from original Wizardry 1):
   * - Luck >= 18: +15%
   * - Luck >= 12: +10%
   * - Luck >= 6: +5%
   * - Otherwise: +0%
   */
  private static getLuckBonus(luck: number): number {
    if (luck >= 18) return 15
    if (luck >= 12) return 10
    if (luck >= 6) return 5
    return 0
  }
}
