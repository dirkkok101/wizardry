// src/app/services/__tests__/CombatService.initiative.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'

/**
 * RandomService.random(min, max) formula:
 * Math.floor(nextRandom() * (max - min + 1)) + min
 *
 * For random(1, 10): Math.floor(value * 10) + 1
 * - value 0.0  → 1
 * - value 0.4  → 5
 * - value 0.89 → 9
 * - value 0.99 → 10
 *
 * For random(1, 8): Math.floor(value * 8) + 1
 * - value 0.0  → 1
 * - value 0.99 → 8
 */
describe('CombatService.calculateInitiative', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('character initiative with agility table', () => {
    it('applies +2 modifier for AGI 3 (slower)', () => {
      RandomService.queueNextValues([0.4]) // Math.floor(0.4*10)+1 = 5
      const character = { type: 'character', agility: 3 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(7) // 5 + 2 = 7
    })

    it('applies +1 modifier for AGI 4-5', () => {
      RandomService.queueNextValues([0.4]) // 5
      const character = { type: 'character', agility: 5 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(6) // 5 + 1 = 6
    })

    it('applies 0 modifier for AGI 6-7', () => {
      RandomService.queueNextValues([0.4]) // 5
      const character = { type: 'character', agility: 7 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(5) // 5 + 0 = 5
    })

    it('applies -1 modifier for AGI 8-14', () => {
      RandomService.queueNextValues([0.4]) // 5
      const character = { type: 'character', agility: 10 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(4) // 5 - 1 = 4
    })

    it('applies -2 modifier for AGI 15', () => {
      RandomService.queueNextValues([0.4]) // 5
      const character = { type: 'character', agility: 15 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(3) // 5 - 2 = 3
    })

    it('applies -5 modifier for AGI 18 (fastest)', () => {
      RandomService.queueNextValues([0.89]) // Math.floor(0.89*10)+1 = 8+1 = 9
      const character = { type: 'character', agility: 18 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(4) // 9 - 5 = 4
    })

    it('clamps result to minimum 1', () => {
      RandomService.queueNextValues([0.0]) // Math.floor(0*10)+1 = 1
      const character = { type: 'character', agility: 18 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(1) // 1 - 5 = -4, clamped to 1
    })

    it('clamps result to maximum 10', () => {
      RandomService.queueNextValues([0.99]) // Math.floor(0.99*10)+1 = 10
      const character = { type: 'character', agility: 3 } as any
      const initiative = CombatService.calculateInitiative(character)
      expect(initiative).toBe(10) // 10 + 2 = 12, clamped to 10
    })
  })

  describe('monster initiative', () => {
    it('uses 1d8+1 formula (range 2-9)', () => {
      RandomService.queueNextValues([0.0]) // Math.floor(0*8)+1 = 1
      const monster = { monsterId: 'test', level: 5 } as any
      const initiative = CombatService.calculateInitiative(monster)
      expect(initiative).toBe(2) // 1 + 1 = 2
    })

    it('produces maximum of 9', () => {
      RandomService.queueNextValues([0.99]) // Math.floor(0.99*8)+1 = 8
      const monster = { monsterId: 'test', level: 5 } as any
      const initiative = CombatService.calculateInitiative(monster)
      expect(initiative).toBe(9) // 8 + 1 = 9
    })
  })
})
