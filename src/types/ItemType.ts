/**
 * ItemType - Categories of items
 */
export enum ItemType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  SHIELD = 'SHIELD',
  HELMET = 'HELMET',
  GAUNTLET = 'GAUNTLET',
  CONSUMABLE = 'CONSUMABLE',
  MISC = 'MISC'
}

/**
 * ItemSlot - Equipment slots for items
 * Uses item names (not body parts) for consistency with ItemType and Character fields
 */
export enum ItemSlot {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  SHIELD = 'SHIELD',
  HELMET = 'HELMET',  // Was HEAD
  GAUNTLETS = 'GAUNTLETS',  // Was HANDS
  NONE = 'NONE'
}
