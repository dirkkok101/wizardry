/**
 * Status Effect Service
 *
 * Manages combat status effects (BLIND, SILENCED, ASLEEP, PARALYZED, etc.)
 * including application, removal, duration tracking, and recovery.
 *
 * @see docs/research/combat-formulas.md
 */

import {
  CombatState,
  MonsterGroup,
  CombatStatusEffect,
  DurationTrackedStatus,
  CombatStatusEffects,
  StatusDurations,
  CombatAcModifiers,
} from '@models/Combat'
import { RandomService } from '@services/RandomService'
import { STATUS_RECOVERY } from '../CombatConstants'

// ============================================================================
// Status Effect Queries
// ============================================================================

/**
 * Check if a combatant has a specific combat status effect
 */
export function hasStatusEffect(
  state: CombatState,
  combatantId: string,
  effect: CombatStatusEffect
): boolean {
  const effects = state.statusEffects.get(combatantId)
  return effects ? effects.has(effect) : false
}

/**
 * Get all status effects for a combatant
 */
export function getStatusEffects(
  state: CombatState,
  combatantId: string
): Set<CombatStatusEffect> {
  return state.statusEffects.get(combatantId) ?? new Set()
}

/**
 * Get the duration of a status effect for a combatant
 * Returns 0 if no duration is set, -1 for permanent effects
 */
export function getStatusDuration(
  state: CombatState,
  combatantId: string,
  status: DurationTrackedStatus
): number {
  const durations = state.statusDurations.get(combatantId)
  return durations?.get(status) ?? 0
}

// ============================================================================
// Status Effect Application (Immutable Updates)
// ============================================================================

/**
 * Apply a combat status effect to a combatant
 * Returns new state (immutable)
 */
export function applyStatusEffect(
  state: CombatState,
  combatantId: string,
  effect: CombatStatusEffect
): CombatState {
  const newStatusEffects = new Map(state.statusEffects)
  const existing = newStatusEffects.get(combatantId) || new Set()
  newStatusEffects.set(combatantId, new Set([...existing, effect]))

  return {
    ...state,
    statusEffects: newStatusEffects,
  }
}

/**
 * Remove a combat status effect from a combatant
 * Returns new state (immutable)
 */
export function removeStatusEffect(
  state: CombatState,
  combatantId: string,
  effect: CombatStatusEffect
): CombatState {
  const newStatusEffects = new Map(state.statusEffects)
  const existing = newStatusEffects.get(combatantId)

  if (existing) {
    const newEffects = new Set(existing)
    newEffects.delete(effect)

    if (newEffects.size === 0) {
      newStatusEffects.delete(combatantId)
    } else {
      newStatusEffects.set(combatantId, newEffects)
    }
  }

  return {
    ...state,
    statusEffects: newStatusEffects,
  }
}

/**
 * Set duration for a status effect
 * Returns new state (immutable)
 *
 * @param duration - Number of rounds, or -1 for permanent
 */
export function setStatusDuration(
  state: CombatState,
  combatantId: string,
  status: DurationTrackedStatus,
  duration: number
): CombatState {
  const newDurations = new Map(state.statusDurations)
  const existing = newDurations.get(combatantId) || new Map()
  const updatedDurations = new Map(existing)
  updatedDurations.set(status, duration)
  newDurations.set(combatantId, updatedDurations)

  return {
    ...state,
    statusDurations: newDurations,
  }
}

/**
 * Remove duration tracking for a status effect
 */
export function removeStatusDuration(
  state: CombatState,
  combatantId: string,
  status: DurationTrackedStatus
): CombatState {
  const newDurations = new Map(state.statusDurations)
  const existing = newDurations.get(combatantId)

  if (existing) {
    const updatedDurations = new Map(existing)
    updatedDurations.delete(status)

    if (updatedDurations.size === 0) {
      newDurations.delete(combatantId)
    } else {
      newDurations.set(combatantId, updatedDurations)
    }
  }

  return {
    ...state,
    statusDurations: newDurations,
  }
}

