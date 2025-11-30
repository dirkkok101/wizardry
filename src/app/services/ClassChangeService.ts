import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterSpellPoints, SpellPointPool } from '@models/SpellPoints'
import { ClassService } from './ClassService'
import { LevelUpService } from './LevelUpService'
import { RaceService } from './RaceService'
import { RandomService } from './RandomService'

interface ClassChangeResult {
  success: boolean
  updatedCharacter?: Character
  error?: string
  ageIncrease: number  // Weeks added to age
}

/**
 * ClassChangeService - Handles class changes in authentic Wizardry 1 style
 *
 * When a character changes class:
 * - Must meet stat requirements for new class
 * - Level resets to 1, but maxLev is preserved for HP reroll
 * - XP resets to 0
 * - Known spells are retained
 * - Character ages (52 weeks = 1 year per class change)
 * - Spell points recalculated for new class at level 1
 *
 * Source: Thomas William Ewers' reverse-engineered Apple II source
 */
export class ClassChangeService {
  /**
   * Calculate age increase for class change (authentic Wizardry 1)
   *
   * Formula: (1d3 + 3) years + 44 weeks
   * - 1d3 + 3 = 4 to 6 years
   * - Plus 44 weeks
   * - Total range: 252-356 weeks (4.8-6.8 years)
   *
   * This makes class changing a significant decision due to the age penalty.
   */
  private static getClassChangeAgeWeeks(): number {
    const years = RandomService.rollDie(3) + 3  // 1d3 + 3 = 4-6 years
    return (years * 52) + 44  // Convert to weeks + 44
  }

  /**
   * Check if character can change to a new class
   */
  static canChangeClass(character: Character, newClass: CharacterClass): { allowed: boolean; reason?: string } {
    // Cannot change to current class
    if (character.class === newClass) {
      return { allowed: false, reason: 'Already this class' }
    }

    // Must meet stat requirements for new class
    const classData = ClassService.getClassData(newClass)
    if (!classData) {
      return { allowed: false, reason: 'Invalid class' }
    }

    // Check stat requirements (uses short names from ClassRequirements: str, int, pie, vit, agi, luc)
    const requirements = classData.requirements
    if (requirements) {
      if (requirements.str && character.strength < requirements.str) {
        return { allowed: false, reason: `Requires ${requirements.str} STR` }
      }
      if (requirements.int && character.intelligence < requirements.int) {
        return { allowed: false, reason: `Requires ${requirements.int} INT` }
      }
      if (requirements.pie && character.piety < requirements.pie) {
        return { allowed: false, reason: `Requires ${requirements.pie} PIE` }
      }
      if (requirements.vit && character.vitality < requirements.vit) {
        return { allowed: false, reason: `Requires ${requirements.vit} VIT` }
      }
      if (requirements.agi && character.agility < requirements.agi) {
        return { allowed: false, reason: `Requires ${requirements.agi} AGI` }
      }
      if (requirements.luc && character.luck < requirements.luc) {
        return { allowed: false, reason: `Requires ${requirements.luc} LUC` }
      }
    }

    // Check alignment restrictions (uses lowercase values: "good", "neutral", "evil")
    if (classData.alignmentRestrictions && classData.alignmentRestrictions.length > 0) {
      const characterAlignment = character.alignment.toLowerCase()
      if (!classData.alignmentRestrictions.includes(characterAlignment)) {
        return { allowed: false, reason: `Requires ${classData.alignmentRestrictions.join(' or ')} alignment` }
      }
    }

    return { allowed: true }
  }

  /**
   * Get list of classes character can change to
   */
  static getAvailableClasses(character: Character): CharacterClass[] {
    const allClasses = Object.values(CharacterClass)
    return allClasses.filter(cls => {
      const result = this.canChangeClass(character, cls)
      return result.allowed
    })
  }

  /**
   * Perform class change
   *
   * Authentic Wizardry 1 mechanics:
   * - Level resets to 1
   * - maxLev is preserved (for HP reroll system)
   * - XP resets to 0
   * - Stats reset to racial base (authentic Wizardry 1)
   * - Known spells retained
   * - Character ages by 1 year (52 weeks)
   * - Spell points recalculated for new class
   * - HP uses reroll system with preserved maxLev
   */
  static changeClass(character: Character, newClass: CharacterClass): ClassChangeResult {
    // Validate class change
    const validation = this.canChangeClass(character, newClass)
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.reason,
        ageIncrease: 0
      }
    }

    // Calculate new spell points for the new class at level 1
    const newSpellPoints = this.calculateSpellPointsForClassChange(character, newClass)

    // Get racial base stats (authentic Wizardry 1 - stats reset on class change)
    const raceData = RaceService.getRaceData(character.race)
    const baseStats = raceData.baseStats

    // Calculate age increase (authentic Wizardry 1: 4-6 years + 44 weeks)
    const ageIncrease = this.getClassChangeAgeWeeks()

    // Create updated character with stats reset to racial base
    const updatedCharacter: Character = {
      ...character,
      class: newClass,
      level: 1,  // Reset to level 1
      experience: 0,  // Reset XP
      age: character.age + ageIncrease,  // Age by 4-6+ years (authentic)
      // Authentic Wizardry 1: Stats reset to racial base on class change
      strength: baseStats.str,
      intelligence: baseStats.int,
      piety: baseStats.pie,
      vitality: baseStats.vit,
      agility: baseStats.agi,
      luck: baseStats.luc,
      // maxLev is preserved - this is the key for HP reroll system
      // maxHp stays the same (reroll happens on next level up)
      spellPoints: newSpellPoints,
      // knownSpells are preserved
    }

    return {
      success: true,
      updatedCharacter,
      ageIncrease
    }
  }

  /**
   * Calculate spell points for new class at level 1
   */
  private static calculateSpellPointsForClassChange(
    character: Character,
    newClass: CharacterClass
  ): CharacterSpellPoints | undefined {
    const classData = ClassService.getClassData(newClass)

    // Non-casters have no spell points
    if (!classData.spellAccess) {
      return undefined
    }

    // Create empty spell point structure
    const createEmptyPool = (): SpellPointPool => ({
      level1: { current: 0, max: 0 },
      level2: { current: 0, max: 0 },
      level3: { current: 0, max: 0 },
      level4: { current: 0, max: 0 },
      level5: { current: 0, max: 0 },
      level6: { current: 0, max: 0 },
      level7: { current: 0, max: 0 }
    })

    const spellPoints: CharacterSpellPoints = {}

    // At level 1, casters get 2 spell points for spell level 1
    if (classData.spellAccess.mage) {
      const pool = createEmptyPool()
      pool.level1 = { current: 2, max: 2 }
      spellPoints.mage = pool
    }

    if (classData.spellAccess.priest) {
      const pool = createEmptyPool()
      pool.level1 = { current: 2, max: 2 }
      spellPoints.priest = pool
    }

    return spellPoints
  }
}
