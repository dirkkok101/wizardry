import { ClassService } from '../ClassService'
import { CharacterClass } from '../../types/CharacterClass'
import { Alignment } from '../../types/Alignment'

describe('ClassService', () => {
  beforeAll(async () => {
    // Mock fetch for data files
    global.fetch = jest.fn((url: string) => {
      const path = url.toString()

      // Class data mocks
      if (path.includes('/assets/classes/fighter.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'fighter',
            name: 'Fighter',
            description: 'Master of combat',
            requirements: { str: 11 },
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d10',
            spellAccess: null,
            attacksPerLevel: { '1-4': 1, '5-9': 2, '10+': 3 },
            xpTable: [2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 900000, 1300000, 1500000],
            specialAbilities: [],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response)
      }
      if (path.includes('/assets/classes/bishop.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'bishop',
            name: 'Bishop',
            description: 'Dual spellcaster',
            requirements: { int: 12, pie: 12 },
            alignmentRestrictions: ['good', 'evil'],
            equipmentRestrictions: {
              weapons: ['mace', 'staff'],
              armor: ['robes'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: {
              mage: { minLevel: 1, maxLevel: 7 },
              priest: { minLevel: 1, maxLevel: 7 }
            },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2600, 5200, 10400, 20800, 41600, 83200, 162500, 325000, 650000, 1170000, 1690000],
            specialAbilities: ['Cast both mage and priest spells'],
            canIdentifyItems: true,
            canDispelUndead: true,
            canCriticalHit: false
          })
        } as Response)
      }
      if (path.includes('/assets/classes/ninja.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'ninja',
            name: 'Ninja',
            description: 'Elite assassin',
            requirements: { str: 17, int: 17, pie: 17, vit: 17, agi: 17 },
            alignmentRestrictions: ['evil'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['leather', 'chain'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: null,
            attacksPerLevel: { '1-4': 2, '5-9': 3, '10+': 4 },
            xpTable: [3200, 6400, 12800, 25600, 51200, 102400, 200000, 400000, 800000, 1440000, 2080000],
            specialAbilities: ['Critical hit', 'Extra attacks', 'AC bonus'],
            canIdentifyItems: true,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response)
      }
      if (path.includes('/assets/classes/mage.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'mage',
            name: 'Mage',
            description: 'Master of arcane magic',
            requirements: {},
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['dagger', 'staff'],
              armor: ['robes'],
              shields: [],
              helmets: []
            },
            hitDice: '1d4',
            spellAccess: { mage: { minLevel: 1, maxLevel: 7 } },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2400, 4800, 9600, 19200, 38400, 76800, 150000, 300000, 600000, 1080000, 1560000],
            specialAbilities: ['Cast mage spells'],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: false
          })
        } as Response)
      }
      if (path.includes('/assets/classes/priest.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'priest',
            name: 'Priest',
            description: 'Divine spellcaster',
            requirements: {},
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['mace', 'staff', 'flail'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d8',
            spellAccess: { priest: { minLevel: 1, maxLevel: 7 } },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2200, 4400, 8800, 17600, 35200, 70400, 137500, 275000, 550000, 990000, 1430000],
            specialAbilities: ['Cast priest spells'],
            canIdentifyItems: false,
            canDispelUndead: true,
            canCriticalHit: false
          })
        } as Response)
      }
      if (path.includes('/assets/classes/thief.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'thief',
            name: 'Thief',
            description: 'Sneaky rogue',
            requirements: {},
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['dagger', 'short-sword'],
              armor: ['leather'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: null,
            attacksPerLevel: { '1+': 1 },
            xpTable: [1800, 3600, 7200, 14400, 28800, 57600, 112500, 225000, 450000, 810000, 1170000],
            specialAbilities: ['Pick locks', 'Disarm traps', 'Hide in shadows'],
            canIdentifyItems: true,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response)
      }
      if (path.includes('/assets/classes/samurai.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'samurai',
            name: 'Samurai',
            description: 'Elite warrior-mage',
            requirements: { str: 15, int: 11, pie: 10, vit: 14, agi: 10 },
            alignmentRestrictions: ['good'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d8',
            spellAccess: { mage: { minLevel: 4, maxLevel: 6 } },
            attacksPerLevel: { '1-4': 1, '5-9': 2, '10+': 3 },
            xpTable: [3000, 6000, 12000, 24000, 48000, 96000, 187500, 375000, 750000, 1350000, 1950000],
            specialAbilities: ['Cast mage spells (limited)'],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response)
      }
      if (path.includes('/assets/classes/lord.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'lord',
            name: 'Lord',
            description: 'Holy warrior',
            requirements: { str: 15, int: 12, pie: 12, vit: 15, agi: 14 },
            alignmentRestrictions: ['good'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d10',
            spellAccess: { priest: { minLevel: 3, maxLevel: 6 } },
            attacksPerLevel: { '1-4': 1, '5-9': 2, '10+': 3 },
            xpTable: [2800, 5600, 11200, 22400, 44800, 89600, 175000, 350000, 700000, 1260000, 1820000],
            specialAbilities: ['Cast priest spells (limited)', 'Dispel undead'],
            canIdentifyItems: false,
            canDispelUndead: true,
            canCriticalHit: true
          })
        } as Response)
      }

      return Promise.reject(new Error(`Not found: ${path}`))
    }) as jest.Mock

    await ClassService.initialize()
  })

  describe('getClassData', () => {
    it('returns class data for Fighter', () => {
      const data = ClassService.getClassData(CharacterClass.FIGHTER)

      expect(data.name).toBe('Fighter')
      expect(data.hitDice).toBe('1d10')
      expect(data.requirements.str).toBe(11)
    })

    it('returns class data for Bishop', () => {
      const data = ClassService.getClassData(CharacterClass.BISHOP)

      expect(data.name).toBe('Bishop')
      expect(data.requirements.int).toBe(12)
      expect(data.requirements.pie).toBe(12)
      expect(data.requirements.str).toBeUndefined()
    })
  })

  describe('getXpForLevel', () => {
    it('returns correct XP for Fighter level 2', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 2)
      expect(xp).toBe(2000)
    })

    it('returns correct XP for Fighter level 12', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 12)
      expect(xp).toBe(1500000)
    })

    it('returns 0 for level 1', () => {
      const xp = ClassService.getXpForLevel(CharacterClass.FIGHTER, 1)
      expect(xp).toBe(0)
    })
  })

  describe('getAttacksPerRound', () => {
    it('returns 1 attack for Fighter level 1', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 1)
      expect(attacks).toBe(1)
    })

    it('returns 2 attacks for Fighter level 5', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 5)
      expect(attacks).toBe(2)
    })

    it('returns 3 attacks for Fighter level 10', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.FIGHTER, 10)
      expect(attacks).toBe(3)
    })

    it('returns 2 attacks for Ninja level 1', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.NINJA, 1)
      expect(attacks).toBe(2)
    })

    it('returns 3 attacks for Ninja level 5', () => {
      const attacks = ClassService.getAttacksPerRound(CharacterClass.NINJA, 5)
      expect(attacks).toBe(3)
    })
  })

  describe('isAlignmentAllowed', () => {
    it('allows any alignment for Fighter', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.GOOD)).toBe(true)
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.NEUTRAL)).toBe(true)
      expect(ClassService.isAlignmentAllowed(CharacterClass.FIGHTER, Alignment.EVIL)).toBe(true)
    })

    it('allows only Good/Evil for Bishop', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.GOOD)).toBe(true)
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.NEUTRAL)).toBe(false)
      expect(ClassService.isAlignmentAllowed(CharacterClass.BISHOP, Alignment.EVIL)).toBe(true)
    })

    it('allows only Evil for Ninja', () => {
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.GOOD)).toBe(false)
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.NEUTRAL)).toBe(false)
      expect(ClassService.isAlignmentAllowed(CharacterClass.NINJA, Alignment.EVIL)).toBe(true)
    })
  })
})
