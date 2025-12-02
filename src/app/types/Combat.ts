// src/types/Combat.ts
import { Character } from './Character'

export type CombatActionType = 'ATTACK' | 'CAST_SPELL' | 'USE_ITEM' | 'PARRY' | 'RUN' | 'DISPEL' | 'ADVANCE' | 'BREATH' | 'CALL_FOR_HELP' | 'MONSTER_FLEE'
export type CombatantStatus = 'ALIVE' | 'DEAD' | 'ASLEEP' | 'PARALYZED'

/**
 * Temporary status effects that only last during combat
 * These are cleared when combat ends
 */
export type CombatStatusEffect = 'BLIND' | 'SILENCED'

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
  monsterClass?: string  // Monster class (dragon, mage, undead, etc.) - for purposed weapons
  // Spell casting properties
  mageLevel?: number    // 0-7, determines mage spell selection
  priestLevel?: number  // 0-7, determines priest spell selection
  // Breath weapon properties
  breathType?: 'fire' | 'cold' | 'poison' | 'stone' | 'drain'
  // Special abilities
  canCall?: boolean     // Can call for help
  canFlee?: boolean     // Can flee when demoralized
}

export type Combatant = Character | MonsterInstance

export interface CombatCommand {
  id: string
  actor: Combatant
  type: CombatActionType
  initiative: number
  target?: Combatant | Combatant[]
  targetGroupId?: 'A' | 'B' | 'C' | 'D'  // For group-based targeting (DISPEL, group spells)
  data?: any  // spell ID, item ID, etc.
  attackIndex?: number  // For multi-attack combatants: which attack (0-based) this command represents
}

export interface MonsterGroup {
  id: 'A' | 'B' | 'C' | 'D'
  monsters: MonsterInstance[]
  formation: 'front' | 'back'  // Row position
  identified: boolean  // True if LATUMAPIC has revealed monster names (expedition-long)
  /**
   * Current mage spell level for the group (degrades during combat)
   *
   * Per Apple II reference (Section 10): After casting a mage spell, there is
   * 1 / (group size + 2) chance the group's mage level decreases by 1.
   * This is PERMANENT for the encounter, affecting all monsters in the group.
   * Priest spells do NOT degrade.
   */
  currentMageLevel?: number
}

export interface CombatState {
  monsterGroups: MonsterGroup[]  // 1-4 groups (A, B, C, D)
  commandQueue: CombatCommand[]
  roundNumber: number
  combatLog: string[]
  canFlee: boolean
  dungeonLevel: number  // Current dungeon level (1-10), affects flee chance
  statusEffects: CombatStatusEffects  // Temporary status effects (blind, silenced)
  acModifiers: CombatAcModifiers  // Temporary AC bonuses (MOGREF, KALKI, etc.)
  statusDurations: StatusDurations  // Track how many rounds each status effect lasts
  monstersDemoralized?: boolean  // True when monsters have lost morale (easier flee)
  surpriseState?: 'party' | 'monsters' | 'none'  // Surprise mechanics: 20% party, 16% monsters, 64% none
}

export interface AttackResult {
  hit: boolean
  damage: number
  critical: boolean
  instantKill?: boolean
  message: string
}

/**
 * Result of executing a combat command
 * Includes state changes and optional metadata about what happened
 */
export interface CommandExecutionResult {
  newState: CombatState
  messages: string[]
  /** Damage dealt to target (if attack hit) - used for display synchronization */
  targetDamage?: {
    targetId: string
    damage: number
    newHp: number
    newStatus?: CombatantStatus
  }
  /** Character updates from this command (healing, status changes, etc.) */
  characterUpdates?: Map<string, Character>
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
  resurrection?: {  // Resurrection results (DI, KADORTO)
    targetId: string
    success: boolean
    resultStatus: 'OK' | 'ASHES' | 'LOST'  // Final status after attempt
    newHp: number | 'full'  // 1 for DI, full for KADORTO on success
    vitalityLoss: number  // 1 on attempt
    message: string
  }[]
  statusCures?: {  // Status effects to cure (LITOKAN, LATUMOFIS)
    targetIds: string[]
    cureType: 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'
  }
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
    /** Behavior mode from spell data (coordinate_teleport or random_escape) */
    mode?: 'coordinate_teleport' | 'random_escape'
    /** Dangers if teleporting into invalid location (camp mode only) */
    dangers?: {
      solidRock?: 'instant_party_death'
      outsideBounds?: 'instant_party_death'
    }
    /** Whether this mode is safe (combat mode = true, camp mode = false) */
    safe?: boolean
    /** Restrictions on teleport destination */
    restrictions?: {
      level10?: 'cannot_teleport_in'
    }
  }
  recall?: {  // Recall to town (LOKTOFEIT)
    success: boolean
    /** Equipment lost on success (LOKTOFEIT strips all equipment) */
    equipmentLost?: boolean
    /** Percentage of gold lost on success (LOKTOFEIT = 90%) */
    goldLostPercent?: number
  }
  monsterIdentification?: {  // LATUMAPIC - identifies ALL monster groups (bug-fixed)
    groupIds: Array<'A' | 'B' | 'C' | 'D'>  // All groups that are now identified
  }
  hpReduction?: {  // MABADI - reduces target HP to dice roll (cannot be resisted)
    targetId: string
    newHp: number  // Result of dice roll (e.g., 1d8 = 1-8)
  }[]
  randomEffect?: {  // HAMAN/MAHAMAN - random powerful effect
    effectId: number  // Which effect was selected (1-5 for HAMAN, 1-3 for MAHAMAN)
    effectName: string  // Human-readable effect name
    effect: string  // Effect type for processing
    healDice?: string  // For healing effects
    acValue?: number  // For AC buff effects
    durationDice?: string  // For duration-based effects
    levelDrain: number  // XP levels lost (always 1)
    mustRelearn: boolean  // Whether spell must be relearned (MAHAMAN only)
    spellbookMangled: boolean  // Whether spellbook was mangled
  }
  message: string
}

