/**
 * SerializedTypes - Type-safe interfaces for JSON-serialized game state
 *
 * These types represent the JSON-compatible versions of GameState types.
 * Maps become [key, value][] arrays, Sets become value[] arrays.
 * This enables type-safe serialization/deserialization without 'as any' casts.
 */

import { Character } from '@models/Character'
import { CharacterStatus } from '@models/CharacterStatus'
import { SceneType } from '@models/SceneType'
import { TrapId } from '@models/Trap'
import { Party, Settings, Body, PendingCombatRewards } from '@models/GameState'
import { Position, LightSpellType } from '@models/Dungeon'

/**
 * Serialized version of DungeonState
 * All Sets become string[] for JSON compatibility
 */
export interface SerializedDungeonState {
  currentLevel: number
  position: Position
  lightActive: boolean
  lightRadius: number
  lightSpellType?: LightSpellType
  lightDurationRemaining?: number
  inDarknessZone: boolean
  teleportCount: number
  visitedTiles: string[]                    // Set<string> → string[]
  defeatedEncounters: string[]
  unlockedDoors: string[]                   // Set<string> → string[]
  openDoors: string[]                       // Set<string> → string[]
  lootedTiles: string[]                     // Set<string> → string[]
  completedConditionTiles: string[]         // Set<string> → string[]
  consumedConditionItems: string[]          // Set<string> → string[]
  latumapicActive: boolean
  pendingCampEncounter?: boolean
  expeditionAcBuff: number
  activeExpeditionSpells: string[]
  pendingSpellMessage?: string
}

/**
 * Serialized version of CombatState
 * All Maps become [key, value][] arrays
 */
export interface SerializedCombatState {
  round: number
  phase: string
  turnOrder: string[]
  currentTurnIndex: number
  partyActions: Array<[string, any]>        // Map entries
  monsterGroups: any[]                      // MonsterGroup[]
  statusDurations: Array<[string, Array<[string, number]>]>  // Nested Map
  statusEffects: Array<[string, string[]]>  // Map<string, Set> → [string, string[]][]
  acModifiers: Array<[string, number]>      // Map<string, number> entries
  monstersActed: boolean
  encounterId?: string
  canFlee: boolean
  breathUsedThisRound: Set<string> | string[]  // Accept both for backward compatibility
  fleeAttempted?: boolean
  fleeSucceeded?: boolean
}

/**
 * Serialized version of PendingTrapResult
 */
export interface SerializedPendingTrapResult {
  trapId: TrapId
  trapName: string
  message: string
  damageDealt: Array<[string, number]>           // Map<string, number> entries
  statusApplied: Array<[string, CharacterStatus]> // Map entries
  specialEffect?: string
  openerId: string
}

/**
 * Serialized version of Body (unchanged - no Maps/Sets)
 */
export type SerializedBody = Body

/**
 * Serialized version of GameState
 * roster becomes [id, character][] array
 * bodies becomes [id, body][] array
 */
export interface SerializedGameState {
  currentScene: SceneType
  roster: Array<[string, Character]>        // Map<string, Character> entries
  party: Party
  dungeon?: SerializedDungeonState
  settings: Settings
  encounterTriggered?: boolean
  combat?: SerializedCombatState
  bodies?: Array<[string, SerializedBody]>  // Map<string, Body> entries
  pendingChest?: any                        // Chest type (no Maps/Sets)
  pendingCombatRewards?: PendingCombatRewards
  pendingTrapResult?: SerializedPendingTrapResult
  chestAlarmActive?: boolean
}

/**
 * Complete serialized save data wrapper
 */
export interface SerializedSaveData {
  version: string
  schemaVersion: number
  timestamp: number
  state: SerializedGameState
  checksum?: string
}