// ============================================================================
// Monster Status Application
// ============================================================================

/**
 * Apply ASLEEP status to a monster
 * Updates the monster's status field to 'ASLEEP'
 */
export function applyAsleepToMonster(
  state: CombatState,
  monsterId: string
): CombatState {
  const newMonsterGroups = state.monsterGroups.map(group => ({
    ...group,
    monsters: group.monsters.map(m => {
      if (m.id !== monsterId) return m
      // Only put alive monsters to sleep
      if (m.status === 'ALIVE') {
        return { ...m, status: 'ASLEEP' as const }
      }
      return m
    }),
  }))

  return { ...state, monsterGroups: newMonsterGroups }
}

/**
 * Apply PARALYZED status to a monster
 */
export function applyParalyzedToMonster(
  state: CombatState,
  monsterId: string
): CombatState {
  const newMonsterGroups = state.monsterGroups.map(group => ({
    ...group,
    monsters: group.monsters.map(m => {
      if (m.id !== monsterId) return m
      // Only paralyze alive monsters
      if (m.status === 'ALIVE') {
        return { ...m, status: 'PARALYZED' as const }
      }
      return m
    }),
  }))

  return { ...state, monsterGroups: newMonsterGroups }
}

/**
 * Wake a monster from sleep (damage or natural recovery)
 */
export function wakeMonster(
  state: CombatState,
  monsterId: string
): CombatState {
  const newMonsterGroups = state.monsterGroups.map(group => ({
    ...group,
    monsters: group.monsters.map(m => {
      if (m.id !== monsterId) return m
      if (m.status === 'ASLEEP') {
        return { ...m, status: 'ALIVE' as const }
      }
      return m
    }),
  }))

  return { ...state, monsterGroups: newMonsterGroups }
}

// ============================================================================
// AC Modifier Management
// ============================================================================

/**
 * Get AC modifier for a combatant
 */
export function getAcModifier(state: CombatState, combatantId: string): number {
  return state.acModifiers.get(combatantId) ?? 0
}

/**
 * Apply AC buff to a combatant (stacks with existing)
 */
export function applyAcBuff(
  state: CombatState,
  combatantId: string,
  acModifier: number
): CombatState {
  const newAcModifiers = new Map(state.acModifiers)
  const currentModifier = newAcModifiers.get(combatantId) ?? 0
  newAcModifiers.set(combatantId, currentModifier + acModifier)

  return { ...state, acModifiers: newAcModifiers }
}

/**
 * Remove all AC modifiers for a combatant
 */
export function clearAcModifier(
  state: CombatState,
  combatantId: string
): CombatState {
  const newAcModifiers = new Map(state.acModifiers)
  newAcModifiers.delete(combatantId)

  return { ...state, acModifiers: newAcModifiers }
}

// ============================================================================
// Duration Tick / Status Recovery
// ============================================================================

/**
 * Tick all status durations at the end of a round
 * Returns updated state with decremented durations and removed expired effects
 */
export function tickStatusDurations(state: CombatState): CombatState {
  const newDurations: StatusDurations = new Map()
  const newStatusEffects: CombatStatusEffects = new Map(state.statusEffects)

  for (const [combatantId, durationMap] of state.statusDurations) {
    const updatedDurations = new Map<DurationTrackedStatus, number>()

    for (const [status, duration] of durationMap) {
      // -1 means permanent, don't decrement
      if (duration === -1) {
        updatedDurations.set(status, duration)
        continue
      }

      const newDuration = duration - 1

      if (newDuration <= 0) {
        // Effect expired - remove from status effects if it's a combat effect
        if (status === 'BLIND' || status === 'SILENCED') {
          const effects = newStatusEffects.get(combatantId)
          if (effects) {
            const newEffects = new Set(effects)
            newEffects.delete(status)
            if (newEffects.size === 0) {
              newStatusEffects.delete(combatantId)
            } else {
              newStatusEffects.set(combatantId, newEffects)
            }
          }
        }
      } else {
        updatedDurations.set(status, newDuration)
      }
    }

    if (updatedDurations.size > 0) {
      newDurations.set(combatantId, updatedDurations)
    }
  }

  return {
    ...state,
    statusDurations: newDurations,
    statusEffects: newStatusEffects,
  }
}

