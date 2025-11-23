// src/services/MonsterService.ts
import { MonsterInstance } from '../types/Combat'
import { MonsterTemplate, validateMonster } from '../validation/MonsterSchema'
import { v4 as uuidv4 } from 'uuid'

/**
 * MonsterService - Pure function service for monster data loading and instance creation
 *
 * Responsibilities:
 * - Load and validate monster templates from JSON files
 * - Create monster instances with randomized HP
 * - Generate monster groups with randomized counts
 * - Cache validated monster data
 *
 * Data-Driven Architecture:
 * - All monster data loaded from data/monsters/*.json
 * - Validated using Zod schema (see src/validation/MonsterSchema.ts)
 * - No hardcoded monster data
 *
 * Performance:
 * - Monsters loaded on-demand and cached
 * - Validation happens once per monster type
 */

// Monster cache: monsterId -> validated template
const MONSTER_CACHE = new Map<string, MonsterTemplate>()

// Import all monster JSON files
// Using a function to dynamically import monsters as needed
async function importMonster(monsterId: string): Promise<any> {
  try {
    // Dynamic import of monster JSON file
    const monsterData = await import(`../../data/monsters/${monsterId}.json`)
    return monsterData.default || monsterData
  } catch (error) {
    throw new Error(`Failed to load monster: ${monsterId}. ${error}`)
  }
}

export class MonsterService {
  /**
   * Load monster template from JSON and validate
   * @param monsterId - Monster identifier (e.g., "kobold", "werdna")
   * @returns Validated monster template
   * @throws Error if monster not found or validation fails
   */
  static async loadMonster(monsterId: string): Promise<MonsterTemplate> {
    // Check cache first
    const cached = MONSTER_CACHE.get(monsterId)
    if (cached) return cached

    // Load and validate monster data
    const rawData = await importMonster(monsterId)
    const validatedMonster = validateMonster(rawData)

    // Cache for future use
    MONSTER_CACHE.set(monsterId, validatedMonster)

    return validatedMonster
  }

  /**
   * Synchronously get a cached monster (for use in tests)
   * @param monsterId - Monster identifier
   * @returns Cached monster template or throws if not loaded
   */
  static getCachedMonster(monsterId: string): MonsterTemplate {
    const cached = MONSTER_CACHE.get(monsterId)
    if (!cached) {
      throw new Error(`Monster not loaded: ${monsterId}. Call loadMonster() first.`)
    }
    return cached
  }

  /**
   * Preload specific monsters into cache
   * Useful for tests or common encounters
   * @param monsterIds - Array of monster IDs to preload
   */
  static async preloadMonsters(monsterIds: string[]): Promise<void> {
    await Promise.all(monsterIds.map(id => this.loadMonster(id)))
  }

  /**
   * Preload all monsters into cache
   * Warning: Loads all 96 monsters - use sparingly
   */
  static async preloadAllMonsters(): Promise<void> {
    const allMonsterIds = [
      // Level 1
      'bubbly_slime', 'bushwacker', 'highwayman', 'kobold', 'lvl_1_mage',
      'lvl_1_ninja', 'lvl_1_priest', 'murphy_ghost', 'orc', 'rogue',
      'undead_kobold', 'zombie',
      // Level 2
      'creeping_coin', 'creeping_crud', 'gas_cloud', 'huge_spider', 'vorpal_bunny',
      // Level 3
      'capybara', 'coyote', 'dragon_fly', 'giant_toad', 'lvl_3_ninja',
      'lvl_3_priest', 'lvl_3_samurai', 'lvl_5_mage', 'rotting_corpse', 'were_bear',
      // Level 4
      'attack_dog', 'bishop', 'boring_beetle', 'dragon_puppy', 'gargoyle',
      'gas_dragon', 'grave_mist', 'high_ninja', 'lvl_4_thief', 'lvl_5_priest',
      'lvl_6_ninja', 'lvl_7_fighter', 'ogre', 'priestess', 'shade',
      // Level 5
      'champ_samurai', 'giant_spider', 'killer_wolf', 'lifestealer', 'lvl_7_mage',
      'minor_daimyo', 'spirit', 'swordsman', 'weretiger', 'wererat',
      // Level 6
      'arch_mage_lesser', 'chimera', 'earth_giant', 'gaze_hound', 'high_priest_lesser',
      'high_wizard', 'lvl_7_thief', 'lvl_8_bishop', 'lvl_8_priest', 'master_thief_lesser',
      'medusalizard', 'ogre_lord', 'troll', 'werewolf',
      // Level 7
      'gorgon', 'lesser_demon', 'lvl_8_fighter', 'major_daimyo', 'nightstalker', 'wyvern',
      // Level 8
      'dragon_zombie', 'fire_dragon', 'hatamoto', 'high_master', 'lvl_8_ninja', 'lvl_10_fighter',
      // Level 9
      'fire_giant', 'frost_giant', 'maelific',
      // Level 10
      'arch_mage_greater', 'bleeb', 'flack', 'greater_demon', 'high_priest_greater',
      'lvl_10_mage', 'master_ninja', 'master_thief_greater', 'poison_giant',
      'raver_lord', 'thief', 'vampire', 'vampire_lord', 'werdna', 'will_o_wisp'
    ]

    await this.preloadMonsters(allMonsterIds)
  }

