/**
 * SaveService - Save and load game state to/from localStorage
 */

import { Injectable } from '@angular/core';
import { GameState, SaveData } from '@models/GameState'
import { Character } from '@models/Character'
import { StorageQuotaError, StorageUnavailableError, SaveVersionError, SaveCorruptionError } from './save/SaveErrors'
import { runMigrations } from './save/SaveMigration'
import { SerializedGameState, SerializedDungeonState, SerializedCombatState, SerializedPendingTrapResult } from './save/SerializedTypes'

const SAVE_KEY = 'wizardry_save'
const SAVE_VERSION = '1.0.0'

/**
 * Schema version for save data structure.
 * Increment this when making breaking changes to Character or other core types.
 *
 * Version History:
 * - v1: Original schema with Character having: password, gold, createdAt, lastModified
 * - v2: Character refactor - removed password, gold, createdAt, lastModified;
 *       added age, vim, spellPoints (Map), knownSpells (Set), equipment slots
 */
const SAVE_SCHEMA_VERSION = 2

/**
 * Result of importing a game state from JSON
 */
export interface ImportResult {
  success: boolean
  error?: string
  state?: GameState
}

/**
 * Metadata about a save slot without loading the full game state
 */
export interface SaveSlotMetadata {
  slotId: number
  timestamp: number
  partySize: number
  partyGold: number
  currentScene: string
  partyLevel: number // Average party level
}

@Injectable({
  providedIn: 'root'
})
export class SaveService {
  /**
   * Check if save data exists (alias for hasSaveData)
   */
  async checkForSaveData(saveSlot: number = 1): Promise<boolean> {
    const saved = localStorage.getItem(`${SAVE_KEY}_${saveSlot}`)
    return saved !== null
  }

  /**
   * Check if save data exists for a given save slot
   */
  async hasSaveData(saveSlot: number = 1): Promise<boolean> {
    return this.checkForSaveData(saveSlot);
  }

