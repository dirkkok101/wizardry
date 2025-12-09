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
  unidentifiedName: string  // Generic name shown before LATUMAPIC identification
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
  regeneration?: number // HP healed per round (25% chance)
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
  /**
   * Track if party attacked a friendly encounter (per Apple II source)
   * Used for alignment shift mechanic: 1/2000 chance GOOD→EVIL on victory
   * See: docs/research/door-kicking-encounter-mechanics.md System 10
   */
  isFriendlyEncounter?: boolean
  /**
   * Reason the encounter was triggered (for treasure mechanics)
   * Treasure room encounters guarantee a chest on victory
   */
  encounterReason?: 'random' | 'door_kick' | 'treasure_room' | 'alarm' | 'fixed' | 'chest_trap'
}

export interface AttackResult {
  hit: boolean
  damage: number
  critical: boolean
  instantKill?: boolean
  message: string
}

/**
 * Structured damage result for cinematic display
 * Used by CinematicArenaComponent to show sequential damage numbers
 */
export interface DamageResult {
  /** Target combatant ID (monster instance ID or character ID) */
  targetId: string
  /** Display name for the target */
  targetName: string
  /** Damage value dealt */
  value: number
  /** Type of effect (damage, healing, status) */
  type: 'damage' | 'healing' | 'status'
  /** Category for visual styling (normal, critical, resisted, miss) */
  category?: 'normal' | 'critical' | 'resisted' | 'miss'
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
  /** Structured damage results for multi-target spells (MAHALITO, etc.) */
  damageResults?: DamageResult[]
  /** Status effects applied by this action (sleep, paralysis, etc.) */
  statusEffects?: { target: string; effect: string }[]
  /** AC buffs applied by this action (MOGREF, KALKI, etc.) */
  acBuffs?: { target: string; acModifier: number }[]
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
 * Encounter configuration with party level override
 *
 * Most encounter config is now data-driven via JSON files:
 * - groupCountWeights, maxGroups, maxFrontRowGroups, maxMonstersPerGroup
 *
 * This config only handles runtime overrides (e.g., party level balancing)
 */
export const ENCOUNTER_CONFIG = {
  /**
   * Get group count weights with party level override for early-game balance
   *
   * @param jsonWeights - Weights from encounter JSON data
   * @param partyLevel - Optional average party level
   * @returns Weights to use (override for low-level parties, otherwise JSON)
   */
  getGroupCountWeights(jsonWeights: number[], partyLevel?: number): number[] {
    // Early game balance: low-level parties only face 1 group
    if (partyLevel !== undefined && partyLevel < 4) {
      return [100]  // Always 1 group for party levels 1-3
    }
    return jsonWeights
  },

  /**
   * Get max monsters per group with party level override for early-game balance
   *
   * Progressive scaling: L1 party = max 2 monsters, L2 = max 3, L3 = max 4
   * Combined with 1-group limit, a L1 party faces at most 2 monsters total
   *
   * @param jsonMax - Max monsters from encounter JSON data
   * @param minPartyLevel - Optional minimum party level (lowest level character)
   * @returns Max monsters to use (override for low-level parties, otherwise JSON)
   */
  getMaxMonstersPerGroup(jsonMax: number, minPartyLevel?: number): number {
    // Early game balance: cap monsters based on lowest-level party member
    if (minPartyLevel !== undefined && minPartyLevel < 4) {
      return minPartyLevel + 1  // L1 = 2, L2 = 3, L3 = 4
    }
    return jsonMax
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

  /**
   * Structured damage results for cinematic arena display
   * Contains per-target damage values for sequential animation
   * Used for group spells (MAHALITO) and multi-target effects
   */
  damageResults?: DamageResult[]

  /**
   * Status effects applied by this action (sleep, paralysis, etc.)
   * Used for cinematic arena floating status indicators
   */
  statusEffects?: { target: string; effect: string }[]

  /**
   * AC buffs applied by this action (MOGREF, KALKI, etc.)
   * Used for cinematic arena floating shield indicators
   */
  acBuffs?: { target: string; acModifier: number }[]
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

  /** New formation if party repositioned due to casualties (dead/stoned/paralyzed moved to back) */
  newFormation?: { frontRow: string[]; backRow: string[] }

  /** Optional round audit for debugging (only populated when auditing enabled) */
  audit?: CombatRoundAudit
}

/**
 * Skip reasons for combat actions
 */
export type ActionSkipReason =
  | 'DIED_BEFORE_TURN'      // Actor died earlier in this round
  | 'ALREADY_DEAD'          // Actor was dead at round start
  | 'ASLEEP'                // Actor is asleep
  | 'PARALYZED'             // Actor is paralyzed
  | 'STONED'                // Actor is petrified
  | 'SILENCED'              // Actor is silenced (spell only)
  | 'SURPRISED'             // Actor surprised (round 1 only)
  | 'NO_LONGER_EXISTS'      // Monster removed from combat
  | 'TARGET_DEAD'           // Target died before this action

/**
 * Audit entry for a single queued action
 */
export interface ActionAuditEntry {
  /** Command ID for correlation */
  commandId: string

  /** Actor name for display */
  actorName: string

  /** Actor ID for correlation */
  actorId: string

  /** Whether this is a monster or character */
  actorType: 'character' | 'monster'

  /** The action type queued */
  actionType: CombatActionType

  /** Target name(s) if applicable */
  targetName?: string

  /** Initiative value (higher = acts first) */
  initiative: number

  /** Execution status */
  status: 'pending' | 'executed' | 'skipped'

  /** Reason if skipped */
  skipReason?: ActionSkipReason

  /** Optional additional details (spell name, etc.) */
  details?: string
}

/**
 * Complete audit of a combat round
 */
export interface CombatRoundAudit {
  /** Round number */
  roundNumber: number

  /** Surprise state for this round (round 1 only) */
  surpriseState?: 'party' | 'monsters' | 'none'

  /** All queued actions in initiative order */
  actions: ActionAuditEntry[]

  /** Summary statistics */
  summary: {
    totalActions: number
    executed: number
    skipped: number
    skipReasons: Record<ActionSkipReason, number>
  }
}
