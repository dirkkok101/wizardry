import { InventoryService } from '../InventoryService'
import { Character } from '@models/Character'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'

describe('InventoryService', () => {
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

  const mockItem: Item = createItem('item-1', 'Short Sword')

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
    knownSpells: [],
    age: 15,
    vim: { max: 12, current: 12 },
    gold: 100,
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  }

  describe('hasSpace', () => {
    it('returns true when inventory is empty', () => {
      expect(InventoryService.hasSpace(mockCharacter)).toBe(true)
    })

    it('returns true when inventory has less than 8 items', () => {
      const items = [
        createItem('item-1', 'Sword'),
        createItem('item-2', 'Shield'),
        createItem('item-3', 'Potion')
      ]
      const char = { ...mockCharacter, inventory: items }
      expect(InventoryService.hasSpace(char)).toBe(true)
    })

    it('returns false when inventory has 8 items', () => {
      const items = Array(8).fill(null).map((_, i) => createItem(`item-${i}`, `Item ${i}`))
      const char = { ...mockCharacter, inventory: items }
      expect(InventoryService.hasSpace(char)).toBe(false)
    })
  })

  describe('addItem', () => {
    it('adds item to empty inventory', () => {
      const result = InventoryService.addItem(mockCharacter, mockItem)
      expect(result.inventory.length).toBe(1)
      expect(result.inventory[0].id).toBe('item-1')
    })

    it('adds item to existing inventory', () => {
      const existingItem = createItem('item-1', 'Dagger')
      const char = { ...mockCharacter, inventory: [existingItem] }
      const newItem = createItem('item-2', 'Long Sword')

      const result = InventoryService.addItem(char, newItem)
      expect(result.inventory.length).toBe(2)
      expect(result.inventory.find(i => i.id === 'item-2')).toBeDefined()
    })

    it('throws error when inventory is full', () => {
      const items = Array(8).fill(null).map((_, i) => createItem(`item-${i}`, `Item ${i}`))
      const char = { ...mockCharacter, inventory: items }

      expect(() => {
        InventoryService.addItem(char, mockItem)
      }).toThrow('Inventory full')
    })

    it('creates a copy of the item with equipped set to false', () => {
      const equippedItem = createItem('item-1', 'Sword', { equipped: true })
      const result = InventoryService.addItem(mockCharacter, equippedItem)
      expect(result.inventory[0].equipped).toBe(false)
    })
  })

  describe('removeItem', () => {
    it('removes item from inventory', () => {
      const item = createItem('item-1', 'Sword')
      const char = { ...mockCharacter, inventory: [item] }

      const result = InventoryService.removeItem(char, 'item-1')
      expect(result.inventory.length).toBe(0)
    })

    it('cannot remove equipped cursed item', () => {
      const cursedItem = createItem('item-1', 'Cursed Blade', { cursed: true, equipped: true })
      const char = { ...mockCharacter, inventory: [cursedItem], equippedWeapon: cursedItem }

      expect(() => {
        InventoryService.removeItem(char, 'item-1')
      }).toThrow('Cannot remove equipped cursed item')
    })

    it('throws error when item not found', () => {
      expect(() => {
        InventoryService.removeItem(mockCharacter, 'nonexistent')
      }).toThrow('Item not found')
    })
  })

  describe('findItem', () => {
    it('finds item by id', () => {
      const item = createItem('item-1', 'Sword')
      const char = { ...mockCharacter, inventory: [item] }

      const found = InventoryService.findItem(char, 'item-1')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Sword')
    })

    it('returns undefined if item not found', () => {
      const found = InventoryService.findItem(mockCharacter, 'nonexistent')
      expect(found).toBeUndefined()
    })
  })

  describe('hasItem', () => {
    it('returns true if item exists', () => {
      const item = createItem('item-1', 'Sword')
      const char = { ...mockCharacter, inventory: [item] }

      expect(InventoryService.hasItem(char, 'item-1')).toBe(true)
    })

    it('returns false if item does not exist', () => {
      expect(InventoryService.hasItem(mockCharacter, 'nonexistent')).toBe(false)
    })
  })

  describe('canEquip', () => {
    it('returns true when character meets class requirements', () => {
      const weapon = createItem('item-1', 'Sword', {
        classRestrictions: [CharacterClass.FIGHTER, CharacterClass.MAGE]
      })

      expect(InventoryService.canEquip(mockCharacter, weapon)).toBe(true)
    })

    it('returns false when character does not meet class requirements', () => {
      const weapon = createItem('item-1', 'Sword', {
        classRestrictions: [CharacterClass.FIGHTER]
      })

      expect(InventoryService.canEquip(mockCharacter, weapon)).toBe(false)
    })

    it('returns true when no class restrictions', () => {
      expect(InventoryService.canEquip(mockCharacter, mockItem)).toBe(true)
    })
  })

  describe('transferItem', () => {
    let fromChar: Character
    let toChar: Character

    beforeEach(() => {
      const potion = createItem('potion', 'Health Potion', { type: ItemType.CONSUMABLE, slot: ItemSlot.ACCESSORY })
      const sword = createItem('sword', 'Iron Sword')

      fromChar = {
        ...mockCharacter,
        id: 'char-1',
        name: 'Fighter',
        inventory: [potion, sword]
      }

      const staff = createItem('staff', 'Oak Staff')
      toChar = {
        ...mockCharacter,
        id: 'char-2',
        name: 'Mage',
        inventory: [staff]
      }
    })

    it('transfers item between characters', () => {
      const result = InventoryService.transferItem(fromChar, toChar, 'potion')

      expect(result.from.inventory.find(i => i.id === 'potion')).toBeUndefined()
      expect(result.to.inventory.find(i => i.id === 'potion')).toBeDefined()
      expect(result.from.inventory.find(i => i.id === 'sword')).toBeDefined()
    })

    it('throws error if item not in donor inventory', () => {
      expect(() => InventoryService.transferItem(fromChar, toChar, 'unknown'))
        .toThrow('Item not found in donor inventory')
    })

    it('throws error if recipient inventory full', () => {
      const items = Array(8).fill(null).map((_, i) => createItem(`item-${i}`, `Item ${i}`))
      toChar.inventory = items

      expect(() => InventoryService.transferItem(fromChar, toChar, 'potion'))
        .toThrow('Recipient inventory full')
    })

    it('unequips transferred item', () => {
      fromChar.inventory[0] = { ...fromChar.inventory[0], equipped: true }
      const result = InventoryService.transferItem(fromChar, toChar, 'potion')

      const transferredItem = result.to.inventory.find(i => i.id === 'potion')
      expect(transferredItem?.equipped).toBe(false)
    })
  })

  describe('dropItem', () => {
    let character: Character

    beforeEach(() => {
      const potion = createItem('potion', 'Health Potion', { type: ItemType.CONSUMABLE, slot: ItemSlot.ACCESSORY })
      const sword = createItem('sword', 'Iron Sword')
      const shield = createItem('shield', 'Wooden Shield', { type: ItemType.SHIELD, slot: ItemSlot.SHIELD })

      character = {
        ...mockCharacter,
        id: 'char-1',
        name: 'Fighter',
        inventory: [potion, sword, shield]
      }
    })

    it('removes item from inventory', () => {
      const result = InventoryService.dropItem(character, 'potion')

      expect(result.inventory).toHaveLength(2)
      expect(result.inventory.find(i => i.id === 'potion')).toBeUndefined()
      expect(result.inventory.find(i => i.id === 'sword')).toBeDefined()
    })

    it('throws error if item not in inventory', () => {
      expect(() => InventoryService.dropItem(character, 'unknown'))
        .toThrow('Item not in inventory')
    })

    it('only removes first occurrence when duplicate items exist', () => {
      // Create character with 3 identical bronze keys
      const key1 = createItem('bronze_key', 'Bronze Key', { type: ItemType.MISC, slot: ItemSlot.NONE })
      const key2 = createItem('bronze_key', 'Bronze Key', { type: ItemType.MISC, slot: ItemSlot.NONE })
      const key3 = createItem('bronze_key', 'Bronze Key', { type: ItemType.MISC, slot: ItemSlot.NONE })
      const charWithDuplicates = {
        ...mockCharacter,
        inventory: [key1, key2, key3]
      }

      // Drop one key - should only remove ONE, leaving 2
      const result = InventoryService.dropItem(charWithDuplicates, 'bronze_key')

      expect(result.inventory).toHaveLength(2)
      expect(result.inventory.filter(i => i.id === 'bronze_key')).toHaveLength(2)
    })
  })

  describe('updateItem', () => {
    it('updates item properties', () => {
      const item = createItem('item-1', 'Sword', { identified: false })
      const char = { ...mockCharacter, inventory: [item] }

      const result = InventoryService.updateItem(char, 'item-1', { identified: true })

      expect(result.inventory[0].identified).toBe(true)
    })

    it('throws error if item not found', () => {
      expect(() => InventoryService.updateItem(mockCharacter, 'nonexistent', { identified: true }))
        .toThrow('Item not found')
    })
  })

  describe('getInventoryCount', () => {
    it('returns current and max inventory count', () => {
      const items = [
        createItem('item-1', 'Sword'),
        createItem('item-2', 'Shield'),
        createItem('item-3', 'Potion')
      ]
      const char = { ...mockCharacter, inventory: items }
      const result = InventoryService.getInventoryCount(char)

      expect(result.current).toBe(3)
      expect(result.max).toBe(8)
    })

    it('returns 0 for empty inventory', () => {
      const result = InventoryService.getInventoryCount(mockCharacter)

      expect(result.current).toBe(0)
      expect(result.max).toBe(8)
    })
  })

  describe('partyHasItem', () => {
    it('returns true when any party member has the item', () => {
      const bronzeKey = createItem('bronze_key', 'Bronze Key')
      const char1 = { ...mockCharacter, id: 'char-1', inventory: [] }
      const char2 = { ...mockCharacter, id: 'char-2', inventory: [bronzeKey] }
      const char3 = { ...mockCharacter, id: 'char-3', inventory: [] }

      const roster = new Map<string, Character>([
        ['char-1', char1],
        ['char-2', char2],
        ['char-3', char3]
      ])
      const memberIds = ['char-1', 'char-2', 'char-3']

      expect(InventoryService.partyHasItem(roster, memberIds, 'bronze_key')).toBe(true)
    })

    it('returns false when no party member has the item', () => {
      const char1 = { ...mockCharacter, id: 'char-1', inventory: [] }
      const char2 = { ...mockCharacter, id: 'char-2', inventory: [] }

      const roster = new Map<string, Character>([
        ['char-1', char1],
        ['char-2', char2]
      ])
      const memberIds = ['char-1', 'char-2']

      expect(InventoryService.partyHasItem(roster, memberIds, 'bronze_key')).toBe(false)
    })

    it('only checks party members, not entire roster', () => {
      const bronzeKey = createItem('bronze_key', 'Bronze Key')
      const partyMember = { ...mockCharacter, id: 'party-1', inventory: [] }
      const nonPartyMember = { ...mockCharacter, id: 'roster-only', inventory: [bronzeKey] }

      const roster = new Map<string, Character>([
        ['party-1', partyMember],
        ['roster-only', nonPartyMember]
      ])
      const memberIds = ['party-1'] // Only party-1 is in the party

      // roster-only has the key, but they're not in the party
      expect(InventoryService.partyHasItem(roster, memberIds, 'bronze_key')).toBe(false)
    })
  })
})
