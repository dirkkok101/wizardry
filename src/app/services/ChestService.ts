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
import { Position } from '@models/Dungeon'
import {
  Chest,
  ChestSource,
  RewardTier,
  TreasureContents,
  TreasureDistributionResult,
  InventoryWarning,
  TRAP_PROBABILITY_BY_TIER,
  MAX_INVENTORY_SIZE
} from '@models/Chest'
import { TrapId } from '@models/Trap'
import { RandomService } from './RandomService'
import { TreasureService } from './TreasureService'
import { isAlive } from '@utils/CharacterStatusHelpers'

/**
 * Generate a unique chest ID
 */
function generateChestId(): string {
  return `chest_${Date.now()}_${RandomService.random(1000, 9999)}`
}

/**
 * Authentic Wizardry 1 trap distribution (FROM SOURCE CODE):
 *
 * Base Distribution (when chest IS trapped):
 * - 33.3%: Poison Needle
 * - 33.3%: Gas Bomb
 * - 33.3%: Type3 trap → 20% each for:
 *   - Crossbow Bolt
 *   - Exploding Box
 *   - Splinters
 *   - Blades
 *   - Stunner
 *
 * High-tier rewards (14+) can substitute with dangerous traps:
 * - TELEPORTER (tier 14+)
 * - MAGE_BLASTER (tier 14+)
 * - PRIEST_BLASTER (tier 16+)
 * - ALARM (all tiers)
 */

// Type3 traps (20% each when Type3 is selected)
const TYPE3_TRAPS: TrapId[] = [
  'CROSSBOW_BOLT',
  'EXPLODING_BOX',
  'SPLINTERS',
  'BLADES',
  'STUNNER'
]

// High-tier trap substitutions with minimum tier requirements
const HIGH_TIER_TRAPS: Array<{ trapId: TrapId, minTier: RewardTier, weight: number }> = [
  { trapId: 'ALARM', minTier: 10, weight: 10 },           // Can appear at any tier
  { trapId: 'TELEPORTER', minTier: 14, weight: 15 },     // Mid-high tiers
  { trapId: 'MAGE_BLASTER', minTier: 14, weight: 10 },   // Mid-high tiers
  { trapId: 'PRIEST_BLASTER', minTier: 16, weight: 10 }  // High tiers only
]

/**
 * Select a trap type using authentic Wizardry 1 distribution
 *
 * @param rewardTier Reward tier (10-19) affects high-tier trap availability
 * @returns Selected trap ID
 */
async function selectTrapId(rewardTier: RewardTier): Promise<TrapId> {
  // For high-tier rewards, chance to get dangerous traps
  // Chance increases with tier: (tier - 10) * 5% = 0% at tier 10, 45% at tier 19
  const highTierChance = (rewardTier - 10) * 0.05

  if (RandomService.roll(highTierChance)) {
    // Select from high-tier traps available at this reward tier
    const availableHighTier = HIGH_TIER_TRAPS.filter(t => rewardTier >= t.minTier)
    if (availableHighTier.length > 0) {
      const totalWeight = availableHighTier.reduce((sum, t) => sum + t.weight, 0)
      let roll = RandomService.random(1, totalWeight)
      for (const trap of availableHighTier) {
        roll -= trap.weight
        if (roll <= 0) {
          return trap.trapId
        }
      }
    }
  }

  // Authentic base distribution: 33.3% each for Poison Needle, Gas Bomb, Type3
  // (The 25% "no trap" case is handled in generateChest, not here)
  const baseRoll = RandomService.random(1, 3)

  switch (baseRoll) {
    case 1:
      return 'POISON_NEEDLE'
    case 2:
      return 'GAS_BOMB'
    case 3:
    default:
      // Type3: 20% each for 5 traps
      return RandomService.pickRandom(TYPE3_TRAPS)
  }
}