export interface CombatVictoryResult {
  xpPerCharacter: number
  gold: number
  items?: string[]
}

/**
 * Encounter configuration based on original Wizardry 1 mechanics
 *
 * Research source: Original Wizardry used weighted encounter tables where
 * multi-group encounters were rare on early levels. On Level 1, it was
 * noted that "it is rare to encounter more than two groups at one time."
 */
export const ENCOUNTER_CONFIG = {
  /**
   * Maximum number of monster groups that can occupy the front row
   * Similar to party's 3-member front row limit
   */
  MAX_FRONT_ROW_GROUPS: 2,

  /**
   * Maximum number of monster groups by dungeon level
   * Level 1: 1-2 groups
   * Level 2: 1-3 groups
   * Level 3+: 1-4 groups
   */
  getMaxGroupsForLevel(level: number): number {
    if (level === 1) return 2
    if (level === 2) return 3
    return 4
  },

  /**
   * Get weighted probabilities for number of groups by dungeon level
   * Returns array of weights for [1 group, 2 groups, 3 groups, 4 groups]
   *
   * Level 1: 85% single group, 15% two groups (multi-group is "rare")
   * Level 2: 60% single, 30% two, 10% three groups
   * Level 3: 40% single, 35% two, 20% three, 5% four groups
   * Level 4+: 25% single, 35% two, 25% three, 15% four groups
   */
  getGroupCountWeights(level: number): number[] {
    if (level === 1) return [85, 15]  // Heavily favor single groups
    if (level === 2) return [60, 30, 10]
    if (level === 3) return [40, 35, 20, 5]
    return [25, 35, 25, 15]  // Deeper levels have more multi-group encounters
  },

  /**
   * Maximum monsters per group by dungeon level
   * Level 1: 1-5 monsters
   * Level 2: 1-6 monsters
   * Level 3: 1-7 monsters
   * Level 4+: 1-8 monsters
   * Deep levels (5+): 1-9 monsters
   */
  getMaxMonstersPerGroupForLevel(level: number): number {
    if (level === 1) return 5
    if (level === 2) return 6
    if (level === 3) return 7
    if (level === 4) return 8
    return 9
  }
} as const

/**
 * Event types for combat round animation
 * Each event pairs messages with the state changes that occur when displayed
 */
export type CombatEventType = 'action' | 'poison' | 'status' | 'flee' | 'phase'

/**
 * A single event in combat round playback
 * Each event contains its messages and the state changes to apply when displayed
 *
 * The component displays messages with delays, then applies state changes
 * after the messages are shown. This synchronizes visual updates with the log.
 */
export interface CombatRoundEvent {
  /** Type of event for potential animation effects */
  type: CombatEventType

  /** Messages to display (action message first, then result with RESULT_MARKER) */
  messages: string[]

  /**
   * Updated monster groups state after this event
   * Only present if monsters were affected (damage, status change, death)
   */
  monsterGroupsSnapshot?: MonsterGroup[]

  /**
   * Character state changes to apply after this event
   * Maps character ID to partial character update (hp, status, etc.)
   */
  characterUpdates?: Map<string, CharacterUpdate>

  /** Spell point deduction info - applied after event displays */
  spellCast?: { characterId: string; spellId: string }
}

/**
 * Partial character update for animation
 * Only includes fields that can change during combat
 */
export interface CharacterUpdate {
  hp?: number
  status?: string  // CharacterStatus value
}

/**
 * Complete result of a combat round, broken into events for animation
 * Events are played back in sequence with delays between messages
 */
export interface CombatRoundResult {
  /** Sequence of events to animate in order */
  events: CombatRoundEvent[]

  /** Final combat state after all events (monster groups, round number, etc.) */
  finalState: CombatState

  /** Final accumulated character updates (for committing to roster after animation) */
  finalCharacterUpdates: Map<string, Character>

  /** Characters who cast spells this round (for spell point deduction) */
  spellCasters: Map<string, { character: Character; spellId: string }>

  /** Characters whose status changed (sleep/paralysis wore off) */
  curedCharacters: Map<string, Character>

  /** All monsters defeated */
  victory: boolean

  /** All party members fallen */
  defeat: boolean

  /** Party successfully fled */
  fled: boolean
}
