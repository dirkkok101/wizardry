import { Race } from '@types/Race'
import { RaceService } from './RaceService'
import { RandomService } from './RandomService'

export interface BaseStats {
  strength: number
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number
}

export interface RolledStats extends BaseStats {
  bonusPoints: number
}

/**
 * CharacterCreationService - Character creation wizard logic
 *
 * Features:
 * - Roll random stats (3d6 per attribute)
 * - Apply race base stats (data-driven via RaceService)
 * - Allocate bonus points
 * - Calculate eligible classes
 */
export class CharacterCreationService {
  /**
   * Roll 3d6 for each attribute and weighted bonus points (7-29).
   */
  static rollStats(): RolledStats {
    return {
      strength: this.roll3d6(),
      intelligence: this.roll3d6(),
      piety: this.roll3d6(),
      vitality: this.roll3d6(),
      agility: this.roll3d6(),
      luck: this.roll3d6(),
      bonusPoints: this.rollBonusPoints()
    }
  }

  /**
   * Roll ONLY bonus points (authentic Wizardry 1 system)
   * No 3d6 rolls - all stats start at 0 (player allocates bonus points)
   *
   * Bonus Point Formula (authentic):
   * - Base: 1d4 + 6 = 7-10 points (90% probability)
   * - First bonus: 1/11 chance to add +10 → 17-20 points (9.25%)
   * - Second bonus: If still <20, another 1/11 chance to add +10 → 27-29 points (0.75%)
   */
  static rollBonusPointsOnly(): RolledStats {
    return {
      strength: 0,
      intelligence: 0,
      piety: 0,
      vitality: 0,
      agility: 0,
      luck: 0,
      bonusPoints: this.rollBonusPoints()
    }
  }

  /**
   * Roll 3d6 (sum of three 6-sided dice).
   */
  private static roll3d6(): number {
    return RandomService.rollDice(3, 6)
  }

  /**
   * Roll bonus points using authentic Wizardry formula.
   * Formula: 1d4 + 6, then 1/11 chance +10, then 1/11 chance +10 if <20
   * Distribution: 7-10 points (90%), 17-20 points (9.25%), 27-29 points (0.75%)
   */
  private static rollBonusPoints(): number {
    let points = RandomService.rollDie(4) + 6 // 1d4 + 6 = 7-10

    // 1/11 chance to add 10
    if (RandomService.roll(1/11)) {
      points += 10

      // If still <20, another 1/11 chance to add 10
      if (points < 20 && RandomService.roll(1/11)) {
        points += 10
      }
    }

    return points
  }

  /**
   * Apply race base stats to allocated bonus points.
   *
   * FORMULA: finalStat = raceBase + allocatedBonus
   *
   * The stats parameter contains ALLOCATED bonus points (0-29 range),
   * NOT rolled 3d6 values (3-18 range).
   *
   * Example: Human (STR 8 base) + 5 allocated bonus points = 13 final STR
   * Example: Elf (INT 9 base) + 10 allocated bonus points = 19 final INT
   */
  static applyRaceModifiers(stats: BaseStats, race: Race): BaseStats {
    const raceData = RaceService.getRaceData(race)
    const baseStats = raceData.baseStats

    return {
      strength: baseStats.str + stats.strength,
      intelligence: baseStats.int + stats.intelligence,
      piety: baseStats.pie + stats.piety,
      vitality: baseStats.vit + stats.vitality,
      agility: baseStats.agi + stats.agility,
      luck: baseStats.luc + stats.luck
    }
  }

  /**
   * Allocate bonus points to a specific stat.
   * Throws error if not enough bonus points available.
   */
  static allocateBonusPoints(
    stats: RolledStats,
    stat: keyof BaseStats,
    points: number
  ): RolledStats {
    if (stats.bonusPoints < points) {
      throw new Error('Not enough bonus points')
    }

    return {
      ...stats,
      [stat]: stats[stat] + points,
      bonusPoints: stats.bonusPoints - points
    }
  }

  /**
   * Reset all bonus point allocations
   * Returns all allocated points back to the bonus pool
   * Used when player wants to re-allocate from scratch
   */
  static resetAllocations(currentStats: RolledStats): RolledStats {
    const totalAllocated =
      currentStats.strength +
      currentStats.intelligence +
      currentStats.piety +
      currentStats.vitality +
      currentStats.agility +
      currentStats.luck

    return {
      strength: 0,
      intelligence: 0,
      piety: 0,
      vitality: 0,
      agility: 0,
      luck: 0,
      bonusPoints: currentStats.bonusPoints + totalAllocated
    }
  }
}
