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
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'
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
import { isAlive } from '@utils/CharacterStatusHelpers'

/**
 * Trap types available at each reward tier
 * Lower tiers have simpler traps, higher tiers can have any trap
 */
const TRAP_TYPES_BY_TIER: Record<RewardTier, TrapType[]> = {
  1: [TrapType.POISON_NEEDLE, TrapType.GAS_BOMB, TrapType.ALARM],
  2: [TrapType.POISON_NEEDLE, TrapType.GAS_BOMB, TrapType.CROSSBOW_BOLT, TrapType.ALARM],
  3: [TrapType.CROSSBOW_BOLT, TrapType.EXPLODING_BOX, TrapType.SPLINTERS, TrapType.BLADES, TrapType.STUNNER, TrapType.TELEPORTER],
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
    type: ItemType.MISC,
    slot: ItemSlot.NONE,
    price: rewardTier * 100 * RandomService.random(1, 5),
    cursed: false,
    identified: false,
    equipped: false
  }
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
 * Select the party member who will receive items from a chest
 *
 * This pre-selects the recipient using the same logic as distributeTreasure,
 * allowing inventory warnings to accurately show who will receive items.
 *
 * @param partyMembers Array of Character objects in the party
 * @returns Selected recipient, or null if no living members
 */
function selectRecipient(partyMembers: Character[]): Character | null {
  const livingMembers = partyMembers.filter(isAlive)
  if (livingMembers.length === 0) {
    return null
  }
  return RandomService.pickRandom(livingMembers)
}

/**
 * Check if recipient has enough inventory space for chest contents
 *
 * @param recipient The character who will receive items (from selectRecipient)
 * @param chest The chest being opened
 * @returns InventoryWarning if there's a risk of losing items, null otherwise
 */
function checkInventorySpace(recipient: Character, chest: Chest): InventoryWarning | null {
  const itemCount = chest.contents.items.length
  const freeSlots = MAX_INVENTORY_SIZE - recipient.inventory.length

  if (itemCount > freeSlots) {
    const itemsAtRisk = itemCount - freeSlots
    return {
      itemCount,
      freeSlots,
      itemsAtRisk,
      warning: `WARNING: ${recipient.name} has only ${freeSlots} free slot${freeSlots === 1 ? '' : 's'}. ` +
               `${itemsAtRisk} item${itemsAtRisk === 1 ? '' : 's'} will be LOST FOREVER!`
    }
  }

  return null
}

/**
 * Distribute treasure from an opened chest
 *
 * Original Wizardry 1 behavior:
 * - Gold goes to party pool
 * - Items go to a RANDOM LIVING party member (not the opener!)
 * - Items that don't fit are LOST forever
 *
 * @param chest The opened chest
 * @param partyMembers Array of Character objects in the party
 * @param preSelectedRecipient Optional pre-selected recipient (from selectRecipient)
 * @returns Distribution result with received items, lost items, and recipient info
 */
function distributeTreasure(
  chest: Chest,
  partyMembers: Character[],
  preSelectedRecipient?: Character
): TreasureDistributionResult {
  // Use pre-selected recipient if provided, otherwise select randomly
  let recipient: Character | null = preSelectedRecipient ?? null

  if (!recipient) {
    // Find living party members who can receive items
    const livingMembers = partyMembers.filter(isAlive)

    // If no living members, all items are lost
    if (livingMembers.length === 0) {
      return {
        goldAdded: chest.contents.gold,
        itemsReceived: [],
        itemsLost: [...chest.contents.items],
        recipientId: '',
        recipientName: 'No one'
      }
    }

    // Select random living member as recipient (original Wizardry behavior)
    recipient = RandomService.pickRandom(livingMembers)
  }

  const result: TreasureDistributionResult = {
    goldAdded: chest.contents.gold,
    itemsReceived: [],
    itemsLost: [],
    recipientId: recipient.id,
    recipientName: recipient.name
  }

  // Gold always goes to party pool
  // Note: Actual gold update should happen in the caller/command layer
  // This service just calculates the distribution

  // Track current inventory count (including items we're adding)
  let currentInventoryCount = recipient.inventory.length

  // Distribute items to random recipient
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
  selectRecipient,
  checkInventorySpace,
  distributeTreasure,
  getDistributionMessage
}
