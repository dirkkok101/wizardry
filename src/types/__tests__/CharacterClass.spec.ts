import { CharacterClass, ClassData, parseAlignmentRestrictions, getClassId, parseClass, getAttacksForLevel } from '../CharacterClass'
import { Alignment } from '../Alignment'

describe('CharacterClass Type System', () => {
  describe('ClassData interface', () => {
    it('matches JSON structure for Fighter', () => {
      const fighter: ClassData = {
        id: 'fighter',
        name: 'Fighter',
        description: 'Test',
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
        hitDice: '1d10',
        spellAccess: null,
        attacksPerLevel: {
          '1-4': 1,
          '5-9': 2,
          '10+': 3
        },
        xpTable: [2000, 4000, 8000, 16000, 32000, 64000, 128000, 250000, 500000, 1000000, 1500000],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: true
      }

      expect(fighter.requirements.str).toBe(11)
      expect(fighter.hitDice).toBe('1d10')
      expect(fighter.xpTable).toHaveLength(11)
    })

    it('matches JSON structure for Mage', () => {
      const mage: ClassData = {
        id: 'mage',
        name: 'Mage',
        description: 'Test',
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
        hitDice: '1d4',
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
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: false
      }

      expect(mage.spellAccess?.mage?.maxLevel).toBe(7)
      expect(mage.hitDice).toBe('1d4')
    })

    it('matches JSON structure for Bishop', () => {
      const bishop: ClassData = {
        id: 'bishop',
        name: 'Bishop',
        description: 'Test',
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
        hitDice: '1d6',
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
        specialAbilities: [],
        canIdentifyItems: true,
        canDispelUndead: false,
        canCriticalHit: false
      }

      expect(bishop.alignmentRestrictions).toEqual(['good', 'evil'])
      expect(bishop.requirements.str).toBeUndefined()
    })
  })

  describe('parseAlignmentRestrictions', () => {
    it('parses alignment restrictions correctly', () => {
      const restrictions = parseAlignmentRestrictions(['good', 'evil'])
      expect(restrictions).toEqual([Alignment.GOOD, Alignment.EVIL])
    })

    it('handles empty restrictions', () => {
      const restrictions = parseAlignmentRestrictions([])
      expect(restrictions).toEqual([])
    })

    it('throws error for invalid alignment', () => {
      expect(() => parseAlignmentRestrictions(['invalid'])).toThrow('Invalid alignment: invalid')
    })
  })

  describe('getClassId', () => {
    it('converts CharacterClass to lowercase id', () => {
      expect(getClassId(CharacterClass.FIGHTER)).toBe('fighter')
      expect(getClassId(CharacterClass.MAGE)).toBe('mage')
      expect(getClassId(CharacterClass.BISHOP)).toBe('bishop')
    })
  })

  describe('parseClass', () => {
    it('converts lowercase id to CharacterClass', () => {
      expect(parseClass('fighter')).toBe(CharacterClass.FIGHTER)
      expect(parseClass('mage')).toBe(CharacterClass.MAGE)
      expect(parseClass('bishop')).toBe(CharacterClass.BISHOP)
    })

    it('handles uppercase input', () => {
      expect(parseClass('FIGHTER')).toBe(CharacterClass.FIGHTER)
    })

    it('returns null for invalid class id', () => {
      expect(parseClass('invalid')).toBeNull()
    })
  })

  describe('getAttacksForLevel', () => {
    it('handles range notation (1-4)', () => {
      const attacksPerLevel = {
        '1-4': 1,
        '5-9': 2,
        '10+': 3
      }

      expect(getAttacksForLevel(attacksPerLevel, 1)).toBe(1)
      expect(getAttacksForLevel(attacksPerLevel, 4)).toBe(1)
      expect(getAttacksForLevel(attacksPerLevel, 5)).toBe(2)
      expect(getAttacksForLevel(attacksPerLevel, 9)).toBe(2)
      expect(getAttacksForLevel(attacksPerLevel, 10)).toBe(3)
      expect(getAttacksForLevel(attacksPerLevel, 13)).toBe(3)
    })

    it('handles plus notation (1+)', () => {
      const attacksPerLevel = {
        '1+': 1
      }

      expect(getAttacksForLevel(attacksPerLevel, 1)).toBe(1)
      expect(getAttacksForLevel(attacksPerLevel, 5)).toBe(1)
      expect(getAttacksForLevel(attacksPerLevel, 13)).toBe(1)
    })

    it('defaults to 1 attack when no range matches', () => {
      const attacksPerLevel = {
        '5-9': 2
      }

      expect(getAttacksForLevel(attacksPerLevel, 1)).toBe(1)
    })
  })
})
