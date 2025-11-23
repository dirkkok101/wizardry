// src/services/VictoryService.ts
import { MonsterInstance } from '../types/Combat'
import { Character } from '../types/Character'
import { CharacterStatus } from '../types/CharacterStatus'

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
  // Item pools by monster level
  private static readonly ITEM_POOLS = {
    level1: ['dagger', 'short_sword', 'leather_armor', 'small_shield', 'staff', 'robes'],
    level2: ['dagger_1', 'short_sword_1', 'leather_1', 'shield_1', 'helm', 'chain_mail'],
    level3: ['long_sword', 'mace_1', 'chain_1', 'shield_2', 'helm_1', 'breast_plate'],
    level4: ['long_sword_1', 'staff_2', 'chain_2', 'breast_plate_1', 'shield_3', 'great_helm'],
    level5: ['long_sword_2', 'mace_2', 'plate_mail', 'plate_mail_1', 'large_shield', 'armor_heroes'],
    level6: ['anointed_mace', 'blade_cusinart', 'plate_mail_2', 'ring_healing', 'blue_ribbon'],
    level7: ['were_slayer', 'dragon_slayer', 'staff_mogref', 'chain_pro_fire', 'ring_porfic'],
    level8: ['vorpal_blade', 'mage_masher', 'evil_plate_3', 'evil_shield_3', 'deadly_ring'],
    level9: ['murasama_blade', 'thieves_dagger', 'lords_garb', 'jeweled_amulet', 'diadem_malor'],
    level10: ['werdna_amulet', 'staff_montino', 'shuriken', 'amulet_makanito', 'ring_pro_undead']
  }

  // Item names for display (simplified - in real game would load from item files)
  private static readonly ITEM_NAMES: Record<string, string> = {
    'dagger': 'Dagger',
    'short_sword': 'Short Sword',
    'leather_armor': 'Leather Armor',
    'small_shield': 'Small Shield',
    'staff': 'Staff',
    'robes': 'Robes',
    'dagger_1': 'Dagger +1',
    'short_sword_1': 'Short Sword +1',
    'leather_1': 'Leather +1',
    'shield_1': 'Shield +1',
    'helm': 'Helm',
    'chain_mail': 'Chain Mail',
    'long_sword': 'Long Sword',
    'mace_1': 'Mace +1',
    'chain_1': 'Chain +1',
    'shield_2': 'Shield +2',
    'helm_1': 'Helm +1',
    'breast_plate': 'Breast Plate',
    'long_sword_1': 'Long Sword +1',
    'staff_2': 'Staff +2',
    'chain_2': 'Chain +2',
    'breast_plate_1': 'Breast Plate +1',
    'shield_3': 'Shield +3',
    'great_helm': 'Great Helm',
    'long_sword_2': 'Long Sword +2',
    'mace_2': 'Mace +2',
    'plate_mail': 'Plate Mail',
    'plate_mail_1': 'Plate Mail +1',
    'large_shield': 'Large Shield',
    'armor_heroes': 'Armor of Heroes',
    'anointed_mace': 'Anointed Mace',
    'blade_cusinart': 'Blade Cusinart',
    'plate_mail_2': 'Plate Mail +2',
    'ring_healing': 'Ring of Healing',
    'blue_ribbon': 'Blue Ribbon',
    'were_slayer': 'Were Slayer',
    'dragon_slayer': 'Dragon Slayer',
    'staff_mogref': 'Staff of MOGREF',
    'chain_pro_fire': 'Chain Mail Pro Fire',
    'ring_porfic': 'Ring of PORFIC',
    'vorpal_blade': 'Vorpal Blade',
    'mage_masher': 'Mage Masher',
    'evil_plate_3': 'Evil Plate +3',
    'evil_shield_3': 'Evil Shield +3',
    'deadly_ring': 'Deadly Ring',
    'murasama_blade': 'Murasama Blade',
    'thieves_dagger': 'Thieves Dagger',
    'lords_garb': 'Lords Garb',
    'jeweled_amulet': 'Jeweled Amulet',
    'diadem_malor': 'Diadem of MALOR',
    'werdna_amulet': 'Werdnas Amulet',
    'staff_montino': 'Staff of MONTINO',
    'shuriken': 'Shuriken',
    'amulet_makanito': 'Amulet of MAKANITO',
    'ring_pro_undead': 'Ring vs Undead'
  }

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
      // 15% base chance per group
      const dropChance = 0.15

      // Higher level monsters can drop multiple items (1-2 items for level 6+)
      const maxDrops = level >= 6 ? 2 : 1

      for (let i = 0; i < maxDrops; i++) {
        if (Math.random() < dropChance) {
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
   */
  private static selectItemForLevel(monsterLevel: number): ItemDrop | null {
    // Cap level at 10
    const level = Math.min(monsterLevel, 10)

    // Get appropriate item pool
    const poolKey = `level${level}` as keyof typeof this.ITEM_POOLS
    const pool = this.ITEM_POOLS[poolKey]

    if (!pool || pool.length === 0) {
      return null
    }

    // Select random item from pool
    const itemId = pool[Math.floor(Math.random() * pool.length)]
    const itemName = this.ITEM_NAMES[itemId] || itemId

    // Items from level 5+ monsters start unidentified (70% chance)
    const identified = level < 5 || Math.random() < 0.3

    return {
      itemId,
      itemName: identified ? itemName : '??? (Unidentified)',
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
    const MAX_INVENTORY = 8

    // Get living party members
    const livingMembers = partyMembers.filter(id => {
      const char = newRoster.get(id)
      return char && char.status !== CharacterStatus.DEAD && char.hp > 0
    })

    // Round-robin distribution
    let currentMemberIndex = 0

    // Distribute each item
    for (const item of items) {
      let itemAdded = false
      const startIndex = currentMemberIndex

      // Try to find a character with space, starting from current index
      do {
        const memberId = livingMembers[currentMemberIndex]
        if (!memberId) break

        const character = newRoster.get(memberId)
        if (character && character.inventory.length < MAX_INVENTORY) {
          // Add item to inventory
          newRoster.set(memberId, {
            ...character,
            inventory: [...character.inventory, item.itemId]
          })

          // Track which items were added to which character
          if (!itemsAdded.has(memberId)) {
            itemsAdded.set(memberId, [])
          }
          itemsAdded.get(memberId)!.push(item.itemId)

          itemAdded = true
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
