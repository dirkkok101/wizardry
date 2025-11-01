import { Race, RACE_MODIFIERS } from '../types/Race'

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
 * - Apply race modifiers
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
   * Roll 3d6 (sum of three 6-sided dice).
   */
  private static roll3d6(): number {
    return (
      Math.floor(Math.random() * 6) + 1 +
      Math.floor(Math.random() * 6) + 1 +
      Math.floor(Math.random() * 6) + 1
    )
  }

  /**
   * Roll bonus points using authentic Wizardry formula.
   * Formula: 1d4 + 6, then 1/11 chance +10, then 1/11 chance +10 if <20
   * Distribution: 7-10 points (90%), 17-20 points (9.25%), 27-29 points (0.75%)
   */
  private static rollBonusPoints(): number {
    let points = Math.floor(Math.random() * 4) + 7 // 1d4 + 6 = 7-10

    // 1/11 chance to add 10
    if (Math.random() < 1/11) {
      points += 10

      // If still <20, another 1/11 chance to add 10
      if (points < 20 && Math.random() < 1/11) {
        points += 10
      }
    }

    return points
  }

  /**
   * Apply race modifiers to base stats.
   */
  static applyRaceModifiers(stats: BaseStats, race: Race): BaseStats {
    const modifiers = RACE_MODIFIERS[race]

    return {
      strength: stats.strength + modifiers.strength,
      intelligence: stats.intelligence + modifiers.intelligence,
      piety: stats.piety + modifiers.piety,
      vitality: stats.vitality + modifiers.vitality,
      agility: stats.agility + modifiers.agility,
      luck: stats.luck + modifiers.luck
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
}
