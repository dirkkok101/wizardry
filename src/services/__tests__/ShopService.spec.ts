import { ShopService } from '../ShopService'
import { Item } from '../../types/Item'
import { ItemType, ItemSlot } from '../../types/ItemType'

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
})
