/**
 * GameInitializationService - Create new game state
 */

import { GameState } from '../types/GameState'

/**
 * Create a new game with default values
 */
function createNewGame(): GameState {
  return {
    party: {
      inMaze: false
    },
    gold: 0
  }
}

export const GameInitializationService = {
  createNewGame
}
