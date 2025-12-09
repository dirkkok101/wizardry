/**
 * Types for the Cinematic Arena Combat Visualization
 *
 * The cinematic arena transforms combat round execution into a theatrical
 * JRPG-style experience with a split-screen arena showing attacker vs target.
 */

import { CombatActionType } from '@models/Combat'

/**
 * State of the split-screen arena during action display
 */
export interface ArenaState {
  /** The attacker (left side) */
  attacker: ArenaCombatant

  /** The targets (right side) - empty array for self-targeting actions
   * Multiple targets for group spells (stacked card display)
   */
  targets: ArenaCombatant[]

  /** Action text to display (e.g., "Fighter ATTACKS") - no target, visuals show it */
  actionText: string

  /** Spell name for spell actions (e.g., "MAHALITO") */
  spellName?: string

  /** Result text after action resolves */
  resultText?: string

  /** Animation to play */
  actionAnimation: ArenaAnimation

  /** Damage result to show (if applicable) */
  damageResult?: {
    value: string
    type: DamageDisplayType
  }
}

export interface ArenaCombatant {
  id: string
  name: string
  spriteUrl: string
  type: 'character' | 'monster'
  groupId?: 'A' | 'B' | 'C' | 'D'

  // Character-specific stats (for live HP display)
  className?: string        // e.g., "FIGHTER", "MAGE"
  currentHp?: number        // Live HP (updates during combat)
  maxHp?: number            // Maximum HP

  // Monster-specific stats (for live count display)
  aliveCount?: number       // Monsters alive in group
  totalCount?: number       // Total monsters in group
}

export type ArenaAnimation =
  | 'idle'
  | 'attack'
  | 'spell'
  | 'parry'
  | 'flee'
  | 'breath'
  | 'call'
  | 'dispel'

export type DamageDisplayType = 'damage' | 'critical' | 'heal' | 'miss' | 'status'

/**
 * Timing constants for animation choreography (in milliseconds)
 * Dramatic phased reveal (~4.5s per action)
 */
export const ARENA_TIMING = {
  /** Letterbox bars slide in */
  LETTERBOX_EXPAND: 400,

  /** Attacker/target portraits slide in */
  PORTRAIT_ENTER: 400,

  /** Attacker name label reveal */
  ATTACKER_REVEAL: 400,

  /** Action verb display */
  ACTION_VERB_DISPLAY: 600,

  /** Target name label reveal */
  TARGET_REVEAL: 400,

  /** Attack lunge / spell glow duration */
  ATTACK_ANIMATION: 500,

  /** Pause before showing result (anticipation) */
  RESULT_DELAY: 800,

  /** Outcome text burst reveal */
  OUTCOME_REVEAL: 1000,

  /** Floating damage number animation */
  DAMAGE_FLOAT: 1200,

  /** Target shake on hit */
  TARGET_HIT_SHAKE: 300,

  /** Pause before next action */
  NEXT_ACTION_DELAY: 600,

  /** Letterbox collapse */
  LETTERBOX_COLLAPSE: 400,
} as const

/**
 * Get dramatic action verb for center display (uppercase, short)
 */
export function getActionVerbDisplay(animation: ArenaAnimation): string {
  switch (animation) {
    case 'attack':
      return 'ATTACKS'
    case 'spell':
      return 'CASTS'
    case 'parry':
      return 'DEFENDS'
    case 'flee':
      return 'FLEES'
    case 'breath':
      return 'BREATHES'
    case 'call':
      return 'CALLS'
    case 'dispel':
      return 'DISPELS'
    default:
      return 'ACTS'
  }
}

/**
 * Map action type to arena animation
 */
export function getArenaAnimation(actionType: CombatActionType): ArenaAnimation {
  switch (actionType) {
    case 'ATTACK':
      return 'attack'
    case 'CAST_SPELL':
      return 'spell'
    case 'PARRY':
      return 'parry'
    case 'RUN':
    case 'MONSTER_FLEE':
      return 'flee'
    case 'BREATH':
      return 'breath'
    case 'CALL_FOR_HELP':
      return 'call'
    case 'DISPEL':
      return 'dispel'
    default:
      return 'idle'
  }
}
