import {
  ClassDataSchema,
  ClassRequirementsSchema,
  AlignmentSchema,
  EquipmentRestrictionsSchema,
  SpellAccessSchema,
  HitDiceSchema,
  AttacksPerLevelSchema,
  XPTableSchema,
  validateClassData,
  safeValidateClassData,
  isValidClassData
} from '../CharacterClass.schema'
import { z } from 'zod'

describe('CharacterClass Zod Schemas', () => {
  describe('ClassRequirementsSchema', () => {
    it('accepts valid stat requirements', () => {
      const valid = {
        str: 11,
        int: 12,
        pie: 10
      }
      expect(() => ClassRequirementsSchema.parse(valid)).not.toThrow()
    })

    it('accepts empty requirements', () => {
      const empty = {}
      expect(() => ClassRequirementsSchema.parse(empty)).not.toThrow()
    })

    it('rejects stats below 3', () => {
      const invalid = { str: 2 }
      expect(() => ClassRequirementsSchema.parse(invalid)).toThrow()
    })

    it('rejects stats above 18', () => {
      const invalid = { str: 19 }
      expect(() => ClassRequirementsSchema.parse(invalid)).toThrow()
    })

    it('rejects non-integer stats', () => {
      const invalid = { str: 11.5 }
      expect(() => ClassRequirementsSchema.parse(invalid)).toThrow()
    })

    it('rejects invalid stat keys', () => {
      const invalid = { strength: 11 } as any
      expect(() => ClassRequirementsSchema.parse(invalid)).toThrow()
    })
  })

  describe('AlignmentSchema', () => {
    it('accepts valid alignments', () => {
      expect(() => AlignmentSchema.parse('good')).not.toThrow()
      expect(() => AlignmentSchema.parse('neutral')).not.toThrow()
      expect(() => AlignmentSchema.parse('evil')).not.toThrow()
    })

    it('rejects invalid alignments', () => {
      expect(() => AlignmentSchema.parse('lawful')).toThrow()
      expect(() => AlignmentSchema.parse('chaotic')).toThrow()
    })
  })

  describe('EquipmentRestrictionsSchema', () => {
    it('accepts valid equipment restrictions', () => {
      const valid = {
        weapons: ['all'],
        armor: ['cloth', 'leather'],
        shields: ['small'],
        helmets: []
      }
      expect(() => EquipmentRestrictionsSchema.parse(valid)).not.toThrow()
    })

    it('requires at least one weapon', () => {
      const invalid = {
        weapons: [],
        armor: ['cloth'],
        shields: [],
        helmets: []
      }
      expect(() => EquipmentRestrictionsSchema.parse(invalid)).toThrow()
    })

    it('requires at least one armor type', () => {
      const invalid = {
        weapons: ['dagger'],
        armor: [],
        shields: [],
        helmets: []
      }
      expect(() => EquipmentRestrictionsSchema.parse(invalid)).toThrow()
    })

    it('allows empty shields and helmets arrays', () => {
      const valid = {
        weapons: ['dagger'],
        armor: ['none'],
        shields: [],
        helmets: []
      }
      expect(() => EquipmentRestrictionsSchema.parse(valid)).not.toThrow()
    })
  })

  describe('SpellAccessSchema', () => {
    it('accepts null spell access', () => {
      expect(() => SpellAccessSchema.parse(null)).not.toThrow()
    })

    it('accepts mage spells only', () => {
      const valid = {
        mage: {
          minLevel: 1,
          maxLevel: 7
        }
      }
      expect(() => SpellAccessSchema.parse(valid)).not.toThrow()
    })

    it('accepts priest spells only', () => {
      const valid = {
        priest: {
          minLevel: 1,
          maxLevel: 7
        }
      }
      expect(() => SpellAccessSchema.parse(valid)).not.toThrow()
    })

    it('accepts both mage and priest spells (Bishop)', () => {
      const valid = {
        mage: {
          minLevel: 1,
          maxLevel: 7
        },
        priest: {
          minLevel: 1,
          maxLevel: 7
        }
      }
      expect(() => SpellAccessSchema.parse(valid)).not.toThrow()
    })

    it('accepts hybrid class spell limits (Samurai/Lord)', () => {
      const samurai = {
        mage: {
          minLevel: 4,
          maxLevel: 6
        }
      }
      expect(() => SpellAccessSchema.parse(samurai)).not.toThrow()
    })

    it('rejects spell maxLevel > 7', () => {
      const invalid = {
        mage: {
          minLevel: 1,
          maxLevel: 8
        }
      }
      expect(() => SpellAccessSchema.parse(invalid)).toThrow()
    })

    it('rejects spell minLevel < 1', () => {
      const invalid = {
        mage: {
          minLevel: 0,
          maxLevel: 7
        }
      }
      expect(() => SpellAccessSchema.parse(invalid)).toThrow()
    })

    it('rejects spell minLevel > 13', () => {
      const invalid = {
        mage: {
          minLevel: 14,
          maxLevel: 7
        }
      }
      expect(() => SpellAccessSchema.parse(invalid)).toThrow()
    })
  })

  describe('HitDiceSchema', () => {
    it('accepts valid hit dice', () => {
      expect(() => HitDiceSchema.parse('1d4')).not.toThrow()
      expect(() => HitDiceSchema.parse('1d6')).not.toThrow()
      expect(() => HitDiceSchema.parse('1d8')).not.toThrow()
      expect(() => HitDiceSchema.parse('1d10')).not.toThrow()
    })

    it('rejects invalid hit dice', () => {
      expect(() => HitDiceSchema.parse('1d12')).toThrow()
      expect(() => HitDiceSchema.parse('2d6')).toThrow()
      expect(() => HitDiceSchema.parse('d8')).toThrow()
    })
  })

  describe('AttacksPerLevelSchema', () => {
    it('accepts valid range notation', () => {
      const valid = {
        '1-4': 1,
        '5-9': 2,
        '10+': 3
      }
      expect(() => AttacksPerLevelSchema.parse(valid)).not.toThrow()
    })

    it('accepts plus notation', () => {
      const valid = {
        '1+': 1
      }
      expect(() => AttacksPerLevelSchema.parse(valid)).not.toThrow()
    })

    it('accepts ninja attack progression (starts at 2)', () => {
      const ninja = {
        '1-4': 2,
        '5-9': 3,
        '10-14': 4,
        '15+': 5
      }
      expect(() => AttacksPerLevelSchema.parse(ninja)).not.toThrow()
    })

    it('rejects invalid range notation', () => {
      const invalid = {
        '1-': 1
      }
      expect(() => AttacksPerLevelSchema.parse(invalid)).toThrow()
    })

    it('rejects attacks > 10', () => {
      const invalid = {
        '1+': 11
      }
      expect(() => AttacksPerLevelSchema.parse(invalid)).toThrow()
    })

    it('rejects attacks < 1', () => {
      const invalid = {
        '1+': 0
      }
      expect(() => AttacksPerLevelSchema.parse(invalid)).toThrow()
    })
  })

  describe('XPTableSchema', () => {
    it('accepts valid XP table (11 ascending values)', () => {
      const valid = [2000, 4000, 8000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000]
      expect(() => XPTableSchema.parse(valid)).not.toThrow()
    })

    it('rejects XP table with wrong length', () => {
      const invalid = [2000, 4000, 8000]
      expect(() => XPTableSchema.parse(invalid)).toThrow()
    })

    it('rejects XP table with non-ascending values', () => {
      const invalid = [2000, 4000, 3000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000]
      expect(() => XPTableSchema.parse(invalid)).toThrow()
    })

    it('rejects XP table with duplicate values', () => {
      const invalid = [2000, 4000, 4000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000]
      expect(() => XPTableSchema.parse(invalid)).toThrow()
    })

    it('rejects negative XP values', () => {
      const invalid = [-1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000]
      expect(() => XPTableSchema.parse(invalid)).toThrow()
    })
  })

  describe('ClassDataSchema', () => {
    const validFighterData = {
      id: 'fighter',
      name: 'Fighter',
      description: 'Master of weapons and combat.',
      requirements: {
        str: 11
      },
      alignmentRestrictions: [],
      equipmentRestrictions: {
        weapons: ['all'],
        armor: ['cloth', 'leather', 'chain', 'plate'],
        shields: ['small', 'large'],
        helmets: ['leather', 'iron', 'steel']
      },
      hitDice: '1d10' as const,
      spellAccess: null,
      attacksPerLevel: {
        '1-4': 1,
        '5-9': 2,
        '10-14': 3,
        '15+': 4
      },
      xpTable: [2000, 4000, 8000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000],
      specialAbilities: ['Can use all weapons and armor'],
      canIdentifyItems: false,
      canDispelUndead: false,
      canCriticalHit: false
    }

    it('accepts valid Fighter data', () => {
      expect(() => ClassDataSchema.parse(validFighterData)).not.toThrow()
    })

    it('accepts valid Mage data', () => {
      const mageData = {
        id: 'mage',
        name: 'Mage',
        description: 'Master of arcane magic.',
        requirements: {
          int: 11
        },
        alignmentRestrictions: [],
        equipmentRestrictions: {
          weapons: ['dagger', 'staff'],
          armor: ['none'],
          shields: [],
          helmets: []
        },
        hitDice: '1d4' as const,
        spellAccess: {
          mage: {
            minLevel: 1,
            maxLevel: 7
          }
        },
        attacksPerLevel: {
          '1+': 1
        },
        xpTable: [2500, 5000, 10000, 20000, 40000, 60000, 90000, 125000, 175000, 250000, 400000],
        specialAbilities: ['Can cast mage spells'],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: false
      }
      expect(() => ClassDataSchema.parse(mageData)).not.toThrow()
    })

    it('accepts valid Bishop data (both spell types)', () => {
      const bishopData = {
        id: 'bishop',
        name: 'Bishop',
        description: 'Master of both divine and arcane magic.',
        requirements: {
          int: 12,
          pie: 12
        },
        alignmentRestrictions: ['good', 'evil'],
        equipmentRestrictions: {
          weapons: ['mace', 'flail', 'staff'],
          armor: ['cloth', 'leather', 'chain', 'plate'],
          shields: ['small', 'large'],
          helmets: []
        },
        hitDice: '1d6' as const,
        spellAccess: {
          mage: {
            minLevel: 1,
            maxLevel: 7
          },
          priest: {
            minLevel: 1,
            maxLevel: 7
          }
        },
        attacksPerLevel: {
          '1+': 1
        },
        xpTable: [3000, 6000, 12000, 24000, 48000, 96000, 190000, 380000, 760000, 1140000, 1520000],
        specialAbilities: ['Can cast both mage and priest spells', 'Can identify cursed items'],
        canIdentifyItems: true,
        canDispelUndead: false,
        canCriticalHit: false
      }
      expect(() => ClassDataSchema.parse(bishopData)).not.toThrow()
    })

    it('accepts valid Ninja data (all stats 17)', () => {
      const ninjaData = {
        id: 'ninja',
        name: 'Ninja',
        description: 'Master of stealth and martial arts.',
        requirements: {
          str: 17,
          int: 17,
          pie: 17,
          vit: 17,
          agi: 17,
          luc: 17
        },
        alignmentRestrictions: ['evil'],
        equipmentRestrictions: {
          weapons: ['dagger', 'short_sword', 'shuriken', 'staff', 'nunchaku'],
          armor: ['none'],
          shields: [],
          helmets: []
        },
        hitDice: '1d8' as const,
        spellAccess: null,
        attacksPerLevel: {
          '1-4': 2,
          '5-9': 3,
          '10-14': 4,
          '15+': 5
        },
        xpTable: [4000, 8000, 16000, 32000, 64000, 128000, 256000, 500000, 1000000, 1500000, 2000000],
        specialAbilities: ['Critical hits', 'AC bonus when unarmored', 'Fast attacks'],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: true
      }
      expect(() => ClassDataSchema.parse(ninjaData)).not.toThrow()
    })

    it('rejects missing required fields', () => {
      const { id, ...missingId } = validFighterData
      expect(() => ClassDataSchema.parse(missingId)).toThrow()
    })

    it('rejects extra fields (strict mode)', () => {
      const extraField = {
        ...validFighterData,
        extraField: 'should not be here'
      }
      expect(() => ClassDataSchema.parse(extraField)).toThrow()
    })

    it('rejects invalid nested data', () => {
      const invalidHitDice = {
        ...validFighterData,
        hitDice: '2d6'
      }
      expect(() => ClassDataSchema.parse(invalidHitDice)).toThrow()
    })
  })

  describe('Helper functions', () => {
    const validData = {
      id: 'fighter',
      name: 'Fighter',
      description: 'Test',
      requirements: { str: 11 },
      alignmentRestrictions: [],
      equipmentRestrictions: {
        weapons: ['all'],
        armor: ['plate'],
        shields: [],
        helmets: []
      },
      hitDice: '1d10' as const,
      spellAccess: null,
      attacksPerLevel: { '1+': 1 },
      xpTable: [2000, 4000, 8000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000],
      specialAbilities: [],
      canIdentifyItems: false,
      canDispelUndead: false,
      canCriticalHit: false
    }

    describe('validateClassData', () => {
      it('returns parsed data for valid input', () => {
        const result = validateClassData(validData)
        expect(result.id).toBe('fighter')
      })

      it('throws for invalid input', () => {
        const invalid = { ...validData, hitDice: 'invalid' }
        expect(() => validateClassData(invalid)).toThrow(z.ZodError)
      })
    })

    describe('safeValidateClassData', () => {
      it('returns success result for valid input', () => {
        const result = safeValidateClassData(validData)
        expect(result.success).toBe(true)
        expect(result.data?.id).toBe('fighter')
        expect(result.error).toBeUndefined()
      })

      it('returns error result for invalid input', () => {
        const invalid = { ...validData, hitDice: 'invalid' }
        const result = safeValidateClassData(invalid)
        expect(result.success).toBe(false)
        expect(result.data).toBeUndefined()
        expect(result.error).toBeDefined()
      })
    })

    describe('isValidClassData', () => {
      it('returns true for valid data', () => {
        expect(isValidClassData(validData)).toBe(true)
      })

      it('returns false for invalid data', () => {
        const invalid = { ...validData, hitDice: 'invalid' }
        expect(isValidClassData(invalid)).toBe(false)
      })

      it('returns false for non-object data', () => {
        expect(isValidClassData(null)).toBe(false)
        expect(isValidClassData('string')).toBe(false)
        expect(isValidClassData(123)).toBe(false)
      })
    })
  })
})
