import { Item } from '@models/Item'
import { GameState } from '@models/GameState'
import * as PartyService from './PartyService'
import { ItemDataLoader } from './ItemDataLoader'

/**
 * ShopService - Boltac's Trading Post business logic
 *
 * Features:
 * - Purchase price validation
 * - Sell price calculation (50% of purchase price)
 * - Identify service pricing (100 gold flat fee)
 * - Uncurse service pricing (half item price, per original Wizardry 1)
 * - Cursed item handling (cannot sell)
 */

// Uncurse pricing constants (original Wizardry 1 mechanics)
const SPECIAL_ITEM_UNCURSE_COST = 150000  // Flat rate for priceless/special items
const SPECIAL_ITEM_PRICE_THRESHOLD = 100000  // Items at or above this use flat rate

interface ShopResult {
  success: boolean
  error?: string
  state?: GameState
}

interface BuyResult extends ShopResult {}
interface SellResult extends ShopResult {}
interface IdentifyResult extends ShopResult {}
interface UncurseResult extends ShopResult {}

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
      inventory: character.inventory.filter((invItem: string | Item) => invItem !== item.id)
    }

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter)
    }

    return { success: true, state: newState }
  }

  /**
   * Calculate uncurse price for an item.
   * Original Wizardry 1: uncurse cost is half the item's price.
   * Special/priceless items use flat rate of 150,000 gold.
   */
  static calculateUncursePrice(item: Item): number {
    const itemPrice = item.price
    if (itemPrice === 0 || itemPrice >= SPECIAL_ITEM_PRICE_THRESHOLD) {
      return SPECIAL_ITEM_UNCURSE_COST
    }
    return Math.floor(itemPrice / 2)
  }

  /**
   * Identify an item in character inventory.
   * Reveals item properties and sets identified flag to true.
   *
   * @param state - Current game state
   * @param characterId - Character owning the item
   * @param itemId - ID of item to identify
   * @returns IdentifyResult with updated state or error
   */
  static identifyItem(state: GameState, characterId: string, itemId: string): IdentifyResult {
    const character = state.roster.get(characterId)
    if (!character) {
      return { success: false, error: 'Character not found' }
    }

    // Find item in inventory (handle both string IDs and Item objects)
    const itemIndex = character.inventory.findIndex((invItem: string | Item) => {
      if (typeof invItem === 'object' && 'id' in invItem) {
        return invItem.id === itemId
      }
      return invItem === itemId
    })

    if (itemIndex === -1) {
      return { success: false, error: 'Item not in inventory' }
    }

    const item = character.inventory[itemIndex]

    // Resolve item to Item object (may be string ID or already an object)
    let itemObj: Item | null = null
    if (typeof item === 'object') {
      itemObj = item as Item
    } else if (typeof item === 'string') {
      // Look up from ItemDataLoader
      if (ItemDataLoader.isLoaded()) {
        itemObj = ItemDataLoader.getItem(item)
      }
    }

    if (!itemObj) {
      return { success: false, error: 'Item data not found' }
    }

    if (itemObj.identified) {
      return { success: false, error: 'Item is already identified' }
    }

    const identifyCost = ShopService.calculateIdentifyPrice(itemObj)

    // Check party gold
    if (!PartyService.hasEnoughGold(state, identifyCost)) {
      return { success: false, error: 'Insufficient party gold' }
    }

    // Deduct from party gold
    let newState = PartyService.removePartyGold(state, identifyCost)

    // Update item to be identified (store as object with identified: true)
    const updatedInventory = [...character.inventory]
    updatedInventory[itemIndex] = { ...itemObj, identified: true }

    const updatedCharacter = {
      ...character,
      inventory: updatedInventory
    }

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter)
    }

    return { success: true, state: newState }
  }

  /**
   * Remove curse from an item in character inventory.
   * Allows the item to be unequipped and sold.
   *
   * @param state - Current game state
   * @param characterId - Character owning the item
   * @param itemId - ID of item to uncurse
   * @returns UncurseResult with updated state or error
   */
  static uncurseItem(state: GameState, characterId: string, itemId: string): UncurseResult {
    const character = state.roster.get(characterId)
    if (!character) {
      return { success: false, error: 'Character not found' }
    }

    // Find item in inventory (handle both string IDs and Item objects)
    const itemIndex = character.inventory.findIndex((invItem: string | Item) => {
      if (typeof invItem === 'object' && 'id' in invItem) {
        return invItem.id === itemId
      }
      return invItem === itemId
    })

    if (itemIndex === -1) {
      return { success: false, error: 'Item not in inventory' }
    }

    const item = character.inventory[itemIndex]

    // Resolve item to Item object (may be string ID or already an object)
    let itemObj: Item | null = null
    if (typeof item === 'object') {
      itemObj = item as Item
    } else if (typeof item === 'string') {
      // Look up from ItemDataLoader
      if (ItemDataLoader.isLoaded()) {
        itemObj = ItemDataLoader.getItem(item)
      }
    }

    if (!itemObj) {
      return { success: false, error: 'Item data not found' }
    }

    if (!itemObj.cursed) {
      return { success: false, error: 'Item is not cursed' }
    }

    const uncurseCost = ShopService.calculateUncursePrice(itemObj)

    // Check party gold
    if (!PartyService.hasEnoughGold(state, uncurseCost)) {
      return { success: false, error: 'Insufficient party gold' }
    }

    // Deduct from party gold
    let newState = PartyService.removePartyGold(state, uncurseCost)

    // Update item to remove curse
    const updatedInventory = [...character.inventory]
    updatedInventory[itemIndex] = { ...itemObj, cursed: false }

    const updatedCharacter = {
      ...character,
      inventory: updatedInventory
    }

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter)
    }

    return { success: true, state: newState }
  }
}
