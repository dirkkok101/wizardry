import { RandomService } from '../RandomService'

describe('RandomService', () => {
  // Always reset after each test to avoid polluting other tests
  afterEach(() => {
    RandomService.resetSeed()
  })

  describe('setSeed', () => {
    it('produces deterministic sequence with same seed', () => {
      RandomService.setSeed(12345)
      const sequence1 = [
        RandomService.nextRandom(),
        RandomService.nextRandom(),
        RandomService.nextRandom()
      ]

      RandomService.setSeed(12345)
      const sequence2 = [
        RandomService.nextRandom(),
        RandomService.nextRandom(),
        RandomService.nextRandom()
      ]

      expect(sequence1).toEqual(sequence2)
    })

    it('produces different sequence with different seed', () => {
      RandomService.setSeed(12345)
      const val1 = RandomService.nextRandom()

      RandomService.setSeed(54321)
      const val2 = RandomService.nextRandom()

      expect(val1).not.toBe(val2)
    })
  })

  describe('getSeed', () => {
    it('returns null when not seeded', () => {
      expect(RandomService.getSeed()).toBeNull()
    })

    it('returns seed when seeded', () => {
      RandomService.setSeed(42)
      expect(RandomService.getSeed()).toBe(42)
    })
  })

  describe('resetSeed', () => {
    it('clears seed', () => {
      RandomService.setSeed(42)
      RandomService.resetSeed()
      expect(RandomService.getSeed()).toBeNull()
    })

    it('clears queued values', () => {
      RandomService.queueNextValues([0.5])
      RandomService.resetSeed()
      expect(RandomService.getQueuedCount()).toBe(0)
    })
  })

  describe('queueNextValues', () => {
    it('returns queued values in order', () => {
      RandomService.queueNextValues([0.1, 0.5, 0.9])

      expect(RandomService.nextRandom()).toBe(0.1)
      expect(RandomService.nextRandom()).toBe(0.5)
      expect(RandomService.nextRandom()).toBe(0.9)
    })

    it('queued values take precedence over seed', () => {
      RandomService.setSeed(12345)
      RandomService.queueNextValues([0.123])

      expect(RandomService.nextRandom()).toBe(0.123)
      // After queue exhausted, uses seeded RNG
      const seededVal = RandomService.nextRandom()
      expect(seededVal).not.toBe(0.123)
    })

    it('can add more values to queue', () => {
      RandomService.queueNextValues([0.1])
      RandomService.queueNextValues([0.2])

      expect(RandomService.nextRandom()).toBe(0.1)
      expect(RandomService.nextRandom()).toBe(0.2)
    })
  })

  describe('clearQueue', () => {
    it('clears queued values without affecting seed', () => {
      RandomService.setSeed(42)
      RandomService.queueNextValues([0.5])
      RandomService.clearQueue()

      expect(RandomService.getQueuedCount()).toBe(0)
      expect(RandomService.getSeed()).toBe(42)
    })
  })

  describe('random', () => {
    it('returns integer in range', () => {
      RandomService.setSeed(12345)
      for (let i = 0; i < 100; i++) {
        const val = RandomService.random(1, 10)
        expect(val).toBeGreaterThanOrEqual(1)
        expect(val).toBeLessThanOrEqual(10)
        expect(Number.isInteger(val)).toBe(true)
      }
    })

    it('is deterministic with seed', () => {
      RandomService.setSeed(999)
      const val1 = RandomService.random(1, 100)

      RandomService.setSeed(999)
      const val2 = RandomService.random(1, 100)

      expect(val1).toBe(val2)
    })
  })

  describe('randomFloat', () => {
    it('returns float in range', () => {
      RandomService.setSeed(12345)
      for (let i = 0; i < 100; i++) {
        const val = RandomService.randomFloat(0, 1)
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThan(1)
      }
    })
  })

  describe('chance', () => {
    it('returns true when roll is below percentage', () => {
      RandomService.queueNextValues([0.3]) // 30%
      expect(RandomService.chance(50)).toBe(true) // 30% < 50%
    })

    it('returns false when roll is above percentage', () => {
      RandomService.queueNextValues([0.7]) // 70%
      expect(RandomService.chance(50)).toBe(false) // 70% >= 50%
    })
  })

  describe('roll', () => {
    it('returns true when roll is below probability', () => {
      RandomService.queueNextValues([0.3])
      expect(RandomService.roll(0.5)).toBe(true)
    })

    it('returns false when roll is above probability', () => {
      RandomService.queueNextValues([0.7])
      expect(RandomService.roll(0.5)).toBe(false)
    })
  })

  describe('rollDie', () => {
    it('returns value between 1 and sides', () => {
      RandomService.setSeed(12345)
      for (let i = 0; i < 100; i++) {
        const val = RandomService.rollDie(6)
        expect(val).toBeGreaterThanOrEqual(1)
        expect(val).toBeLessThanOrEqual(6)
      }
    })

    it('uses queued values correctly', () => {
      RandomService.queueNextValues([0]) // Minimum roll
      expect(RandomService.rollDie(6)).toBe(1)

      RandomService.queueNextValues([0.999]) // Maximum roll
      expect(RandomService.rollDie(6)).toBe(6)
    })
  })

  describe('rollDice', () => {
    it('returns sum of multiple dice', () => {
      // Queue values for 3d6: 1 + 3 + 6 = 10
      RandomService.queueNextValues([0, 0.4, 0.999])
      expect(RandomService.rollDice(3, 6)).toBe(10)
    })

    it('returns correct range for 2d6', () => {
      RandomService.setSeed(12345)
      for (let i = 0; i < 100; i++) {
        const val = RandomService.rollDice(2, 6)
        expect(val).toBeGreaterThanOrEqual(2)
        expect(val).toBeLessThanOrEqual(12)
      }
    })
  })

  describe('rollDiceNotation', () => {
    it('parses simple notation', () => {
      RandomService.queueNextValues([0.5])
      const result = RandomService.rollDiceNotation('1d6')
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(6)
    })

    it('parses notation with positive modifier', () => {
      RandomService.queueNextValues([0]) // Roll 1
      expect(RandomService.rollDiceNotation('1d6+3')).toBe(4)
    })

    it('parses notation with negative modifier', () => {
      RandomService.queueNextValues([0.999]) // Roll 6
      expect(RandomService.rollDiceNotation('1d6-2')).toBe(4)
    })

    it('throws on invalid notation', () => {
      expect(() => RandomService.rollDiceNotation('invalid')).toThrow()
    })
  })

  describe('rollMultipleDice', () => {
    it('returns array of individual results', () => {
      RandomService.queueNextValues([0, 0.5, 0.999])
      const results = RandomService.rollMultipleDice(3, 6)
      expect(results).toHaveLength(3)
      expect(results[0]).toBe(1)
      expect(results[1]).toBe(4)
      expect(results[2]).toBe(6)
    })
  })

  describe('pickRandom', () => {
    it('picks element from array', () => {
      const items = ['a', 'b', 'c']
      RandomService.queueNextValues([0.5]) // Middle index
      expect(RandomService.pickRandom(items)).toBe('b')
    })

    it('throws on empty array', () => {
      expect(() => RandomService.pickRandom([])).toThrow()
    })
  })

  describe('pickRandomIndex', () => {
    it('returns valid index', () => {
      RandomService.queueNextValues([0.5])
      expect(RandomService.pickRandomIndex(['a', 'b', 'c'])).toBe(1)
    })

    it('throws on empty array', () => {
      expect(() => RandomService.pickRandomIndex([])).toThrow()
    })
  })

  describe('weightedRandom', () => {
    it('respects weights', () => {
      const items = ['common', 'rare']
      const weights = [90, 10]

      // With weight 90 vs 10, random 0.5 should pick common
      RandomService.queueNextValues([0.5]) // 50% of total weight = 50, which is < 90
      expect(RandomService.weightedRandom(items, weights)).toBe('common')

      // Random 0.95 should pick rare
      RandomService.queueNextValues([0.95]) // 95% of total weight = 95, which is > 90
      expect(RandomService.weightedRandom(items, weights)).toBe('rare')
    })

    it('throws on mismatched array lengths', () => {
      expect(() => RandomService.weightedRandom(['a'], [1, 2])).toThrow()
    })

    it('throws on empty array', () => {
      expect(() => RandomService.weightedRandom([], [])).toThrow()
    })
  })

  describe('shuffle', () => {
    it('returns new array with same elements', () => {
      const original = [1, 2, 3, 4, 5]
      RandomService.setSeed(12345)
      const shuffled = RandomService.shuffle(original)

      expect(shuffled).not.toBe(original) // New array
      expect(shuffled.sort()).toEqual(original.sort()) // Same elements
    })

    it('does not modify original array', () => {
      const original = [1, 2, 3]
      RandomService.shuffle(original)
      expect(original).toEqual([1, 2, 3])
    })

    it('is deterministic with seed', () => {
      const arr = [1, 2, 3, 4, 5]

      RandomService.setSeed(12345)
      const shuffle1 = RandomService.shuffle(arr)

      RandomService.setSeed(12345)
      const shuffle2 = RandomService.shuffle(arr)

      expect(shuffle1).toEqual(shuffle2)
    })
  })

  describe('gaussianRandom', () => {
    it('produces values around mean', () => {
      RandomService.setSeed(12345)
      const values: number[] = []
      for (let i = 0; i < 1000; i++) {
        values.push(RandomService.gaussianRandom(100, 10))
      }

      const avg = values.reduce((a, b) => a + b, 0) / values.length
      expect(avg).toBeGreaterThan(95)
      expect(avg).toBeLessThan(105)
    })
  })

  describe('integration: typical test usage', () => {
    it('allows precise control for combat tests', () => {
      // Simulating a combat test that needs specific outcomes:
      // - Hit roll: success (0.3 < 0.5 threshold)
      // - Damage roll: high (0.9 = near max)
      // - Crit roll: fail (0.9 > 0.1 crit chance)
      RandomService.queueNextValues([0.3, 0.9, 0.9])

      const hitRoll = RandomService.nextRandom()
      const damageRoll = RandomService.nextRandom()
      const critRoll = RandomService.nextRandom()

      expect(hitRoll).toBe(0.3)
      expect(damageRoll).toBe(0.9)
      expect(critRoll).toBe(0.9)
    })

    it('allows seeded sequences for reproducibility', () => {
      RandomService.setSeed(42)

      // Run some game logic
      const initiative = RandomService.random(1, 10)
      const hit = RandomService.chance(75)
      const damage = RandomService.rollDice(2, 6)

      // Reset and verify same results
      RandomService.setSeed(42)
      expect(RandomService.random(1, 10)).toBe(initiative)
      expect(RandomService.chance(75)).toBe(hit)
      expect(RandomService.rollDice(2, 6)).toBe(damage)
    })
  })
})
