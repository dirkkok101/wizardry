import { ShopService } from '../ShopService'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'
import { createTestGameState, createTestCharacter } from '@testing/test-factories'

// Helper function to create test items
const createItem = (id: string, name: string, overrides: Partial<Item> = {}): Item => ({
  id,
  name,
  type: ItemType.WEAPON,
  slot: ItemSlot.WEAPON,
  price: 100,
  damage: 5,
  cursed: false,
  identified: true,
  equipped: false,
  ...overrides
})

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
      expect(updatedChar!.inventory.find(i => i.id === 'item-1')).toBeDefined()
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
      const fullInventory = Array(8).fill(null).map((_, i) => createItem(`item${i}`, `Item ${i}`))
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
      const character = createTestCharacter({ id: 'char-1', inventory: [mockItem] })
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
      const item2 = createItem('item-2', 'Item 2')
      const character = createTestCharacter({ id: 'char-1', inventory: [mockItem, item2] })
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
      expect(updatedChar!.inventory.find(i => i.id === 'item-1')).toBeUndefined()
      expect(updatedChar!.inventory.find(i => i.id === 'item-2')).toBeDefined()
    })

    it('returns error if character not found', () => {
      const state = createTestGameState()

      const result = ShopService.sellItem(state, 'nonexistent', mockItem)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Character not found')
    })

    it('returns error if item not in inventory', () => {
      const item2 = createItem('item-2', 'Item 2')
      const character = createTestCharacter({ id: 'char-1', inventory: [item2] })
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
      const character = createTestCharacter({ id: 'char-1', inventory: [cursedItem] })
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

  describe('identifyItem', () => {
    const unidentifiedItem: Item = {
      id: 'unid-item',
      name: 'Magic Sword',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 500,
      damage: 15,
      cursed: false,
      identified: false,
      equipped: false
    }

    it('identifies an item stored as object in inventory', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [unidentifiedItem] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 500,
          members: ['char-1']
        }
      }

      const result = ShopService.identifyItem(state, 'char-1', 'unid-item')

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get('char-1')
      const identifiedItem = updatedChar!.inventory[0] as Item
      expect(identifiedItem.identified).toBe(true)
    })

    it('deducts gold when identifying item', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [unidentifiedItem] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 500,
          members: ['char-1']
        }
      }

      const result = ShopService.identifyItem(state, 'char-1', 'unid-item')

      expect(result.success).toBe(true)
      expect(result.state!.party.gold).toBe(400) // 500 - 100
    })

    it('returns error if item is already identified', () => {
      const identifiedItem = { ...unidentifiedItem, identified: true }
      const character = createTestCharacter({ id: 'char-1', inventory: [identifiedItem] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 500,
          members: ['char-1']
        }
      }

      const result = ShopService.identifyItem(state, 'char-1', 'unid-item')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Item is already identified')
    })

    it('returns error if party has insufficient gold', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [unidentifiedItem] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 50,
          members: ['char-1']
        }
      }

      const result = ShopService.identifyItem(state, 'char-1', 'unid-item')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient party gold')
    })

    it('returns error if item not in inventory', () => {
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

      const result = ShopService.identifyItem(state, 'char-1', 'nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Item not in inventory')
    })

    it('returns error if character not found', () => {
      const state = createTestGameState()

      const result = ShopService.identifyItem(state, 'nonexistent', 'unid-item')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Character not found')
    })
  })

  describe('uncurseItem', () => {
    const cursedItem: Item = {
      id: 'cursed-item',
      name: 'Cursed Blade',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 300,
      damage: 20,
      cursed: true,
      identified: true,
      equipped: true
    }

    it('removes curse from item stored as object in inventory', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [cursedItem] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 1000,
          members: ['char-1']
        }
      }

      const result = ShopService.uncurseItem(state, 'char-1', 'cursed-item')

      expect(result.success).toBe(true)
      const updatedChar = result.state!.roster.get('char-1')
      const uncursedItem = updatedChar!.inventory[0] as Item
      expect(uncursedItem.cursed).toBe(false)
    })

    it('deducts correct gold for uncursing (half item price)', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [cursedItem] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 1000,
          members: ['char-1']
        }
      }

      const result = ShopService.uncurseItem(state, 'char-1', 'cursed-item')

      expect(result.success).toBe(true)
      // cursedItem.price = 300, uncurse cost = 150 (half price)
      expect(result.state!.party.gold).toBe(850) // 1000 - 150
    })

    it('returns error if item is not cursed', () => {
      const normalItem = { ...cursedItem, cursed: false }
      const character = createTestCharacter({ id: 'char-1', inventory: [normalItem] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 1000,
          members: ['char-1']
        }
      }

      const result = ShopService.uncurseItem(state, 'char-1', 'cursed-item')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Item is not cursed')
    })

    it('returns error if party has insufficient gold', () => {
      const character = createTestCharacter({ id: 'char-1', inventory: [cursedItem] })
      const state = {
        ...createTestGameState(),
        roster: new Map([['char-1', character]]),
        party: {
          ...createTestGameState().party,
          gold: 100,
          members: ['char-1']
        }
      }

      const result = ShopService.uncurseItem(state, 'char-1', 'cursed-item')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insufficient party gold')
    })

    it('returns error if character not found', () => {
      const state = createTestGameState()

      const result = ShopService.uncurseItem(state, 'nonexistent', 'cursed-item')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Character not found')
    })
  })

  describe('calculateUncursePrice', () => {
    it('returns half item price for normal items', () => {
      // mockItem.price = 200
      const item = { ...mockItem, cursed: true }
      expect(ShopService.calculateUncursePrice(item)).toBe(100) // 200 / 2
    })

    it('returns 150000 for special/priceless items (price >= 100000)', () => {
      const item = { ...mockItem, cursed: true, price: 150000 }
      expect(ShopService.calculateUncursePrice(item)).toBe(150000)
    })

    it('returns 150000 for items with no price', () => {
      const item = { ...mockItem, cursed: true, price: 0 }
      expect(ShopService.calculateUncursePrice(item)).toBe(150000)
    })

    it('floors the result for odd prices', () => {
      const item = { ...mockItem, cursed: true, price: 75 }
      expect(ShopService.calculateUncursePrice(item)).toBe(37) // floor(75 / 2)
    })

    it('returns half price for items just below threshold (99,999)', () => {
      const item = { ...mockItem, cursed: true, price: 99999 }
      expect(ShopService.calculateUncursePrice(item)).toBe(49999) // floor(99999 / 2)
    })

    it('returns 150000 for items at exact threshold (100,000)', () => {
      const item = { ...mockItem, cursed: true, price: 100000 }
      expect(ShopService.calculateUncursePrice(item)).toBe(150000)
    })
  })
})
