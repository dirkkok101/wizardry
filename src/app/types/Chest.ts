import { TrapId } from './Trap'
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
 * Treasure reward tier (Reward 2 values from Wizardry 1)
 *
 * Authentic Wizardry 1: Monsters have a Reward 2 value (10-19) that determines:
 * - Which trap pool to draw from
 * - Gold amounts and item quality
 *
 * Higher values = more dangerous traps, better rewards
 */
export type RewardTier = 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19

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
  trapId: TrapId | null
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
 * Trap probability by reward tier (Reward 2 values 10-19)
 * Higher Reward 2 = more likely to be trapped
 */
export const TRAP_PROBABILITY_BY_TIER: Record<RewardTier, number> = {
  10: 0.50,   // 50% trapped (lowest tier)
  11: 0.55,
  12: 0.60,
  13: 0.65,
  14: 0.70,
  15: 0.75,
  16: 0.80,
  17: 0.85,
  18: 0.90,
  19: 0.95    // 95% trapped (highest tier)
}

/**
 * Gold ranges by reward tier (Reward 2 values 10-19)
 * Scaled progression from minimal to generous rewards
 */
export const GOLD_RANGE_BY_TIER: Record<RewardTier, { min: number; max: number }> = {
  10: { min: 10, max: 100 },
  11: { min: 25, max: 150 },
  12: { min: 50, max: 250 },
  13: { min: 75, max: 400 },
  14: { min: 100, max: 600 },
  15: { min: 150, max: 900 },
  16: { min: 200, max: 1200 },
  17: { min: 300, max: 2000 },
  18: { min: 400, max: 3500 },
  19: { min: 500, max: 5000 }
}

/**
 * Item drop chance by reward tier (for first and second item slots)
 * Higher Reward 2 = better chance of items
 */
export const ITEM_CHANCE_BY_TIER: Record<RewardTier, { first: number; second: number }> = {
  10: { first: 0.20, second: 0.10 },
  11: { first: 0.28, second: 0.14 },
  12: { first: 0.36, second: 0.18 },
  13: { first: 0.44, second: 0.22 },
  14: { first: 0.52, second: 0.26 },
  15: { first: 0.60, second: 0.30 },
  16: { first: 0.70, second: 0.35 },
  17: { first: 0.80, second: 0.40 },
  18: { first: 0.90, second: 0.45 },
  19: { first: 1.00, second: 0.50 }  // Tier 19 always has at least 1 item
}

/**
 * Maximum inventory size for a character
 */
export const MAX_INVENTORY_SIZE = 8
