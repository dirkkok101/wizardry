/**
 * Shop inventory configuration - item IDs available for purchase at Boltac's Trading Post
 *
 * Items are loaded from JSON files via ItemDataLoader.
 * This file only defines WHICH items are available, not the items themselves.
 */

/**
 * Item IDs available for purchase in the shop
 * These must match IDs in /data/items/*.json files
 */
export const SHOP_ITEM_IDS: string[] = [
  // Weapons
  'long_sword',
  'short_sword',
  'dagger',
  'staff',

  // Armor
  'leather_armor',
  'chain_mail',
  'breast_plate',
  'plate_mail',
  'robes',

  // Shields
  'small_shield',
  'large_shield',

  // Helmets
  'helm',

  // Gloves
  'copper_gloves',

  // Potions
  'potion_dios',
  'potion_dial'
]
