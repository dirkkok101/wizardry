// src/data/shop-inventory.ts
import { Item } from '../types/Item'
import { ItemType, ItemSlot } from '../types/ItemType'
import { CharacterClass } from '../types/CharacterClass'

/**
 * Shop inventory - items available for purchase at Boltac's Trading Post
 */
export const SHOP_INVENTORY: Item[] = [
  {
    id: 'weapon-long-sword',
    name: 'Long Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 200,
    damage: 10,
    classRestrictions: [CharacterClass.FIGHTER, CharacterClass.LORD, CharacterClass.SAMURAI],
    cursed: false,
    identified: true,
    equipped: false,
    description: 'A well-balanced blade for warriors'
  },
  {
    id: 'armor-chain-mail',
    name: 'Chain Mail',
    type: ItemType.ARMOR,
    slot: ItemSlot.ARMOR,
    price: 300,
    defense: 4,
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Interlocking metal rings provide solid protection'
  },
  {
    id: 'weapon-staff',
    name: 'Staff',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 30,
    damage: 2,
    classRestrictions: [CharacterClass.MAGE, CharacterClass.PRIEST, CharacterClass.BISHOP],
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Simple wooden staff for spellcasters'
  },
  {
    id: 'armor-leather',
    name: 'Leather Armor',
    type: ItemType.ARMOR,
    slot: ItemSlot.ARMOR,
    price: 50,
    defense: 2,
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Light armor suitable for most adventurers'
  },
  {
    id: 'weapon-dagger',
    name: 'Dagger',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 20,
    damage: 3,
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Small blade, easily concealed'
  },
  {
    id: 'shield-wooden',
    name: 'Shield',
    type: ItemType.SHIELD,
    slot: ItemSlot.SHIELD,
    price: 100,
    defense: 1,
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Wooden shield for blocking attacks'
  }
]

/**
 * Unidentified items for testing identification mechanics
 * These are not for sale but can be found in character inventories
 */
export const UNIDENTIFIED_ITEMS: Item[] = [
  {
    id: 'unknown-sword-1',
    name: 'Sharpened Blade',
    unidentifiedName: 'Unknown Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 250,
    damage: 12,
    cursed: false,
    identified: false,
    equipped: false,
    description: 'A finely crafted sword with excellent balance'
  },
  {
    id: 'unknown-armor-1',
    name: 'Reinforced Mail',
    unidentifiedName: 'Unknown Armor',
    type: ItemType.ARMOR,
    slot: ItemSlot.ARMOR,
    price: 400,
    defense: 5,
    cursed: false,
    identified: false,
    equipped: false,
    description: 'Heavy armor with reinforced plating'
  },
  {
    id: 'cursed-sword-1',
    name: 'Blade of Despair',
    unidentifiedName: 'Mysterious Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 500,
    damage: 15,
    cursed: true,
    identified: false,
    equipped: false,
    description: 'A powerful but cursed weapon that cannot be removed once equipped'
  },
  {
    id: 'cursed-armor-1',
    name: 'Cursed Plate',
    unidentifiedName: 'Heavy Armor',
    type: ItemType.ARMOR,
    slot: ItemSlot.ARMOR,
    price: 600,
    defense: 8,
    cursed: true,
    identified: false,
    equipped: false,
    description: 'Excellent protection, but binds to the wearer permanently'
  }
]
