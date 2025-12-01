import { BishopIdentificationService } from '../BishopIdentificationService'
import { Character } from '@models/Character'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'
import { CharacterClass } from '@models/CharacterClass'
import { RandomService } from '../RandomService'

// Helper to create test Bishop
const createBishop = (overrides: Partial<Character> = {}): Character => ({
  id: 'bishop-1',
  name: 'Test Bishop',
  race: 'HUMAN',
  class: CharacterClass.BISHOP,
  alignment: 'GOOD',
  strength: 10,
  intelligence: 15, // Higher IQ = better identification
  piety: 14,
  vitality: 12,
  agility: 10,
  luck: 10,
  level: 5,
  experience: 5000,
  age: 25,
  hp: 25,
  maxHp: 25,
  ac: 8,
  status: 'OK',
  vim: { current: 100, max: 100 },
  knownSpells: [],
  inventory: [],
  gold: 100,
  createdAt: Date.now(),
  lastModified: Date.now(),
  ...overrides
})

// Helper to create test item
const createUnidentifiedItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'test-item',
  name: 'Mystery Sword',
  type: ItemType.WEAPON,
  slot: ItemSlot.WEAPON,
  price: 500,
  cursed: false,
  identified: false,
  equipped: false,
  ...overrides
})

describe('BishopIdentificationService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('canIdentify', () => {
    it('allows Bishop to identify', () => {
      const bishop = createBishop()
      const result = BishopIdentificationService.canIdentify(bishop)
      expect(result.canIdentify).toBe(true)
    })

    it('rejects non-Bishop classes', () => {
      const fighter = createBishop({ class: CharacterClass.FIGHTER })
      const result = BishopIdentificationService.canIdentify(fighter)
      expect(result.canIdentify).toBe(false)
      expect(result.reason).toContain('Only Bishops')
    })

    it('rejects dead Bishop', () => {
      const deadBishop = createBishop({ status: 'DEAD' })
      const result = BishopIdentificationService.canIdentify(deadBishop)
      expect(result.canIdentify).toBe(false)
      expect(result.reason).toContain('dead')
    })

    it('rejects unconscious Bishop (0 HP)', () => {
      const unconscious = createBishop({ hp: 0 })
      const result = BishopIdentificationService.canIdentify(unconscious)
      expect(result.canIdentify).toBe(false)
      expect(result.reason).toContain('unconscious')
    })
  })

  describe('calculateSuccessChance', () => {
    it('calculates base chance from IQ', () => {
      const bishop = createBishop({ intelligence: 10, level: 0 })
      const cheapItem = createUnidentifiedItem({ price: 0 })

      // Base 50% + (10 IQ × 3) + 0 level = 80%
      const chance = BishopIdentificationService.calculateSuccessChance(bishop, cheapItem)
      expect(chance).toBe(80)
    })

    it('reduces chance for expensive items', () => {
      const bishop = createBishop({ intelligence: 10, level: 0 })
      const expensiveItem = createUnidentifiedItem({ price: 1000 })

      // Base 50% + (10 × 3) - (1000/100) = 80 - 10 = 70%
      const chance = BishopIdentificationService.calculateSuccessChance(bishop, expensiveItem)
      expect(chance).toBe(70)
    })

    it('adds level bonus', () => {
      const bishop = createBishop({ intelligence: 10, level: 10 })
      const cheapItem = createUnidentifiedItem({ price: 0 })

      // Base 50% + (10 × 3) + 10 level = 90%
      const chance = BishopIdentificationService.calculateSuccessChance(bishop, cheapItem)
      expect(chance).toBe(90)
    })

    it('caps at 95% maximum', () => {
      const geniusBishop = createBishop({ intelligence: 18, level: 15 })
      const cheapItem = createUnidentifiedItem({ price: 0 })

      // Would be 50 + 54 + 15 = 119%, but capped at 95%
      const chance = BishopIdentificationService.calculateSuccessChance(geniusBishop, cheapItem)
      expect(chance).toBe(95)
    })

    it('has minimum 5% chance', () => {
      const dumbBishop = createBishop({ intelligence: 3, level: 1 })
      const veryExpensiveItem = createUnidentifiedItem({ price: 10000 })

      // Would be 50 + 9 + 1 - 100 = -40%, but minimum is 5%
      const chance = BishopIdentificationService.calculateSuccessChance(dumbBishop, veryExpensiveItem)
      expect(chance).toBe(5)
    })

    it('handles items with no price', () => {
      const bishop = createBishop({ intelligence: 12, level: 5 })
      const noPriceItem = createUnidentifiedItem({ price: undefined, cost: undefined })

      // Should use 0 for cost
      const chance = BishopIdentificationService.calculateSuccessChance(bishop, noPriceItem)
      expect(chance).toBeGreaterThan(0)
    })
  })

  describe('attemptIdentification', () => {
    it('succeeds when roll is under success chance', () => {
      RandomService.queueNextValues([0.50]) // 50% = roll of 50
      const bishop = createBishop({
        intelligence: 15, // 50 + 45 + 5 level = 100%, capped at 95%
        level: 5,
        inventory: [createUnidentifiedItem({ price: 100 })]
      })

      const result = BishopIdentificationService.attemptIdentification(bishop, 'test-item')

      expect(result.success).toBe(true)
      expect(result.updatedCharacter?.inventory[0].identified).toBe(true)
    })

    it('fails when roll exceeds success chance', () => {
      RandomService.queueNextValues([0.99]) // 99% = roll of 99
      const bishop = createBishop({
        intelligence: 10,
        level: 1,
        inventory: [createUnidentifiedItem({ price: 5000 })] // Expensive = hard
      })

      const result = BishopIdentificationService.attemptIdentification(bishop, 'test-item')

      expect(result.success).toBe(false)
      expect(result.message).toContain('cannot discern')
      expect(result.updatedCharacter).toBeUndefined()
    })

    it('warns about cursed items on success', () => {
      RandomService.queueNextValues([0.01]) // Low roll = success
      const bishop = createBishop({
        intelligence: 15,
        inventory: [createUnidentifiedItem({ cursed: true })]
      })

      const result = BishopIdentificationService.attemptIdentification(bishop, 'test-item')

      expect(result.success).toBe(true)
      expect(result.isCursed).toBe(true)
      expect(result.message).toContain('CURSED')
    })

    it('fails for non-Bishop', () => {
      const fighter = createBishop({
        class: CharacterClass.FIGHTER,
        inventory: [createUnidentifiedItem()]
      })

      const result = BishopIdentificationService.attemptIdentification(fighter, 'test-item')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Only Bishops')
    })

    it('fails for item not in inventory', () => {
      const bishop = createBishop({ inventory: [] })

      const result = BishopIdentificationService.attemptIdentification(bishop, 'nonexistent')

      expect(result.success).toBe(false)
      expect(result.message).toContain('not in inventory')
    })

    it('fails for already identified item', () => {
      const bishop = createBishop({
        inventory: [createUnidentifiedItem({ identified: true })]
      })

      const result = BishopIdentificationService.attemptIdentification(bishop, 'test-item')

      expect(result.success).toBe(false)
      expect(result.message).toContain('already identified')
    })
  })

  describe('getUnidentifiedItems', () => {
    it('returns only unidentified items', () => {
      const bishop = createBishop({
        inventory: [
          createUnidentifiedItem({ id: 'item1', identified: false }),
          createUnidentifiedItem({ id: 'item2', identified: true }),
          createUnidentifiedItem({ id: 'item3', identified: false })
        ]
      })

      const unidentified = BishopIdentificationService.getUnidentifiedItems(bishop)

      expect(unidentified).toHaveLength(2)
      expect(unidentified.map(i => i.id)).toEqual(['item1', 'item3'])
    })

    it('returns empty array when all items identified', () => {
      const bishop = createBishop({
        inventory: [
          createUnidentifiedItem({ identified: true }),
          createUnidentifiedItem({ identified: true })
        ]
      })

      const unidentified = BishopIdentificationService.getUnidentifiedItems(bishop)

      expect(unidentified).toHaveLength(0)
    })
  })

  describe('hasUnidentifiedItems', () => {
    it('returns true when unidentified items exist', () => {
      const bishop = createBishop({
        inventory: [createUnidentifiedItem({ identified: false })]
      })

      expect(BishopIdentificationService.hasUnidentifiedItems(bishop)).toBe(true)
    })

    it('returns false when all items identified', () => {
      const bishop = createBishop({
        inventory: [createUnidentifiedItem({ identified: true })]
      })

      expect(BishopIdentificationService.hasUnidentifiedItems(bishop)).toBe(false)
    })
  })

  describe('getDifficultyDescription', () => {
    it('returns correct descriptions for various chances', () => {
      expect(BishopIdentificationService.getDifficultyDescription(95)).toBe('Trivial')
      expect(BishopIdentificationService.getDifficultyDescription(80)).toBe('Easy')
      expect(BishopIdentificationService.getDifficultyDescription(60)).toBe('Moderate')
      expect(BishopIdentificationService.getDifficultyDescription(30)).toBe('Difficult')
      expect(BishopIdentificationService.getDifficultyDescription(15)).toBe('Very Hard')
      expect(BishopIdentificationService.getDifficultyDescription(5)).toBe('Nearly Impossible')
    })
  })

  describe('getExpectedAttempts', () => {
    it('calculates expected attempts based on success chance', () => {
      const bishop = createBishop({ intelligence: 10, level: 0 })
      const item = createUnidentifiedItem({ price: 0 })

      // 80% success = ~1.25 attempts expected, rounded up to 2
      const expected = BishopIdentificationService.getExpectedAttempts(bishop, item)
      expect(expected).toBe(2)
    })

    it('returns higher attempts for low success chance', () => {
      const bishop = createBishop({ intelligence: 5, level: 1 })
      const expensiveItem = createUnidentifiedItem({ price: 5000 })

      // Low IQ + expensive item = low chance = many attempts
      const expected = BishopIdentificationService.getExpectedAttempts(bishop, expensiveItem)
      expect(expected).toBeGreaterThan(5)
    })
  })
})