  /**
   * Create a single monster instance from template
   * @param monsterId - Monster identifier
   * @returns Monster instance with randomized HP
   */
  static async createMonsterInstance(monsterId: string): Promise<MonsterInstance> {
    const template = await this.loadMonster(monsterId)
    return this.createMonsterInstanceFromTemplate(template)
  }

  /**
   * Create monster instance from template (synchronous)
   * Useful when template is already loaded
   * @param template - Validated monster template
   * @returns Monster instance with randomized HP
   */
  static createMonsterInstanceFromTemplate(template: MonsterTemplate): MonsterInstance {
    // Roll HP from min/max range
    const hp = this.rollInRange(template.hp.min, template.hp.max)

    return {
      id: uuidv4(),
      monsterId: template.id,
      name: template.name,
      hp,
      maxHp: hp,
      ac: template.ac,
      damage: template.damage,
      xp: template.xp,
      gold: template.gold,
      status: 'ALIVE',
      level: template.level,
      agility: 10,  // Default monster agility
      undead: template.type === 'undead'
    }
  }

  /**
   * Generate a group of monsters (randomized count) - async version
   * @param monsterId - Monster identifier
   * @returns Promise of array of monster instances
   */
  static async generateMonsterGroupAsync(monsterId: string): Promise<MonsterInstance[]> {
    const template = await this.loadMonster(monsterId)

    // Roll group size from numberAppearing range
    const count = this.rollInRange(
      template.numberAppearing.min,
      template.numberAppearing.max
    )

    // Create that many instances
    return Array.from({ length: count }, () =>
      this.createMonsterInstanceFromTemplate(template)
    )
  }

  /**
   * Generate a group of monsters synchronously from cached template
   * WARNING: Monster must be preloaded first using preloadMonsters()
   * This is the original synchronous method for backward compatibility
   * @param monsterId - Monster identifier
   * @returns Array of monster instances
   * @throws Error if monster not preloaded
   */
  static generateMonsterGroup(monsterId: string): MonsterInstance[] {
    const template = this.getCachedMonster(monsterId)

    // Roll group size from numberAppearing range
    const count = this.rollInRange(
      template.numberAppearing.min,
      template.numberAppearing.max
    )

    // Create that many instances
    return Array.from({ length: count }, () =>
      this.createMonsterInstanceFromTemplate(template)
    )
  }

  /**
   * Create a single monster instance synchronously from cached template
   * This overloaded method maintains backward compatibility
   * @param monsterId - Monster identifier
   * @returns Monster instance
   * @throws Error if monster not preloaded
   */
  static createMonsterInstanceSync(monsterId: string): MonsterInstance {
    const template = this.getCachedMonster(monsterId)
    return this.createMonsterInstanceFromTemplate(template)
  }

  /**
   * Get all cached monster IDs
   * @returns Array of monster IDs currently in cache
   */
  static getCachedMonsterIds(): string[] {
    return Array.from(MONSTER_CACHE.keys())
  }

  /**
   * Clear monster cache (useful for tests)
   */
  static clearCache(): void {
    MONSTER_CACHE.clear()
  }

  /**
   * Roll a random number in range [min, max] inclusive
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns Random integer in range
   */
  private static rollInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}
