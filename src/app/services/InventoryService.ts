import { Character } from '@models/Character'
import { Item } from '@models/Item'

const MAX_INVENTORY_SIZE = 8

/**
 * InventoryService - Manages character inventory
 *
 * Inventory stores full Item objects (not string IDs).
 * Each character owns their item instances with their own state
 * (identified, cursed, equipped flags).
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
   * Returns new Character with Item added to inventory.
   */
  static addItem(character: Character, item: Item): Character {
    if (!this.hasSpace(character)) {
      throw new Error('Inventory full')
    }

    // Create a fresh copy of the item for this character's inventory
    const itemCopy: Item = { ...item, equipped: false }

    return {
      ...character,
      inventory: [...character.inventory, itemCopy]
    }
  }

  /**
   * Remove item from character inventory by item ID.
   * Cannot remove equipped cursed items.
   * Returns new Character with item removed from inventory.
   */
  static removeItem(character: Character, itemId: string): Character {
    const item = character.inventory.find(i => i.id === itemId)
    if (!item) {
      throw new Error('Item not found')
    }

    // Check if item is equipped and cursed
    if (item.equipped && item.cursed) {
      throw new Error('Cannot remove equipped cursed item')
    }

    return {
      ...character,
      inventory: character.inventory.filter(i => i.id !== itemId)
    }
  }

  /**
   * Find an item in character's inventory by ID.
   */
  static findItem(character: Character, itemId: string): Item | undefined {
    return character.inventory.find(i => i.id === itemId)
  }

  /**
   * Check if character has an item in inventory.
   */
  static hasItem(character: Character, itemId: string): boolean {
    return character.inventory.some(i => i.id === itemId)
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

  /**
   * Transfer item between characters
   */
  static transferItem(
    fromCharacter: Character,
    toCharacter: Character,
    itemId: string
  ): { from: Character; to: Character } {
    const item = fromCharacter.inventory.find(i => i.id === itemId)
    if (!item) {
      throw new Error('Item not found in donor inventory')
    }

    if (!this.hasSpace(toCharacter)) {
      throw new Error('Recipient inventory full')
    }

    // Unequip item if it was equipped
    const transferredItem: Item = { ...item, equipped: false }

    const from = {
      ...fromCharacter,
      inventory: fromCharacter.inventory.filter(i => i.id !== itemId)
    }

    const to = {
      ...toCharacter,
      inventory: [...toCharacter.inventory, transferredItem]
    }

    return { from, to }
  }

  /**
   * Drop item from inventory (permanent removal)
   * Only removes the first occurrence if there are duplicates with the same ID
   */
  static dropItem(
    character: Character,
    itemId: string
  ): Character {
    const itemIndex = character.inventory.findIndex(i => i.id === itemId)
    if (itemIndex === -1) {
      throw new Error('Item not in inventory')
    }

    // Remove only the first occurrence (preserve other duplicates)
    const newInventory = [...character.inventory]
    newInventory.splice(itemIndex, 1)

    return {
      ...character,
      inventory: newInventory
    }
  }

  /**
   * Update an item in the character's inventory.
   * Used for changing item state (identified, cursed, equipped).
   */
  static updateItem(character: Character, itemId: string, updates: Partial<Item>): Character {
    const itemIndex = character.inventory.findIndex(i => i.id === itemId)
    if (itemIndex === -1) {
      throw new Error('Item not found')
    }

    const updatedInventory = [...character.inventory]
    updatedInventory[itemIndex] = { ...updatedInventory[itemIndex], ...updates }

    return {
      ...character,
      inventory: updatedInventory
    }
  }

  /**
   * Get inventory count
   */
  static getInventoryCount(character: Character): { current: number; max: number } {
    return {
      current: character.inventory.length,
      max: MAX_INVENTORY_SIZE
    }
  }

  /**
   * Check if any character in the party has an item.
   * Checks by item ID regardless of identified status.
   */
  static partyHasItem(roster: Map<string, Character>, memberIds: string[], itemId: string): boolean {
    return memberIds.some(id => {
      const char = roster.get(id)
      return char && this.hasItem(char, itemId)
    })
  }
}
