// src/services/__tests__/SpellCastingService.resurrection.spec.ts
import { SpellCastingService } from '../SpellCastingService'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { RandomService } from '../RandomService'
import { loadSpellsForTests } from '@testing/test-data-loader'

// Load spell data before running tests (required for SpellCastingService to access spell definitions)
beforeAll(async () => {
  await loadSpellsForTests()
})

/**
 * Tests for Vitality-based resurrection mechanics (DI, KADORTO)
 *
 * Research-based formulas:
 * - Success rate: (Vitality × 4)%, capped at 100%
 * - DI: DEAD → OK (1 HP) on success, DEAD → ASHES on failure
 * - KADORTO: DEAD/ASHES → OK (full HP) on success
 * - Critical vitality (≤3): failure = permanent LOST
 * - Vitality reduced by 1 on any attempt
 */

// Create minimal test character
const createTestCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'test-char-1',
  name: 'Test Victim',
  race: 'human',
  class: 'fighter',
  alignment: 'good',
  level: 5,
  xp: 1000,
  hp: 0,  // Dead
  maxHp: 50,
  ac: 5,
  status: CharacterStatus.DEAD,
  strength: 14,
  intelligence: 10,
  piety: 10,
  vitality: 15,
  agility: 12,
  luck: 10,
  gold: 100,
  age: 20,
  ageWeeks: 0,
  marks: 0,
  partyOrder: 0,
  ...overrides
})

