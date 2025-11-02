import { RaceService } from '../RaceService'
import { Race } from '../../types/Race'

describe('RaceService', () => {
  beforeAll(async () => {
    // Mock fetch for data files
    global.fetch = jest.fn((url: string) => {
      const path = url.toString()

      // Race data mocks
      if (path.includes('/assets/races/human.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'human',
            name: 'Human',
            baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
            savingThrowBonus: { death: -1 },
            statTotal: 46,
            description: 'Humans are the most versatile race',
            strengths: ['Balanced stats'],
            weaknesses: ['No special bonuses'],
            bestClasses: ['Any']
          })
        } as Response)
      }
      if (path.includes('/assets/races/elf.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'elf',
            name: 'Elf',
            baseStats: { str: 7, int: 10, pie: 10, vit: 6, agi: 9, luc: 6 },
            savingThrowBonus: { wand: -2 },
            statTotal: 48,
            description: 'Elves are magical and agile',
            strengths: ['High INT, PIE'],
            weaknesses: ['Low VIT'],
            bestClasses: ['Mage', 'Priest']
          })
        } as Response)
      }
      if (path.includes('/assets/races/dwarf.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'dwarf',
            name: 'Dwarf',
            baseStats: { str: 10, int: 7, pie: 10, vit: 10, agi: 5, luc: 6 },
            savingThrowBonus: { breath: -4 },
            statTotal: 48,
            description: 'Dwarves are tough',
            strengths: ['High VIT'],
            weaknesses: ['Low AGI'],
            bestClasses: ['Fighter', 'Priest']
          })
        } as Response)
      }
      if (path.includes('/assets/races/gnome.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'gnome',
            name: 'Gnome',
            baseStats: { str: 7, int: 7, pie: 10, vit: 8, agi: 10, luc: 7 },
            savingThrowBonus: { petrify: -2 },
            statTotal: 49,
            description: 'Gnomes are clever',
            strengths: ['Balanced'],
            weaknesses: ['Low STR'],
            bestClasses: ['Thief', 'Mage']
          })
        } as Response)
      }
      if (path.includes('/assets/races/hobbit.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'hobbit',
            name: 'Hobbit',
            baseStats: { str: 5, int: 7, pie: 6, vit: 6, agi: 10, luc: 12 },
            savingThrowBonus: { spell: -3 },
            statTotal: 46,
            description: 'Hobbits are lucky',
            strengths: ['High LUC, AGI'],
            weaknesses: ['Low STR, VIT'],
            bestClasses: ['Thief']
          })
        } as Response)
      }

      return Promise.reject(new Error(`Not found: ${path}`))
    }) as jest.Mock

    await RaceService.initialize()
  })

  describe('getRaceData', () => {
    it('returns race data for Human', () => {
      const data = RaceService.getRaceData(Race.HUMAN)

      expect(data.name).toBe('Human')
      expect(data.baseStats.str).toBe(8)
      expect(data.savingThrowBonus.death).toBe(-1)
    })

    it('returns race data for Elf', () => {
      const data = RaceService.getRaceData(Race.ELF)

      expect(data.name).toBe('Elf')
      expect(data.baseStats.int).toBe(10)
      expect(data.savingThrowBonus.wand).toBe(-2)
    })

    it('throws error for uninitialized service', () => {
      const uninitializedService = Object.create(RaceService)
      uninitializedService.raceData = null

      expect(() => uninitializedService.getRaceData(Race.HUMAN)).toThrow('RaceService not initialized')
    })
  })

  describe('getAllRaces', () => {
    it('returns all 5 races', () => {
      const races = RaceService.getAllRaces()

      expect(races).toHaveLength(5)
      expect(races.map(r => r.id)).toContain('human')
      expect(races.map(r => r.id)).toContain('elf')
      expect(races.map(r => r.id)).toContain('dwarf')
      expect(races.map(r => r.id)).toContain('gnome')
      expect(races.map(r => r.id)).toContain('hobbit')
    })
  })

  describe('getSavingThrowBonus', () => {
    it('returns death bonus for Human', () => {
      const bonus = RaceService.getSavingThrowBonus(Race.HUMAN, 'death')
      expect(bonus).toBe(-1)
    })

    it('returns 0 for non-existent bonus', () => {
      const bonus = RaceService.getSavingThrowBonus(Race.HUMAN, 'wand')
      expect(bonus).toBe(0)
    })

    it('returns spell bonus for Hobbit', () => {
      const bonus = RaceService.getSavingThrowBonus(Race.HOBBIT, 'spell')
      expect(bonus).toBe(-3)
    })
  })
})
