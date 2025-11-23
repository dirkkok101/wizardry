import { RaceService } from '../RaceService'
import { Race } from '../../types/Race'

describe('RaceService Integration', () => {
  beforeAll(async () => {
    // Initialize race service with actual JSON data
    await RaceService.initialize()
  })

  describe('initialization', () => {
    it('loads all 5 races successfully', () => {
      expect(RaceService.isInitialized()).toBe(true)
      expect(RaceService.isLoaded()).toBe(true)
      expect(RaceService.getLoadedCount()).toBe(5)
      expect(RaceService.getTotalCount()).toBe(5)
    })

    it('has no failed races', () => {
      const failedRaces = RaceService.getFailedRaces()
      expect(failedRaces.size).toBe(0)
    })

    it('can retrieve all races', () => {
      const allRaces = RaceService.getAllRaces()
      expect(allRaces).toHaveLength(5)

      // Verify all expected races are present
      const raceNames = allRaces.map(r => r.name)
      expect(raceNames).toContain('Human')
      expect(raceNames).toContain('Elf')
      expect(raceNames).toContain('Dwarf')
      expect(raceNames).toContain('Gnome')
      expect(raceNames).toContain('Hobbit')
    })
  })

  describe('getRaceData', () => {
    it('returns correct data for Human', () => {
      const humanData = RaceService.getRaceData(Race.HUMAN)
      expect(humanData.id).toBe('human')
      expect(humanData.name).toBe('Human')
      expect(humanData.baseStats.str).toBe(8)
      expect(humanData.baseStats.int).toBe(8)
      expect(humanData.baseStats.pie).toBe(5)
      expect(humanData.baseStats.vit).toBe(8)
      expect(humanData.baseStats.agi).toBe(8)
      expect(humanData.baseStats.luc).toBe(9)
      expect(humanData.statTotal).toBe(46)
      expect(humanData.savingThrowBonus.death).toBe(-1)
    })

    it('returns correct data for Elf', () => {
      const elfData = RaceService.getRaceData(Race.ELF)
      expect(elfData.id).toBe('elf')
      expect(elfData.name).toBe('Elf')
      expect(elfData.baseStats.str).toBe(7)
      expect(elfData.baseStats.int).toBe(10)
      expect(elfData.baseStats.pie).toBe(10)
      expect(elfData.statTotal).toBe(48)
      expect(elfData.savingThrowBonus.wand).toBe(-2)
    })

    it('returns correct data for Dwarf', () => {
      const dwarfData = RaceService.getRaceData(Race.DWARF)
      expect(dwarfData.id).toBe('dwarf')
      expect(dwarfData.name).toBe('Dwarf')
      expect(dwarfData.baseStats.str).toBe(10)
      expect(dwarfData.baseStats.vit).toBe(10)
      expect(dwarfData.statTotal).toBe(48)
      expect(dwarfData.savingThrowBonus.breath).toBe(-4)
    })

    it('returns correct data for Gnome', () => {
      const gnomeData = RaceService.getRaceData(Race.GNOME)
      expect(gnomeData.id).toBe('gnome')
      expect(gnomeData.name).toBe('Gnome')
      expect(gnomeData.baseStats.agi).toBe(10)
      expect(gnomeData.baseStats.pie).toBe(10)
      expect(gnomeData.statTotal).toBe(49)
      expect(gnomeData.savingThrowBonus.petrify).toBe(-2)
    })

    it('returns correct data for Hobbit', () => {
      const hobbitData = RaceService.getRaceData(Race.HOBBIT)
      expect(hobbitData.id).toBe('hobbit')
      expect(hobbitData.name).toBe('Hobbit')
      expect(hobbitData.baseStats.luc).toBe(15) // Highest luck
      expect(hobbitData.baseStats.str).toBe(5) // Lowest strength
      expect(hobbitData.statTotal).toBe(50) // Highest total
      expect(hobbitData.savingThrowBonus.spell).toBe(-3)
    })
  })

  describe('getSavingThrowBonus', () => {
    it('returns correct death save bonus for Human', () => {
      expect(RaceService.getSavingThrowBonus(Race.HUMAN, 'death')).toBe(-1)
    })

    it('returns 0 for non-existent save bonus', () => {
      expect(RaceService.getSavingThrowBonus(Race.HUMAN, 'breath')).toBe(0)
      expect(RaceService.getSavingThrowBonus(Race.ELF, 'death')).toBe(0)
    })

    it('returns correct wand save bonus for Elf', () => {
      expect(RaceService.getSavingThrowBonus(Race.ELF, 'wand')).toBe(-2)
    })

    it('returns correct breath save bonus for Dwarf', () => {
      expect(RaceService.getSavingThrowBonus(Race.DWARF, 'breath')).toBe(-4)
    })

    it('returns correct petrify save bonus for Gnome', () => {
      expect(RaceService.getSavingThrowBonus(Race.GNOME, 'petrify')).toBe(-2)
    })

    it('returns correct spell save bonus for Hobbit', () => {
      expect(RaceService.getSavingThrowBonus(Race.HOBBIT, 'spell')).toBe(-3)
    })
  })

  describe('validation enforcement', () => {
    it('ensures all race data is validated against source material', () => {
      // All races should have loaded successfully
      expect(RaceService.getLoadedCount()).toBe(5)

      // Verify stat totals match source material
      expect(RaceService.getRaceData(Race.HUMAN).statTotal).toBe(46)
      expect(RaceService.getRaceData(Race.ELF).statTotal).toBe(48)
      expect(RaceService.getRaceData(Race.DWARF).statTotal).toBe(48)
      expect(RaceService.getRaceData(Race.GNOME).statTotal).toBe(49)
      expect(RaceService.getRaceData(Race.HOBBIT).statTotal).toBe(50)
    })

    it('ensures all race stats match actual totals', () => {
      const allRaces = RaceService.getAllRaces()

      allRaces.forEach(race => {
        const actualTotal =
          race.baseStats.str +
          race.baseStats.int +
          race.baseStats.pie +
          race.baseStats.vit +
          race.baseStats.agi +
          race.baseStats.luc

        expect(actualTotal).toBe(race.statTotal)
      })
    })
  })

  describe('performance', () => {
    it('initializes all races in under 100ms', async () => {
      // Create a fresh instance to test initialization performance
      const { RaceService: FreshRaceService } = await import('../RaceService')

      const start = performance.now()
      await FreshRaceService.initialize()
      const duration = performance.now() - start

      expect(duration).toBeLessThan(100)
      expect(FreshRaceService.getLoadedCount()).toBe(5)
    })
  })
})
