import { Race, RaceData, parseSavingThrowBonus, getRaceId, parseRace } from '../Race'

describe('Race Type System', () => {
  describe('RaceData interface', () => {
    it('matches JSON structure for Human', () => {
      const human: RaceData = {
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
        savingThrowBonus: {
          death: -1
        },
        statTotal: 46,
        description: 'Test',
        strengths: [],
        weaknesses: [],
        bestClasses: []
      }

      expect(human.baseStats.str).toBe(8)
      expect(human.savingThrowBonus.death).toBe(-1)
    })

    it('matches JSON structure for Elf', () => {
      const elf: RaceData = {
        id: 'elf',
        name: 'Elf',
        baseStats: {
          str: 7,
          int: 10,
          pie: 10,
          vit: 6,
          agi: 9,
          luc: 6
        },
        savingThrowBonus: {
          wand: -2
        },
        statTotal: 48,
        description: 'Test',
        strengths: [],
        weaknesses: [],
        bestClasses: []
      }

      expect(elf.savingThrowBonus.wand).toBe(-2)
    })

    it('handles complete RaceData structure with all fields', () => {
      const dwarf: RaceData = {
        id: 'dwarf',
        name: 'Dwarf',
        baseStats: {
          str: 10,
          int: 7,
          pie: 10,
          vit: 10,
          agi: 5,
          luc: 6
        },
        savingThrowBonus: {
          breath: -4
        },
        statTotal: 48,
        description: 'Stout and sturdy, dwarves excel at combat and resisting toxins',
        strengths: ['High Vitality', 'Strong saving throws vs breath'],
        weaknesses: ['Low Agility'],
        bestClasses: ['Fighter', 'Lord']
      }

      expect(dwarf.id).toBe('dwarf')
      expect(dwarf.name).toBe('Dwarf')
      expect(dwarf.baseStats.str).toBe(10)
      expect(dwarf.baseStats.int).toBe(7)
      expect(dwarf.baseStats.pie).toBe(10)
      expect(dwarf.baseStats.vit).toBe(10)
      expect(dwarf.baseStats.agi).toBe(5)
      expect(dwarf.baseStats.luc).toBe(6)
      expect(dwarf.savingThrowBonus.breath).toBe(-4)
      expect(dwarf.statTotal).toBe(48)
      expect(dwarf.description).toBe('Stout and sturdy, dwarves excel at combat and resisting toxins')
      expect(dwarf.strengths).toEqual(['High Vitality', 'Strong saving throws vs breath'])
      expect(dwarf.weaknesses).toEqual(['Low Agility'])
      expect(dwarf.bestClasses).toEqual(['Fighter', 'Lord'])
    })
  })

  describe('getRaceId', () => {
    it('converts Race.HUMAN to lowercase id', () => {
      expect(getRaceId(Race.HUMAN)).toBe('human')
    })

    it('converts Race.ELF to lowercase id', () => {
      expect(getRaceId(Race.ELF)).toBe('elf')
    })

    it('converts Race.DWARF to lowercase id', () => {
      expect(getRaceId(Race.DWARF)).toBe('dwarf')
    })

    it('converts Race.GNOME to lowercase id', () => {
      expect(getRaceId(Race.GNOME)).toBe('gnome')
    })

    it('converts Race.HOBBIT to lowercase id', () => {
      expect(getRaceId(Race.HOBBIT)).toBe('hobbit')
    })
  })

  describe('parseRace', () => {
    it('parses lowercase "human" to Race.HUMAN', () => {
      expect(parseRace('human')).toBe(Race.HUMAN)
    })

    it('parses uppercase "HUMAN" to Race.HUMAN (case insensitive)', () => {
      expect(parseRace('HUMAN')).toBe(Race.HUMAN)
    })

    it('parses mixed case "HuMaN" to Race.HUMAN (case insensitive)', () => {
      expect(parseRace('HuMaN')).toBe(Race.HUMAN)
    })

    it('parses lowercase "elf" to Race.ELF', () => {
      expect(parseRace('elf')).toBe(Race.ELF)
    })

    it('parses lowercase "dwarf" to Race.DWARF', () => {
      expect(parseRace('dwarf')).toBe(Race.DWARF)
    })

    it('parses lowercase "gnome" to Race.GNOME', () => {
      expect(parseRace('gnome')).toBe(Race.GNOME)
    })

    it('parses lowercase "hobbit" to Race.HOBBIT', () => {
      expect(parseRace('hobbit')).toBe(Race.HOBBIT)
    })

    it('returns null for invalid race string', () => {
      expect(parseRace('invalid')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(parseRace('')).toBeNull()
    })

    it('returns null for random string', () => {
      expect(parseRace('orc')).toBeNull()
    })
  })

  describe('parseSavingThrowBonus', () => {
    it('parses death bonus correctly', () => {
      const bonus = parseSavingThrowBonus({ death: -1 })
      expect(bonus.death).toBe(-1)
      expect(bonus.wand).toBeUndefined()
    })

    it('handles empty saving throw bonuses', () => {
      const bonus = parseSavingThrowBonus({})
      expect(bonus).toEqual({})
    })
  })
})
