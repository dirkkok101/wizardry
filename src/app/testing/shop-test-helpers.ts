// src/test-helpers/shop-test-helpers.ts
import { GameState } from '@models/GameState'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'
import { ItemDataLoader } from '@services/ItemDataLoader'

// Test item IDs that can be used for testing unidentified/cursed flows
// These match actual items in the JSON data files
const TEST_UNIDENTIFIED_ITEM_IDS = [
  'long_sword_1',     // Long Sword +1 (enhanced weapon)
  'chain_1',          // Chain +1 (enhanced armor)
  'shield_1',         // Shield +1 (enhanced shield)
  'dagger_1'          // Dagger +1 (enhanced dagger)
]

// Create test unidentified items (not from data files)
const createTestUnidentifiedItems = (): Item[] => [
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
    equipped: false
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
    equipped: false
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
    equipped: false
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
    equipped: false
  }
]

/**
 * Test helper: Add unidentified items to a character for testing identify flow
 * Inventory stores full Item objects (not string IDs).
 */
export function addUnidentifiedItemsToCharacter(
  state: GameState,
  characterId: string,
  itemCount: number = 2
): GameState {
  const character = state.roster.get(characterId)
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }

  // Get test unidentified items (make copies to avoid mutation)
  const testItems = createTestUnidentifiedItems()
  const items: Item[] = testItems.slice(0, itemCount).map(item => ({
    ...item,
    equipped: false
  }))

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: [...character.inventory, ...items]
    })
  }
}

/**
 * Test helper: Give character identified version of an item
 * Adds the item as a full Item object to inventory with identified: true.
 */
export function identifyItemForCharacter(
  state: GameState,
  characterId: string,
  itemId: string
): GameState {
  const character = state.roster.get(characterId)
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }

  // Check if item already exists in inventory
  const existingItem = character.inventory.find(item => item.id === itemId)
  if (existingItem) {
    // Update existing item to be identified
    const updatedInventory = character.inventory.map(item =>
      item.id === itemId ? { ...item, identified: true } : item
    )
    return {
      ...state,
      roster: new Map(state.roster).set(characterId, {
        ...character,
        inventory: updatedInventory
      })
    }
  }

  // Item not in inventory - look it up from test items or ItemDataLoader
  const testItems = createTestUnidentifiedItems()
  let sourceItem = testItems.find(item => item.id === itemId)

  if (!sourceItem) {
    // Try to get from ItemDataLoader
    sourceItem = ItemDataLoader.getItem(itemId) ?? undefined
  }

  if (!sourceItem) {
    throw new Error(`Item ${itemId} not found`)
  }

  const identifiedItem: Item = { ...sourceItem, identified: true, equipped: false }

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: [...character.inventory, identifiedItem]
    })
  }
}
