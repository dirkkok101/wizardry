import { ResurrectionService } from '../ResurrectionService'
import { ServiceType } from '../../types/ServiceType'
import { Character } from '../../types/Character'
import { CharacterClass } from '../../types/CharacterClass'
import { CharacterStatus } from '../../types/CharacterStatus'
import { Race } from '../../types/Race'
import { Alignment } from '../../types/Alignment'

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
      it('calculates success rate: 50% base + (vitality × 2%)', () => {
        const char = createChar(18)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT)
        expect(rate).toBe(86) // 50 + (18 × 2) = 86%
      })

      it('handles low vitality characters', () => {
        const char = createChar(3)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT)
        expect(rate).toBe(56) // 50 + (3 × 2) = 56%
      })

      it('handles high vitality characters', () => {
        const char = createChar(18)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESURRECT)
        expect(rate).toBe(86) // 50 + (18 × 2) = 86%
      })
    })

    describe('restoration (ASHES → OK)', () => {
      it('calculates success rate: 40% base + (vitality × 1%)', () => {
        const char = createChar(15)
        const rate = ResurrectionService.getSuccessRate(char, ServiceType.RESTORE)
        expect(rate).toBe(55) // 40 + (15 × 1) = 55%
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
      const char = createChar(18)

      // Run service attempt multiple times
      const results = Array.from({ length: 100 }, () =>
        ResurrectionService.attemptService(char, ServiceType.RESURRECT)
      )

      const successCount = results.filter(Boolean).length

      // With 86% success rate, expect roughly 80-92 successes out of 100
      expect(successCount).toBeGreaterThan(70)
      expect(successCount).toBeLessThan(95)
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
