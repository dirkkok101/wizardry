// src/test-helpers/shop-test-helpers.ts
import { GameState } from '../types/GameState'
import { Character } from '../types/Character'
import { Item } from '../types/Item'
import { UNIDENTIFIED_ITEMS } from '../data/shop-inventory'

/**
 * Test helper: Add unidentified items to a character for testing identify flow
 */
export function addUnidentifiedItemsToCharacter(
  state: GameState,
  characterId: string,
  itemCount: number = 2
): GameState {
  const character = state.roster.get(characterId)
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }

  // Get item IDs, not full Item objects (inventory stores IDs)
  const itemIds = UNIDENTIFIED_ITEMS.slice(0, itemCount).map(item => item.id)

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: [...character.inventory, ...itemIds]
    })
  }
}

/**
 * Test helper: Give character identified version of an item
 * Note: This doesn't actually identify the item in the global items registry.
 * It only adds the item ID to inventory (identification is handled by ShopService).
 */
export function identifyItemForCharacter(
  state: GameState,
  characterId: string,
  itemId: string
): GameState {
  const character = state.roster.get(characterId)
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }

  // Just ensure the item is in the inventory
  // Actual identification logic is handled by the ShopService
  if (!character.inventory.includes(itemId)) {
    return {
      ...state,
      roster: new Map(state.roster).set(characterId, {
        ...character,
        inventory: [...character.inventory, itemId]
      })
    }
  }

  return state
}
