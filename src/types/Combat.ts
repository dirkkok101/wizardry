// src/types/Combat.ts
import { Character } from './Character'

export type CombatActionType = 'ATTACK' | 'CAST_SPELL' | 'USE_ITEM' | 'PARRY' | 'RUN' | 'DISPEL'
export type CombatantStatus = 'ALIVE' | 'DEAD' | 'ASLEEP' | 'PARALYZED'

/**
 * Temporary status effects that only last during combat
 * These are cleared when combat ends
 */
export type CombatStatusEffect = 'BLIND' | 'SILENCED' | 'FEARED'

/**
 * All status effects that can have durations tracked during combat
 * Includes both temporary combat effects and persistent character effects
 */
export type DurationTrackedStatus = CombatStatusEffect | 'ASLEEP' | 'PARALYZED' | 'POISONED'

/**
 * Map of combatant IDs to their active status effects
 */
export type CombatStatusEffects = Map<string, Set<CombatStatusEffect>>

/**
 * Status effect duration tracking
 * Map of combatant ID -> Map of status type -> rounds remaining
 * -1 means permanent/until cured
 */
export type StatusDurations = Map<string, Map<DurationTrackedStatus, number>>

/**
 * Map of combatant IDs to their AC modifier (negative = better defense)
 * Example: -2 means AC is improved by 2 points
 */
export type CombatAcModifiers = Map<string, number>

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
  undead?: boolean  // True if monster is undead (for BADIOS, etc.)
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

export interface MonsterGroup {
  id: 'A' | 'B' | 'C' | 'D'
  monsters: MonsterInstance[]
  formation: 'front' | 'back'  // Row position
}

export interface CombatState {
  monsterGroups: MonsterGroup[]  // 1-4 groups (A, B, C, D)
  commandQueue: CombatCommand[]
  roundNumber: number
  combatLog: string[]
  canFlee: boolean
  statusEffects: CombatStatusEffects  // Temporary status effects (blind, silenced)
  acModifiers: CombatAcModifiers  // Temporary AC bonuses (MOGREF, KALKI, etc.)
  statusDurations: StatusDurations  // Track how many rounds each status effect lasts
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
  fullHeal?: string[]  // Target IDs to heal to full HP (MALIKTO)
  statusEffects?: { target: string; effect: string }[]
  acBuffs?: { target: string; acModifier: number }[]  // AC modifiers to apply
  revealedInfo?: {  // Information revealed by utility spells
    targetIds: string[]
    type: 'stats' | 'identity'  // 'stats' for MILWA, 'identity' for LATUMAPIC
  }
  instantDeath?: string[]  // Target IDs to instantly kill (MAKANITO)
  resurrection?: string[]  // Target IDs to resurrect (KADORTO)
  statusCures?: {  // Status effects to cure (LITOKAN, LATUMOFIS)
    targetIds: string[]
    cureType: 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'
  }
  causeFear?: string[]  // Target IDs that become feared (MORLIS)
  dispelEffects?: string[]  // Target IDs to dispel magic effects from (ZILWAN)
  transformations?: Array<{  // Monster transformations (HAMAN, MAHAMAN)
    monsterId: string
    newType: string
  }>
  teleport?: {  // Teleport effect (MALOR)
    success: boolean
    targetX?: number
    targetY?: number
    targetLevel?: number
  }
  recall?: {  // Recall to town (LOKTOFEIT)
    success: boolean
  }
  message: string
}

export interface CombatVictoryResult {
  xpPerCharacter: number
  gold: number
  items?: string[]
}
