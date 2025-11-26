// src/test-helpers/__tests__/shop-test-helpers.spec.ts
import { addUnidentifiedItemsToCharacter, identifyItemForCharacter } from '../shop-test-helpers'
import { GameState } from '@models/GameState'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { Item } from '@models/Item'

describe('Shop Test Helpers', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Test',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    status: CharacterStatus.OK,
    strength: 15,
    intelligence: 10,
    piety: 10,
    vitality: 12,
    agility: 10,
    luck: 10,
    level: 1,
    experience: 0,
    hp: 10,
    maxHp: 10,
    ac: 10,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  } as Character

  const mockState: GameState = {
    roster: new Map([['char-1', mockCharacter]]),
    party: {
      members: ['char-1'],
      gold: 500,
      location: { level: 0, x: 0, y: 0 },
      facing: 'north'
    }
  } as GameState

  describe('addUnidentifiedItemsToCharacter', () => {
    it('adds unidentified Item objects to character inventory', () => {
      const updated = addUnidentifiedItemsToCharacter(mockState, 'char-1', 2)

      const char = updated.roster.get('char-1')!
      expect(char.inventory.length).toBe(2)
      // Inventory contains full Item objects
      expect(typeof char.inventory[0]).toBe('object')
      expect(char.inventory[0].id).toBeDefined()
      expect(char.inventory[0].name).toBeDefined()
      expect(char.inventory[0].identified).toBe(false)
    })
  })

  describe('identifyItemForCharacter', () => {
    it('marks item as identified in inventory', () => {
      const withItems = addUnidentifiedItemsToCharacter(mockState, 'char-1', 1)
      const item = withItems.roster.get('char-1')!.inventory[0] as Item

      const updated = identifyItemForCharacter(withItems, 'char-1', item.id)

      const char = updated.roster.get('char-1')!
      // Find the item in inventory
      const identifiedItem = char.inventory.find(i => i.id === item.id)
      expect(identifiedItem).toBeDefined()
      expect(identifiedItem!.identified).toBe(true)
    })

    it('adds item to inventory if not present', () => {
      // Item not in inventory yet
      const updated = identifyItemForCharacter(mockState, 'char-1', 'unknown-sword-1')

      const char = updated.roster.get('char-1')!
      expect(char.inventory.length).toBe(1)
      expect(char.inventory[0].id).toBe('unknown-sword-1')
      expect(char.inventory[0].identified).toBe(true)
    })
  })
})
