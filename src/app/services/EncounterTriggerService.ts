import { FightMapService } from './FightMapService'
import { RandomService } from './RandomService'
import { CombatState, MonsterGroup } from '@models/Combat'

/**
 * Fixed encounter configuration
 *
 * Modern replacement for the original AUX system (aux0/aux1/aux2).
 * Uses direct monster IDs instead of table index arithmetic.
 */
export interface FixedEncounterConfig {
  encounterId: string     // Direct monster ID (e.g., "murphy_ghost")
  repeatable: boolean     // true = resets on level re-entry, false = one-time only
  cannotFlee?: boolean    // Optional: forces combat without flee option
  triggered?: boolean     // Runtime state: has this been triggered this visit?
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
 * 3. Fixed encounter squares (100% if encounterId exists and not triggered)
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

    console.log(`[Encounter] Checking encounter at (${x}, ${y}) level ${level}. isDoorKick: ${isDoorKick}, isRoomTile: ${isRoomTile}`)

    // Priority 1: Chest alarm trap (100% - from failed disarm)
    if (chestAlarmActive) {
      console.log(`[Encounter] Priority 1: Chest alarm ACTIVE -> ENCOUNTER`)
      return {
        trigger: true,
        reason: 'chest_trap',
        guaranteedFight: true
      }
    }

    // Priority 2: Alarm tiles (clanging bells)
    if (FightMapService.isAlarmTile(level, x, y)) {
      console.log(`[Encounter] Priority 2: Alarm tile -> ENCOUNTER`)
      return {
        trigger: true,
        reason: 'alarm',
        guaranteedFight: true
      }
    }

    // Priority 3: Fixed encounter squares
    // Note: Fixed encounters can trigger in rooms OR corridors
    // They have their own triggered state, not the room-based clearing
    if (fixedEncounterConfig && fixedEncounterConfig.encounterId && !fixedEncounterConfig.triggered) {
      console.log(`[Encounter] Priority 3: Fixed encounter (${fixedEncounterConfig.encounterId}) -> ENCOUNTER`)
      return {
        trigger: true,
        reason: 'fixed',
        fixedEncounterConfig,
        guaranteedFight: true
      }
    }

    // Priority 4: Treasure room (guaranteed if not cleared)
    const isTreasureRoom = FightMapService.hasTreasure(level, x, y)
    const canEncounter = FightMapService.canEncounter(level, x, y)
    console.log(`[Encounter] Priority 4: Treasure room check. isTreasure: ${isTreasureRoom}, canEncounter: ${canEncounter}`)
    if (isTreasureRoom && canEncounter) {
      console.log(`[Encounter] Priority 4: Treasure room -> ENCOUNTER`)
      return {
        trigger: true,
        reason: 'treasure_room',
        guaranteedFight: true
      }
    }

    // Priority 5: Door kick + Room (12.5%)
    // NOTE: Works even on cleared tiles - this is the farming mechanic!
    if (isDoorKick && isRoomTile && FightMapService.canEncounterDoorKick(level, x, y)) {
      console.log(`[Encounter] Priority 5: Door kick eligible, rolling...`)
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
    console.log(`[Encounter] Priority 6: Random encounter check...`)
    if (this.checkRandomEncounter()) {
      return {
        trigger: true,
        reason: 'random',
        guaranteedFight: false
      }
    }

    // No encounter triggered
    console.log(`[Encounter] No encounter triggered`)
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
    const triggered = roll === ENCOUNTER_CONSTANTS.RANDOM_ENCOUNTER_TARGET
    console.log(`[Encounter] Random check: rolled ${roll}, target ${ENCOUNTER_CONSTANTS.RANDOM_ENCOUNTER_TARGET} (1 in 99 = ~1%). Encounter: ${triggered}`)
    return triggered
  },

  /**
   * Check for door kick encounter (12.5% chance)
   * Original formula: (RANDOM MOD 8) === 3
   *
   * This gives exactly 1/8 = 12.5% chance
   */
  checkDoorKickEncounter(): boolean {
    const roll = Math.floor(RandomService.random(0, ENCOUNTER_CONSTANTS.DOOR_KICK_MODULO - 1))
    const triggered = roll === ENCOUNTER_CONSTANTS.DOOR_KICK_TARGET
    console.log(`[Encounter] Door kick check: rolled ${roll}, target ${ENCOUNTER_CONSTANTS.DOOR_KICK_TARGET} (1 in 8 = 12.5%). Encounter: ${triggered}`)
    return triggered
  },

  /**
   * Create combat state for ALARM trap encounters
   *
   * This follows the "Components as Presenters" pattern by moving
   * CombatState construction from chest-playback.component.ts to the service layer.
   *
   * @param dungeonLevel - Current dungeon level (1-10)
   * @param monsterGroups - Monster groups for this encounter
   * @returns Complete CombatState ready for combat planning
   */
  createAlarmCombatState(dungeonLevel: number, monsterGroups: MonsterGroup[]): CombatState {
    return {
      monsterGroups,
      commandQueue: [],
      roundNumber: 1,
      combatLog: ['An alarm trap has been triggered!'],
      canFlee: true,
      dungeonLevel,
      statusEffects: new Map(),
      acModifiers: new Map(),
      statusDurations: new Map(),
      encounterReason: 'alarm' as const
    }
  }
}
