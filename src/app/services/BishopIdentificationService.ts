import { Character } from '@models/Character'
import { Item } from '@models/Item'
import { CharacterClass } from '@models/CharacterClass'
import { RandomService } from './RandomService'

/**
 * Result of identification attempt
 */
export interface IdentificationResult {
  success: boolean
  message: string
  updatedCharacter?: Character
  isCursed?: boolean
}

/**
 * BishopIdentificationService - Handles Bishop's special item identification ability
 *
 * Based on Wizardry 1 reference document Section 9:
 * - Only Bishops can identify items for free (shop charges gold)
 * - Success chance based on IQ stat
 * - Higher-value items are harder to identify
 * - Failed attempts don't reveal the item
 *
 * Formula: Success% = 50 + (IQ × 3) - (ItemCost / 100)
 * - Base 50% chance
 * - +3% per point of IQ (10 IQ = +30%, so 80% base)
 * - -1% per 100 gold item value (expensive items are harder)
 * - Minimum 5% success chance
 * - Maximum 95% success chance
 */
export class BishopIdentificationService {
  /**
   * Check if character can attempt identification
   */
  static canIdentify(character: Character): { canIdentify: boolean; reason?: string } {
    if (character.class !== CharacterClass.BISHOP) {
      return { canIdentify: false, reason: 'Only Bishops can identify items' }
    }

    // Character must be alive and conscious
    if (character.status === 'DEAD' || character.status === 'ASHES') {
      return { canIdentify: false, reason: 'Character is dead' }
    }

    if (character.hp <= 0) {
      return { canIdentify: false, reason: 'Character is unconscious' }
    }

    return { canIdentify: true }
  }

  /**
   * Calculate identification success chance
   *
   * @param bishop - The Bishop attempting identification
   * @param item - The item to identify
   * @returns Success percentage (5-95%)
   */
  static calculateSuccessChance(bishop: Character, item: Item): number {
    const iq = bishop.intelligence

    // Get item cost (use price or cost field)
    const itemCost = item.price ?? item.cost ?? 0

    // Formula: 50 + (IQ × 3) - (ItemCost / 100)
    let chance = 50 + (iq * 3) - Math.floor(itemCost / 100)

    // Level bonus: +1% per Bishop level
    chance += bishop.level

    // Clamp to 5-95% range
    return Math.max(5, Math.min(95, chance))
  }

  /**
   * Attempt to identify an item
   *
   * @param character - The Bishop attempting identification
   * @param itemId - ID of the item in inventory to identify
   * @returns Result of identification attempt
   */
  static attemptIdentification(character: Character, itemId: string): IdentificationResult {
    // Validate character can identify
    const canIdentifyCheck = this.canIdentify(character)
    if (!canIdentifyCheck.canIdentify) {
      return {
        success: false,
        message: canIdentifyCheck.reason || 'Cannot identify items'
      }
    }

    // Find item in inventory
    const itemIndex = character.inventory.findIndex(i => i.id === itemId)
    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Item not in inventory'
      }
    }

    const item = character.inventory[itemIndex]

    // Check if already identified
    if (item.identified) {
      return {
        success: false,
        message: `${item.name} is already identified`
      }
    }

    // Calculate and roll success chance
    const successChance = this.calculateSuccessChance(character, item)
    const roll = RandomService.random(1, 100)
    const succeeded = roll <= successChance

    if (!succeeded) {
      return {
        success: false,
        message: `${character.name} cannot discern this item's true nature... (${successChance}% chance)`
      }
    }

    // Success - identify the item
    const identifiedItem: Item = { ...item, identified: true }
    const updatedInventory = [...character.inventory]
    updatedInventory[itemIndex] = identifiedItem

    const updatedCharacter: Character = {
      ...character,
      inventory: updatedInventory
    }

    // Build success message
    let message = `${character.name} identifies: ${item.name}`
    if (item.cursed) {
      message += ` - IT'S CURSED!`
    }

    return {
      success: true,
      message,
      updatedCharacter,
      isCursed: item.cursed
    }
  }

  /**
   * Get all unidentified items in character's inventory
   */
  static getUnidentifiedItems(character: Character): Item[] {
    return character.inventory.filter(item => !item.identified)
  }

  /**
   * Check if character has any unidentified items
   */
  static hasUnidentifiedItems(character: Character): boolean {
    return character.inventory.some(item => !item.identified)
  }

  /**
   * Get identification difficulty description
   */
  static getDifficultyDescription(successChance: number): string {
    if (successChance >= 90) return 'Trivial'
    if (successChance >= 75) return 'Easy'
    if (successChance >= 50) return 'Moderate'
    if (successChance >= 25) return 'Difficult'
    if (successChance >= 10) return 'Very Hard'
    return 'Nearly Impossible'
  }

  /**
   * Calculate expected cost to identify at shop vs Bishop attempts
   *
   * Helps players decide whether to pay shop or risk Bishop identification
   *
   * @param bishop - The Bishop
   * @param item - The item to identify
   * @param shopCost - Gold cost at shop
   * @returns Expected number of attempts needed
   */
  static getExpectedAttempts(bishop: Character, item: Item): number {
    const successChance = this.calculateSuccessChance(bishop, item)
    // Expected attempts = 1 / probability
    return Math.ceil(100 / successChance)
  }
}
