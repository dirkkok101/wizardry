import { CharacterCreationService } from '../CharacterCreationService'
import { Race } from '../../types/Race'
import { RaceService } from '../RaceService'

describe('CharacterCreationService', () => {
  beforeAll(async () => {
    // Mock fetch for race data files
    global.fetch = jest.fn((url: string) => {
      const path = url.toString()

      if (path.includes('/assets/races/human.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'human',
            name: 'Human',
            baseStats: { str: 8, int: 8, pie: 8, vit: 8, agi: 8, luc: 8 },
            savingThrowBonus: {},
            statTotal: 48,
            description: 'Humans are versatile',
            strengths: ['Balanced'],
            weaknesses: ['None'],
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
            baseStats: { str: 7, int: 9, pie: 9, vit: 6, agi: 9, luc: 8 },
            savingThrowBonus: {},
            statTotal: 48,
            description: 'Elves are magical',
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
            baseStats: { str: 10, int: 7, pie: 8, vit: 10, agi: 7, luc: 8 },
            savingThrowBonus: {},
            statTotal: 50,
            description: 'Dwarves are tough',
            strengths: ['High STR, VIT'],
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
            savingThrowBonus: {},
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
            savingThrowBonus: {},
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

    // Initialize RaceService for tests
    await RaceService.initialize()
  })

  describe('rollStats', () => {
    it('rolls 3d6 for each attribute', () => {
      const stats = CharacterCreationService.rollStats()

      // Each stat should be between 3-18 (3d6 range)
      expect(stats.strength).toBeGreaterThanOrEqual(3)
      expect(stats.strength).toBeLessThanOrEqual(18)
      expect(stats.intelligence).toBeGreaterThanOrEqual(3)
      expect(stats.intelligence).toBeLessThanOrEqual(18)
      expect(stats.piety).toBeGreaterThanOrEqual(3)
      expect(stats.piety).toBeLessThanOrEqual(18)
      expect(stats.vitality).toBeGreaterThanOrEqual(3)
      expect(stats.vitality).toBeLessThanOrEqual(18)
      expect(stats.agility).toBeGreaterThanOrEqual(3)
      expect(stats.agility).toBeLessThanOrEqual(18)
      expect(stats.luck).toBeGreaterThanOrEqual(3)
      expect(stats.luck).toBeLessThanOrEqual(18)
    })

    it('generates random bonus points (7-29)', () => {
      const stats = CharacterCreationService.rollStats()

      expect(stats.bonusPoints).toBeGreaterThanOrEqual(7)
      expect(stats.bonusPoints).toBeLessThanOrEqual(29)
    })

    describe('rollBonusPointsOnly', () => {
      it('returns 0 for all stats', () => {
        const result = CharacterCreationService.rollBonusPointsOnly()

        expect(result.strength).toBe(0)
        expect(result.intelligence).toBe(0)
        expect(result.piety).toBe(0)
        expect(result.vitality).toBe(0)
        expect(result.agility).toBe(0)
        expect(result.luck).toBe(0)
      })

      it('rolls bonus points between 7-29', () => {
        const result = CharacterCreationService.rollBonusPointsOnly()

        expect(result.bonusPoints).toBeGreaterThanOrEqual(7)
        expect(result.bonusPoints).toBeLessThanOrEqual(29)
      })

      it('returns immutable RolledStats object', () => {
        const result = CharacterCreationService.rollBonusPointsOnly()

        expect(result).toHaveProperty('strength')
        expect(result).toHaveProperty('bonusPoints')
      })
    })
  })

  describe('applyRaceModifiers', () => {
    it('applies human modifiers using RaceService (8 base stats)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.HUMAN)

      // Human base stats are 8 across the board, so 8 + 10 = 18
      expect(result.strength).toBe(18)
      expect(result.intelligence).toBe(18)
      expect(result.piety).toBe(18)
      expect(result.vitality).toBe(18)
      expect(result.agility).toBe(18)
      expect(result.luck).toBe(18)
    })

    it('applies elf modifiers using RaceService (7/9/9/6/9/8)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.ELF)

      // Elf: STR 7, INT 9, PIE 9, VIT 6, AGI 9, LUCK 8
      expect(result.strength).toBe(17)   // 7 + 10
      expect(result.intelligence).toBe(19) // 9 + 10
      expect(result.piety).toBe(19)       // 9 + 10
      expect(result.vitality).toBe(16)    // 6 + 10
      expect(result.agility).toBe(19)     // 9 + 10
      expect(result.luck).toBe(18)        // 8 + 10
    })

    it('applies dwarf modifiers using RaceService (10/7/8/10/7/8)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.DWARF)

      // Dwarf: STR 10, INT 7, PIE 8, VIT 10, AGI 7, LUCK 8
      expect(result.strength).toBe(20)    // 10 + 10
      expect(result.intelligence).toBe(17) // 7 + 10
      expect(result.piety).toBe(18)       // 8 + 10
      expect(result.vitality).toBe(20)    // 10 + 10
      expect(result.agility).toBe(17)     // 7 + 10
      expect(result.luck).toBe(18)        // 8 + 10
    })
  })

  describe('allocateBonusPoints', () => {
    it('adds bonus points to specified stat', () => {
      const stats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 5
      }

      const result = CharacterCreationService.allocateBonusPoints(stats, 'strength', 3)

      expect(result.strength).toBe(13)
      expect(result.bonusPoints).toBe(2)
    })

    it('throws error when not enough bonus points', () => {
      const stats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 2
      }

      expect(() => {
        CharacterCreationService.allocateBonusPoints(stats, 'strength', 5)
      }).toThrow('Not enough bonus points')
    })
  })

  describe('resetAllocations', () => {
    it('returns all allocated points to pool', () => {
      const stats = {
        strength: 5,
        intelligence: 3,
        piety: 2,
        vitality: 4,
        agility: 1,
        luck: 0,
        bonusPoints: 7
      }

      const result = CharacterCreationService.resetAllocations(stats)

      // 5 + 3 + 2 + 4 + 1 + 0 = 15 allocated
      // 7 remaining + 15 allocated = 22 total
      expect(result.bonusPoints).toBe(22)
    })

    it('zeros all stat allocations', () => {
      const stats = {
        strength: 5,
        intelligence: 3,
        piety: 2,
        vitality: 4,
        agility: 1,
        luck: 0,
        bonusPoints: 7
      }

      const result = CharacterCreationService.resetAllocations(stats)

      expect(result.strength).toBe(0)
      expect(result.intelligence).toBe(0)
      expect(result.piety).toBe(0)
      expect(result.vitality).toBe(0)
      expect(result.agility).toBe(0)
      expect(result.luck).toBe(0)
    })

    it('returns new immutable RolledStats object', () => {
      const stats = {
        strength: 5,
        intelligence: 3,
        piety: 2,
        vitality: 4,
        agility: 1,
        luck: 0,
        bonusPoints: 7
      }

      const result = CharacterCreationService.resetAllocations(stats)

      expect(result).not.toBe(stats)
      expect(result).toHaveProperty('strength')
      expect(result).toHaveProperty('bonusPoints')
    })
  })
})
