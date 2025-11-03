import { Item } from '../types/Item'
import { GameState } from '../types/GameState'
import * as PartyService from './PartyService'

/**
 * ShopService - Boltac's Trading Post business logic
 *
 * Features:
 * - Purchase price validation
 * - Sell price calculation (50% of purchase price)
 * - Identify service pricing (100 gold flat fee)
 * - Cursed item handling (cannot sell)
 */

interface BuyResult {
  success: boolean
  error?: string
  state?: GameState
}

interface SellResult {
  success: boolean
  error?: string
  state?: GameState
}

export class ShopService {
  /**
   * Calculate sell price for an item.
   * Returns 50% of purchase price (floored).
   * Cursed items cannot be sold (return 0).
   */
  static calculateSellPrice(item: Item): number {
    if (item.cursed) {
      return 0
    }
    return Math.floor(item.price * 0.5)
  }

  /**
   * Check if party can afford an item.
   * @param partyGold - Current party gold amount
   * @param item - Item to purchase
   */
  static canAfford(partyGold: number, item: Item): boolean {
    return partyGold >= item.price
  }

  /**
   * Calculate identification price (flat 100 gold).
   */
  static calculateIdentifyPrice(_item: Item): number {
    return 100
  }

  /**
   * Buy an item from the shop.
   * Deducts gold from party and adds item to character inventory.
   *
   * @param state - Current game state
   * @param characterId - Character purchasing the item
   * @param item - Item to purchase
   * @returns BuyResult with updated state or error
   */
  static buyItem(state: GameState, characterId: string, item: Item): BuyResult {
    const character = state.roster.get(characterId)
    if (!character) {
      return { success: false, error: 'Character not found' }
    }

    // Check party gold
    if (!PartyService.hasEnoughGold(state, item.price)) {
      return { success: false, error: 'Insufficient party gold' }
    }

    // Check inventory space (max 8 items)
    if (character.inventory.length >= 8) {
      return { success: false, error: 'Inventory full (max 8 items)' }
    }

    // Deduct from party gold
    let newState = PartyService.removePartyGold(state, item.price)

    // Add item to character inventory
    const updatedCharacter = {
      ...character,
      inventory: [...character.inventory, item.id]
    }

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter)
    }

    return { success: true, state: newState }
  }

  /**
   * Sell an item to the shop.
   * Adds gold to party (50% of purchase price) and removes item from character inventory.
   *
   * @param state - Current game state
   * @param characterId - Character selling the item
   * @param item - Item to sell
   * @returns SellResult with updated state or error
   */
  static sellItem(state: GameState, characterId: string, item: Item): SellResult {
    const character = state.roster.get(characterId)
    if (!character) {
      return { success: false, error: 'Character not found' }
    }

    // Check if item is in inventory
    if (!character.inventory.includes(item.id)) {
      return { success: false, error: 'Item not in inventory' }
    }

    // Cannot sell cursed equipped items
    if (item.cursed && item.equipped) {
      return { success: false, error: 'Cannot sell cursed equipped item' }
    }

    // Calculate sell price (50% of purchase price)
    const sellPrice = ShopService.calculateSellPrice(item)

    // Add gold to party
    let newState = PartyService.addPartyGold(state, sellPrice)

    // Remove item from character inventory
    const updatedCharacter = {
      ...character,
      inventory: character.inventory.filter(invItem => invItem !== item.id)
    }

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter)
    }

    return { success: true, state: newState }
  }
}