/**
 * Generate a treasure chest using authentic Wizardry 1 treasure formulas
 *
 * Uses TreasureService for gold/item generation with authentic dice-based formulas:
 * - Gold: reward-type-specific dice rolls (e.g., 10d5×10 for type 14 = 100-500 gold)
 * - Items: tier-based percentage chances with real item lookups from JSON data
 *
 * @param rewardTier Quality tier (10-19) affecting trap chance and loot
 * @param mazeLevel Dungeon level (affects disarm difficulty)
 * @param position Where the chest was found
 * @param source How the chest was discovered
 * @returns Fully configured Chest object
 */
async function generateChest(
  rewardTier: RewardTier,
  mazeLevel: number,
  position: Position,
  source: ChestSource
): Promise<Chest> {
  // Use TreasureService for authentic treasure generation
  const treasureChest = TreasureService.generateChest(rewardTier)

  // Convert TreasureItem[] to Item[]
  const items: Item[] = treasureChest.items.map(ti => ti.item)

  const contents: TreasureContents = {
    gold: treasureChest.gold,
    items
  }

  // Determine if trapped (keep existing logic for authentic trap selection)
  const trapProbability = TRAP_PROBABILITY_BY_TIER[rewardTier]
  const trapped = RandomService.roll(trapProbability)

  return {
    id: generateChestId(),
    trapped,
    trapId: trapped ? await selectTrapId(rewardTier) : null,
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
 *
 * Authentic Wizardry 1: Each monster has a Reward 2 value (10-19)
 * that determines trap pool and treasure quality.
 *
 * For now, we map monster level to Reward 2 value:
 * - Level 1-2: Tier 10
 * - Level 3-4: Tier 11
 * - Level 5-6: Tier 12
 * ... and so on up to Tier 19 for highest level monsters
 *
 * @param monsterReward2 Monster's Reward 2 value (10-19), or monster level to convert
 * @param mazeLevel Current dungeon level
 * @param position Where the chest was found
 */
async function generateCombatChest(
  monsterReward2: number,
  mazeLevel: number,
  position: Position
): Promise<Chest> {
  // If passed a small number (monster level), convert to Reward 2 range
  // If passed a value in 10-19 range, use it directly
  let rewardTier: RewardTier
  if (monsterReward2 >= 10 && monsterReward2 <= 19) {
    rewardTier = monsterReward2 as RewardTier
  } else {
    // Map monster level to Reward 2 tier (10-19)
    // Level 1-2 = tier 10, Level 3-4 = tier 11, etc.
    const tier = Math.min(19, Math.max(10, 10 + Math.floor((monsterReward2 - 1) / 2)))
    rewardTier = tier as RewardTier
  }
  return generateChest(rewardTier, mazeLevel, position, 'combat_victory')
}

/**
 * Generate a boss chest (always high tier, always trapped)
 * Boss chests use tier 19 traps (most dangerous in Reward 2 system)
 */
async function generateBossChest(
  mazeLevel: number,
  position: Position
): Promise<Chest> {
  const chest = await generateChest(19, mazeLevel, position, 'boss')
  // Boss chests are always trapped - use immutable update pattern
  if (!chest.trapped) {
    const trapId = await selectTrapId(19)
    return {
      ...chest,
      trapped: true,
      trapId
    }
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
    trapId: null,
    trapIdentified: true,
    trapDisarmed: false,
    rewardTier: 10,  // Lowest tier in Reward 2 system
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
  trapId: TrapId | null,
  mazeLevel: number,
  position: Position
): Chest {
  return {
    id: generateChestId(),
    trapped: trapId !== null,
    trapId,
    trapIdentified: false,
    trapDisarmed: false,
    rewardTier: 14,  // Default to mid-tier in Reward 2 system
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

  // Trap selection (internal, exposed for testing)
  selectTrapId,

  // Distribution
  selectRecipient,
  checkInventorySpace,
  distributeTreasure,
  getDistributionMessage
}
