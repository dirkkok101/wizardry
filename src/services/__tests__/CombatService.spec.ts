// src/services/__tests__/CombatService.spec.ts
import { CombatService } from '../CombatService'
import { createTestCharacter } from '../../test-helpers/test-factories'

describe('CombatService', () => {
  describe('calculateInitiative', () => {
    it('calculates initiative with AGI modifier', () => {
      const char = createTestCharacter({ agility: 18 })  // +4 modifier

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // Formula: random(0-9) + AGI_modifier
      // AGI 18 = +4 modifier
      // Range: 4-13 (0+4 to 9+4)
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(4)
        expect(init).toBeLessThanOrEqual(13)
      })
    })

    it('has minimum of 1', () => {
      const char = createTestCharacter({ agility: 3 })  // -4 modifier

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // Even with negative modifier, minimum is 1
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
      })
    })

    it('uses default AGI 10 if undefined', () => {
      const char = createTestCharacter({ agility: undefined })

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // AGI 10 = +0 modifier, range 0-9, but min 1
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
        expect(init).toBeLessThanOrEqual(9)
      })
    })
  })
})
