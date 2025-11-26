import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { RandomService } from './RandomService'

interface StatChanges {
  strength?: number
  intelligence?: number
  piety?: number
  vitality?: number
  agility?: number
  luck?: number
}

interface LevelUpData {
  newLevel: number
  hpIncrease: number
  statChanges: StatChanges
}

interface LevelUpResult {
  updatedCharacter: Character
  levelUpData: LevelUpData
}

export const MAX_LEVEL = 13

// Class XP multipliers (lower = faster leveling)
const CLASS_XP_MULTIPLIERS: Record<CharacterClass, number> = {
  [CharacterClass.FIGHTER]: 0.8,
  [CharacterClass.THIEF]: 0.9,
  [CharacterClass.MAGE]: 1.2,
  [CharacterClass.PRIEST]: 1.0,
  [CharacterClass.BISHOP]: 1.3,
  [CharacterClass.SAMURAI]: 1.1,
  [CharacterClass.LORD]: 1.1,
  [CharacterClass.NINJA]: 1.2
}

// Hit dice by class (for HP rolls)
const CLASS_HIT_DICE: Record<CharacterClass, number> = {
  [CharacterClass.FIGHTER]: 10,
  [CharacterClass.LORD]: 10,
  [CharacterClass.SAMURAI]: 8,
  [CharacterClass.NINJA]: 6,
  [CharacterClass.PRIEST]: 8,
  [CharacterClass.BISHOP]: 6,
  [CharacterClass.THIEF]: 6,
  [CharacterClass.MAGE]: 4
}

export class LevelUpService {
  /**
   * Calculate XP required for a given level
   * Uses exponential growth: 1000 * level^1.5 * class multiplier
   */
  static getXPRequirement(level: number, characterClass: CharacterClass): number {
    const baseXP = 1000
    const multiplier = CLASS_XP_MULTIPLIERS[characterClass]
    return Math.floor(baseXP * Math.pow(level, 1.5) * multiplier)
  }

  /**
   * Check if character has enough XP to level up
   */
  static canLevelUp(character: Character): boolean {
    if (character.level >= MAX_LEVEL) {
      return false
    }

    const requiredXP = this.getXPRequirement(character.level + 1, character.class)
    return character.experience >= requiredXP
  }

  /**
   * Roll HP increase based on class hit die and VIT bonus
   * Returns 1-X where X is hit die + VIT bonus (minimum 1)
   */
  static rollHPIncrease(character: Character): number {
    const hitDie = CLASS_HIT_DICE[character.class]
    const roll = RandomService.rollDie(hitDie) // 1 to hitDie
    const vitBonus = this.getVitalityBonus(character.vitality)
    return Math.max(1, roll + vitBonus)
  }

  /**
   * Get VIT bonus for HP rolls
   * VIT 3-5 = -3, 6-7 = -2, 8-9 = -1, 10-11 = 0, 12-13 = +1, 14-15 = +2, 16-17 = +3, 18 = +4
   */
  private static getVitalityBonus(vitality: number): number {
    if (vitality <= 5) return -3
    if (vitality <= 7) return -2
    if (vitality <= 9) return -1
    if (vitality <= 11) return 0
    if (vitality <= 13) return 1
    if (vitality <= 15) return 2
    if (vitality <= 17) return 3
    return 4
  }

  /**
   * Roll for stat changes using authentic Wizardry 1 age-based formula.
   *
   * For each stat:
   *   75% chance the stat is checked
   *   If checked: roll 1-100
   *     If roll <= (130 - age): stat +1 (increase)
   *     Else: stat -1 (decrease)
   *
   * Younger characters have better growth, older characters risk stat decreases.
   * Stats are clamped to 3-18 range.
   */
  static rollStatChanges(character: Character): StatChanges {
    const changes: StatChanges = {}
    const age = character.age

    // Calculate increase threshold based on age
    // Age 15: 115% capped to 95%, Age 30: 100%, Age 50: 80%, etc.
    const increaseThreshold = Math.min(95, Math.max(5, 130 - age))

    const stats: Array<keyof StatChanges> = [
      'strength',
      'intelligence',
      'piety',
      'vitality',
      'agility',
      'luck'
    ]

    stats.forEach(stat => {
      // 75% chance this stat is checked for modification
      if (RandomService.chance(75)) {
        const roll = RandomService.random(1, 100)
        const currentValue = character[stat]

        if (roll <= increaseThreshold) {
          // Stat increase - but cap at 18
          if (currentValue < 18) {
            changes[stat] = 1
          }
        } else {
          // Stat decrease - but floor at 3
          if (currentValue > 3) {
            changes[stat] = -1
          }
        }
      }
    })

    return changes
  }

  /**
   * @deprecated Use rollStatChanges instead. This method is kept for backwards compatibility.
   */
  static rollStatIncreases(character: Character): StatChanges {
    return this.rollStatChanges(character)
  }

  /**
   * Perform level up: increment level, roll HP, roll stats
   * Returns updated character and level up data for display
   */
  static performLevelUp(character: Character): LevelUpResult {
    const hpIncrease = this.rollHPIncrease(character)
    const statChanges = this.rollStatChanges(character)

    const updatedCharacter: Character = {
      ...character,
      level: character.level + 1,
      maxHp: character.maxHp + hpIncrease,
      hp: character.maxHp + hpIncrease, // Fully heal on level up
      strength: character.strength + (statChanges.strength || 0),
      intelligence: character.intelligence + (statChanges.intelligence || 0),
      piety: character.piety + (statChanges.piety || 0),
      vitality: character.vitality + (statChanges.vitality || 0),
      agility: character.agility + (statChanges.agility || 0),
      luck: character.luck + (statChanges.luck || 0)
    }

    const levelUpData: LevelUpData = {
      newLevel: character.level + 1,
      hpIncrease,
      statChanges
    }

    return {
      updatedCharacter,
      levelUpData
    }
  }
}
