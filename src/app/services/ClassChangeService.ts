import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterSpellPoints, SpellPointPool } from '@models/SpellPoints'
import { ClassService } from './ClassService'
import { LevelUpService } from './LevelUpService'

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
   * Age increase per class change in weeks (1 year)
   */
  private static readonly CLASS_CHANGE_AGE_WEEKS = 52

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

    // Check stat requirements
    const statRequirements = classData.statRequirements
    if (statRequirements) {
      if (statRequirements.strength && character.strength < statRequirements.strength) {
        return { allowed: false, reason: `Requires ${statRequirements.strength} STR` }
      }
      if (statRequirements.intelligence && character.intelligence < statRequirements.intelligence) {
        return { allowed: false, reason: `Requires ${statRequirements.intelligence} INT` }
      }
      if (statRequirements.piety && character.piety < statRequirements.piety) {
        return { allowed: false, reason: `Requires ${statRequirements.piety} PIE` }
      }
      if (statRequirements.vitality && character.vitality < statRequirements.vitality) {
        return { allowed: false, reason: `Requires ${statRequirements.vitality} VIT` }
      }
      if (statRequirements.agility && character.agility < statRequirements.agility) {
        return { allowed: false, reason: `Requires ${statRequirements.agility} AGI` }
      }
      if (statRequirements.luck && character.luck < statRequirements.luck) {
        return { allowed: false, reason: `Requires ${statRequirements.luck} LUC` }
      }
    }

    // Check alignment requirements
    if (classData.alignmentRequirements && classData.alignmentRequirements.length > 0) {
      if (!classData.alignmentRequirements.includes(character.alignment)) {
        return { allowed: false, reason: `Requires ${classData.alignmentRequirements.join(' or ')} alignment` }
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

    // Create updated character
    const updatedCharacter: Character = {
      ...character,
      class: newClass,
      level: 1,  // Reset to level 1
      experience: 0,  // Reset XP
      age: character.age + this.CLASS_CHANGE_AGE_WEEKS,  // Age by 1 year
      // maxLev is preserved - this is the key for HP reroll system
      // maxHp stays the same (reroll happens on next level up)
      spellPoints: newSpellPoints,
      // knownSpells are preserved
    }

    return {
      success: true,
      updatedCharacter,
      ageIncrease: this.CLASS_CHANGE_AGE_WEEKS
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
