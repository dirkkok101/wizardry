// src/data/__tests__/shop-inventory.spec.ts
import { SHOP_INVENTORY, UNIDENTIFIED_ITEMS } from '../shop-inventory'
import { ItemType } from '../../types/ItemType'

describe('Shop Inventory', () => {
  describe('regular inventory', () => {
    it('contains identified items', () => {
      const allIdentified = SHOP_INVENTORY.every(item => item.identified === true)
      expect(allIdentified).toBe(true)
    })

    it('contains no cursed items', () => {
      const noCursed = SHOP_INVENTORY.every(item => item.cursed === false)
      expect(noCursed).toBe(true)
    })
  })

  describe('unidentified items', () => {
    it('contains unidentified items for testing', () => {
      expect(UNIDENTIFIED_ITEMS.length).toBeGreaterThan(0)
    })

    it('all items are unidentified', () => {
      const allUnidentified = UNIDENTIFIED_ITEMS.every(item => item.identified === false)
      expect(allUnidentified).toBe(true)
    })

    it('includes some cursed items', () => {
      const hasCursed = UNIDENTIFIED_ITEMS.some(item => item.cursed === true)
      expect(hasCursed).toBe(true)
    })

    it('has unidentifiedName for display', () => {
      UNIDENTIFIED_ITEMS.forEach(item => {
        expect(item.unidentifiedName).toBeDefined()
        expect(item.unidentifiedName).not.toBe(item.name)
      })
    })
  })
})
