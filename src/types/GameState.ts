/**
 * Core game state structure
 */
export interface Party {
  inMaze: boolean
  // Additional party properties to be added later
}

export interface GameState {
  party: Party
  gold: number
  // Additional game state properties to be added later
}

export interface SaveData {
  version: string
  timestamp: number
  state: GameState
}