/**
 * Process monster status recovery at end of round
 * - Sleeping monsters have 25% chance to wake each round
 * - Paralyzed monsters recover based on duration
 *
 * Returns updated state and list of recovered monster IDs
 */
export function processMonsterStatusRecovery(
  state: CombatState
): { newState: CombatState; recoveredIds: string[] } {
  const recoveredIds: string[] = []
  let newState = state

  for (const group of state.monsterGroups) {
    for (const monster of group.monsters) {
      if (monster.status === 'ASLEEP') {
        // 25% chance to wake up each round
        if (RandomService.chance(STATUS_RECOVERY.MONSTER_WAKE_CHANCE)) {
          newState = wakeMonster(newState, monster.id)
          recoveredIds.push(monster.id)
        }
      }
    }
  }

  return { newState, recoveredIds }
}

// ============================================================================
// Cure Status Effects
// ============================================================================

export type CureType = 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'

/**
 * Cure status effects for specified combatants
 */
export function applyCureStatus(
  state: CombatState,
  targetIds: string[],
  cureType: CureType
): CombatState {
  let newState = state

  for (const targetId of targetIds) {
    // Cure combat status effects (BLIND, SILENCED)
    if (cureType === 'blind' || cureType === 'all') {
      newState = removeStatusEffect(newState, targetId, 'BLIND')
      newState = removeStatusDuration(newState, targetId, 'BLIND')
    }

    if (cureType === 'silence' || cureType === 'all') {
      newState = removeStatusEffect(newState, targetId, 'SILENCED')
      newState = removeStatusDuration(newState, targetId, 'SILENCED')
    }

    // Cure monster status (ASLEEP, PARALYZED)
    if (cureType === 'asleep' || cureType === 'all') {
      newState = wakeMonster(newState, targetId)
      newState = removeStatusDuration(newState, targetId, 'ASLEEP')
    }

    if (cureType === 'paralysis' || cureType === 'all') {
      // Cure paralysis on monsters
      const newMonsterGroups = newState.monsterGroups.map(group => ({
        ...group,
        monsters: group.monsters.map(m => {
          if (m.id !== targetId) return m
          if (m.status === 'PARALYZED') {
            return { ...m, status: 'ALIVE' as const }
          }
          return m
        }),
      }))
      newState = { ...newState, monsterGroups: newMonsterGroups }
      newState = removeStatusDuration(newState, targetId, 'PARALYZED')
    }

    if (cureType === 'poison' || cureType === 'all') {
      newState = removeStatusDuration(newState, targetId, 'POISONED')
    }
  }

  return newState
}

/**
 * Status Effect Service class (static methods for backward compatibility)
 */
export class StatusEffectService {
  static hasStatusEffect = hasStatusEffect
  static getStatusEffects = getStatusEffects
  static getStatusDuration = getStatusDuration
  static applyStatusEffect = applyStatusEffect
  static removeStatusEffect = removeStatusEffect
  static setStatusDuration = setStatusDuration
  static removeStatusDuration = removeStatusDuration
  static applyAsleepToMonster = applyAsleepToMonster
  static applyParalyzedToMonster = applyParalyzedToMonster
  static wakeMonster = wakeMonster
  static getAcModifier = getAcModifier
  static applyAcBuff = applyAcBuff
  static clearAcModifier = clearAcModifier
  static tickStatusDurations = tickStatusDurations
  static processMonsterStatusRecovery = processMonsterStatusRecovery
  static applyCureStatus = applyCureStatus
}
