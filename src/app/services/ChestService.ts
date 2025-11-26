/**
 * ChestService - Pure function service for chest generation and treasure distribution
 *
 * Handles:
 * - Chest generation with appropriate traps based on reward tier
 * - Treasure content generation (gold + items)
 * - Treasure distribution to party (gold to pool, items to opener)
 * - Inventory space warnings
 */

import { Character } from '@models/Character'
import { Party } from '@models/GameState'
import { Item } from '@models/Item'
import { Position } from '@models/Dungeon'
import {
  Chest,
  ChestSource,
  RewardTier,
  TreasureContents,
  TreasureDistributionResult,
  InventoryWarning,
  TRAP_PROBABILITY_BY_TIER,
  GOLD_RANGE_BY_TIER,
  ITEM_CHANCE_BY_TIER,
  MAX_INVENTORY_SIZE
} from '@models/Chest'
import { TrapType } from '@models/Trap'
import { RandomService } from './RandomService'

/**
 * Trap types available at each reward tier
 * Lower tiers have simpler traps, higher tiers can have any trap
 */
const TRAP_TYPES_BY_TIER: Record<RewardTier, TrapType[]> = {
  1: [TrapType.POISON_NEEDLE, TrapType.GAS_BOMB, TrapType.ALARM],
  2: [TrapType.POISON_NEEDLE, TrapType.GAS_BOMB, TrapType.CROSSBOW_BOLT, TrapType.ALARM],
  3: [TrapType.CROSSBOW_BOLT, TrapType.EXPLODING_BOX, TrapType.STUNNER, TrapType.TELEPORTER],
  4: [TrapType.EXPLODING_BOX, TrapType.TELEPORTER, TrapType.MAGE_BLASTER, TrapType.PRIEST_BLASTER],
  5: [TrapType.TELEPORTER, TrapType.MAGE_BLASTER, TrapType.PRIEST_BLASTER, TrapType.ALARM]
}

/**
 * Generate a unique chest ID
 */
function generateChestId(): string {
  return `chest_${Date.now()}_${RandomService.random(1000, 9999)}`
}

/**
 * Select a trap type appropriate for the reward tier
 */
function selectTrapType(rewardTier: RewardTier): TrapType {
  const availableTraps = TRAP_TYPES_BY_TIER[rewardTier]
  return RandomService.pickRandom(availableTraps)
}

/**
 * Generate gold amount based on reward tier
 */
function generateGold(rewardTier: RewardTier): number {
  const range = GOLD_RANGE_BY_TIER[rewardTier]
  return RandomService.random(range.min, range.max)
}

/**
 * Generate items for a chest (placeholder - actual items would come from item tables)
 * In full implementation, this would use ItemService to select appropriate items
 */
function generateItems(rewardTier: RewardTier, mazeLevel: number): Item[] {
  const items: Item[] = []
  const chances = ITEM_CHANCE_BY_TIER[rewardTier]

  // First item slot
  if (RandomService.roll(chances.first)) {
    // Placeholder - in real implementation, would select from item tables
    // based on rewardTier and mazeLevel
    items.push(createPlaceholderItem(rewardTier, mazeLevel, 1))
  }

  // Second item slot
  if (RandomService.roll(chances.second)) {
    items.push(createPlaceholderItem(rewardTier, mazeLevel, 2))
  }

  return items
}

/**
 * Create a placeholder item (to be replaced with real item generation)
 */
function createPlaceholderItem(rewardTier: RewardTier, mazeLevel: number, slot: number): Item {
  // This is a placeholder - real implementation would query item tables
  return {
    id: `item_${rewardTier}_${mazeLevel}_${slot}_${RandomService.random(1000, 9999)}`,
    name: `Treasure Item (Tier ${rewardTier})`,
    type: 'EQUIPMENT',
    slot: 'NONE',
    price: rewardTier * 100 * RandomService.random(1, 5)
  } as Item
}

/**
 * Generate a treasure chest
 *
 * @param rewardTier Quality tier (1-5) affecting trap chance and loot
 * @param mazeLevel Dungeon level (affects disarm difficulty)
 * @param position Where the chest was found
 * @param source How the chest was discovered
 * @returns Fully configured Chest object
 */
function generateChest(
  rewardTier: RewardTier,
  mazeLevel: number,
  position: Position,
  source: ChestSource
): Chest {
  // Determine if trapped
  const trapProbability = TRAP_PROBABILITY_BY_TIER[rewardTier]
  const trapped = RandomService.roll(trapProbability)

  // Generate contents
  const contents: TreasureContents = {
    gold: generateGold(rewardTier),
    items: generateItems(rewardTier, mazeLevel)
  }

  return {
    id: generateChestId(),
    trapped,
    trapType: trapped ? selectTrapType(rewardTier) : null,
    trapIdentified: false,
    trapDisarmed: false,
    rewardTier,
    contents,
    sourcePosition: position,
    mazeLevel,
    source
  }
}

