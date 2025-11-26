/**
 * RandomService - Pure function service for random number generation with seed support.
 *
 * Provides deterministic random number generation with seeding support for testing,
 * replay, and procedural generation.
 *
 * Usage in tests:
 *   RandomService.setSeed(12345) // Deterministic sequence
 *   RandomService.queueNextValues([0.1, 0.5, 0.9]) // Specific values
 *   RandomService.resetSeed() // Back to true random
 */

// Internal state
let currentSeed: number | null = null
let seededRng: (() => number) | null = null
let queuedValues: number[] = []

/**
 * Mulberry32 PRNG algorithm - fast, good distribution, deterministic
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/**
 * Get the next random value (0-1 range)
 * Uses queued values first, then seeded RNG, then Math.random()
 */
function nextRandom(): number {
  // First check for queued values (for precise test control)
  if (queuedValues.length > 0) {
    return queuedValues.shift()!
  }

  // Then use seeded RNG if set
  if (seededRng) {
    return seededRng()
  }

  // Fall back to true random
  return Math.random()
}

/**
 * Set random seed for deterministic generation.
 * All subsequent random calls will produce the same sequence.
 */
function setSeed(seed: number): void {
  currentSeed = seed
  seededRng = mulberry32(seed)
  queuedValues = [] // Clear any queued values
}

/**
 * Get current random seed.
 * @returns Current seed or null if unseeded
 */
function getSeed(): number | null {
  return currentSeed
}

/**
 * Reset to unseeded random generation (Math.random).
 * Also clears any queued values.
 */
function resetSeed(): void {
  currentSeed = null
  seededRng = null
  queuedValues = []
}

/**
 * Queue specific values to be returned by subsequent random calls.
 * Useful for precise test control where you need specific outcomes.
 * Values are consumed in order (FIFO).
 *
 * @param values Array of values (0-1 range) to queue
 *
 * @example
 * RandomService.queueNextValues([0.1, 0.9]) // First call returns 0.1, second returns 0.9
 */
function queueNextValues(values: number[]): void {
  queuedValues.push(...values)
}

/**
 * Clear any queued values without affecting seed state.
 */
function clearQueue(): void {
  queuedValues = []
}

/**
 * Get count of remaining queued values.
 */
function getQueuedCount(): number {
  return queuedValues.length
}

/**
 * Generate random integer in range [min, max] (inclusive).
 */
function random(min: number, max: number): number {
  return Math.floor(nextRandom() * (max - min + 1)) + min
}

/**
 * Generate random float in range [min, max].
 */
function randomFloat(min: number = 0, max: number = 1): number {
  return nextRandom() * (max - min) + min
}

/**
 * Test random chance (percentage).
 * @param percentage Success chance (0-100)
 * @returns True if success, false if failure
 */
function chance(percentage: number): boolean {
  return nextRandom() * 100 < percentage
}

/**
 * Test random chance (0-1 range).
 * @param probability Success probability (0-1)
 * @returns True if success, false if failure
 */
function roll(probability: number): boolean {
  return nextRandom() < probability
}

/**
 * Roll a single die.
 * @param sides Number of sides on the die
 * @returns Roll result (1 to sides)
 */
function rollDie(sides: number): number {
  return Math.floor(nextRandom() * sides) + 1
}

/**
 * Roll multiple dice and return total.
 * @param count Number of dice
 * @param sides Sides per die
 * @returns Total of all dice
 */
function rollDice(count: number, sides: number): number {
  let total = 0
  for (let i = 0; i < count; i++) {
    total += rollDie(sides)
  }
  return total
}

/**
 * Roll dice with notation string (e.g., "2d6+3").
 * @param notation Dice notation string
 * @returns Total rolled value
 */
function rollDiceNotation(notation: string): number {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/)
  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`)
  }

  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  const modifier = match[3] ? parseInt(match[3], 10) : 0

  return rollDice(count, sides) + modifier
}

/**
 * Roll multiple dice and return individual results.
 */
function rollMultipleDice(count: number, sides: number): number[] {
  const results: number[] = []
  for (let i = 0; i < count; i++) {
    results.push(rollDie(sides))
  }
  return results
}

/**
 * Pick random element from array.
 * @throws Error if array is empty
 */
function pickRandom<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from empty array')
  }
  return array[Math.floor(nextRandom() * array.length)]
}

/**
 * Pick random index from array.
 * @throws Error if array is empty
 */
function pickRandomIndex<T>(array: T[]): number {
  if (array.length === 0) {
    throw new Error('Cannot pick from empty array')
  }
  return Math.floor(nextRandom() * array.length)
}

/**
 * Pick random element with weights.
 * @param items Array of items to choose from
 * @param weights Corresponding weights (higher = more likely)
 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length) {
    throw new Error('Items and weights arrays must have same length')
  }
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array')
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = nextRandom() * totalWeight

  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return items[i]
    }
  }

  return items[items.length - 1]
}

/**
 * Shuffle array randomly (Fisher-Yates algorithm).
 * @returns New shuffled array (original unchanged)
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Generate random number with gaussian/normal distribution.
 * Uses Box-Muller transform.
 */
function gaussianRandom(mean: number = 0, stdDev: number = 1): number {
  const u1 = nextRandom()
  const u2 = nextRandom()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return z0 * stdDev + mean
}

export const RandomService = {
  // Seed management
  setSeed,
  getSeed,
  resetSeed,

  // Test helpers
  queueNextValues,
  clearQueue,
  getQueuedCount,

  // Core random functions
  random,
  randomFloat,
  nextRandom,

  // Probability
  chance,
  roll,

  // Dice
  rollDie,
  rollDice,
  rollDiceNotation,
  rollMultipleDice,

  // Array utilities
  pickRandom,
  pickRandomIndex,
  weightedRandom,
  shuffle,

  // Distribution
  gaussianRandom,
}
