/**
 * CalfoSpellService Tests
 *
 * Tests for the CALFO spell trap identification mechanics.
 */

import { CalfoSpellService } from '../CalfoSpellService'
import { RandomService } from '../../RandomService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { Chest, RewardTier } from '@models/Chest'
import { loadTrapsWithResistanceForTests } from '@testing/test-data-loader'

// Load trap data (needed for trap name lookup in deception mechanic)
beforeAll(async () => {
  await loadTrapsWithResistanceForTests()
})

// Helper to create a test chest
function createTestChest(overrides: Partial<Chest> = {}): Chest {
  return {
    id: 'test-chest',
    trapped: true,
    trapId: 'POISON_NEEDLE',
    trapIdentified: false,
    trapDisarmed: false,
    rewardTier: 10 as RewardTier,
    contents: { gold: 100, items: [] },
    sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
    mazeLevel: 1,
    source: 'combat_victory',
    ...overrides
  }
}

describe('CalfoSpellService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('canCastCalfo', () => {
    it('should return true for Priest with CALFO and spell points', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        knownSpells: ['calfo'],
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }  // Level 2 has 2 SP
          }
        }
      })

      expect(CalfoSpellService.canCastCalfo(priest)).toBe(true)
    })

    it('should return false for Priest without CALFO spell', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        knownSpells: ['dios'],  // Only knows DIOS, not CALFO
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        }
      })

      expect(CalfoSpellService.canCastCalfo(priest)).toBe(false)
    })

    it('should return false for Priest without level 2 spell points', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        knownSpells: ['calfo'],
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 2 }  // Level 2 has 0 SP
          }
        }
      })

      expect(CalfoSpellService.canCastCalfo(priest)).toBe(false)
    })

    it('should return false for Fighter', () => {
      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        knownSpells: ['calfo']
      })

      expect(CalfoSpellService.canCastCalfo(fighter)).toBe(false)
    })

    it('should return true for Bishop with CALFO', () => {
      const bishop = createTestCharacter({
        class: CharacterClass.BISHOP,
        knownSpells: ['calfo'],
        spellPoints: {
          mage: {
            level1: { current: 2, max: 2 }
          },
          priest: {
            level1: { current: 2, max: 2 },
            level2: { current: 1, max: 1 }
          }
        }
      })

      expect(CalfoSpellService.canCastCalfo(bishop)).toBe(true)
    })

    it('should return true for Lord with CALFO', () => {
      const lord = createTestCharacter({
        class: CharacterClass.LORD,
        knownSpells: ['calfo'],
        spellPoints: {
          priest: {
            level1: { current: 2, max: 2 },
            level2: { current: 1, max: 1 }
          }
        }
      })

      expect(CalfoSpellService.canCastCalfo(lord)).toBe(true)
    })
  })

  describe('castCalfo', () => {
    it('should identify trap with 95% success rate', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const chest = createTestChest()

      // Queue success roll (< 95% = success)
      RandomService.queueNextValues([0.5])

      const result = CalfoSpellService.castCalfo(priest, chest)

      expect(result.success).toBe(true)
      expect(result.trapIdentified).toBe('POISON_NEEDLE')
      expect(result.triggered).toBe(false)
    })

    it('should return random trap name on 5% failure (deception mechanic)', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const chest = createTestChest({ trapId: 'POISON_NEEDLE' })

      // Queue failure roll (> 95% = fail), then random trap selection
      RandomService.queueNextValues([0.99, 0.3])

      const result = CalfoSpellService.castCalfo(priest, chest)

      expect(result.success).toBe(false)
      // Should return random trap, not null (deception mechanic)
      expect(result.trapIdentified).not.toBeNull()
      expect(result.triggered).toBe(false)
    })

    it('should never trigger trap', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const chest = createTestChest()

      // Even on failure, CALFO should never trigger
      RandomService.queueNextValues([0.99, 0.5])  // fail + random trap

      const result = CalfoSpellService.castCalfo(priest, chest)

      expect(result.triggered).toBe(false)
    })

    it('should return null trap on success for untrapped chest', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const chest = createTestChest({ trapped: false, trapId: null })

      // Queue success roll
      RandomService.queueNextValues([0.5])

      const result = CalfoSpellService.castCalfo(priest, chest)

      expect(result.success).toBe(true)
      expect(result.trapIdentified).toBeNull()  // Correctly identifies no trap
    })
  })
})
