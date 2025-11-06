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
})
