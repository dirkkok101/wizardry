// src/services/MonsterService.ts
import { MonsterInstance } from '../types/Combat'
import koboldData from '../../data/monsters/kobold.json'
import { v4 as uuidv4 } from 'uuid'

interface MonsterTemplate {
  id: string
  name: string
  level: number
  numberAppearing: { min: number; max: number }
  hp: { min: number; max: number }
  ac: number
  damage: Array<{ dice: string; min: number; max: number }>
  xp: number
  gold?: number
  type: string
  specialAbilities: string[]
  resistances: Array<{ type: string; value: number }>
  regeneration: number
  isBoss: boolean
  canFlee: boolean
}

const MONSTER_CACHE = new Map<string, MonsterTemplate>()

// Pre-load common monsters
MONSTER_CACHE.set('kobold', koboldData as MonsterTemplate)

export class MonsterService {
  /**
   * Load monster synchronously from cache or throw error.
   * For runtime use, call loadMonsterAsync() first to populate cache.
   */
  static loadMonster(monsterId: string): MonsterTemplate {
    const cached = MONSTER_CACHE.get(monsterId)
    if (cached) return cached

    throw new Error(`Monster not loaded: ${monsterId}. Call loadMonsterAsync() first.`)
  }

  /**
   * Load monster asynchronously from assets and cache it.
   * This is the primary method for loading monsters at runtime.
   */
  static async loadMonsterAsync(monsterId: string): Promise<MonsterTemplate> {
    // Check cache first
    const cached = MONSTER_CACHE.get(monsterId)
    if (cached) return cached

    try {
      // Fetch from assets folder
      const response = await fetch(`/assets/monsters/${monsterId}.json`)
      if (!response.ok) {
        throw new Error(`Failed to load monster: ${monsterId} (HTTP ${response.status})`)
      }

      const monsterData = await response.json() as MonsterTemplate

      // Validate required fields
      if (!monsterData.id || !monsterData.name) {
        throw new Error(`Invalid monster data for: ${monsterId}`)
      }

      // Cache the monster for future use
      MONSTER_CACHE.set(monsterId, monsterData)

      return monsterData
    } catch (error) {
      console.error(`[MonsterService] Failed to load monster "${monsterId}":`, error)
      throw error
    }
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