describe('SpellCastingService.resolveResurrection', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('success rate calculation', () => {
    it('calculates (Vitality × 4)% success rate', () => {
      expect(SpellCastingService.getResurrectionSuccessRate(10)).toBe(40)  // 10 × 4 = 40%
      expect(SpellCastingService.getResurrectionSuccessRate(15)).toBe(60)  // 15 × 4 = 60%
      expect(SpellCastingService.getResurrectionSuccessRate(18)).toBe(72)  // 18 × 4 = 72%
    })

    it('caps success rate at 100%', () => {
      expect(SpellCastingService.getResurrectionSuccessRate(25)).toBe(100)  // 25 × 4 = 100 (capped)
      expect(SpellCastingService.getResurrectionSuccessRate(30)).toBe(100)
    })
  })

  describe('DI spell', () => {
    it('resurrects DEAD character with 1 HP on success', () => {
      const target = createTestCharacter({ vitality: 15, maxHp: 50 })

      // 15 × 4 = 60% success rate, queue roll < 60% to succeed
      RandomService.queueNextValues([0.5])

      const result = SpellCastingService.resolveResurrection('di', target)

      expect(result.success).toBe(true)
      expect(result.resultStatus).toBe('OK')
      expect(result.newHp).toBe(1)  // DI = 1 HP
      expect(result.vitalityLoss).toBe(1)
      expect(result.updatedCharacter.hp).toBe(1)
      expect(result.updatedCharacter.vitality).toBe(14)  // 15 - 1
      expect(result.updatedCharacter.status).toBe(CharacterStatus.OK)
    })

    it('converts DEAD to ASHES on failure', () => {
      const target = createTestCharacter({ vitality: 10 })

      // 10 × 4 = 40% success rate, queue roll > 40% to fail
      RandomService.queueNextValues([0.5])

      const result = SpellCastingService.resolveResurrection('di', target)

      expect(result.success).toBe(false)
      expect(result.resultStatus).toBe('ASHES')
      expect(result.updatedCharacter.status).toBe(CharacterStatus.ASHES)
      expect(result.updatedCharacter.vitality).toBe(9)  // Still reduced
    })

    it('cannot resurrect ASHES - returns error', () => {
      const target = createTestCharacter({ status: CharacterStatus.ASHES })

      const result = SpellCastingService.resolveResurrection('di', target)

      expect(result.success).toBe(false)
      expect(result.vitalityLoss).toBe(0)  // No vitality lost for invalid target
      expect(result.message).toContain('cannot resurrect ashes')
    })

    it('failure results in LOST when vitality ≤ 3', () => {
      const target = createTestCharacter({ vitality: 3 })

      // 3 × 4 = 12% success rate, queue roll > 12% to fail
      RandomService.queueNextValues([0.2])

      const result = SpellCastingService.resolveResurrection('di', target)

      expect(result.success).toBe(false)
      expect(result.resultStatus).toBe('LOST')
      expect(result.updatedCharacter.status).toBe(CharacterStatus.LOST)
      expect(result.message).toContain('lost forever')
    })
  })

  describe('KADORTO spell', () => {
    it('resurrects DEAD character with full HP on success', () => {
      const target = createTestCharacter({ vitality: 18, maxHp: 100 })

      // 18 × 4 = 72% success rate
      RandomService.queueNextValues([0.5])

      const result = SpellCastingService.resolveResurrection('kadorto', target)

      expect(result.success).toBe(true)
      expect(result.resultStatus).toBe('OK')
      expect(result.newHp).toBe(100)  // KADORTO = full HP
      expect(result.updatedCharacter.hp).toBe(100)
      expect(result.updatedCharacter.vitality).toBe(17)
    })

    it('resurrects ASHES character with full HP on success', () => {
      const target = createTestCharacter({
        status: CharacterStatus.ASHES,
        vitality: 15,
        maxHp: 80
      })

      // 15 × 4 = 60%
      RandomService.queueNextValues([0.4])

      const result = SpellCastingService.resolveResurrection('kadorto', target)

      expect(result.success).toBe(true)
      expect(result.updatedCharacter.hp).toBe(80)
      expect(result.updatedCharacter.status).toBe(CharacterStatus.OK)
    })

    it('converts DEAD to ASHES on failure', () => {
      const target = createTestCharacter({ vitality: 10, status: CharacterStatus.DEAD })

      // 40% success, roll > 40% to fail
      RandomService.queueNextValues([0.5])

      const result = SpellCastingService.resolveResurrection('kadorto', target)

      expect(result.success).toBe(false)
      expect(result.resultStatus).toBe('ASHES')
      expect(result.updatedCharacter.status).toBe(CharacterStatus.ASHES)
    })

    it('converts ASHES to LOST on failure', () => {
      const target = createTestCharacter({
        status: CharacterStatus.ASHES,
        vitality: 10
      })

      // 40% success, roll > 40% to fail
      RandomService.queueNextValues([0.5])

      const result = SpellCastingService.resolveResurrection('kadorto', target)

      expect(result.success).toBe(false)
      expect(result.resultStatus).toBe('LOST')
      expect(result.updatedCharacter.status).toBe(CharacterStatus.LOST)
      expect(result.message).toContain('lost forever')
    })

    it('failure results in LOST when vitality ≤ 3 (even from DEAD)', () => {
      const target = createTestCharacter({
        status: CharacterStatus.DEAD,
        vitality: 2
      })

      // 2 × 4 = 8%, roll > 8% to fail
      RandomService.queueNextValues([0.2])

      const result = SpellCastingService.resolveResurrection('kadorto', target)

      expect(result.success).toBe(false)
      expect(result.resultStatus).toBe('LOST')
      expect(result.updatedCharacter.status).toBe(CharacterStatus.LOST)
    })
  })

  describe('edge cases', () => {
    it('high vitality (25) gives 100% success rate', () => {
      const target = createTestCharacter({ vitality: 25 })

      // 25 × 4 = 100%, always succeeds
      RandomService.queueNextValues([0.99])

      const result = SpellCastingService.resolveResurrection('di', target)

      expect(result.success).toBe(true)
    })

    it('vitality 1 gives only 4% success rate', () => {
      const target = createTestCharacter({ vitality: 1 })

      // 1 × 4 = 4%, roll > 4% to fail
      RandomService.queueNextValues([0.1])

      const result = SpellCastingService.resolveResurrection('di', target)

      expect(result.success).toBe(false)
      expect(result.resultStatus).toBe('LOST')  // Critical vitality
    })

    it('invalid spell returns error', () => {
      const target = createTestCharacter()

      const result = SpellCastingService.resolveResurrection('invalid_spell', target)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid resurrection spell')
    })
  })
})
