import { TileConditionService } from '../TileConditionService'
import { createTestCharacter, createTestGameState, createPartyWithMembers } from '@testing/test-factories'
import { TileCondition } from '@models/Dungeon'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'

describe('TileConditionService', () => {
  const createItem = (id: string, name: string): Item => ({
    id,
    name,
    type: ItemType.MISC,
    slot: ItemSlot.NONE,
    price: 0,
    cursed: false,
    identified: true,
    equipped: false
  })

  describe('checkCondition', () => {
    describe('has_item condition', () => {
      it('returns true when party member has the required item', () => {
        const silverKey = createItem('silver_key', 'Silver Key')
        const char = createTestCharacter({
          id: 'hero-1',
          inventory: [silverKey]
        })

        const state = createTestGameState({
          roster: new Map([['hero-1', char]]),
          party: createPartyWithMembers(['hero-1'])
        })

        const condition: TileCondition = {
          type: 'has_item',
          itemId: 'silver_key'
        }

        expect(TileConditionService.checkCondition(condition, state)).toBe(true)
      })

      it('returns false when no party member has the required item', () => {
        const char = createTestCharacter({
          id: 'hero-1',
          inventory: [] // No items
        })

        const state = createTestGameState({
          roster: new Map([['hero-1', char]]),
          party: createPartyWithMembers(['hero-1'])
        })

        const condition: TileCondition = {
          type: 'has_item',
          itemId: 'silver_key'
        }

        expect(TileConditionService.checkCondition(condition, state)).toBe(false)
      })

      it('returns true when any party member has the item (not just first)', () => {
        const silverKey = createItem('silver_key', 'Silver Key')
        const char1 = createTestCharacter({
          id: 'hero-1',
          inventory: [] // No items
        })
        const char2 = createTestCharacter({
          id: 'hero-2',
          inventory: [silverKey] // Has the key
        })

        const state = createTestGameState({
          roster: new Map([
            ['hero-1', char1],
            ['hero-2', char2]
          ]),
          party: createPartyWithMembers(['hero-1', 'hero-2'])
        })

        const condition: TileCondition = {
          type: 'has_item',
          itemId: 'silver_key'
        }

        expect(TileConditionService.checkCondition(condition, state)).toBe(true)
      })

      it('returns false when party has different item (not the required one)', () => {
        const bronzeKey = createItem('bronze_key', 'Bronze Key')
        const char = createTestCharacter({
          id: 'hero-1',
          inventory: [bronzeKey]
        })

        const state = createTestGameState({
          roster: new Map([['hero-1', char]]),
          party: createPartyWithMembers(['hero-1'])
        })

        const condition: TileCondition = {
          type: 'has_item',
          itemId: 'silver_key' // Looking for silver, has bronze
        }

        expect(TileConditionService.checkCondition(condition, state)).toBe(false)
      })

      it('returns true when itemId is missing (invalid condition)', () => {
        const char = createTestCharacter({ id: 'hero-1' })
        const state = createTestGameState({
          roster: new Map([['hero-1', char]]),
          party: createPartyWithMembers(['hero-1'])
        })

        const condition: TileCondition = {
          type: 'has_item'
          // itemId intentionally missing
        }

        // Should allow entry when condition is invalid
        expect(TileConditionService.checkCondition(condition, state)).toBe(true)
      })
    })

    describe('has_spell condition (future)', () => {
      it('returns true (not yet implemented)', () => {
        const char = createTestCharacter({ id: 'hero-1' })
        const state = createTestGameState({
          roster: new Map([['hero-1', char]]),
          party: createPartyWithMembers(['hero-1'])
        })

        const condition: TileCondition = {
          type: 'has_spell',
          spellId: 'malor'
        }

        // Currently returns true as not implemented
        expect(TileConditionService.checkCondition(condition, state)).toBe(true)
      })
    })

    describe('flag_set condition (future)', () => {
      it('returns true (not yet implemented)', () => {
        const char = createTestCharacter({ id: 'hero-1' })
        const state = createTestGameState({
          roster: new Map([['hero-1', char]]),
          party: createPartyWithMembers(['hero-1'])
        })

        const condition: TileCondition = {
          type: 'flag_set',
          flagName: 'werdna_defeated'
        }

        // Currently returns true as not implemented
        expect(TileConditionService.checkCondition(condition, state)).toBe(true)
      })
    })

    describe('unknown condition type', () => {
      it('returns true for unknown types (allows entry)', () => {
        const char = createTestCharacter({ id: 'hero-1' })
        const state = createTestGameState({
          roster: new Map([['hero-1', char]]),
          party: createPartyWithMembers(['hero-1'])
        })

        // Force an unknown type
        const condition = {
          type: 'unknown_type' as any
        }

        expect(TileConditionService.checkCondition(condition, state)).toBe(true)
      })
    })
  })

  describe('consumeConditionItem', () => {
    it('removes the item from the party member who has it', () => {
      const silverKey = createItem('silver_key', 'Silver Key')
      const char = createTestCharacter({
        id: 'hero-1',
        name: 'Dirk',
        inventory: [silverKey]
      })

      const state = createTestGameState({
        roster: new Map([['hero-1', char]]),
        party: createPartyWithMembers(['hero-1'])
      })

      const condition: TileCondition = {
        type: 'has_item',
        itemId: 'silver_key'
      }

      const newState = TileConditionService.consumeConditionItem(condition, state)

      // Item should be removed from inventory
      const updatedChar = newState.roster.get('hero-1')!
      expect(updatedChar.inventory).toHaveLength(0)
      expect(updatedChar.inventory.find(i => i.id === 'silver_key')).toBeUndefined()
    })

    it('removes item from first party member who has it (not all)', () => {
      const silverKey = createItem('silver_key', 'Silver Key')
      const char1 = createTestCharacter({
        id: 'hero-1',
        name: 'Dirk',
        inventory: [silverKey]
      })
      const char2 = createTestCharacter({
        id: 'hero-2',
        name: 'Michael',
        inventory: [{ ...silverKey }]  // Also has the key
      })

      const state = createTestGameState({
        roster: new Map([
          ['hero-1', char1],
          ['hero-2', char2]
        ]),
        party: createPartyWithMembers(['hero-1', 'hero-2'])
      })

      const condition: TileCondition = {
        type: 'has_item',
        itemId: 'silver_key'
      }

      const newState = TileConditionService.consumeConditionItem(condition, state)

      // First party member should have item removed
      const updatedChar1 = newState.roster.get('hero-1')!
      expect(updatedChar1.inventory).toHaveLength(0)

      // Second party member should still have the item
      const updatedChar2 = newState.roster.get('hero-2')!
      expect(updatedChar2.inventory).toHaveLength(1)
      expect(updatedChar2.inventory[0].id).toBe('silver_key')
    })

    it('returns state unchanged for non-has_item conditions', () => {
      const char = createTestCharacter({
        id: 'hero-1',
        inventory: []
      })

      const state = createTestGameState({
        roster: new Map([['hero-1', char]]),
        party: createPartyWithMembers(['hero-1'])
      })

      const condition: TileCondition = {
        type: 'has_spell',
        spellId: 'malor'
      }

      const newState = TileConditionService.consumeConditionItem(condition, state)

      // State should be unchanged
      expect(newState).toBe(state)
    })

    it('returns state unchanged when itemId is missing', () => {
      const char = createTestCharacter({
        id: 'hero-1',
        inventory: []
      })

      const state = createTestGameState({
        roster: new Map([['hero-1', char]]),
        party: createPartyWithMembers(['hero-1'])
      })

      const condition: TileCondition = {
        type: 'has_item'
        // itemId intentionally missing
      }

      const newState = TileConditionService.consumeConditionItem(condition, state)

      // State should be unchanged
      expect(newState).toBe(state)
    })

    it('returns state unchanged when item not found (defensive check)', () => {
      const char = createTestCharacter({
        id: 'hero-1',
        inventory: []  // No items
      })

      const state = createTestGameState({
        roster: new Map([['hero-1', char]]),
        party: createPartyWithMembers(['hero-1'])
      })

      const condition: TileCondition = {
        type: 'has_item',
        itemId: 'silver_key'
      }

      const newState = TileConditionService.consumeConditionItem(condition, state)

      // State should be unchanged (item not found)
      expect(newState).toBe(state)
    })
  })
})
