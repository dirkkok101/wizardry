// src/services/VictoryService.ts
import { MonsterInstance } from '@models/Combat'
import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { Item } from '@models/Item'
import { RandomService } from './RandomService'
import { ItemDataLoader } from './ItemDataLoader'
import { MonsterDropDataLoader } from './MonsterDropDataLoader'

export interface ItemDrop {
  itemId: string
  itemName: string
  identified: boolean  // Whether item is identified (unidentified items need temple service)
}

export interface VictoryRewards {
  totalXP: number
  xpPerCharacter: number
  totalGold: number
  livingCharacterCount: number  // Number of living characters who receive XP
  items: ItemDrop[]  // Items dropped from monsters
}

export class VictoryService {
  // Drop rate configuration
  private static readonly DROP_CHANCE = 0.15  // 15% base chance per monster level group
  private static readonly HIGH_LEVEL_THRESHOLD = 6  // Monsters at this level can drop multiple items
  private static readonly MAX_DROPS_HIGH_LEVEL = 2  // Maximum drops for high level monsters
  private static readonly MAX_DROPS_LOW_LEVEL = 1   // Maximum drops for low level monsters
  private static readonly UNIDENTIFIED_LEVEL_THRESHOLD = 5  // Monsters at this level drop unidentified items
  private static readonly UNIDENTIFIED_CHANCE = 0.7  // 70% chance items are unidentified for high level
  private static readonly MAX_INVENTORY_SIZE = 8  // Maximum items per character inventory

  /**
   * Calculate XP and gold rewards from defeated monsters
   * XP is divided evenly among LIVING party members only (dead get no XP)
   * Gold goes to party pool
   * Items are generated based on monster level and count
   */
  static calculateVictoryRewards(
    monsters: MonsterInstance[],
    roster: Map<string, Character>,
    partyMembers: string[]
  ): VictoryRewards {
    const totalXP = monsters.reduce((sum, m) => sum + m.xp, 0)
    const totalGold = monsters.reduce((sum, m) => sum + (m.gold || 0), 0)

    // Count only living characters
    const livingCharacterCount = partyMembers.filter(id => {
      const char = roster.get(id)
      return char && char.status !== CharacterStatus.DEAD && char.hp > 0
    }).length

    // Avoid division by zero if all party members are dead
    const xpPerCharacter = livingCharacterCount > 0
      ? Math.floor(totalXP / livingCharacterCount)
      : 0

    // Generate item drops
    const items = this.generateItemDrops(monsters)

    return {
      totalXP,
      xpPerCharacter,
      totalGold,
      livingCharacterCount,
      items
    }
  }

  /**
   * Generate item drops based on monster level
   * Drop chance: 15% per monster group (not per monster)
   * Higher level monsters drop better items and are more likely to drop multiple items
   */
  private static generateItemDrops(monsters: MonsterInstance[]): ItemDrop[] {
    const items: ItemDrop[] = []

    // Group monsters by level
    const monstersByLevel = new Map<number, MonsterInstance[]>()
    for (const monster of monsters) {
      const level = monster.level || 1
      if (!monstersByLevel.has(level)) {
        monstersByLevel.set(level, [])
      }
      monstersByLevel.get(level)!.push(monster)
    }

    // Generate drops per level group
    for (const [level, groupMonsters] of monstersByLevel.entries()) {
      // Higher level monsters can drop multiple items
      const maxDrops = level >= this.HIGH_LEVEL_THRESHOLD
        ? this.MAX_DROPS_HIGH_LEVEL
        : this.MAX_DROPS_LOW_LEVEL

      for (let i = 0; i < maxDrops; i++) {
        if (RandomService.roll(this.DROP_CHANCE)) {
          const item = this.selectItemForLevel(level)
          if (item) {
            items.push(item)
          }
        }
      }
    }

    return items
  }

