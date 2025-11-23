// src/services/MonsterService.ts
import { MonsterInstance } from '../types/Combat'
import { MonsterDataLoader, MonsterTemplate } from './MonsterDataLoader'
import { v4 as uuidv4 } from 'uuid'

export class MonsterService {
  /**
   * Load monster synchronously from cache or throw error.
   * For runtime use, call loadMonsterAsync() first to populate cache.
   */
  static loadMonster(monsterId: string): MonsterTemplate {
    return MonsterDataLoader.getMonster(monsterId)
  }

  /**
   * Load monster asynchronously from assets and cache it.
   * This is the primary method for loading monsters at runtime.
   */
  static async loadMonsterAsync(monsterId: string): Promise<MonsterTemplate> {
    return MonsterDataLoader.loadMonster(monsterId)
  }

  static createMonsterInstance(monsterId: string): MonsterInstance {
    const template = this.loadMonster(monsterId)

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
      agility: 10  // Default monster agility
    }
  }

  static generateMonsterGroup(monsterId: string): MonsterInstance[] {
    const template = this.loadMonster(monsterId)

    // Roll group size from numberAppearing range
    const count = this.rollInRange(
      template.numberAppearing.min,
      template.numberAppearing.max
    )

    // Create that many instances
    return Array.from({ length: count }, () =>
      this.createMonsterInstance(monsterId)
    )
  }

  private static rollInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}
