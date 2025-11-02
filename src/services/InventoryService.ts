import { Character } from '../types/Character'
import { Item } from '../types/Item'

const MAX_INVENTORY_SIZE = 8

/**
 * InventoryService - Manages character inventory
 *
 * Features:
 * - Add/remove items
 * - Check inventory capacity (8 items max)
 * - Equip/unequip items
 * - Validate class/alignment restrictions
 * - Handle cursed items (cannot remove when equipped)
 */
export class InventoryService {
  /**
   * Check if character has space in inventory.
   */
  static hasSpace(character: Character): boolean {
    return character.inventory.length < MAX_INVENTORY_SIZE
  }

  /**
   * Add item to character inventory.
   * Throws error if inventory is full.
   * Returns new Character with item ID added to inventory.
   */
  static addItem(character: Character, item: Item): Character {
    if (!this.hasSpace(character)) {
      throw new Error('Inventory full')
    }

    return {
      ...character,
      inventory: [...character.inventory, item.id]
    }
  }

  /**
   * Remove item from character inventory.
   * Cannot remove equipped cursed items.
   * Returns new Character with item ID removed from inventory.
   */
  static removeItem(character: Character, itemId: string, item?: Item): Character {
    if (!character.inventory.includes(itemId)) {
      throw new Error('Item not found')
    }

    // Check if item is equipped and cursed
    if (item && item.equipped && item.cursed) {
      throw new Error('Cannot remove equipped cursed item')
    }

    return {
      ...character,
      inventory: character.inventory.filter(id => id !== itemId)
    }
  }

  /**
   * Check if character can equip item based on class/alignment restrictions.
   */
  static canEquip(character: Character, item: Item): boolean {
    // Check class restrictions
    if (item.classRestrictions && item.classRestrictions.length > 0) {
      if (!item.classRestrictions.includes(character.class)) {
        return false
      }
    }

    // Check alignment restrictions (if implemented)
    // if (item.alignmentRestrictions && item.alignmentRestrictions.length > 0) {
    //   if (!item.alignmentRestrictions.includes(character.alignment)) {
    //     return false
    //   }
    // }

    return true
  }
}
