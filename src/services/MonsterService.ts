// src/services/MonsterService.ts
import { MonsterInstance } from '../types/Combat'
import { MonsterTemplate } from '../validation/MonsterSchema'
import { MonsterDataLoader } from './MonsterDataLoader'
import { v4 as uuidv4 } from 'uuid'

/**
 * MonsterService - Pure function service for monster instance creation
 *
 * Responsibilities:
 * - Create monster instances with randomized HP
 * - Generate monster groups with randomized counts
 * - Access monster templates from MonsterDataLoader
 *
 * Data-Driven Architecture:
 * - All monster data loaded via MonsterDataLoader (uses AssetLoadingService)
 * - Validated using Zod schema (see src/validation/MonsterSchema.ts)
 * - No hardcoded monster data
 *
 * Pattern Consistency:
 * - Follows same pattern as SpellDataLoader/SpellCastingService
 * - MonsterDataLoader handles loading and caching
 * - MonsterService handles instance creation from templates
 */

export class MonsterService {
  /**
   * Create a single monster instance from template ID
   * @param monsterId - Monster identifier (e.g., "kobold", "werdna")
   * @returns Monster instance with randomized HP
   * @throws Error if monsters not loaded or monster not found
   */
  static createMonsterInstance(monsterId: string): MonsterInstance {
    const template = MonsterDataLoader.getMonster(monsterId)
    if (!template) {
      throw new Error(`Monster not found: ${monsterId}`)
    }
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
   * Generate a group of monsters (randomized count)
   * @param monsterId - Monster identifier
   * @returns Array of monster instances
   * @throws Error if monsters not loaded or monster not found
   */
  static generateMonsterGroup(monsterId: string): MonsterInstance[] {
    const template = MonsterDataLoader.getMonster(monsterId)
    if (!template) {
      throw new Error(`Monster not found: ${monsterId}`)
    }

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
   * Get monster template by ID
   * @param monsterId - Monster identifier
   * @returns Monster template or undefined if not found
   */
  static getMonsterTemplate(monsterId: string): MonsterTemplate | undefined {
    return MonsterDataLoader.getMonster(monsterId)
  }

  /**
   * Check if a monster is loaded and available
   * @param monsterId - Monster identifier
   * @returns true if monster is loaded
   */
  static hasMonster(monsterId: string): boolean {
    return MonsterDataLoader.hasMonster(monsterId)
  }

  /**
   * Get all loaded monster IDs
   * @returns Array of monster IDs currently loaded
   */
  static getLoadedMonsterIds(): string[] {
    return MonsterDataLoader.getLoadedMonsterIds()
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
