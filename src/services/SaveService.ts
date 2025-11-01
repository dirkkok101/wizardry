/**
 * SaveService - Save and load game state to/from localStorage
 */

import { Injectable } from '@angular/core';
import { GameState, SaveData } from '../types/GameState'

const SAVE_KEY = 'wizardry_save'
const SAVE_VERSION = '1.0.0'

@Injectable({
  providedIn: 'root'
})
export class SaveService {
  /**
   * Check if save data exists
   */
  async checkForSaveData(saveSlot: number = 1): Promise<boolean> {
    const saved = localStorage.getItem(`${SAVE_KEY}_${saveSlot}`)
    return saved !== null
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
}
