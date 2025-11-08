// src/services/MonsterService.ts
import { MonsterInstance } from '../types/Combat'
import koboldData from '../../data/monsters/kobold.json'

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
  static loadMonster(monsterId: string): MonsterTemplate {
    const cached = MONSTER_CACHE.get(monsterId)
    if (cached) return cached

    try {
      // Dynamic import for other monsters
      const data = require(`../../data/monsters/${monsterId}.json`)
      MONSTER_CACHE.set(monsterId, data)
      return data
    } catch (error) {
      throw new Error(`Monster not found: ${monsterId}`)
    }
  }
}
