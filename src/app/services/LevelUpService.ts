import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
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
  diedFromVitalityLoss?: boolean  // True if character died from VIT dropping to 0
}

interface LevelUpResult {
  updatedCharacter: Character
  levelUpData: LevelUpData
}

export const MAX_LEVEL = 13

/**
 * Authentic Wizardry 1 XP tables per class.
 * Index 0 = level 1, index 12 = level 13.
 * Source: Thomas William Ewers' reverse-engineered Apple II source
 */
const CLASS_XP_TABLES: Record<CharacterClass, number[]> = {
  [CharacterClass.FIGHTER]: [
    0, 1000, 1724, 2972, 5124, 8834, 15231, 26256, 45268, 78052, 134575, 232039, 400144
  ],
  [CharacterClass.MAGE]: [
    0, 1100, 1896, 3269, 5636, 9718, 16755, 28882, 49795, 85857, 148033, 255243, 440159
  ],
  [CharacterClass.PRIEST]: [
    0, 1050, 1810, 3121, 5380, 9276, 15993, 27569, 47532, 81955, 141304, 243641, 420151
  ],
  [CharacterClass.THIEF]: [
    0, 900, 1551, 2675, 4611, 7951, 13708, 23631, 40742, 70247, 121118, 208835, 360130
  ],
  [CharacterClass.BISHOP]: [
    0, 1200, 2069, 3567, 6149, 10601, 18278, 31507, 54322, 93662, 161491, 278447, 480173
  ],
  [CharacterClass.SAMURAI]: [
    0, 1250, 2155, 3716, 6405, 11043, 19040, 32820, 56586, 97565, 168220, 290049, 500180
  ],
  [CharacterClass.LORD]: [
    0, 1300, 2241, 3864, 6661, 11484, 19801, 34132, 58849, 101468, 174949, 301650, 520187
  ],
  [CharacterClass.NINJA]: [
    0, 1450, 2500, 4310, 7431, 12812, 22092, 38080, 65660, 113211, 195199, 336577, 580209
  ]
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
   * Get XP required for a given level using authentic Wizardry 1 tables.
   * Returns XP needed to reach the specified level.
   */
  static getXPRequirement(level: number, characterClass: CharacterClass): number {
    const table = CLASS_XP_TABLES[characterClass]
    if (level < 1 || level > MAX_LEVEL) {
      return Infinity
    }
    // Table index 0 = level 1, index 1 = level 2, etc.
    return table[level - 1]
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
   * Roll HP using authentic Wizardry 1 reroll system.
   * Rolls ALL hit dice based on maxLev, returns higher of: current maxHP or new roll.
   *
   * Formula: Roll (maxLev × hitDie) dice, add (maxLev × vitBonus)
   * Keep higher of current maxHP or new total.
   *
   * @param character - Character leveling up
   * @param newMaxLev - The new maxLev value (max of current maxLev and new level)
   * @returns Object with newMaxHp and the hpIncrease (can be 0 if current was higher)
   */
  static rollHPWithReroll(character: Character, newMaxLev: number): { newMaxHp: number; hpIncrease: number } {
    const hitDie = CLASS_HIT_DICE[character.class]
    const vitBonus = this.getVitalityBonus(character.vitality)

    // Roll ALL dice for maxLev levels
    let newRoll = 0
    for (let i = 0; i < newMaxLev; i++) {
      newRoll += RandomService.rollDie(hitDie)
    }
    // Add vitality bonus for each level
    newRoll += newMaxLev * vitBonus

    // Minimum HP is maxLev (at least 1 HP per level)
    newRoll = Math.max(newMaxLev, newRoll)

    // Authentic Wizardry 1: Keep higher of current or new, but ALWAYS gain at least 1 HP
    // (per research doc Section 6.1: "return character.maxHP + 1" if new roll isn't higher)
    const newMaxHp = newRoll > character.maxHp ? newRoll : character.maxHp + 1
    const hpIncrease = newMaxHp - character.maxHp

    return { newMaxHp, hpIncrease }
  }

  /**
   * @deprecated Use rollHPWithReroll instead. Kept for backwards compatibility.
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
   *     If roll <= (130 - ageInYears): stat +1 (increase)
   *     Else: stat -1 (decrease)
   *
   * Younger characters have better growth, older characters risk stat decreases.
   * Stats are clamped to 3-18 range.
   *
   * Note: Age is stored in weeks, converted to years for this calculation.
   */
  static rollStatChanges(character: Character): StatChanges {
    const changes: StatChanges = {}
    // Convert age from weeks to years for stat change calculation
    const ageInYears = Math.floor(character.age / 52)

    // Calculate increase threshold based on age in years
    // Age 18: 112% capped to 95%, Age 30: 100%, Age 50: 80%, etc.
    const increaseThreshold = Math.min(95, Math.max(5, 130 - ageInYears))

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
            // Authentic Wizardry 1: Stats at 18 have 5/6 chance to resist decrease
            // Roll 1d6 - only decrease if roll is 1 (1/6 = 16.67% chance)
            if (currentValue !== 18 || RandomService.rollDie(6) === 1) {
              changes[stat] = -1
            }
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
   * Perform level up: increment level, roll HP (with reroll system),
   * roll stats (with death on VIT drop), increase spell points.
   *
   * Authentic Wizardry 1 mechanics:
   * - HP uses reroll system: roll ALL dice, keep higher of current or new
   * - maxLev tracks highest level achieved (for HP preservation)
   * - If vitality drops to 0, character dies
   *
   * Returns updated character and level up data for display
   */
  static performLevelUp(character: Character): LevelUpResult {
    const statChanges = this.rollStatChanges(character)
    const newLevel = character.level + 1

    // Calculate new vitality after stat changes
    const newVitality = character.vitality + (statChanges.vitality || 0)

    // Check for death from vitality dropping to 0 or below
    const diedFromVitalityLoss = newVitality <= 0

    // Update maxLev (highest level achieved) for HP calculation
    const newMaxLev = Math.max(character.maxLev || character.level, newLevel)

    // Roll HP using authentic reroll system
    const { newMaxHp, hpIncrease } = this.rollHPWithReroll(character, newMaxLev)

    // Calculate updated spell points for the new level
    const updatedSpellPoints = this.calculateSpellPointsForLevel(character, newLevel)

    const updatedCharacter: Character = {
      ...character,
      level: newLevel,
      maxLev: newMaxLev,
      maxHp: newMaxHp,
      hp: diedFromVitalityLoss ? 0 : newMaxHp, // Dead if VIT dropped to 0, else fully heal
      strength: character.strength + (statChanges.strength || 0),
      intelligence: character.intelligence + (statChanges.intelligence || 0),
      piety: character.piety + (statChanges.piety || 0),
      vitality: Math.max(0, newVitality), // Don't go negative
      agility: character.agility + (statChanges.agility || 0),
      luck: character.luck + (statChanges.luck || 0),
      spellPoints: updatedSpellPoints,
      // If died from VIT loss, update status
      status: diedFromVitalityLoss ? CharacterStatus.DEAD : character.status
    }

    const levelUpData: LevelUpData = {
      newLevel,
      hpIncrease,
      statChanges,
      diedFromVitalityLoss
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