/**
 * Generate a chest for a combat victory
 * Reward tier is based on monster difficulty
 */
function generateCombatChest(
  monsterLevel: number,
  mazeLevel: number,
  position: Position
): Chest {
  // Map monster level to reward tier (simplified)
  const rewardTier = Math.min(5, Math.max(1, Math.ceil(monsterLevel / 3))) as RewardTier
  return generateChest(rewardTier, mazeLevel, position, 'combat_victory')
}

/**
 * Generate a boss chest (always high tier, always trapped)
 */
function generateBossChest(
  mazeLevel: number,
  position: Position
): Chest {
  const chest = generateChest(5, mazeLevel, position, 'boss')
  // Boss chests are always trapped
  if (!chest.trapped) {
    chest.trapped = true
    chest.trapType = RandomService.pickRandom([
      TrapType.TELEPORTER,
      TrapType.MAGE_BLASTER,
      TrapType.PRIEST_BLASTER
    ])
  }
  return chest
}

/**
 * Check if opener has enough inventory space for chest contents
 *
 * @returns InventoryWarning if there's a risk of losing items, null otherwise
 */
function checkInventorySpace(opener: Character, chest: Chest): InventoryWarning | null {
  const itemCount = chest.contents.items.length
  const freeSlots = MAX_INVENTORY_SIZE - opener.inventory.length

  if (itemCount > freeSlots) {
    const itemsAtRisk = itemCount - freeSlots
    return {
      itemCount,
      freeSlots,
      itemsAtRisk,
      warning: `WARNING: ${opener.name} has only ${freeSlots} free slot${freeSlots === 1 ? '' : 's'}. ` +
               `${itemsAtRisk} item${itemsAtRisk === 1 ? '' : 's'} will be LOST FOREVER!`
    }
  }

  return null
}

/**
 * Distribute treasure from an opened chest
 *
 * Gold goes to party pool, items go to opener's inventory.
 * Items that don't fit are LOST (original Wizardry behavior).
 *
 * @param chest The opened chest
 * @param opener Character who opened the chest
 * @param party The party (for gold pool)
 * @returns Distribution result with received and lost items
 */
function distributeTreasure(
  chest: Chest,
  opener: Character,
  party: Party
): TreasureDistributionResult {
  const result: TreasureDistributionResult = {
    goldAdded: chest.contents.gold,
    itemsReceived: [],
    itemsLost: []
  }

  // Gold always goes to party pool
  // Note: Actual gold update should happen in the caller/command layer
  // This service just calculates the distribution

  // Track current inventory count (including items we're adding)
  let currentInventoryCount = opener.inventory.length

  // Distribute items to opener
  for (const item of chest.contents.items) {
    if (currentInventoryCount < MAX_INVENTORY_SIZE) {
      result.itemsReceived.push(item)
      currentInventoryCount++
    } else {
      // CRITICAL: Item is lost forever
      result.itemsLost.push(item)
    }
  }

  return result
}

/**
 * Get a summary message for treasure distribution
 */
function getDistributionMessage(result: TreasureDistributionResult): string {
  const messages: string[] = []

  if (result.goldAdded > 0) {
    messages.push(`Found ${result.goldAdded} gold!`)
  }

  if (result.itemsReceived.length > 0) {
    const itemNames = result.itemsReceived.map(i => i.name).join(', ')
    messages.push(`Obtained: ${itemNames}`)
  }

  if (result.itemsLost.length > 0) {
    const lostNames = result.itemsLost.map(i => i.name).join(', ')
    messages.push(`LOST (inventory full): ${lostNames}`)
  }

  return messages.join(' ')
}

/**
 * Create an empty (safe) chest for testing or special cases
 */
function createEmptyChest(mazeLevel: number, position: Position): Chest {
  return {
    id: generateChestId(),
    trapped: false,
    trapType: null,
    trapIdentified: true,
    trapDisarmed: false,
    rewardTier: 1,
    contents: { gold: 0, items: [] },
    sourcePosition: position,
    mazeLevel,
    source: 'fixed_location'
  }
}

/**
 * Create a chest with specific contents (for testing or scripted events)
 */
function createChestWithContents(
  contents: TreasureContents,
  trapType: TrapType | null,
  mazeLevel: number,
  position: Position
): Chest {
  return {
    id: generateChestId(),
    trapped: trapType !== null,
    trapType,
    trapIdentified: false,
    trapDisarmed: false,
    rewardTier: 3,  // Default to mid-tier
    contents,
    sourcePosition: position,
    mazeLevel,
    source: 'fixed_location'
  }
}

export const ChestService = {
  // Generation
  generateChest,
  generateCombatChest,
  generateBossChest,
  createEmptyChest,
  createChestWithContents,

  // Content generation (internal, exposed for testing)
  selectTrapType,
  generateGold,
  generateItems,

  // Distribution
  checkInventorySpace,
  distributeTreasure,
  getDistributionMessage
}