  /**
   * Select a random item appropriate for the monster level
   * Lower level items are identified, higher level items (level 5+) are unidentified
   *
   * Item pools are loaded from data/treasure/monster-drop-pools.json
   * Item names are looked up from ItemDataLoader
   */
  private static selectItemForLevel(monsterLevel: number): ItemDrop | null {
    // Cap level at maximum defined in data
    const maxLevel = MonsterDropDataLoader.getMaxLevel()
    const level = Math.min(monsterLevel, maxLevel)

    // Get item pool for this level from data file
    const pool = MonsterDropDataLoader.getPoolForLevel(level)

    if (!pool || pool.length === 0) {
      return null
    }

    // Select random item from pool
    const itemId = RandomService.pickRandom(pool)

    // Look up item name from ItemDataLoader (data-driven, not hardcoded)
    const item = ItemDataLoader.getItem(itemId)
    const itemName = item?.name ?? itemId

    // Items from high level monsters start unidentified
    const identified = level < this.UNIDENTIFIED_LEVEL_THRESHOLD
      || !RandomService.roll(this.UNIDENTIFIED_CHANCE)

    return {
      itemId,
      itemName,  // Always store real name, UI handles display logic
      identified
    }
  }

  /**
   * Distribute rewards to LIVING party members only
   * Dead characters receive no XP
   * Returns new roster Map with updated characters (immutable)
   */
  static distributeRewards(
    roster: Map<string, Character>,
    partyMembers: string[],
    xpPerCharacter: number
  ): Map<string, Character> {
    const newRoster = new Map(roster)

    // Add XP only to living party members
    for (const memberId of partyMembers) {
      const character = newRoster.get(memberId)
      if (!character) continue

      // Dead characters get no XP
      if (character.status === CharacterStatus.DEAD || character.hp <= 0) {
        continue
      }

      newRoster.set(memberId, {
        ...character,
        experience: character.experience + xpPerCharacter
      })
    }

    return newRoster
  }

  /**
   * Distribute items to party members
   * Items are distributed to living party members with inventory space (max 8 items)
   * Returns new roster Map with items added to character inventories
   *
   * Distribution strategy:
   * 1. Living characters get priority
   * 2. Round-robin distribution across party members with space
   * 3. If all inventories full, items are lost (dropped)
   */
  static distributeItems(
    roster: Map<string, Character>,
    partyMembers: string[],
    items: ItemDrop[]
  ): { roster: Map<string, Character>; itemsAdded: Map<string, string[]> } {
    const newRoster = new Map(roster)
    const itemsAdded = new Map<string, string[]>() // characterId -> itemIds[]

    // Get living party members
    const livingMembers = partyMembers.filter(id => {
      const char = newRoster.get(id)
      return char && char.status !== CharacterStatus.DEAD && char.hp > 0
    })

    // Early return if no living members (prevents division by zero)
    if (livingMembers.length === 0) {
      return { roster: newRoster, itemsAdded }
    }

    // Round-robin distribution
    let currentMemberIndex = 0

    // Distribute each item
    for (const itemDrop of items) {
      const startIndex = currentMemberIndex

      // Look up full Item from ItemDataLoader
      const baseItem = ItemDataLoader.getItem(itemDrop.itemId)
      if (!baseItem) {
        // Item not found in database, skip it
        continue
      }

      // Create item instance with correct identified state
      const itemInstance: Item = {
        ...baseItem,
        identified: itemDrop.identified,
        equipped: false
      }

      // Try to find a character with space, starting from current index
      do {
        const memberId = livingMembers[currentMemberIndex]
        if (!memberId) break

        const character = newRoster.get(memberId)
        if (character && character.inventory.length < this.MAX_INVENTORY_SIZE) {
          // Add item to inventory
          newRoster.set(memberId, {
            ...character,
            inventory: [...character.inventory, itemInstance]
          })

          // Track which items were added to which character
          if (!itemsAdded.has(memberId)) {
            itemsAdded.set(memberId, [])
          }
          itemsAdded.get(memberId)!.push(itemDrop.itemId)

          // Move to next character for next item (round-robin)
          currentMemberIndex = (currentMemberIndex + 1) % livingMembers.length
          break
        }

        // Try next character
        currentMemberIndex = (currentMemberIndex + 1) % livingMembers.length
      } while (currentMemberIndex !== startIndex)

      // If item couldn't be added (all inventories full), it's lost
      // This matches Wizardry's brutal difficulty - manage your inventory!
    }

    return { roster: newRoster, itemsAdded }
  }
}
