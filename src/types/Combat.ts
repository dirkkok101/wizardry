// src/types/Combat.ts
import { Character } from './Character'

export type CombatActionType = 'ATTACK' | 'CAST_SPELL' | 'USE_ITEM' | 'PARRY' | 'RUN' | 'DISPEL'
export type CombatantStatus = 'ALIVE' | 'DEAD' | 'ASLEEP' | 'PARALYZED'

export interface DiceRoll {
  dice: string  // "1d8", "2d6", etc.
  min: number
  max: number
}

export interface MonsterInstance {
  id: string
  monsterId: string
  name: string
  hp: number
  maxHp: number
  ac: number
  damage: DiceRoll[]
  xp: number
  gold?: number
  status: CombatantStatus
  level: number
  agility?: number  // For initiative calculation
}

export type Combatant = Character | MonsterInstance

export interface CombatCommand {
  id: string
  actor: Combatant
  type: CombatActionType
  initiative: number
  target?: Combatant | Combatant[]
  data?: any  // spell ID, item ID, etc.
}

export interface CombatState {
  monsters: MonsterInstance[]
  commandQueue: CombatCommand[]
  roundNumber: number
  combatLog: string[]
  canFlee: boolean
}

export interface AttackResult {
  hit: boolean
  damage: number
  critical: boolean
  message: string
}

export interface SpellEffect {
  damage?: number[]
  healing?: number[]
  statusEffects?: { target: string; effect: string }[]
  message: string
}

export interface CombatVictoryResult {
  xpPerCharacter: number
  gold: number
  items?: string[]
}
