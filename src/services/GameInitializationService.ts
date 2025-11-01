/**
 * GameInitializationService - Create new game state
 */

import { GameState } from '../types/GameState'
import { SceneType } from '../types/SceneType'

let gameState: GameState | null = null

/**
 * Create a new game with default values
 */
function createNewGame(): GameState {
  return {
    currentScene: SceneType.TITLE_SCREEN,
    roster: new Map(),
    party: {
      members: [],
      formation: {
        frontRow: [],
        backRow: []
      },
      position: {
        level: 1,
        x: 0,
        y: 0,
        facing: 'NORTH'
      },
      light: false
    },
    dungeon: {
      currentLevel: 1,
      visitedTiles: new Map(),
      encounters: []
    },
    settings: {
      difficulty: 'NORMAL',
      soundEnabled: true,
      musicEnabled: true
    }
  }
}

/**
 * Initialize game state
 */
async function initializeGame(): Promise<void> {
  gameState = createNewGame()
}

/**
 * Get current game state
 */
function getGameState(): GameState {
  if (!gameState) {
    gameState = createNewGame()
  }
  return gameState
}

/**
 * Update game state
 */
function updateGameState(newState: GameState): void {
  gameState = newState
}

export const GameInitializationService = {
  createNewGame,
  initializeGame,
  getGameState,
  updateGameState
}
