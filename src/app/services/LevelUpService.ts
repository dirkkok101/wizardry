import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterSpellPoints, SpellPointPool } from '@models/SpellPoints'
import { RandomService } from './RandomService'
import { ClassService } from './ClassService'

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

// Character level required to access each spell level (1-7)
const SPELL_LEVEL_REQUIREMENTS: Record<number, number> = {
  1: 1,   // Spell level 1 at character level 1
  2: 3,   // Spell level 2 at character level 3
  3: 5,   // Spell level 3 at character level 5
  4: 7,   // Spell level 4 at character level 7
  5: 9,   // Spell level 5 at character level 9
  6: 11,  // Spell level 6 at character level 11
  7: 13   // Spell level 7 at character level 13
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
   * Perform level up: increment level, roll HP, roll stats, increase spell points
   * Returns updated character and level up data for display
   */
  static performLevelUp(character: Character): LevelUpResult {
    const hpIncrease = this.rollHPIncrease(character)
    const statChanges = this.rollStatChanges(character)
    const newLevel = character.level + 1

    // Calculate updated spell points for the new level
    const updatedSpellPoints = this.calculateSpellPointsForLevel(character, newLevel)

    const updatedCharacter: Character = {
      ...character,
      level: newLevel,
      maxHp: character.maxHp + hpIncrease,
      hp: character.maxHp + hpIncrease, // Fully heal on level up
      strength: character.strength + (statChanges.strength || 0),
      intelligence: character.intelligence + (statChanges.intelligence || 0),
      piety: character.piety + (statChanges.piety || 0),
      vitality: character.vitality + (statChanges.vitality || 0),
      agility: character.agility + (statChanges.agility || 0),
      luck: character.luck + (statChanges.luck || 0),
      spellPoints: updatedSpellPoints
    }

    const levelUpData: LevelUpData = {
      newLevel,
      hpIncrease,
      statChanges
    }

    return {
      updatedCharacter,
      levelUpData
    }
  }

  /**
   * Calculate spell points for a character at a given level.
   *
   * Formula: For each accessible spell level, max points = min(9, characterLevel - reqLevel + 2)
   * - Spell level 1 at char level 1: min(9, 1-1+2) = 2 points
   * - Spell level 1 at char level 2: min(9, 2-1+2) = 3 points
   * - Spell level 2 at char level 3: min(9, 3-3+2) = 2 points
   *
   * Current spell points are restored to max on level up.
   */
  static calculateSpellPointsForLevel(
    character: Character,
    newLevel: number
  ): CharacterSpellPoints | undefined {
    const classData = ClassService.getClassData(character.class)

    // Non-casters have no spell points
    if (!classData.spellAccess) {
      return character.spellPoints // Preserve existing (should be undefined)
    }

    const calculatePool = (maxSpellLevel: number): SpellPointPool => {
      const pool: SpellPointPool = {
        level1: { current: 0, max: 0 },
        level2: { current: 0, max: 0 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 }
      }

      for (let spellLevel = 1; spellLevel <= 7; spellLevel++) {
        const reqLevel = SPELL_LEVEL_REQUIREMENTS[spellLevel]

        // Check if this spell level is accessible (character level >= required AND within class max)
        if (newLevel >= reqLevel && spellLevel <= maxSpellLevel) {
          // Calculate max spell points: characterLevel - reqLevel + 2, capped at 9
          const maxPoints = Math.min(9, newLevel - reqLevel + 2)
          const key = `level${spellLevel}` as keyof SpellPointPool
          pool[key] = { current: maxPoints, max: maxPoints }
        }
      }

      return pool
    }

    const spellPoints: CharacterSpellPoints = {}

    // Calculate mage spell points if class has mage access
    if (classData.spellAccess.mage) {
      // Samurai maxes at spell level 6, others can reach 7
      const maxMageLevel = character.class === CharacterClass.SAMURAI ? 6 : 7
      spellPoints.mage = calculatePool(maxMageLevel)
    }

    // Calculate priest spell points if class has priest access
    if (classData.spellAccess.priest) {
      // Lord maxes at spell level 6, others can reach 7
      const maxPriestLevel = character.class === CharacterClass.LORD ? 6 : 7
      spellPoints.priest = calculatePool(maxPriestLevel)
    }

    return spellPoints
  }
}
