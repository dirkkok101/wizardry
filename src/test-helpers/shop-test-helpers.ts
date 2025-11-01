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

  const itemsToAdd = UNIDENTIFIED_ITEMS.slice(0, itemCount)

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: [...character.inventory, ...itemsToAdd]
    })
  }
}

/**
 * Test helper: Give character identified version of an item
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

  const updatedInventory = character.inventory.map(item =>
    (typeof item === 'object' && item.id === itemId) ? { ...item, identified: true } : item
  )

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: updatedInventory
    })
  }
}
