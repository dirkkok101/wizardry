import { Item } from '@models/Item'
import { TreasureReward, TrapType } from '@validation/treasure-schema'
import { RandomService } from './RandomService'
import { TreasureDataLoader } from './TreasureDataLoader'
import { ItemDataLoader } from './ItemDataLoader'
import { NumericIdMappingLoader } from './NumericIdMappingLoader'

/**
 * Item dropped from treasure chest
 */
export interface TreasureItem {
  item: Item
  identified: boolean
}

/**
 * Complete treasure chest contents
 */
export interface TreasureChest {
  gold: number
  trap: TrapType
  items: TreasureItem[]
}

/**
 * Configuration for treasure generation
 */
export interface TreasureConfig {
  applyItemRangeBug?: boolean  // Apply original Wizardry 1 range bug (+2 min, +1 max)
  unidentifiedChance?: number  // Chance items are unidentified (0-100, default 70)
}

const DEFAULT_CONFIG: TreasureConfig = {
  applyItemRangeBug: false,  // Disabled - all items should be obtainable
  unidentifiedChance: 70
}

/**
 * Service for generating treasure from reward types
 *
 * Based on Wizardry 1 reference document Section 4:
 * - Reward types 10-19 define treasure chest contents
 * - Each type has specific gold dice, trap possibilities, and item tiers
 * - Item ranges have a bug in the original (+2 min, +1 max offset)
 */
export class TreasureService {
  /**
   * Generate complete treasure chest contents for a reward type
   */
  static generateChest(rewardType: number, config: TreasureConfig = DEFAULT_CONFIG): TreasureChest {
    const rewardConfig = TreasureDataLoader.getRewardConfig(rewardType)

    if (!rewardConfig) {
      console.warn(`No treasure config for reward type ${rewardType}, using default`)
      return { gold: 0, trap: 'none', items: [] }
    }

    return {
      gold: this.calculateGold(rewardConfig),
      trap: this.generateTrap(rewardConfig),
      items: this.generateItems(rewardConfig, config)
    }
  }

  /**
   * Calculate gold from reward configuration
   * Supports simple (2d5×10) and complex (10d10×d4×10) formulas
   */
  static calculateGold(rewardConfig: TreasureReward): number {
    const dice = rewardConfig.goldDice

    // Roll base dice
    let gold = RandomService.rollDice(dice.count, dice.sides)

    // Apply bonus roll multiplier if present (e.g., ×d4)
    if (dice.bonusRoll) {
      const bonusMultiplier = RandomService.rollDice(dice.bonusRoll.count, dice.bonusRoll.sides)
      gold *= bonusMultiplier
    }

    // Apply final multiplier (usually ×10)
    gold *= dice.multiplier

    return gold
  }

  /**
   * Generate random trap from reward configuration
   */
  static generateTrap(rewardConfig: TreasureReward): TrapType {
    const traps = rewardConfig.traps
    if (!traps || traps.length === 0) {
      return 'none'
    }

    return RandomService.pickRandom(traps) as TrapType
  }

  /**
   * Generate items from treasure tiers
   * Each tier has a chance to drop an item from a specific ID range
   */
  static generateItems(
    rewardConfig: TreasureReward,
    config: TreasureConfig = DEFAULT_CONFIG
  ): TreasureItem[] {
    const items: TreasureItem[] = []

    for (const tier of rewardConfig.tiers) {
      // Check if this tier drops an item
      if (!RandomService.chance(tier.chance)) {
        continue
      }

      // Apply item range bug if configured (original Wizardry 1 behavior)
      let minId = tier.minItemId
      let maxId = tier.maxItemId
      if (config.applyItemRangeBug) {
        [minId, maxId] = this.applyRangeBug(minId, maxId)
      }

      // Generate random item ID from range
      const itemId = RandomService.random(minId, maxId)

      // Convert numeric ID to string ID (lookup by index)
      const item = this.getItemByNumericId(itemId)
      if (!item) {
        continue
      }

      // Determine if item is identified
      const identified = !RandomService.chance(config.unidentifiedChance ?? 70)

      items.push({
        item: { ...item, identified },
        identified
      })
    }

    return items
  }

  /**
   * Apply the original Wizardry 1 item range bug
   *
   * Due to a bug in the range selector function, item ranges are shifted:
   * - +2 to minimum
   * - +1 to maximum
   *
   * This causes some items to never drop from treasure (IDs 1, 2, 18, 34, 53)
   */
  static applyRangeBug(min: number, max: number): [number, number] {
    return [min + 2, max + 1]
  }

  /**
   * Get item by numeric ID (matches original Wizardry 1 item indices)
   * Maps numeric IDs to string item IDs via externalized JSON mapping
   *
   * Requires NumericIdMappingLoader to be pre-loaded (call loadMapping() at app startup)
   */
  private static getItemByNumericId(numericId: number): Item | null {
    const itemId = NumericIdMappingLoader.getItemId(numericId)
    if (!itemId) {
      return null
    }

    return ItemDataLoader.getItem(itemId)
  }

  /**
   * Get reward type from monster reward value
   *
   * Per reference Section 4.2:
   * - reward1: Used for random encounters (loose gold, no chest)
   * - reward2: Used for fixed room encounters (treasure chest with items)
   */
  static getRewardTypeFromMonster(rewardValue: number, isRoomEncounter: boolean): number | null {
    // Reward values 0-9 are loose gold only (no chest)
    if (rewardValue < 10) {
      return null
    }

    // Reward values 10-19 are chest treasures
    if (rewardValue <= 19) {
      return rewardValue
    }

    // Special reward values
    if (rewardValue === 20) {
      // Werdna's Amulet (guaranteed drop from Werdna)
      return 19  // Use highest tier
    }

    if (rewardValue === 21) {
      // Level 7 Fighters special chest
      return 17
    }

    return null
  }
}
