import { InventoryService } from '../InventoryService'
import { Character } from '../../types/Character'
import { Item } from '../../types/Item'
import { ItemType, ItemSlot } from '../../types/ItemType'
import { CharacterClass } from '../../types/CharacterClass'
import { CharacterStatus } from '../../types/CharacterStatus'
import { Race } from '../../types/Race'
import { Alignment } from '../../types/Alignment'

describe('InventoryService', () => {
  const mockItem: Item = {
    id: 'item-1',
    name: 'Short Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 100,
    damage: 5,
    cursed: false,
    identified: true,
    equipped: false
  }

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    race: Race.HUMAN,
    class: CharacterClass.MAGE,
    alignment: Alignment.GOOD,
    level: 5,
    hp: 20,
    maxHp: 25,
    status: CharacterStatus.OK,
    strength: 10,
    intelligence: 15,
    piety: 12,
    vitality: 12,
    agility: 10,
    luck: 10,
    experience: 5000,
    ac: 5,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  }

  describe('hasSpace', () => {
    it('returns true when inventory is empty', () => {
      expect(InventoryService.hasSpace(mockCharacter)).toBe(true)
    })

    it('returns true when inventory has less than 8 items', () => {
      const char = {
        ...mockCharacter,
        inventory: ['item-1', 'item-2', 'item-3']
      }
      expect(InventoryService.hasSpace(char)).toBe(true)
    })

    it('returns false when inventory has 8 items', () => {
      const char = {
        ...mockCharacter,
        inventory: Array(8).fill('item-1')
      }
      expect(InventoryService.hasSpace(char)).toBe(false)
    })
  })

  describe('addItem', () => {
    it('adds item to empty inventory', () => {
      const result = InventoryService.addItem(mockCharacter, mockItem)
      expect(result.inventory.length).toBe(1)
      expect(result.inventory[0]).toBe('item-1')
    })

    it('adds item to existing inventory', () => {
      const char = { ...mockCharacter, inventory: ['item-1'] }
      const newItem = { ...mockItem, id: 'item-2', name: 'Long Sword' }

      const result = InventoryService.addItem(char, newItem)
      expect(result.inventory.length).toBe(2)
      expect(result.inventory).toContain('item-2')
    })

    it('throws error when inventory is full', () => {
      const char = {
        ...mockCharacter,
        inventory: Array(8).fill('item')
      }

      expect(() => {
        InventoryService.addItem(char, mockItem)
      }).toThrow('Inventory full')
    })
  })

  describe('removeItem', () => {
    it('removes item from inventory', () => {
      const char = { ...mockCharacter, inventory: ['item-1'] }

      const result = InventoryService.removeItem(char, 'item-1')
      expect(result.inventory.length).toBe(0)
    })

    it('cannot remove equipped cursed item', () => {
      const cursedItem = { ...mockItem, cursed: true, equipped: true }
      const char = { ...mockCharacter, inventory: ['item-1'], equippedWeapon: 'item-1' }

      expect(() => {
        InventoryService.removeItem(char, 'item-1', cursedItem)
      }).toThrow('Cannot remove equipped cursed item')
    })

    it('throws error when item not found', () => {
      expect(() => {
        InventoryService.removeItem(mockCharacter, 'nonexistent')
      }).toThrow('Item not found')
    })
  })

  describe('canEquip', () => {
    it('returns true when character meets class requirements', () => {
      const weapon = {
        ...mockItem,
        classRestrictions: [CharacterClass.FIGHTER, CharacterClass.MAGE]
      }

      expect(InventoryService.canEquip(mockCharacter, weapon)).toBe(true)
    })

    it('returns false when character does not meet class requirements', () => {
      const weapon = {
        ...mockItem,
        classRestrictions: [CharacterClass.FIGHTER]
      }

      expect(InventoryService.canEquip(mockCharacter, weapon)).toBe(false)
    })

    it('returns true when no class restrictions', () => {
      expect(InventoryService.canEquip(mockCharacter, mockItem)).toBe(true)
    })
  })
})
