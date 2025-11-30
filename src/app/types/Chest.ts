import { TrapType } from './Trap'
import { Item } from './Item'
import { Position } from './Dungeon'

/**
 * How the chest was discovered
 */
export type ChestSource =
  | 'combat_victory'   // Dropped after defeating monsters
  | 'exploration'      // Found while searching
  | 'fixed_location'   // Pre-placed at specific dungeon location
  | 'boss'             // Special boss encounter chest

/**
 * Treasure reward tier (1-5)
 * Affects trap probability, gold amounts, and item quality
 */
export type RewardTier = 1 | 2 | 3 | 4 | 5

/**
 * Contents of a treasure chest
 */
export interface TreasureContents {
  gold: number         // Always present
  items: Item[]        // 0-2 items typically
}

/**
 * Treasure chest data structure
 */
export interface Chest {
  id: string
  trapped: boolean
  trapType: TrapType | null
  trapIdentified: boolean
  trapDisarmed: boolean
  rewardTier: RewardTier
  contents: TreasureContents
  sourcePosition: Position  // Where in dungeon the chest was found
  mazeLevel: number         // Dungeon level (affects disarm difficulty)
  source: ChestSource
}

/**
 * Result of distributing treasure from a chest
 * Original Wizardry: items go to random living party member, not opener
 */
export interface TreasureDistributionResult {
  goldAdded: number
  itemsReceived: Item[]
  itemsLost: Item[]         // Items lost due to full inventory
  recipientId: string       // ID of character who received items
  recipientName: string     // Name for display
}

/**
 * Warning when opener's inventory may not fit all items
 */
export interface InventoryWarning {
  itemCount: number         // Items in chest
  freeSlots: number         // Available inventory slots
  itemsAtRisk: number       // Items that will be lost
  warning: string           // Human-readable warning message
}

/**
 * Trap probability by reward tier
 */
export const TRAP_PROBABILITY_BY_TIER: Record<RewardTier, number> = {
  1: 0.5,   // 50% trapped
  2: 0.6,   // 60% trapped
  3: 0.7,   // 70% trapped
  4: 0.8,   // 80% trapped
  5: 0.9    // 90% trapped
}

/**
 * Gold ranges by reward tier
 */
export const GOLD_RANGE_BY_TIER: Record<RewardTier, { min: number; max: number }> = {
  1: { min: 10, max: 100 },
  2: { min: 50, max: 300 },
  3: { min: 100, max: 600 },
  4: { min: 300, max: 1500 },
  5: { min: 500, max: 5000 }
}

/**
 * Item drop chance by reward tier (for first and second item slots)
 */
export const ITEM_CHANCE_BY_TIER: Record<RewardTier, { first: number; second: number }> = {
  1: { first: 0.28, second: 0.14 },
  2: { first: 0.46, second: 0.23 },
  3: { first: 0.64, second: 0.32 },
  4: { first: 0.82, second: 0.41 },
  5: { first: 1.00, second: 0.50 }  // Tier 5 always has at least 1 item
}

/**
 * Maximum inventory size for a character
 */
export const MAX_INVENTORY_SIZE = 8
