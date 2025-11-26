import { Character } from '@models/Character';
import { Item } from '@models/Item';
import { ItemSlot } from '@models/ItemType';
import { InventoryService } from './InventoryService';

/**
 * EquipmentService - Equipment management and validation
 * Pure functions following docs/services/EquipmentService.md
 *
 * Note: Equipment slots now store full Item objects (equippedWeapon, equippedArmor, etc.)
 * along with inventory. When equipping, the item is moved from inventory to slot.
 * When unequipping, the item is moved from slot back to inventory.
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
    // Find item in inventory (now Item[])
    const item = character.inventory.find(i => i.id === itemId);
    if (!item) {
      throw new Error('Item not in inventory');
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

    // If slot occupied, unequip existing item first (return to inventory)
    const existingItem = updatedChar[slotField] as Item | undefined;
    if (existingItem) {
      // Move existing item back to inventory
      const unequippedItem: Item = { ...existingItem, equipped: false };
      updatedChar = {
        ...updatedChar,
        inventory: [...updatedChar.inventory, unequippedItem],
        [slotField]: undefined
      };
    }

    // Mark item as equipped
    const equippedItem: Item = { ...item, equipped: true };

    // Equip new item (remove from inventory, set in slot with full Item object)
    updatedChar = {
      ...updatedChar,
      inventory: updatedChar.inventory.filter(i => i.id !== itemId),
      [slotField]: equippedItem
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

    // Equipment bonuses - directly access Item objects from slots
    const equippedItems: (Item | undefined)[] = [
      character.equippedArmor,
      character.equippedShield,
      character.equippedHelmet,
      character.equippedGauntlets
    ];

    for (const item of equippedItems) {
      if (item?.defense) {
        ac -= item.defense; // Lower is better
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

    const item = character[slotField] as Item | undefined;
    if (!item) {
      throw new Error('No item in slot');
    }

    // Check if cursed
    if (item.cursed) {
      throw new Error('Cannot unequip cursed item');
    }

    // Check inventory space
    if (!InventoryService.hasSpace(character)) {
      throw new Error('Inventory full');
    }

    // Create unequipped item for inventory
    const unequippedItem: Item = { ...item, equipped: false };

    // Move to inventory
    const updatedChar = {
      ...character,
      inventory: [...character.inventory, unequippedItem],
      [slotField]: undefined
    };

    // Recalculate AC
    updatedChar.ac = this.calculateAC(updatedChar);

    return updatedChar;
  }

  /**
   * Get equipped item from a slot
   */
  static getEquippedItem(character: Character, slot: ItemSlot): Item | null {
    const slotField = this.getSlotFieldName(slot);
    if (!slotField) {
      return null;
    }

    return (character[slotField] as Item | undefined) ?? null;
  }
}
