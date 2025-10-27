/**
 * SaveService - Save and load game state to/from localStorage
 */

import { GameState, SaveData } from '../types/GameState'

const SAVE_KEY = 'wizardry_save'
const SAVE_VERSION = '1.0.0'

/**
 * Check if save data exists
 */
async function checkForSaveData(): Promise<boolean> {
  const saved = localStorage.getItem(SAVE_KEY)
  return saved !== null
}

/**
 * Serialize GameState to JSON-compatible format
 */
function serializeGameState(state: GameState): any {
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
 */
function deserializeGameState(data: any): GameState {
  return {
    ...data,
    roster: new Map(data.roster),
    dungeon: {
      ...data.dungeon,
      visitedTiles: new Map(data.dungeon.visitedTiles)
    }
  }
}

/**
 * Save game to localStorage
 */
async function saveGame(gameState: GameState): Promise<void> {
  const saveData: SaveData = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    state: gameState
  }

  const serialized = JSON.stringify({
    ...saveData,
    state: serializeGameState(gameState)
  })
  localStorage.setItem(SAVE_KEY, serialized)
}

/**
 * Load game from localStorage
 */
async function loadGame(): Promise<GameState> {
  const saved = localStorage.getItem(SAVE_KEY)

  if (!saved) {
    throw new Error('No save data found')
  }

  try {
    const saveData: any = JSON.parse(saved)

    // Validate structure
    if (!saveData.state || !saveData.version) {
      throw new Error('Save data corrupted - missing required fields')
    }

    return deserializeGameState(saveData.state)
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
async function validateSaveData(): Promise<boolean> {
  try {
    await loadGame()
    return true
  } catch (error) {
    return false
  }
}

/**
 * Delete save data
 */
async function deleteSave(): Promise<void> {
  localStorage.removeItem(SAVE_KEY)
}

export const SaveService = {
  checkForSaveData,
  saveGame,
  loadGame,
  validateSaveData,
  deleteSave
}
