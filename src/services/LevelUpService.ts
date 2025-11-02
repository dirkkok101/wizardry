import { Character } from '../types/Character'
import { CharacterClass } from '../types/CharacterClass'

interface StatIncreases {
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
  statIncreases: StatIncreases
}

interface LevelUpResult {
  updatedCharacter: Character
  levelUpData: LevelUpData
}

const MAX_LEVEL = 13

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

// Stat increase chances by class (% per stat per level)
const CLASS_STAT_CHANCES: Record<CharacterClass, Record<string, number>> = {
  [CharacterClass.FIGHTER]: {
    strength: 5,
    intelligence: 1,
    piety: 1,
    vitality: 4,
    agility: 3,
    luck: 2
  },
  [CharacterClass.MAGE]: {
    strength: 1,
    intelligence: 5,
    piety: 2,
    vitality: 2,
    agility: 2,
    luck: 2
  },
  [CharacterClass.PRIEST]: {
    strength: 2,
    intelligence: 2,
    piety: 5,
    vitality: 3,
    agility: 2,
    luck: 2
  },
  [CharacterClass.THIEF]: {
    strength: 2,
    intelligence: 2,
    piety: 1,
    vitality: 2,
    agility: 5,
    luck: 4
  },
  [CharacterClass.BISHOP]: {
    strength: 1,
    intelligence: 4,
    piety: 4,
    vitality: 2,
    agility: 2,
    luck: 2
  },
  [CharacterClass.SAMURAI]: {
    strength: 4,
    intelligence: 3,
    piety: 2,
    vitality: 3,
    agility: 3,
    luck: 2
  },
  [CharacterClass.LORD]: {
    strength: 4,
    intelligence: 2,
    piety: 3,
    vitality: 4,
    agility: 2,
    luck: 2
  },
  [CharacterClass.NINJA]: {
    strength: 3,
    intelligence: 3,
    piety: 2,
    vitality: 2,
    agility: 5,
    luck: 3
  }
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
    const roll = Math.floor(Math.random() * hitDie) + 1 // 1 to hitDie
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
   * Roll for stat increases (chance-based)
   * Each stat has % chance to increase by 1
   */
  static rollStatIncreases(character: Character): StatIncreases {
    const chances = CLASS_STAT_CHANCES[character.class]
    const increases: StatIncreases = {}

    const stats: Array<keyof StatIncreases> = [
      'strength',
      'intelligence',
      'piety',
      'vitality',
      'agility',
      'luck'
    ]

    stats.forEach(stat => {
      const chance = chances[stat] || 0
      const roll = Math.random() * 100
      if (roll < chance) {
        increases[stat] = 1
      }
    })

    return increases
  }

  /**
   * Perform level up: increment level, roll HP, roll stats
   * Returns updated character and level up data for display
   */
  static performLevelUp(character: Character): LevelUpResult {
    const hpIncrease = this.rollHPIncrease(character)
    const statIncreases = this.rollStatIncreases(character)

    const updatedCharacter: Character = {
      ...character,
      level: character.level + 1,
      maxHp: character.maxHp + hpIncrease,
      hp: character.maxHp + hpIncrease, // Fully heal on level up
      strength: character.strength + (statIncreases.strength || 0),
      intelligence: character.intelligence + (statIncreases.intelligence || 0),
      piety: character.piety + (statIncreases.piety || 0),
      vitality: character.vitality + (statIncreases.vitality || 0),
      agility: character.agility + (statIncreases.agility || 0),
      luck: character.luck + (statIncreases.luck || 0)
    }

    const levelUpData: LevelUpData = {
      newLevel: character.level + 1,
      hpIncrease,
      statIncreases
    }

    return {
      updatedCharacter,
      levelUpData
    }
  }
}
