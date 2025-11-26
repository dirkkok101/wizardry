// src/test-helpers/shop-test-helpers.ts
import { GameState } from '@models/GameState'
import { Item } from '@models/Item'
import { UNIDENTIFIED_ITEMS } from '@config/shop-inventory'

/**
 * Test helper: Add unidentified items to a character for testing identify flow
 * Inventory stores full Item objects (not string IDs).
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

  // Get full Item objects for inventory (make copies to avoid mutation)
  const items: Item[] = UNIDENTIFIED_ITEMS.slice(0, itemCount).map(item => ({
    ...item,
    equipped: false
  }))

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: [...character.inventory, ...items]
    })
  }
}

/**
 * Test helper: Give character identified version of an item
 * Adds the item as a full Item object to inventory with identified: true.
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

  // Check if item already exists in inventory
  const existingItem = character.inventory.find(item => item.id === itemId)
  if (existingItem) {
    // Update existing item to be identified
    const updatedInventory = character.inventory.map(item =>
      item.id === itemId ? { ...item, identified: true } : item
    )
    return {
      ...state,
      roster: new Map(state.roster).set(characterId, {
        ...character,
        inventory: updatedInventory
      })
    }
  }

  // Item not in inventory - look it up from UNIDENTIFIED_ITEMS and add it
  const sourceItem = UNIDENTIFIED_ITEMS.find(item => item.id === itemId)
  if (!sourceItem) {
    throw new Error(`Item ${itemId} not found in UNIDENTIFIED_ITEMS`)
  }

  const identifiedItem: Item = { ...sourceItem, identified: true, equipped: false }

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: [...character.inventory, identifiedItem]
    })
  }
}
