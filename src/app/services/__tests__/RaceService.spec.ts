import { RaceService } from '../RaceService'
import { Race } from '@types/Race'
import { EXPECTED_RACE_DATA } from '@types/RaceValidation'

describe('RaceService', () => {
  beforeAll(async () => {
    // Mock fetch for data files
    global.fetch = jest.fn((url: string) => {
      const path = url.toString()

      // Race data mocks (using EXPECTED_RACE_DATA to ensure consistency with validation)
      if (path.includes('/assets/races/human.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'human',
            name: 'Human',
            ...EXPECTED_RACE_DATA.human,
            description: 'Humans are the most versatile race',
            strengths: ['Balanced stats'],
            weaknesses: ['No special bonuses'],
            bestClasses: ['fighter', 'lord', 'samurai']
          })
        } as Response)
      }
      if (path.includes('/assets/races/elf.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'elf',
            name: 'Elf',
            ...EXPECTED_RACE_DATA.elf,
            description: 'Elves are magical and agile',
            strengths: ['High INT, PIE'],
            weaknesses: ['Low VIT'],
            bestClasses: ['mage', 'priest', 'bishop']
          })
        } as Response)
      }
      if (path.includes('/assets/races/dwarf.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'dwarf',
            name: 'Dwarf',
            ...EXPECTED_RACE_DATA.dwarf,
            description: 'Dwarves are tough',
            strengths: ['High VIT'],
            weaknesses: ['Low AGI'],
            bestClasses: ['fighter', 'priest', 'lord']
          })
        } as Response)
      }
      if (path.includes('/assets/races/gnome.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'gnome',
            name: 'Gnome',
            ...EXPECTED_RACE_DATA.gnome,
            description: 'Gnomes are clever',
            strengths: ['Balanced'],
            weaknesses: ['Low STR'],
            bestClasses: ['thief', 'priest', 'bishop']
          })
        } as Response)
      }
      if (path.includes('/assets/races/hobbit.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'hobbit',
            name: 'Hobbit',
            ...EXPECTED_RACE_DATA.hobbit,
            description: 'Hobbits are lucky',
            strengths: ['High LUC, AGI'],
            weaknesses: ['Low STR, VIT'],
            bestClasses: ['thief', 'ninja']
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
