import { ShopService } from '../ShopService'
import { Item } from '../../types/Item'
import { ItemType, ItemSlot } from '../../types/ItemType'
import { createTestGameState, createTestCharacter } from '../../test-helpers/test-factories'

describe('ShopService', () => {
  const mockItem: Item = {
    id: 'item-1',
    name: 'Long Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 200,
    damage: 10,
    cursed: false,
    identified: true,
    equipped: false
  }


  describe('calculateSellPrice', () => {
    it('returns 50% of purchase price', () => {
      const sellPrice = ShopService.calculateSellPrice(mockItem)
      expect(sellPrice).toBe(100) // 50% of 200
    })

    it('floors the result for odd prices', () => {
      const oddItem = { ...mockItem, price: 75 }
      const sellPrice = ShopService.calculateSellPrice(oddItem)
      expect(sellPrice).toBe(37) // floor(75 * 0.5) = 37
    })

    it('returns 0 for cursed items', () => {
      const cursedItem = { ...mockItem, cursed: true }
      const sellPrice = ShopService.calculateSellPrice(cursedItem)
      expect(sellPrice).toBe(0)
    })
  })

  describe('canAfford', () => {
    it('returns true when party has enough gold', () => {
      expect(ShopService.canAfford(500, mockItem)).toBe(true)
    })

    it('returns false when party does not have enough gold', () => {
      expect(ShopService.canAfford(50, mockItem)).toBe(false)
    })

    it('returns false when gold exactly equals price minus one', () => {
      expect(ShopService.canAfford(199, mockItem)).toBe(false)
    })

    it('returns true when gold exactly equals price', () => {
      expect(ShopService.canAfford(200, mockItem)).toBe(true)
    })
  })

  describe('calculateIdentifyPrice', () => {
    it('returns 100 gold flat fee for any item', () => {
      expect(ShopService.calculateIdentifyPrice(mockItem)).toBe(100)
    })
  })

  describe('buyItem', () => {
    it('deducts gold from party when buying item', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 500,
          members: ['char-1']
        }
      }

      const result = ShopService.buyItem(state, 'char-1', mockItem)

      expect(result.success).toBe(true)
      expect(result.state!.party.gold).toBe(300) // 500 - 200
    })

    it('adds item to character inventory', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 500,
          members: ['char-1']
        }
      }

      const result = ShopService.buyItem(state, 'char-1', mockItem)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get('char-1')
      expect(updatedChar!.inventory).toContain('item-1')
    })

    it('returns error if party has insufficient gold', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 50,
          members: ['char-1']
        }
      }

      const result = ShopService.buyItem(state, 'char-1', mockItem)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient party gold')
    })

    it('returns error if character not found', () => {
      const state = createTestGameState()

      const result = ShopService.buyItem(state, 'nonexistent', mockItem)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Character not found')
    })

    it('returns error if inventory is full', () => {
      const fullInventory = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8']
      const character = createTestCharacter({ id: 'char-1', inventory: fullInventory })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 500,
          members: ['char-1']
        }
      }

      const result = ShopService.buyItem(state, 'char-1', mockItem)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Inventory full (max 8 items)')
    })
  })

  describe('sellItem', () => {
    it('adds gold to party when selling item', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: ['item-1'] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 100,
          members: ['char-1']
        }
      }

      const result = ShopService.sellItem(state, 'char-1', mockItem)

      expect(result.success).toBe(true)
      expect(result.state!.party.gold).toBe(200) // 100 + 100 (50% of 200)
    })

    it('removes item from character inventory', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: ['item-1', 'item-2'] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 100,
          members: ['char-1']
        }
      }

      const result = ShopService.sellItem(state, 'char-1', mockItem)

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get('char-1')
      expect(updatedChar!.inventory).not.toContain('item-1')
      expect(updatedChar!.inventory).toContain('item-2')
    })

    it('returns error if character not found', () => {
      const state = createTestGameState()

      const result = ShopService.sellItem(state, 'nonexistent', mockItem)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Character not found')
    })

    it('returns error if item not in inventory', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: ['item-2'] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 100,
          members: ['char-1']
        }
      }

      const result = ShopService.sellItem(state, 'char-1', mockItem)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Item not in inventory')
    })

    it('returns error if trying to sell cursed equipped item', () => {
      const cursedItem = { ...mockItem, cursed: true, equipped: true }
      const character = createTestCharacter({ id: 'char-1', inventory: ['item-1'] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 100,
          members: ['char-1']
        }
      }

      const result = ShopService.sellItem(state, 'char-1', cursedItem)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot sell cursed equipped item')
    })
  })
})
