import { FightMapService } from './FightMapService'
import { RandomService } from './RandomService'

/**
 * Fixed encounter configuration (AUX values from original Wizardry)
 */
export interface FixedEncounterConfig {
  aux0: number  // Countdown - decrements each visit, becomes inactive at 0
  aux1: number  // Random range added to aux2
  aux2: number  // Base monster index
}

/**
 * Context for encounter checking
 */
export interface EncounterContext {
  level: number
  x: number
  y: number
  isDoorKick: boolean
  chestAlarmActive: boolean
  isRoomTile: boolean
  fixedEncounterConfig?: FixedEncounterConfig
}

/**
 * Result of encounter check
 */
export interface EncounterCheckResult {
  trigger: boolean
  reason?: EncounterReason
  fixedEncounterConfig?: FixedEncounterConfig
  guaranteedFight?: boolean
}

export type EncounterReason =
  | 'random'
  | 'door_kick'
  | 'treasure_room'
  | 'alarm'
  | 'fixed'
  | 'chest_trap'

/**
 * Encounter constants from original Wizardry 1
 */
const ENCOUNTER_CONSTANTS = {
  // Random encounter: 1 in 99 (~1.01%)
  // Original formula: (RANDOM MOD 99) === 35
  RANDOM_ENCOUNTER_MODULO: 99,
  RANDOM_ENCOUNTER_TARGET: 35,

  // Door kick: 1 in 8 (12.5%)
  // Original formula: (RANDOM MOD 8) === 3
  DOOR_KICK_MODULO: 8,
  DOOR_KICK_TARGET: 3
} as const

/**
 * EncounterTriggerService - Unified encounter trigger workflow
 *
 * Implements the priority chain for all encounter conditions from
 * the original Wizardry 1 source code.
 *
 * Priority order (highest to lowest):
 * 1. Chest alarm trap (100% - from failed disarm)
 * 2. Alarm tiles (100% - clanging bells)
 * 3. Fixed encounter squares (100% if FIGHTS=true, aux0>0)
 * 4. Treasure room (100% if not cleared)
 * 5. Door kick + Room (12.5%)
 * 6. Random movement (1%)
 *
 * Based on: docs/research/door-kicking-encounter-mechanics.md Section 6
 */
export const EncounterTriggerService = {
  /**
   * Master encounter check - implements the full priority chain
   * Called after any movement action
   */
  checkForEncounter(context: EncounterContext): EncounterCheckResult {
    const { level, x, y, isDoorKick, chestAlarmActive, isRoomTile, fixedEncounterConfig } = context

    // Priority 1: Chest alarm trap (100% - from failed disarm)
    if (chestAlarmActive) {
      return {
        trigger: true,
        reason: 'chest_trap',
        guaranteedFight: true
      }
    }

    // Priority 2: Alarm tiles (clanging bells)
    if (FightMapService.isAlarmTile(level, x, y)) {
      return {
        trigger: true,
        reason: 'alarm',
        guaranteedFight: true
      }
    }

    // Priority 3: Fixed encounter squares
    if (fixedEncounterConfig && fixedEncounterConfig.aux0 > 0) {
      // Check FIGHTMAP allows encounter (room tile not cleared)
      if (isRoomTile && FightMapService.canEncounter(level, x, y)) {
        return {
          trigger: true,
          reason: 'fixed',
          fixedEncounterConfig,
          guaranteedFight: true
        }
      }
    }

    // Priority 4: Treasure room (guaranteed if not cleared)
    if (FightMapService.hasTreasure(level, x, y) && FightMapService.canEncounter(level, x, y)) {
      return {
        trigger: true,
        reason: 'treasure_room',
        guaranteedFight: true
      }
    }

    // Priority 5: Door kick + Room (12.5%)
    // NOTE: Works even on cleared tiles - this is the farming mechanic!
    if (isDoorKick && isRoomTile && FightMapService.canEncounterDoorKick(level, x, y)) {
      if (this.checkDoorKickEncounter()) {
        return {
          trigger: true,
          reason: 'door_kick',
          guaranteedFight: false
        }
      }
    }

    // Priority 6: Random movement (1%)
    // Applies to ALL tile types (room and corridor)
    if (this.checkRandomEncounter()) {
      return {
        trigger: true,
        reason: 'random',
        guaranteedFight: false
      }
    }

    // No encounter triggered
    return { trigger: false }
  },

  /**
   * Check for random movement encounter (1% chance)
   * Original formula: (RANDOM MOD 99) === 35
   *
   * This gives exactly 1/99 = ~1.01% chance
   */
  checkRandomEncounter(): boolean {
    const roll = Math.floor(RandomService.random(0, ENCOUNTER_CONSTANTS.RANDOM_ENCOUNTER_MODULO - 1))
    return roll === ENCOUNTER_CONSTANTS.RANDOM_ENCOUNTER_TARGET
  },

  /**
   * Check for door kick encounter (12.5% chance)
   * Original formula: (RANDOM MOD 8) === 3
   *
   * This gives exactly 1/8 = 12.5% chance
   */
  checkDoorKickEncounter(): boolean {
    const roll = Math.floor(RandomService.random(0, ENCOUNTER_CONSTANTS.DOOR_KICK_MODULO - 1))
    return roll === ENCOUNTER_CONSTANTS.DOOR_KICK_TARGET
  }
}
