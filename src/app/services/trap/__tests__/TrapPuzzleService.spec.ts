/**
 * TrapPuzzleService Tests
 *
 * Tests for the scrambled letter puzzle UI system.
 */

import { TrapPuzzleService } from '../TrapPuzzleService'
import { RandomService } from '../../RandomService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { loadTrapsWithResistanceForTests } from '@testing/test-data-loader'

// Load trap data (needed for trap name lookup)
beforeAll(async () => {
  await loadTrapsWithResistanceForTests()
})

describe('TrapPuzzleService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('scrambleLetters', () => {
    it('should scramble all letters from trap name', () => {
      RandomService.setSeed(12345)  // Deterministic shuffle
      const result = TrapPuzzleService.scrambleLetters('POISON NEEDLE')

      // Should have same letters, different order
      const originalLetters = 'POISON NEEDLE'.split('').sort().join('')
      const scrambledLetters = result.map(l => l.char).sort().join('')
      expect(scrambledLetters).toBe(originalLetters)

      // All should start as hidden
      expect(result.every(l => l.state === 'hidden')).toBe(true)
    })

    it('should preserve spaces in scramble', () => {
      RandomService.setSeed(12345)
      const result = TrapPuzzleService.scrambleLetters('GAS BOMB')

      const spaceCount = result.filter(l => l.char === ' ').length
      expect(spaceCount).toBe(1)  // "GAS BOMB" has 1 space
    })

    it('should track original positions', () => {
      RandomService.setSeed(12345)
      const result = TrapPuzzleService.scrambleLetters('ABC')

      // Each letter should have a unique original position 0, 1, or 2
      const positions = result.map(l => l.position).sort()
      expect(positions).toEqual([0, 1, 2])
    })

    it('should handle single character', () => {
      const result = TrapPuzzleService.scrambleLetters('X')

      expect(result.length).toBe(1)
      expect(result[0].char).toBe('X')
      expect(result[0].position).toBe(0)
      expect(result[0].state).toBe('hidden')
    })
  })

  describe('revealLetters', () => {
    it('should reveal percentage of letters based on skill', () => {
      RandomService.setSeed(12345)
      const scrambled = TrapPuzzleService.scrambleLetters('POISON NEEDLE')

      // High skill = reveal ~80% as green, ~20% as red
      // Note: "POISON NEEDLE" is 13 chars; 80% + 20% = 10 + 2 = 12 (floored)
      const revealed = TrapPuzzleService.revealLetters(scrambled, 80, 20)

      const greenCount = revealed.filter(l => l.state === 'green').length
      const redCount = revealed.filter(l => l.state === 'red').length
      const hiddenCount = revealed.filter(l => l.state === 'hidden').length

      // ~80% green = 10, ~20% red = 2, 1 hidden (rounding)
      expect(greenCount).toBe(10)
      expect(redCount).toBe(2)
      expect(hiddenCount).toBe(1)
    })

    it('should reveal fewer letters for low skill', () => {
      RandomService.setSeed(12345)
      const scrambled = TrapPuzzleService.scrambleLetters('POISON NEEDLE')

      // Low skill = reveal only 30% as green, 30% as red
      const revealed = TrapPuzzleService.revealLetters(scrambled, 30, 30)

      const greenCount = revealed.filter(l => l.state === 'green').length
      const hiddenCount = revealed.filter(l => l.state === 'hidden').length

      expect(greenCount).toBeLessThan(6)  // Less than half green
      expect(hiddenCount).toBeGreaterThan(0)  // Some still hidden
    })

    it('should not modify already revealed letters', () => {
      RandomService.setSeed(12345)
      const scrambled = TrapPuzzleService.scrambleLetters('ABC')

      // First reveal: 50% green
      const firstReveal = TrapPuzzleService.revealLetters(scrambled, 50, 0)
      const greenBefore = firstReveal.filter(l => l.state === 'green').length

      // Second reveal: more green should accumulate
      const secondReveal = TrapPuzzleService.revealLetters(firstReveal, 50, 0)
      const greenAfter = secondReveal.filter(l => l.state === 'green').length

      expect(greenAfter).toBeGreaterThanOrEqual(greenBefore)
    })

    it('should return clone without modifying original', () => {
      const scrambled = TrapPuzzleService.scrambleLetters('ABC')
      const original = scrambled[0].state

      TrapPuzzleService.revealLetters(scrambled, 100, 0)

      expect(scrambled[0].state).toBe(original)
    })
  })

  describe('createScrambledState', () => {
    it('should create initial scrambled state for a trap', () => {
      RandomService.setSeed(12345)
      const state = TrapPuzzleService.createScrambledState('POISON_NEEDLE')

      expect(state.actualTrapId).toBe('POISON_NEEDLE')
      expect(state.fullyRevealed).toBe(false)
      expect(state.inspectionCount).toBe(0)
      expect(state.letters.length).toBe(13)  // "POISON NEEDLE"
      expect(state.letters.every(l => l.state === 'hidden')).toBe(true)
    })

    it('should use trap name from TrapDataLoader', () => {
      RandomService.setSeed(12345)
      const state = TrapPuzzleService.createScrambledState('GAS_BOMB')

      // Letters should contain all characters from "GAS BOMB"
      const chars = state.letters.map(l => l.char).sort().join('')
      expect(chars).toBe(' ABBGMOS')  // sorted: space, A, B, B, G, M, O, S
    })
  })

  describe('calculateRevealPercents', () => {
    it('should calculate higher percents for thieves', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const { greenPercent, redPercent } = TrapPuzzleService.calculateRevealPercents(thief)

      // Thief with AGI 16 = 95% inspect chance (capped)
      // Green = 95 * 0.8 = 76, Red = 95 * 0.2 = 19
      expect(greenPercent).toBe(76)
      expect(redPercent).toBe(19)
    })

    it('should calculate lower percents for fighters', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 12 })
      const { greenPercent, redPercent } = TrapPuzzleService.calculateRevealPercents(fighter)

      // Fighter with AGI 12 = 12% inspect chance
      // Green = 12 * 0.8 = 9, Red = 12 * 0.2 = 2
      expect(greenPercent).toBe(9)
      expect(redPercent).toBe(2)
    })
  })

  describe('performInspection', () => {
    it('should update scrambled state with revealed letters', () => {
      RandomService.setSeed(12345)
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const initialState = TrapPuzzleService.createScrambledState('POISON_NEEDLE')

      const result = TrapPuzzleService.performInspection(thief, initialState)

      expect(result.inspectionCount).toBe(1)
      expect(result.fullyRevealed).toBe(false)

      const revealed = result.letters.filter(l => l.state !== 'hidden')
      expect(revealed.length).toBeGreaterThan(0)
    })

    it('should stack inspections', () => {
      RandomService.setSeed(12345)
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 12 })
      let state = TrapPuzzleService.createScrambledState('POISON_NEEDLE')

      state = TrapPuzzleService.performInspection(thief, state)
      const firstRevealCount = state.letters.filter(l => l.state !== 'hidden').length

      state = TrapPuzzleService.performInspection(thief, state)
      const secondRevealCount = state.letters.filter(l => l.state !== 'hidden').length

      expect(secondRevealCount).toBeGreaterThanOrEqual(firstRevealCount)
      expect(state.inspectionCount).toBe(2)
    })

    it('should preserve actualTrapId', () => {
      RandomService.setSeed(12345)
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const initialState = TrapPuzzleService.createScrambledState('GAS_BOMB')

      const result = TrapPuzzleService.performInspection(thief, initialState)

      expect(result.actualTrapId).toBe('GAS_BOMB')
    })
  })

  describe('performCalfo', () => {
    it('should reveal all letters as green', () => {
      RandomService.setSeed(12345)
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const initialState = TrapPuzzleService.createScrambledState('POISON_NEEDLE')

      const result = TrapPuzzleService.performCalfo(priest, initialState)

      expect(result.fullyRevealed).toBe(true)
      expect(result.letters.every(l => l.state === 'green')).toBe(true)
    })

    it('should keep letters scrambled (not in original order)', () => {
      RandomService.setSeed(12345)
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const initialState = TrapPuzzleService.createScrambledState('POISON_NEEDLE')

      const result = TrapPuzzleService.performCalfo(priest, initialState)
      const displayText = result.letters.map(l => l.char).join('')

      // Should still be scrambled, not "POISON NEEDLE"
      expect(displayText).not.toBe('POISON NEEDLE')
    })

    it('should preserve actualTrapId', () => {
      RandomService.setSeed(12345)
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const initialState = TrapPuzzleService.createScrambledState('GAS_BOMB')

      const result = TrapPuzzleService.performCalfo(priest, initialState)

      expect(result.actualTrapId).toBe('GAS_BOMB')
    })
  })
})
