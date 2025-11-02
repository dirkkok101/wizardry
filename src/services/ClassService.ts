import { CharacterClass, ClassData, getClassId, getAttacksForLevel, parseAlignmentRestrictions } from '../types/CharacterClass'
import { Alignment } from '../types/Alignment'

/**
 * Load all JSON data files from a directory
 * @param directory - Directory name under /assets/ (e.g., 'races', 'classes')
 * @returns Map of data objects keyed by their 'id' property
 */
async function loadDataFiles<T extends { id: string }>(directory: string): Promise<Map<string, T>> {
  const dataMap = new Map<string, T>()

  // Determine file list based on directory
  const files = getDataFileList(directory)

  // Load each file
  for (const filename of files) {
    const path = `/assets/${directory}/${filename}`
    try {
      const response = await fetch(path)
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`)
      }
      const data: T = await response.json()
      dataMap.set(data.id, data)
    } catch (error) {
      console.error(`Error loading ${path}:`, error)
      throw error
    }
  }

  return dataMap
}

/**
 * Get list of data files for a directory
 */
function getDataFileList(directory: string): string[] {
  switch (directory) {
    case 'races':
      return ['human.json', 'elf.json', 'dwarf.json', 'gnome.json', 'hobbit.json']
    case 'classes':
      return ['fighter.json', 'mage.json', 'priest.json', 'thief.json', 'bishop.json', 'samurai.json', 'lord.json', 'ninja.json']
    default:
      throw new Error(`Unknown data directory: ${directory}`)
  }
}

class ClassServiceClass {
  private classData: Map<string, ClassData> | null = null

  /**
   * Initialize the class service by loading all class data
   */
  async initialize(): Promise<void> {
    this.classData = await loadDataFiles<ClassData>('classes')
  }

  /**
   * Get class data for a specific class
   */
  getClassData(charClass: CharacterClass): ClassData {
    if (!this.classData) {
      throw new Error('ClassService not initialized. Call initialize() first.')
    }

    const id = getClassId(charClass)
    const data = this.classData.get(id)

    if (!data) {
      throw new Error(`Class data not found for: ${charClass}`)
    }

    return data
  }

  /**
   * Get all class data
   */
  getAllClasses(): ClassData[] {
    if (!this.classData) {
      throw new Error('ClassService not initialized. Call initialize() first.')
    }

    return Array.from(this.classData.values())
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
    return this.classData !== null
  }
}

export const ClassService = new ClassServiceClass()