  /**
   * Check if localStorage is available and writable.
   * Tests by writing, reading, and deleting a test key.
   * @throws StorageUnavailableError if localStorage is not available
   * @throws StorageQuotaError if storage quota is exceeded
   */
  checkStorageAvailable(): void {
    const testKey = '__storage_test__'
    try {
      localStorage.setItem(testKey, 'test')
      const result = localStorage.getItem(testKey)
      localStorage.removeItem(testKey)
      if (result !== 'test') {
        throw new StorageUnavailableError()
      }
    } catch (error) {
      // Re-throw our own error types
      if (error instanceof StorageUnavailableError || error instanceof StorageQuotaError) {
        throw error
      }
      // Check for quota exceeded error (different browsers use different error types)
      if (error instanceof DOMException &&
          (error.name === 'QuotaExceededError' ||
           error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        throw new StorageQuotaError()
      }
      // Any other error means storage unavailable (SecurityError, etc.)
      throw new StorageUnavailableError()
    }
  }

  /**
   * Generate a checksum for the given data string.
   * Uses a simple hash function (djb2) that's fast and provides good distribution.
   * This is for integrity checking (detecting corruption), not security.
   */
  private generateChecksum(data: string): string {
    let hash = 5381
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash) ^ data.charCodeAt(i)
      hash = hash >>> 0 // Convert to unsigned 32-bit integer
    }
    return hash.toString(16).padStart(8, '0')
  }

  /**
   * Verify that a checksum matches the data.
   * Returns true if checksum matches or if checksum is missing (backward compatibility).
   */
  private verifyChecksum(data: string, checksum: string | undefined): boolean {
    // No checksum = old save, allow it (backward compatible)
    if (checksum === undefined) {
      return true
    }
    const computed = this.generateChecksum(data)
    return computed === checksum
  }

  /**
   * Serialize GameState to JSON-compatible format
   */
  private serializeGameState(state: GameState): SerializedGameState {
    // Serialize combat state Maps (if combat exists)
    const serializedCombat: SerializedCombatState | undefined = state.combat ? {
      monsterGroups: state.combat.monsterGroups,
      commandQueue: state.combat.commandQueue,
      roundNumber: state.combat.roundNumber,
      combatLog: state.combat.combatLog,
      canFlee: state.combat.canFlee,
      dungeonLevel: state.combat.dungeonLevel,
      // statusDurations is Map<string, Map<status, number>> - nested Map
      statusDurations: state.combat.statusDurations
        ? Array.from(state.combat.statusDurations.entries()).map(
            ([id, innerMap]) => [id, Array.from(innerMap.entries())] as [string, [string, number][]]
          )
        : [],
      // statusEffects is Map<string, Set<status>>
      statusEffects: state.combat.statusEffects
        ? Array.from(state.combat.statusEffects.entries()).map(
            ([id, set]) => [id, Array.from(set)] as [string, string[]]
          )
        : [],
      // acModifiers is Map<string, number>
      acModifiers: state.combat.acModifiers
        ? Array.from(state.combat.acModifiers.entries())
        : [],
      // Optional fields
      monstersDemoralized: state.combat.monstersDemoralized,
      surpriseState: state.combat.surpriseState,
      isFriendlyEncounter: state.combat.isFriendlyEncounter,
      encounterReason: state.combat.encounterReason,
      expeditionAcBuff: state.combat.expeditionAcBuff
    } : undefined

    // Serialize bodies Map (convert to array for JSON, handle undefined and non-Map cases)
    const serializedBodies = state.bodies instanceof Map
      ? Array.from(state.bodies.entries())
      : []

    // Serialize pendingTrapResult Maps (if exists)
    const serializedPendingTrapResult: SerializedPendingTrapResult | undefined = state.pendingTrapResult ? {
      ...state.pendingTrapResult,
      damageDealt: Array.from(state.pendingTrapResult.damageDealt.entries()),
      statusApplied: Array.from(state.pendingTrapResult.statusApplied.entries())
    } : undefined

    // Handle optional dungeon state
    if (!state.dungeon) {
      return {
        ...state,
        roster: Array.from(state.roster.entries()),
        bodies: serializedBodies,
        combat: serializedCombat,
        pendingTrapResult: serializedPendingTrapResult,
        dungeon: undefined
      }
    }

    // Serialize dungeon state - convert all Sets to arrays
    const serializedDungeon: SerializedDungeonState = {
      ...state.dungeon,
      visitedTiles: Array.from(state.dungeon.visitedTiles),
      unlockedDoors: Array.from(state.dungeon.unlockedDoors),
      openDoors: Array.from(state.dungeon.openDoors),
      lootedTiles: Array.from(state.dungeon.lootedTiles),
      completedConditionTiles: Array.from(state.dungeon.completedConditionTiles),
      consumedConditionItems: Array.from(state.dungeon.consumedConditionItems)
    }

    return {
      ...state,
      roster: Array.from(state.roster.entries()),
      bodies: serializedBodies,
      combat: serializedCombat,
      pendingTrapResult: serializedPendingTrapResult,
      dungeon: serializedDungeon
    }
  }

  /**
   * Deserialize JSON data back to GameState
   * Handles backward compatibility with older save formats
   */
  private deserializeGameState(data: any): GameState {
    // Ensure settings have proper defaults
    // Force encountersEnabled to always be true (override old saves that had it disabled)
    const settings = {
      difficulty: 'NORMAL' as const,
      soundEnabled: true,
      musicEnabled: true,
      ...data.settings,
      encountersEnabled: true // Always enabled by default
    }

    // Deserialize combat state Maps (if combat exists)
    // Handle both new format (arrays) and old format (plain objects from broken serialization)
    const deserializedCombat = data.combat ? {
      ...data.combat,
      // statusDurations is Map<string, Map<status, number>> - nested Map
      // If old format (plain object), create empty Map since old serialization was broken
      statusDurations: Array.isArray(data.combat.statusDurations)
        ? new Map(
            data.combat.statusDurations.map(
              ([id, innerArray]: [string, [string, number][]]) => [id, new Map(innerArray)]
            )
          )
        : new Map(),
      // statusEffects is Map<string, Set<status>>
      statusEffects: Array.isArray(data.combat.statusEffects)
        ? new Map(
            data.combat.statusEffects.map(
              ([id, arr]: [string, string[]]) => [id, new Set(arr)]
            )
          )
        : new Map(),
      // acModifiers is Map<string, number>
      acModifiers: Array.isArray(data.combat.acModifiers)
        ? new Map(data.combat.acModifiers)
        : new Map()
    } : undefined

    // Deserialize bodies Map (from array, handle old saves that don't have it)
    const deserializedBodies = Array.isArray(data.bodies) ? new Map(data.bodies) : new Map()

    // Deserialize pendingTrapResult Maps (if exists)
    // Handle old saves where Maps became {} (plain objects) from broken serialization
    const deserializedPendingTrapResult = data.pendingTrapResult ? {
      ...data.pendingTrapResult,
      damageDealt: Array.isArray(data.pendingTrapResult.damageDealt)
        ? new Map(data.pendingTrapResult.damageDealt)
        : new Map(),
      statusApplied: Array.isArray(data.pendingTrapResult.statusApplied)
        ? new Map(data.pendingTrapResult.statusApplied)
        : new Map()
    } : undefined

    // Handle undefined/null dungeon state (castle/town)
    if (!data.dungeon) {
      return {
        ...data,
        roster: new Map(data.roster || []),
        bodies: deserializedBodies,
        combat: deserializedCombat,
        pendingTrapResult: deserializedPendingTrapResult,
        dungeon: undefined,
        settings
      }
    }

    // Determine if visitedTiles is Map format (array of [key, value] pairs) or Set format (array of strings)
    const visitedTilesData = data.dungeon?.visitedTiles || []
    let visitedTiles
    if (visitedTilesData.length === 0) {
      // Default to Set (current format)
      visitedTiles = new Set()
    } else if (Array.isArray(visitedTilesData[0])) {
      // Old format: array of [key, value] pairs (convert to Set)
      visitedTiles = new Set(visitedTilesData.map(([key]: [string, any]) => key))
    } else {
      // New format: array of strings
      visitedTiles = new Set(visitedTilesData)
    }

    // Deserialize unlockedDoors Set (from array)
    const unlockedDoorsData = data.dungeon?.unlockedDoors || []
    const unlockedDoors = new Set(unlockedDoorsData)

    // Deserialize openDoors Set (from array)
    const openDoorsData = data.dungeon?.openDoors || []
    const openDoors = new Set(openDoorsData)

    // Deserialize lootedTiles Set (from array)
    // Handle old saves that don't have lootedTiles or have invalid format
    const lootedTilesData = data.dungeon?.lootedTiles
    const lootedTiles = Array.isArray(lootedTilesData) ? new Set(lootedTilesData) : new Set()

    // Deserialize completedConditionTiles Set (from array)
    // Handle old saves that don't have completedConditionTiles
    const completedConditionTilesData = data.dungeon?.completedConditionTiles
    const completedConditionTiles = Array.isArray(completedConditionTilesData)
      ? new Set(completedConditionTilesData)
      : new Set()

    // Deserialize consumedConditionItems Set (from array)
    // Handle old saves that don't have consumedConditionItems
    const consumedConditionItemsData = data.dungeon?.consumedConditionItems
    const consumedConditionItems = Array.isArray(consumedConditionItemsData)
      ? new Set(consumedConditionItemsData)
      : new Set()

    return {
      ...data,
      roster: new Map(data.roster || []),
      bodies: deserializedBodies,
      combat: deserializedCombat,
      pendingTrapResult: deserializedPendingTrapResult,
      settings,
      dungeon: {
        ...data.dungeon,
        visitedTiles,
        defeatedEncounters: data.dungeon.defeatedEncounters || [],
        unlockedDoors,
        openDoors,
        lootedTiles,
        completedConditionTiles,
        consumedConditionItems,
        // Light system defaults for old saves
        inDarknessZone: data.dungeon.inDarknessZone ?? false,
        lightSpellType: data.dungeon.lightSpellType,
        lightDurationRemaining: data.dungeon.lightDurationRemaining
      }
    }
  }

  /**
   * Save game to localStorage
   * @throws StorageUnavailableError if localStorage is not available
   * @throws StorageQuotaError if storage quota is exceeded
   */
  async saveGame(gameState: GameState, saveSlot: number = 1): Promise<void> {
    // Check storage availability before attempting to save
    this.checkStorageAvailable()

    // Build save data without checksum first
    const saveDataWithoutChecksum = {
      version: SAVE_VERSION,
      schemaVersion: SAVE_SCHEMA_VERSION,
      timestamp: Date.now(),
      state: this.serializeGameState(gameState)
    }

    // Serialize to compute checksum
    const dataToChecksum = JSON.stringify(saveDataWithoutChecksum)
    const checksum = this.generateChecksum(dataToChecksum)

    // Add checksum to final save
    const serialized = JSON.stringify({
      ...saveDataWithoutChecksum,
      checksum
    })

    try {
      localStorage.setItem(`${SAVE_KEY}_${saveSlot}`, serialized)
    } catch (error) {
      // Check for quota exceeded error (different browsers use different error types)
      if (error instanceof DOMException &&
          (error.name === 'QuotaExceededError' ||
           error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        throw new StorageQuotaError()
      }
      // Re-throw other errors
      throw error
    }
  }

  /**
   * Load game from localStorage
   */
  async loadGame(saveSlot: number = 1): Promise<GameState | null> {
    const saved = localStorage.getItem(`${SAVE_KEY}_${saveSlot}`)

    if (!saved) {
      return null
    }

    try {
      const saveData: any = JSON.parse(saved)

      // Validate structure
      if (!saveData.state || !saveData.version) {
        throw new Error('Save data corrupted - missing required fields')
      }

      // Verify checksum if present (skip for old saves without checksum)
      if (saveData.checksum !== undefined) {
        // Rebuild data without checksum to verify
        const { checksum, ...dataWithoutChecksum } = saveData
        const dataToVerify = JSON.stringify(dataWithoutChecksum)

        if (!this.verifyChecksum(dataToVerify, checksum)) {
          throw new SaveCorruptionError('Save data checksum mismatch - data may be corrupted')
        }
      }

      // Run migrations if needed (throws SaveVersionError for future versions)
      const migratedData = runMigrations(saveData, SAVE_SCHEMA_VERSION)

      // If migrations were applied, save the migrated data back (with new checksum)
      if (migratedData.schemaVersion !== saveData.schemaVersion) {
        console.log(`Save migrated from v${saveData.schemaVersion ?? 1} to v${SAVE_SCHEMA_VERSION}`)
        // Compute new checksum for migrated data
        const { checksum: _oldChecksum, ...migratedWithoutChecksum } = migratedData
        const dataForChecksum = JSON.stringify(migratedWithoutChecksum)
        const newChecksum = this.generateChecksum(dataForChecksum)
        const serialized = JSON.stringify({ ...migratedWithoutChecksum, checksum: newChecksum })
        localStorage.setItem(`${SAVE_KEY}_${saveSlot}`, serialized)
      }

      return this.deserializeGameState(migratedData.state)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Save data corrupted - invalid JSON')
      }
      // Re-throw SaveVersionError and SaveCorruptionError
      if (error instanceof SaveVersionError || error instanceof SaveCorruptionError) {
        throw error
      }
      throw error
    }
  }

  /**
   * Validate save data structure
   */
  async validateSaveData(saveSlot: number = 1): Promise<boolean> {
    try {
      const state = await this.loadGame(saveSlot)
      return state !== null
    } catch (error) {
      return false
    }
  }

  /**
   * Delete save data
   */
  async deleteSave(saveSlot: number = 1): Promise<void> {
    localStorage.removeItem(`${SAVE_KEY}_${saveSlot}`)
  }

  /**
   * Get metadata for a save slot without loading the full game state.
   * Returns null if the slot is empty.
   */
  async getSlotMetadata(slotId: number): Promise<SaveSlotMetadata | null> {
    const saved = localStorage.getItem(`${SAVE_KEY}_${slotId}`)

    if (!saved) {
      return null
    }

    try {
      const saveData: any = JSON.parse(saved)

      // Validate structure
      if (!saveData.state || !saveData.version || !saveData.timestamp) {
        return null
      }

      // Check schema version - return null for incompatible saves
      if (saveData.schemaVersion !== SAVE_SCHEMA_VERSION) {
        return null
      }

      const state = saveData.state

      // Calculate party size
      const partySize = state.party?.members?.length || 0

      // Calculate party gold
      const partyGold = state.party?.gold || 0

      // Get current scene
      const currentScene = state.currentScene || 'UNKNOWN'

      // Calculate average party level
      let partyLevel = 0
      if (partySize > 0 && state.roster) {
        const roster = new Map(state.roster)
        const partyMembers = state.party.members || []
        const levels = partyMembers
          .map((memberId: string) => {
            const character = roster.get(memberId) as Character | undefined
            return character?.level || 1
          })
          .filter((level: number) => level > 0)

        if (levels.length > 0) {
          const sum = levels.reduce((acc: number, level: number) => acc + level, 0)
          partyLevel = Math.round(sum / levels.length)
        }
      }

      return {
        slotId,
        timestamp: saveData.timestamp,
        partySize,
        partyGold,
        currentScene,
        partyLevel
      }
    } catch (error) {
      // If parsing fails, treat as empty slot
      return null
    }
  }

  /**
   * Export current game state as JSON string for backup/download
   */
  exportGameState(gameState: GameState): string {
    const saveData = {
      version: SAVE_VERSION,
      schemaVersion: SAVE_SCHEMA_VERSION,
      timestamp: Date.now(),
      state: this.serializeGameState(gameState)
    }

    return JSON.stringify(saveData, null, 2)
  }

  /**
   * Import and validate game state from JSON string
   * Returns the deserialized state if valid, or an error message if invalid
   */
  importGameState(json: string): ImportResult {
    // 1. Parse JSON
    let data: any
    try {
      data = JSON.parse(json)
    } catch {
      return { success: false, error: 'Invalid JSON format' }
    }

    // 2. Validate required wrapper fields
    if (!data.state) {
      return { success: false, error: 'Missing required field: state' }
    }

    // 3. Validate schema version
    if (data.schemaVersion !== SAVE_SCHEMA_VERSION) {
      return {
        success: false,
        error: `Incompatible schema version (expected ${SAVE_SCHEMA_VERSION}, got ${data.schemaVersion})`
      }
    }

    // 4. Validate required state fields
    const state = data.state
    if (!state.roster) {
      return { success: false, error: 'Missing required field: roster' }
    }
    if (!state.party) {
      return { success: false, error: 'Missing required field: party' }
    }
    if (!state.currentScene) {
      return { success: false, error: 'Missing required field: currentScene' }
    }

    // 5. Deserialize and return
    try {
      const deserializedState = this.deserializeGameState(state)
      return { success: true, state: deserializedState }
    } catch (error) {
      return {
        success: false,
        error: `Failed to deserialize state: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}
