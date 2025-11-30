import { ResurrectionService } from '../ResurrectionService'
import { ServiceType } from '@models/ServiceType'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'

describe('ResurrectionService', () => {
  const createChar = (vitality: number): Character => ({
    id: 'char-1',
    name: 'Test',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    level: 5,
    hp: 0,
    maxHp: 30,
    status: CharacterStatus.DEAD,
    strength: 15,
    intelligence: 10,
    piety: 10,
    vitality,
    agility: 12,
    luck: 10,
    experience: 5000,
    ac: 5,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  })

  describe('getSuccessRate', () => {
    describe('cure services', () => {
      it('returns 100% for cure poison (always succeeds)', () => {
        const char = createChar(10)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.CURE_POISON)
        expect(rate).toBe(100)
      })

      it('returns 100% for cure paralysis (always succeeds)', () => {
        const char = createChar(10)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.CURE_PARALYSIS)
        expect(rate).toBe(100)
      })
    })

    describe('resurrection (DEAD → OK)', () => {
      it('calculates success rate: 50% base + (vitality × 3%) - authentic Wizardry 1', () => {
        const char = createChar(10)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT)
        expect(rate).toBe(80) // 50 + (10 × 3) = 80%
      })

      it('handles low vitality characters', () => {
        const char = createChar(3)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT)
        expect(rate).toBe(59) // 50 + (3 × 3) = 59%
      })

      it('handles high vitality characters (can exceed 100%)', () => {
        const char = createChar(18)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT)
        expect(rate).toBe(104) // 50 + (18 × 3) = 104% (clamped to 100 by chance roll)
      })
    })

    describe('restoration (ASHES → OK)', () => {
      it('calculates success rate: 40% base + (vitality × 3%) - authentic Wizardry 1', () => {
        const char = createChar(10)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESTORE)
        expect(rate).toBe(70) // 40 + (10 × 3) = 70%
      })

      it('has lower success rate than resurrection', () => {
        const char = createChar(15)
        const resurrectRate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT)
        const restoreRate = ResurrectionService.getSuccessRate(char, ServiceType.RESTORE)
        expect(restoreRate).toBeLessThan(resurrectRate)
      })
    })
  })

  describe('attemptService', () => {
    it('returns success/failure based on success rate', () => {
      // Use VIT 5 for testable success rate: 50 + (5 × 3) = 65%
      const char = createChar(5)

      // Run service attempt multiple times
      const results = Array.from({ length: 100 }, () =>
        ResurrectionService.attemptService(char, ServiceType.RESURRECT)
      )

      const successCount = results.filter(Boolean).length

      // With 65% success rate, expect roughly 50-80 successes out of 100
      expect(successCount).toBeGreaterThan(45)
      expect(successCount).toBeLessThan(85)
    })

    it('always succeeds for cure services', () => {
      const char = createChar(10)

      // Run 10 times, all should succeed
      for (let i = 0; i < 10; i++) {
        expect(ResurrectionService.attemptService(char, ServiceType.CURE_POISON)).toBe(true)
      }
    })
  })
})
