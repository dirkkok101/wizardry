import { Character } from '../types/Character'
import { Item } from '../types/Item'

/**
 * ShopService - Boltac's Trading Post business logic
 *
 * Features:
 * - Purchase price validation
 * - Sell price calculation (50% of purchase price)
 * - Identify service pricing (100 gold flat fee)
 * - Cursed item handling (cannot sell)
 */
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
   * Check if character can afford an item.
   */
  static canAfford(character: Character, item: Item): boolean {
    return (character.gold || 0) >= item.price
  }

  /**
   * Calculate identification price (flat 100 gold).
   */
  static calculateIdentifyPrice(_item: Item): number {
    return 100
  }
}
