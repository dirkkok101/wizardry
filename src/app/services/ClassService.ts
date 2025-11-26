import { CharacterClass, ClassData, getClassId, getAttacksForLevel, parseAlignmentRestrictions } from '@types/CharacterClass'
import { Alignment } from '@types/Alignment'
import { ClassDataLoader, LoadedClassData } from './ClassDataLoader'

class ClassServiceClass {
  /**
   * Initialize the class service by loading all class data
   * Uses ClassDataLoader which performs Zod validation
   */
  async initialize(): Promise<void> {
    await ClassDataLoader.loadAllClasses()
  }

  /**
   * Get class data for a specific class
   */
  getClassData(charClass: CharacterClass): LoadedClassData {
    if (!ClassDataLoader.isLoaded()) {
      throw new Error('ClassService not initialized. Call initialize() first.')
    }

    const data = ClassDataLoader.getClass(charClass)

    if (!data) {
      throw new Error(`Class data not found for: ${charClass}`)
    }

    return data
  }

  /**
   * Get all class data
   */
  getAllClasses(): LoadedClassData[] {
    if (!ClassDataLoader.isLoaded()) {
      throw new Error('ClassService not initialized. Call initialize() first.')
    }

    return ClassDataLoader.getAllClassesArray()
  }

  /**
   * Get XP required for a specific level
   * Level 1 = 0 XP, Level 2+ uses xpTable
   */
  getXpForLevel(charClass: CharacterClass, level: number): number {
    if (level <= 1) {
      return 0
    }

    const data = this.getClassData(charClass)
    const index = level - 2  // xpTable is for levels 2-13

    if (index < 0 || index >= data.xpTable.length) {
      throw new Error(`Invalid level ${level} for class ${charClass}`)
    }

    return data.xpTable[index]
  }

  /**
   * Get attacks per round for a class at a given level
   */
  getAttacksPerRound(charClass: CharacterClass, level: number): number {
    const data = this.getClassData(charClass)
    return getAttacksForLevel(data.attacksPerLevel, level)
  }

  /**
   * Check if an alignment is allowed for a class
   */
  isAlignmentAllowed(charClass: CharacterClass, alignment: Alignment): boolean {
    const data = this.getClassData(charClass)

    // Empty array means any alignment allowed
    if (data.alignmentRestrictions.length === 0) {
      return true
    }

    const allowedAlignments = parseAlignmentRestrictions(data.alignmentRestrictions)
    return allowedAlignments.includes(alignment)
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return ClassDataLoader.isLoaded()
  }

  /**
   * Get loading statistics (for debugging)
   */
  getLoadingStats(): { loaded: number; failed: number; total: number } {
    return {
      loaded: ClassDataLoader.getLoadedCount(),
      failed: ClassDataLoader.getFailedClasses().size,
      total: ClassDataLoader.getTotalCount()
    }
  }

  /**
   * Get failed classes (for debugging)
   */
  getFailedClasses(): ReadonlyMap<string, string> {
    return ClassDataLoader.getFailedClasses()
  }
}

export const ClassService = new ClassServiceClass()
