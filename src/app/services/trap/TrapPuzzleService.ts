/**
 * TrapPuzzleService - Handles the scrambled letter puzzle UI system
 *
 * The scrambled letters system is a UI minigame for trap identification:
 * - Letters of the trap name are scrambled and hidden
 * - Inspections reveal letters (green = confirmed, red = uncertain)
 * - Multiple inspections stack (already revealed letters stay revealed)
 * - CALFO spell reveals all letters as green
 * - Player must unscramble letters to type the correct trap name
 *
 * @see docs/ui/scenes/maze-chest.md
 */

import { Character } from '@models/Character'
import {
  TrapId,
  ScrambledLetter,
  LetterState,
  ScrambledTrapState
} from '@models/Trap'
import { RandomService } from '../RandomService'
import { getTrapEffect } from './TrapEffectService'
import { calculateInspectChance } from './TrapInspectionService'

/**
 * Scramble the letters of a trap name for the identification puzzle
 * Returns letters in random order, all initially hidden
 *
 * @param trapName Display name of the trap (from TrapEffect.name)
 * @returns Array of scrambled letters with hidden state
 */
export function scrambleLetters(trapName: string): ScrambledLetter[] {
  const letters: ScrambledLetter[] = trapName.split('').map((char, index) => ({
    char,
    state: 'hidden' as LetterState,
    position: index
  }))

  // Fisher-Yates shuffle using RandomService
  for (let i = letters.length - 1; i > 0; i--) {
    const j = RandomService.random(0, i)
    ;[letters[i], letters[j]] = [letters[j], letters[i]]
  }

  return letters
}

/**
 * Reveal letters based on character's inspection skill
 * Only reveals letters that are currently hidden.
 * Preserves already revealed letters (stacking inspections).
 *
 * @param letters Current scrambled letters
 * @param greenPercent Percentage of TOTAL letters to reveal as confirmed (green)
 * @param redPercent Percentage of TOTAL letters to reveal as uncertain (red)
 * @returns New letter array with reveals applied (original not modified)
 */
export function revealLetters(
  letters: ScrambledLetter[],
  greenPercent: number,
  redPercent: number
): ScrambledLetter[] {
  const result = letters.map(l => ({ ...l }))  // Clone

  // Get indices of hidden letters only
  const hiddenIndices = result
    .map((l, i) => l.state === 'hidden' ? i : -1)
    .filter(i => i >= 0)

  // Shuffle hidden indices for random reveal order
  for (let i = hiddenIndices.length - 1; i > 0; i--) {
    const j = RandomService.random(0, i)
    ;[hiddenIndices[i], hiddenIndices[j]] = [hiddenIndices[j], hiddenIndices[i]]
  }

  // Calculate how many of TOTAL letters to reveal
  const totalLetters = letters.length
  const greenToReveal = Math.floor(totalLetters * greenPercent / 100)
  const redToReveal = Math.floor(totalLetters * redPercent / 100)
  const totalToReveal = greenToReveal + redToReveal

  // Reveal up to totalToReveal hidden letters
  let revealed = 0
  for (const idx of hiddenIndices) {
    if (revealed >= totalToReveal) break

    if (revealed < greenToReveal) {
      result[idx].state = 'green'
    } else {
      result[idx].state = 'red'
    }
    revealed++
  }

  return result
}

/**
 * Create initial scrambled trap state from a trap ID
 * Gets the display name from TrapDataLoader (data-driven)
 *
 * @param trapId The trap ID string
 * @returns Complete scrambled state with all letters hidden
 */
export function createScrambledState(trapId: TrapId): ScrambledTrapState {
  const trapEffect = getTrapEffect(trapId)
  return {
    letters: scrambleLetters(trapEffect.name),
    actualTrapId: trapId,
    trapName: trapEffect.name,
    fullyRevealed: false,
    inspectionCount: 0
  }
}

/**
 * Calculate reveal percentages based on character's inspection skill
 * Uses the existing calculateInspectChance formula
 *
 * @param character The character performing inspection
 * @returns greenPercent (confirmed) and redPercent (uncertain) values
 */
export function calculateRevealPercents(character: Character): { greenPercent: number; redPercent: number } {
  const inspectChance = calculateInspectChance(character)

  // Green = 80% of inspect chance, Red = 20% of inspect chance
  // So a 95% thief reveals ~76% green, ~19% red
  const greenPercent = Math.floor(inspectChance * 0.8)
  const redPercent = Math.floor(inspectChance * 0.2)

  return { greenPercent, redPercent }
}

/**
 * Perform an inspection and update the scrambled state
 * Stacks with previous inspections - already revealed letters stay revealed
 *
 * @param character The character performing inspection
 * @param currentState Current scrambled trap state
 * @returns New state with updated letters and incremented inspection count
 */
export function performInspection(
  character: Character,
  currentState: ScrambledTrapState
): ScrambledTrapState {
  const { greenPercent, redPercent } = calculateRevealPercents(character)
  const updatedLetters = revealLetters(currentState.letters, greenPercent, redPercent)

  return {
    ...currentState,
    letters: updatedLetters,
    inspectionCount: currentState.inspectionCount + 1
  }
}

/**
 * Perform CALFO spell - reveals all letters as green but keeps them scrambled
 * The player must still unscramble the letters to identify the trap
 *
 * @param _caster The character casting CALFO (unused, kept for API consistency)
 * @param currentState Current scrambled trap state
 * @returns New state with all letters green and fullyRevealed = true
 */
export function performCalfo(
  _caster: Character,
  currentState: ScrambledTrapState
): ScrambledTrapState {
  return {
    ...currentState,
    letters: currentState.letters.map(l => ({ ...l, state: 'green' as LetterState })),
    fullyRevealed: true
  }
}

export const TrapPuzzleService = {
  scrambleLetters,
  revealLetters,
  createScrambledState,
  calculateRevealPercents,
  performInspection,
  performCalfo,
}
