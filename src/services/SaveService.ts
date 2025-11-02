/**
 * SaveService - Save and load game state to/from localStorage
 */

import { Injectable } from '@angular/core';
import { GameState, SaveData } from '../types/GameState'
import { Character } from '../types/Character'

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
    return {
      ...state,
      roster: Array.from(state.roster.entries()),
      dungeon: {
        ...state.dungeon,
        visitedTiles: Array.from(state.dungeon.visitedTiles.entries())
      }
    }
  }

  /**
   * Deserialize JSON data back to GameState
   * Handles backward compatibility with older save formats
   */
  private deserializeGameState(data: any): GameState {
    return {
      ...data,
      roster: new Map(data.roster || []),
      dungeon: data.dungeon ? {
        ...data.dungeon,
        visitedTiles: new Map(data.dungeon.visitedTiles || [])
      } : {
        currentLevel: 1,
        visitedTiles: new Map(),
        encounters: []
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
}
