import { Character } from '../types/Character';
import { Item } from '../types/Item';
import { ItemSlot } from '../types/ItemType';
import { ItemDataService } from './ItemDataService';
import { InventoryService } from './InventoryService';

/**
 * EquipmentService - Equipment management and validation
 * Pure functions following docs/services/EquipmentService.md
 */
export class EquipmentService {
  /**
   * Validate if character can equip item
   */
  static canEquipItem(
    character: Character,
    item: Item
  ): { allowed: boolean; reason?: string } {
    // Must be identified
    if (!item.identified) {
      return { allowed: false, reason: 'Item must be identified first' };
    }

    // Class restrictions
    if (item.classRestrictions?.length) {
      if (!item.classRestrictions.includes(character.class)) {
        return {
          allowed: false,
          reason: `${character.class} cannot use this item`
        };
      }
    }

    // Alignment restrictions
    if (item.alignmentRestrictions?.length) {
      if (!item.alignmentRestrictions.includes(character.alignment)) {
        return { allowed: false, reason: 'Alignment restriction' };
      }
    }

    return { allowed: true };
  }

  /**
   * Equip item from inventory to equipment slot
   */
  static equipItem(
    character: Character,
    itemId: string
  ): Character {
    // Check item in inventory
    if (!character.inventory.includes(itemId)) {
      throw new Error('Item not in inventory');
    }

    // Get item data
    const item = ItemDataService.getItem(itemId);
    if (!item) {
      throw new Error('Item not found in database');
    }

    // Validate can equip
    const validation = this.canEquipItem(character, item);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Cannot equip item');
    }

    // Determine slot
    const slotField = this.getSlotFieldName(item.slot);
    if (!slotField) {
      throw new Error('Invalid item slot');
    }

    // Start with character copy
    let updatedChar = { ...character };

    // If slot occupied, unequip existing item first
    const existingItemId = updatedChar[slotField];
    if (existingItemId) {
      updatedChar = {
        ...updatedChar,
        inventory: [...updatedChar.inventory, existingItemId as string],
        [slotField]: undefined
      };
    }

    // Equip new item
    updatedChar = {
      ...updatedChar,
      inventory: updatedChar.inventory.filter(id => id !== itemId),
      [slotField]: itemId
    };

    // Recalculate AC
    updatedChar.ac = this.calculateAC(updatedChar);

    return updatedChar;
  }

  /**
   * Get character field name for slot
   */
  private static getSlotFieldName(slot: ItemSlot): keyof Character | null {
    switch (slot) {
      case ItemSlot.WEAPON: return 'equippedWeapon';
      case ItemSlot.ARMOR: return 'equippedArmor';
      case ItemSlot.SHIELD: return 'equippedShield';
      case ItemSlot.HELMET: return 'equippedHelmet';
      case ItemSlot.GAUNTLETS: return 'equippedGauntlets';
      default: return null;
    }
  }

  /**
   * Calculate AC based on equipment
   * Formula: Base 10 - armor bonus - shield bonus - AGI modifier
   */
  static calculateAC(character: Character): number {
    let ac = 10; // Base AC

    // Equipment bonuses
    const slots: Array<keyof Character> = [
      'equippedArmor',
      'equippedShield',
      'equippedHelmet',
      'equippedGauntlets'
    ];

    for (const slotField of slots) {
      const itemId = character[slotField] as string | undefined;
      if (itemId) {
        const item = ItemDataService.getItem(itemId);
        if (item?.defense) {
          ac -= item.defense; // Lower is better
        }
      }
    }

    // AGI modifier
    const agiMod = Math.floor((character.agility - 10) / 2);
    ac -= agiMod;

    return Math.max(ac, -10); // Cap at -10
  }

  /**
   * Unequip item from slot to inventory
   */
  static unequipItem(
    character: Character,
    slot: ItemSlot
  ): Character {
    const slotField = this.getSlotFieldName(slot);
    if (!slotField) {
      throw new Error('Invalid slot');
    }

    const itemId = character[slotField] as string | undefined;
    if (!itemId) {
      throw new Error('No item in slot');
    }

    // Check if cursed
    const item = ItemDataService.getItem(itemId);
    if (item?.cursed) {
      throw new Error('Cannot unequip cursed item');
    }

    // Check inventory space
    if (!InventoryService.hasSpace(character)) {
      throw new Error('Inventory full');
    }

    // Move to inventory
    const updatedChar = {
      ...character,
      inventory: [...character.inventory, itemId],
      [slotField]: undefined
    };

    // Recalculate AC
    updatedChar.ac = this.calculateAC(updatedChar);

    return updatedChar;
  }
}
