// src/test-helpers/__tests__/shop-test-helpers.spec.ts
import { addUnidentifiedItemsToCharacter, identifyItemForCharacter } from '../shop-test-helpers'
import { GameState } from '../../types/GameState'
import { Character } from '../../types/Character'
import { CharacterClass } from '../../types/CharacterClass'
import { CharacterStatus } from '../../types/CharacterStatus'
import { Race } from '../../types/Race'
import { Alignment } from '../../types/Alignment'

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
    it('adds unidentified items to character inventory', () => {
      const updated = addUnidentifiedItemsToCharacter(mockState, 'char-1', 2)

      const char = updated.roster.get('char-1')!
      expect(char.inventory.length).toBe(2)
      expect((char.inventory[0] as any).identified).toBe(false)
    })
  })

  describe('identifyItemForCharacter', () => {
    it('marks item as identified', () => {
      const withItems = addUnidentifiedItemsToCharacter(mockState, 'char-1', 1)
      const itemId = (withItems.roster.get('char-1')!.inventory[0] as any).id

      const updated = identifyItemForCharacter(withItems, 'char-1', itemId)

      const char = updated.roster.get('char-1')!
      expect((char.inventory[0] as any).identified).toBe(true)
    })
  })
})
