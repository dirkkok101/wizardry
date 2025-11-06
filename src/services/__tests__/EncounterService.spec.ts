import { EncounterService } from '../EncounterService'

describe('EncounterService', () => {
  describe('rollRandomEncounter', () => {
    it('returns true approximately 10% of the time', () => {
      const rolls = Array.from({ length: 1000 }, () =>
        EncounterService.rollRandomEncounter()
      )
      const trueCount = rolls.filter(Boolean).length

      // Expect ~100 true results ± 50 (statistical variance)
      expect(trueCount).toBeGreaterThan(50)
      expect(trueCount).toBeLessThan(150)
    })

    it('returns boolean value', () => {
      const result = EncounterService.rollRandomEncounter()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getEncounterTable', () => {
    it('loads level 1 encounter table', () => {
      const table = EncounterService.getEncounterTable(1)

      expect(table.levelId).toBe('level_1_monsters')
      expect(table.encounterRate).toBe(0.10)
      expect(table.monsters.length).toBeGreaterThan(0)
    })

    it('includes kobold in level 1 monsters', () => {
      const table = EncounterService.getEncounterTable(1)
      const kobold = table.monsters.find(m => m.monsterId === 'kobold')

      expect(kobold).toBeDefined()
      expect(kobold?.weight).toBeGreaterThan(0)
    })

    it('loads level 2 encounter table', () => {
      const table = EncounterService.getEncounterTable(2)

      expect(table.levelId).toBe('level_2_monsters')
    })

    it('throws error for invalid level', () => {
      expect(() => EncounterService.getEncounterTable(0)).toThrow()
      expect(() => EncounterService.getEncounterTable(11)).toThrow()
    })
  })
})
