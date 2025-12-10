/**
 * SaveService - Save and load game state to/from localStorage
 */

import { Injectable } from '@angular/core';
import { GameState, SaveData } from '@models/GameState'
import { Character } from '@models/Character'

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
   * Serialize GameState to JSON-compatible format
   */
  private serializeGameState(state: GameState): any {
    // Serialize combat state Maps (if combat exists)
    const serializedCombat = state.combat ? {
      ...state.combat,
      // statusDurations is Map<string, Map<status, number>> - nested Map
      statusDurations: Array.from(state.combat.statusDurations.entries()).map(
        ([id, innerMap]) => [id, Array.from(innerMap.entries())]
      ),
      // statusEffects is Map<string, Set<status>>
      statusEffects: Array.from(state.combat.statusEffects.entries()).map(
        ([id, set]) => [id, Array.from(set)]
      ),
      // acModifiers is Map<string, number>
      acModifiers: Array.from(state.combat.acModifiers.entries())
    } : undefined

    // Serialize bodies Map (convert to array for JSON, handle undefined and non-Map cases)
    const serializedBodies = state.bodies instanceof Map ? Array.from(state.bodies.entries()) : []

    // Handle optional dungeon state
    if (!state.dungeon) {
      return {
        ...state,
        roster: Array.from(state.roster.entries()),
        bodies: serializedBodies,
        combat: serializedCombat,
        dungeon: undefined
      }
    }

    // Handle visitedTiles as either Map or Set
    const visitedTilesArray = state.dungeon.visitedTiles instanceof Map
      ? Array.from(state.dungeon.visitedTiles.entries())
      : Array.from(state.dungeon.visitedTiles)

    // Handle unlockedDoors Set (convert to array for JSON serialization)
    const unlockedDoorsArray = (state.dungeon as any).unlockedDoors
      ? Array.from((state.dungeon as any).unlockedDoors)
      : []

    // Handle openDoors Set (convert to array for JSON serialization)
    const openDoorsArray = (state.dungeon as any).openDoors
      ? Array.from((state.dungeon as any).openDoors)
      : []

    // Handle lootedTiles Set (convert to array for JSON serialization)
    const lootedTilesArray = (state.dungeon as any).lootedTiles
      ? Array.from((state.dungeon as any).lootedTiles)
      : []

    return {
      ...state,
      roster: Array.from(state.roster.entries()),
      bodies: serializedBodies,
      combat: serializedCombat,
      dungeon: {
        ...state.dungeon,
        visitedTiles: visitedTilesArray,
        unlockedDoors: unlockedDoorsArray,
        openDoors: openDoorsArray,
        lootedTiles: lootedTilesArray
      }
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

    // Handle undefined/null dungeon state (castle/town)
    if (!data.dungeon) {
      return {
        ...data,
        roster: new Map(data.roster || []),
        bodies: deserializedBodies,
        combat: deserializedCombat,
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

    return {
      ...data,
      roster: new Map(data.roster || []),
      bodies: deserializedBodies,
      combat: deserializedCombat,
      settings,
      dungeon: {
        ...data.dungeon,
        visitedTiles,
        defeatedEncounters: data.dungeon.defeatedEncounters || [],
        unlockedDoors,
        openDoors,
        lootedTiles,
        // Light system defaults for old saves
        inDarknessZone: data.dungeon.inDarknessZone ?? false,
        lightSpellType: data.dungeon.lightSpellType,
        lightDurationRemaining: data.dungeon.lightDurationRemaining
      }
    }
  }

  /**
   * Save game to localStorage
   */
  async saveGame(gameState: GameState, saveSlot: number = 1): Promise<void> {
    const saveData: SaveData = {
      version: SAVE_VERSION,
      schemaVersion: SAVE_SCHEMA_VERSION,
      timestamp: Date.now(),
      state: gameState
    }

    const serialized = JSON.stringify({
      ...saveData,
      state: this.serializeGameState(gameState)
    })
    localStorage.setItem(`${SAVE_KEY}_${saveSlot}`, serialized)
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

      // Validate schema version
      if (saveData.schemaVersion !== SAVE_SCHEMA_VERSION) {
        console.log(
          `Save file schema mismatch (expected ${SAVE_SCHEMA_VERSION}, got ${saveData.schemaVersion}), clearing incompatible save`
        )
        await this.deleteSave(saveSlot)
        return null
      }

      return this.deserializeGameState(saveData.state)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Save data corrupted - invalid JSON')
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
