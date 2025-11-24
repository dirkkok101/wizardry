import {
  validateRaceData,
  validateAgainstSourceMaterial,
  validateAndLoadRaceData,
  EXPECTED_RACE_DATA,
  RaceDataSchema
} from '../RaceValidation'

describe('RaceValidation', () => {
  describe('RaceDataSchema', () => {
    it('validates valid human race data', () => {
      const validData = {
        id: 'human',
        name: 'Human',
        baseStats: {
          str: 8,
          int: 8,
          pie: 5,
          vit: 8,
          agi: 8,
          luc: 9
        },
        statTotal: 46,
        savingThrowBonus: {
          death: -1
        },
        description: 'Balanced race',
        strengths: ['Balanced'],
        weaknesses: ['No exceptional stats'],
        bestClasses: ['fighter', 'mage']
      }

      const result = RaceDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('rejects invalid race ID', () => {
      const invalidData = {
        id: 'orc', // Not a valid Wizardry 1 race
        name: 'Orc',
        baseStats: { str: 10, int: 5, pie: 5, vit: 10, agi: 7, luc: 6 },
        statTotal: 43,
        savingThrowBonus: {},
        description: 'Strong warrior',
        strengths: ['Strong'],
        weaknesses: ['Dumb'],
        bestClasses: ['fighter']
      }

      const result = RaceDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('rejects base stats below minimum', () => {
      const invalidData = {
        id: 'human',
        name: 'Human',
        baseStats: {
          str: 3, // Below minimum of 5
          int: 8,
          pie: 5,
          vit: 8,
          agi: 8,
          luc: 9
        },
        statTotal: 41,
        savingThrowBonus: {},
        description: 'Weak human',
        strengths: ['None'],
        weaknesses: ['Weak'],
        bestClasses: ['fighter']
      }

      const result = RaceDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('rejects base stats above maximum', () => {
      const invalidData = {
        id: 'human',
        name: 'Human',
        baseStats: {
          str: 20, // Above maximum of 15
          int: 8,
          pie: 5,
          vit: 8,
          agi: 8,
          luc: 9
        },
        statTotal: 58,
        savingThrowBonus: {},
        description: 'Super strong human',
        strengths: ['Strong'],
        weaknesses: ['None'],
        bestClasses: ['fighter']
      }

      const result = RaceDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('rejects invalid class names', () => {
      const invalidData = {
        id: 'human',
        name: 'Human',
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        statTotal: 46,
        savingThrowBonus: {},
        description: 'Human',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['Fighter'] // Should be lowercase
      }

      const result = RaceDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('rejects positive saving throw bonuses', () => {
      const invalidData = {
        id: 'human',
        name: 'Human',
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        statTotal: 46,
        savingThrowBonus: {
          death: 1 // Should be negative
        },
        description: 'Human',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['fighter']
      }

      const result = RaceDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('accepts empty saving throw bonuses', () => {
      const validData = {
        id: 'human',
        name: 'Human',
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        statTotal: 46,
        savingThrowBonus: {},
        description: 'Human',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['fighter']
      }

      const result = RaceDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('validateAgainstSourceMaterial', () => {
    it('validates correct human stats', () => {
      const humanData = {
        id: 'human' as const,
        name: 'Human',
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        statTotal: 46,
        savingThrowBonus: { death: -1 },
        description: 'Balanced race',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['fighter' as const]
      }

      const result = validateAgainstSourceMaterial(humanData)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('detects incorrect base stats', () => {
      const incorrectData = {
        id: 'human' as const,
        name: 'Human',
        baseStats: { str: 10, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 }, // Wrong STR
        statTotal: 48,
        savingThrowBonus: { death: -1 },
        description: 'Balanced race',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['fighter' as const]
      }

      const result = validateAgainstSourceMaterial(incorrectData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Base stats do not match'))).toBe(true)
    })

    it('detects incorrect stat total', () => {
      const incorrectData = {
        id: 'human' as const,
        name: 'Human',
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        statTotal: 50, // Wrong total
        savingThrowBonus: { death: -1 },
        description: 'Balanced race',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['fighter' as const]
      }

      const result = validateAgainstSourceMaterial(incorrectData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Stat total'))).toBe(true)
    })

    it('detects incorrect stat total calculation', () => {
      const incorrectData = {
        id: 'human' as const,
        name: 'Human',
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        statTotal: 100, // Declared total doesn't match actual
        savingThrowBonus: { death: -1 },
        description: 'Balanced race',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['fighter' as const]
      }

      const result = validateAgainstSourceMaterial(incorrectData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('mismatch: declared 100, actual 46'))).toBe(true)
    })

    it('detects missing saving throw bonuses', () => {
      const incorrectData = {
        id: 'human' as const,
        name: 'Human',
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        statTotal: 46,
        savingThrowBonus: {}, // Missing death bonus
        description: 'Balanced race',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['fighter' as const]
      }

      const result = validateAgainstSourceMaterial(incorrectData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Missing saving throw bonuses'))).toBe(true)
    })

    it('detects unexpected saving throw bonuses', () => {
      const incorrectData = {
        id: 'human' as const,
        name: 'Human',
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        statTotal: 46,
        savingThrowBonus: { death: -1, breath: -4 }, // Unexpected breath bonus
        description: 'Balanced race',
        strengths: ['Balanced'],
        weaknesses: ['None'],
        bestClasses: ['fighter' as const]
      }

      const result = validateAgainstSourceMaterial(incorrectData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Unexpected saving throw bonuses'))).toBe(true)
    })

    it('detects incorrect saving throw bonus values', () => {
      const incorrectData = {
        id: 'dwarf' as const,
        name: 'Dwarf',
        baseStats: { str: 10, int: 7, pie: 10, vit: 10, agi: 5, luc: 6 },
        statTotal: 48,
        savingThrowBonus: { breath: -2 }, // Should be -4
        description: 'Hardy race',
        strengths: ['Strong'],
        weaknesses: ['Slow'],
        bestClasses: ['fighter' as const]
      }

      const result = validateAgainstSourceMaterial(incorrectData)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Saving throw bonus mismatch'))).toBe(true)
    })
  })

  describe('validateAndLoadRaceData', () => {
    it('validates and loads valid race data', () => {
      const validData = {
        id: 'elf',
        name: 'Elf',
        baseStats: { str: 7, int: 10, pie: 10, vit: 6, agi: 9, luc: 6 },
        statTotal: 48,
        savingThrowBonus: { wand: -2 },
        description: 'Magical race',
        strengths: ['Smart', 'Pious'],
        weaknesses: ['Fragile'],
        bestClasses: ['mage', 'priest']
      }

      const result = validateAndLoadRaceData(validData)
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.id).toBe('elf')
      expect(result.schemaErrors).toBeUndefined()
      expect(result.sourceErrors).toBeUndefined()
    })

    it('returns schema errors for invalid data', () => {
      const invalidData = {
        id: 'invalid-race',
        name: 'Invalid',
        baseStats: { str: 8 }, // Missing required fields
        description: 'Invalid',
        strengths: [],
        weaknesses: [],
        bestClasses: []
      }

      const result = validateAndLoadRaceData(invalidData)
      expect(result.success).toBe(false)
      expect(result.schemaErrors).toBeDefined()
      expect(result.schemaErrors!.length).toBeGreaterThan(0)
    })

    it('returns source errors for data that does not match source material', () => {
      const invalidData = {
        id: 'hobbit',
        name: 'Hobbit',
        baseStats: { str: 6, int: 7, pie: 7, vit: 6, agi: 10, luc: 14 }, // Wrong STR and LUC (but valid range)
        statTotal: 50, // Correct total, but wrong individual stats
        savingThrowBonus: { spell: -3 },
        description: 'Lucky race',
        strengths: ['Lucky'],
        weaknesses: ['Weak'],
        bestClasses: ['thief']
      }

      const result = validateAndLoadRaceData(invalidData)
      expect(result.success).toBe(false)
      expect(result.sourceErrors).toBeDefined()
      expect(result.sourceErrors!.length).toBeGreaterThan(0)
      expect(result.sourceErrors!.some(e => e.includes('Base stats do not match'))).toBe(true)
    })
  })

  describe('EXPECTED_RACE_DATA', () => {
    it('contains all 5 races', () => {
      expect(Object.keys(EXPECTED_RACE_DATA)).toHaveLength(5)
      expect(EXPECTED_RACE_DATA).toHaveProperty('human')
      expect(EXPECTED_RACE_DATA).toHaveProperty('elf')
      expect(EXPECTED_RACE_DATA).toHaveProperty('dwarf')
      expect(EXPECTED_RACE_DATA).toHaveProperty('gnome')
      expect(EXPECTED_RACE_DATA).toHaveProperty('hobbit')
    })

    it('has correct stat totals', () => {
      expect(EXPECTED_RACE_DATA.human.statTotal).toBe(46)
      expect(EXPECTED_RACE_DATA.elf.statTotal).toBe(48)
      expect(EXPECTED_RACE_DATA.dwarf.statTotal).toBe(48)
      expect(EXPECTED_RACE_DATA.gnome.statTotal).toBe(49)
      expect(EXPECTED_RACE_DATA.hobbit.statTotal).toBe(50)
    })

    it('has correct hobbit luck (highest)', () => {
      expect(EXPECTED_RACE_DATA.hobbit.baseStats.luc).toBe(15)
    })

    it('has correct saving throw bonuses', () => {
      expect(EXPECTED_RACE_DATA.human.savingThrowBonus.death).toBe(-1)
      expect(EXPECTED_RACE_DATA.elf.savingThrowBonus.wand).toBe(-2)
      expect(EXPECTED_RACE_DATA.dwarf.savingThrowBonus.breath).toBe(-4)
      expect(EXPECTED_RACE_DATA.gnome.savingThrowBonus.petrify).toBe(-2)
      expect(EXPECTED_RACE_DATA.hobbit.savingThrowBonus.spell).toBe(-3)
    })
  })
})
