/**
 * GameInitializationService - Create new game state
 */

import { GameState } from '../types/GameState'
import { SceneType } from '../types/SceneType'
import { RaceService } from './RaceService'
import { ClassService } from './ClassService'

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
      light: false,
      gold: 100 // Starting gold for party services
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
 * Initialize game state and load game data
 *
 * Loads race and class data in parallel for optimal startup performance.
 * Must be called before character creation functionality is used.
 *
 * @throws {Error} If race or class data fails to load
 */
async function initializeGame(): Promise<void> {
  console.log('Initializing game data...')

  // Initialize data services in parallel
  await Promise.all([
    RaceService.initialize(),
    ClassService.initialize()
  ])

  console.log('Game data initialized successfully')
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
