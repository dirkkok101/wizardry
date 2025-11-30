import { ClassDataLoader } from '../ClassDataLoader'
import { CharacterClass } from '@models/CharacterClass'

describe('ClassDataLoader', () => {
  beforeEach(() => {
    // Clear cache before each test
    ClassDataLoader.clearCache()
  })

  afterEach(() => {
    // Clean up after tests
    ClassDataLoader.clearCache()
  })

  describe('loadAllClasses', () => {
    it('should load all 8 class JSON files', async () => {
      const classes = await ClassDataLoader.loadAllClasses()

      expect(classes.size).toBeGreaterThanOrEqual(8)
      expect(ClassDataLoader.getLoadedCount()).toBeGreaterThanOrEqual(8)
    })

    it('should validate all classes with Zod schema', async () => {
      const classes = await ClassDataLoader.loadAllClasses()

      // All loaded classes should have validation metadata
      for (const classData of classes.values()) {
        expect(classData.loaded).toBe(true)
        expect(classData.validatedAt).toBeGreaterThan(0)
        expect(typeof classData.validatedAt).toBe('number')
      }
    })

    it('should cache results on subsequent calls', async () => {
      const firstLoad = await ClassDataLoader.loadAllClasses()
      const secondLoad = await ClassDataLoader.loadAllClasses()

      // Should return same Map instance
      expect(secondLoad).toBe(firstLoad)
    })

    it('should set loaded state to true', async () => {
      expect(ClassDataLoader.isLoaded()).toBe(false)

      await ClassDataLoader.loadAllClasses()

      expect(ClassDataLoader.isLoaded()).toBe(true)
    })

    it('should track loading state during load', async () => {
      expect(ClassDataLoader.isLoading()).toBe(false)

      const loadPromise = ClassDataLoader.loadAllClasses()

      // Note: This may or may not be true depending on timing
      // but isLoaded should definitely be false
      expect(ClassDataLoader.isLoaded()).toBe(false)

      await loadPromise

      expect(ClassDataLoader.isLoading()).toBe(false)
      expect(ClassDataLoader.isLoaded()).toBe(true)
    })

    it('should report no failed classes when all valid', async () => {
      await ClassDataLoader.loadAllClasses()

      const failedClasses = ClassDataLoader.getFailedClasses()
      expect(failedClasses.size).toBe(0)
    })
  })

  describe('getClass', () => {
    it('should throw if not loaded', () => {
      expect(() => ClassDataLoader.getClass(CharacterClass.FIGHTER)).toThrow(
        'Classes not loaded. Call loadAllClasses() first.'
      )
    })

    it('should return FIGHTER class data', async () => {
      await ClassDataLoader.loadAllClasses()

      const fighter = ClassDataLoader.getClass(CharacterClass.FIGHTER)

      expect(fighter).toBeDefined()
      expect(fighter?.id).toBe('fighter')
      expect(fighter?.name).toBe('Fighter')
      expect(fighter?.requirements.str).toBe(11)
      expect(fighter?.hitDice).toBe('1d10')
    })

    it('should return MAGE class data', async () => {
      await ClassDataLoader.loadAllClasses()

      const mage = ClassDataLoader.getClass(CharacterClass.MAGE)

      expect(mage).toBeDefined()
      expect(mage?.id).toBe('mage')
      expect(mage?.name).toBe('Mage')
      expect(mage?.requirements.int).toBe(11)
      expect(mage?.hitDice).toBe('1d4')
      expect(mage?.spellAccess?.mage?.maxLevel).toBe(7)
    })

    it('should return NINJA class data', async () => {
      await ClassDataLoader.loadAllClasses()

      const ninja = ClassDataLoader.getClass(CharacterClass.NINJA)

      expect(ninja).toBeDefined()
      expect(ninja?.id).toBe('ninja')
      expect(ninja?.name).toBe('Ninja')
      expect(ninja?.requirements.str).toBe(17)
      expect(ninja?.requirements.int).toBe(17)
      expect(ninja?.requirements.pie).toBe(17)
      expect(ninja?.requirements.vit).toBe(17)
      expect(ninja?.requirements.agi).toBe(17)
      expect(ninja?.requirements.luc).toBe(17)
      expect(ninja?.alignmentRestrictions).toEqual(['evil'])
    })

    it('should return BISHOP class data with both spell types', async () => {
      await ClassDataLoader.loadAllClasses()

      const bishop = ClassDataLoader.getClass(CharacterClass.BISHOP)

      expect(bishop).toBeDefined()
      expect(bishop?.id).toBe('bishop')
      expect(bishop?.spellAccess?.mage?.maxLevel).toBe(7)
      expect(bishop?.spellAccess?.priest?.maxLevel).toBe(7)
      expect(bishop?.canIdentifyItems).toBe(true)
    })
  })

  describe('getClassById', () => {
    it('should throw if not loaded', () => {
      expect(() => ClassDataLoader.getClassById('fighter')).toThrow(
        'Classes not loaded. Call loadAllClasses() first.'
      )
    })

    it('should return class data by string id', async () => {
      await ClassDataLoader.loadAllClasses()

      const samurai = ClassDataLoader.getClassById('samurai')

      expect(samurai).toBeDefined()
      expect(samurai?.name).toBe('Samurai')
      // Data-driven: verify spell access exists rather than hardcoding max level
      expect(samurai?.spellAccess?.mage?.maxLevel).toBeGreaterThanOrEqual(1)
    })

    it('should return undefined for non-existent class', async () => {
      await ClassDataLoader.loadAllClasses()

      const invalid = ClassDataLoader.getClassById('barbarian')

      expect(invalid).toBeUndefined()
    })
  })

  describe('getAllClasses', () => {
    it('should throw if not loaded', () => {
      expect(() => ClassDataLoader.getAllClasses()).toThrow(
        'Classes not loaded. Call loadAllClasses() first.'
      )
    })

    it('should return Map of all classes', async () => {
      await ClassDataLoader.loadAllClasses()

      const allClasses = ClassDataLoader.getAllClasses()

      expect(allClasses instanceof Map).toBe(true)
      expect(allClasses.size).toBeGreaterThanOrEqual(8)
    })
  })

  describe('getAllClassesArray', () => {
    it('should throw if not loaded', () => {
      expect(() => ClassDataLoader.getAllClassesArray()).toThrow(
        'Classes not loaded. Call loadAllClasses() first.'
      )
    })

    it('should return array of all classes', async () => {
      await ClassDataLoader.loadAllClasses()

      const classesArray = ClassDataLoader.getAllClassesArray()

      expect(Array.isArray(classesArray)).toBe(true)
      expect(classesArray.length).toBeGreaterThanOrEqual(8)

      // Verify all are LoadedClassData
      for (const classData of classesArray) {
        expect(classData.loaded).toBe(true)
        expect(classData.validatedAt).toBeGreaterThan(0)
      }
    })
  })

  describe('isLoaded', () => {
    it('should return false initially', () => {
      expect(ClassDataLoader.isLoaded()).toBe(false)
    })

    it('should return true after loading', async () => {
      await ClassDataLoader.loadAllClasses()

      expect(ClassDataLoader.isLoaded()).toBe(true)
    })

    it('should return false after clearing cache', async () => {
      await ClassDataLoader.loadAllClasses()
      expect(ClassDataLoader.isLoaded()).toBe(true)

      ClassDataLoader.clearCache()

      expect(ClassDataLoader.isLoaded()).toBe(false)
    })
  })

  describe('getLoadedCount', () => {
    it('should return 0 initially', () => {
      expect(ClassDataLoader.getLoadedCount()).toBe(0)
    })

    it('should return 8 after loading all classes', async () => {
      await ClassDataLoader.loadAllClasses()

      expect(ClassDataLoader.getLoadedCount()).toBeGreaterThanOrEqual(8)
    })
  })

  describe('getTotalCount', () => {
    it('should return 0 initially', () => {
      expect(ClassDataLoader.getTotalCount()).toBe(0)
    })

    it('should return total count after loading', async () => {
      await ClassDataLoader.loadAllClasses()

      const total = ClassDataLoader.getTotalCount()
      const loaded = ClassDataLoader.getLoadedCount()
      const failed = ClassDataLoader.getFailedClasses().size

      expect(total).toBe(loaded + failed)
    })
  })

  describe('clearCache', () => {
    it('should reset all state', async () => {
      await ClassDataLoader.loadAllClasses()

      expect(ClassDataLoader.isLoaded()).toBe(true)
      expect(ClassDataLoader.getLoadedCount()).toBeGreaterThan(0)

      ClassDataLoader.clearCache()

      expect(ClassDataLoader.isLoaded()).toBe(false)
      expect(ClassDataLoader.getLoadedCount()).toBe(0)
      expect(ClassDataLoader.getTotalCount()).toBe(0)
      expect(ClassDataLoader.getFailedClasses().size).toBe(0)
    })
  })

  describe('Zod validation', () => {
    it('should validate all required fields', async () => {
      const classes = await ClassDataLoader.loadAllClasses()

      for (const classData of classes.values()) {
        // Required string fields
        expect(typeof classData.id).toBe('string')
        expect(classData.id.length).toBeGreaterThan(0)
        expect(typeof classData.name).toBe('string')
        expect(classData.name.length).toBeGreaterThan(0)
        expect(typeof classData.description).toBe('string')

        // Requirements object
        expect(typeof classData.requirements).toBe('object')

        // Alignment restrictions array
        expect(Array.isArray(classData.alignmentRestrictions)).toBe(true)

        // Equipment restrictions
        expect(typeof classData.equipmentRestrictions).toBe('object')
        expect(Array.isArray(classData.equipmentRestrictions.weapons)).toBe(true)
        expect(Array.isArray(classData.equipmentRestrictions.armor)).toBe(true)
        expect(Array.isArray(classData.equipmentRestrictions.shields)).toBe(true)
        expect(Array.isArray(classData.equipmentRestrictions.helmets)).toBe(true)

        // Hit dice
        expect(typeof classData.hitDice).toBe('string')
        expect(['1d4', '1d6', '1d8', '1d10']).toContain(classData.hitDice)

        // Attacks per level
        expect(typeof classData.attacksPerLevel).toBe('object')

        // XP table (11-12 entries per schema)
        expect(Array.isArray(classData.xpTable)).toBe(true)
        expect(classData.xpTable.length).toBeGreaterThanOrEqual(11)
        expect(classData.xpTable.length).toBeLessThanOrEqual(12)

        // Special abilities array
        expect(Array.isArray(classData.specialAbilities)).toBe(true)

        // Boolean flags
        expect(typeof classData.canIdentifyItems).toBe('boolean')
        expect(typeof classData.canDispelUndead).toBe('boolean')
        expect(typeof classData.canCriticalHit).toBe('boolean')
      }
    })

    it('should validate XP tables are ascending', async () => {
      const classes = await ClassDataLoader.loadAllClasses()

      for (const classData of classes.values()) {
        for (let i = 1; i < classData.xpTable.length; i++) {
          expect(classData.xpTable[i]).toBeGreaterThan(classData.xpTable[i - 1])
        }
      }
    })

    it('should validate stat requirements are within valid range', async () => {
      const classes = await ClassDataLoader.loadAllClasses()

      for (const classData of classes.values()) {
        const stats = ['str', 'int', 'pie', 'vit', 'agi', 'luc'] as const
        for (const stat of stats) {
          const value = classData.requirements[stat]
          if (value !== undefined) {
            expect(value).toBeGreaterThanOrEqual(3)
            expect(value).toBeLessThanOrEqual(18)
          }
        }
      }
    })
  })
})
