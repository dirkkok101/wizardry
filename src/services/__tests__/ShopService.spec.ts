import { ShopService } from '../ShopService'
import { Item } from '../../types/Item'
import { ItemType, ItemSlot } from '../../types/ItemType'
import { Character } from '../../types/Character'
import { CharacterClass } from '../../types/CharacterClass'

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

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    // ... other required fields
    inventory: [],
    gold: 500
  } as Character

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
    it('returns true when character has enough gold', () => {
      expect(ShopService.canAfford(mockCharacter, mockItem)).toBe(true)
    })

    it('returns false when character does not have enough gold', () => {
      const poorChar = { ...mockCharacter, gold: 50 }
      expect(ShopService.canAfford(poorChar, mockItem)).toBe(false)
    })
  })

  describe('calculateIdentifyPrice', () => {
    it('returns 100 gold flat fee for any item', () => {
      expect(ShopService.calculateIdentifyPrice(mockItem)).toBe(100)
    })
  })
})
