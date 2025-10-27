import { Character } from './Character'
import { SceneType } from './SceneType'

/**
 * Core game state structure
 */
export interface Party {
  members: string[] // Character IDs
  formation: {
    frontRow: string[] // Max 3 character IDs
    backRow: string[] // Max 3 character IDs
  }
  position: {
    x: number
    y: number
    facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'
  }
  inMaze: boolean
}

export interface Dungeon {
  currentLevel: number
  visitedTiles: Map<string, boolean>
  encounters: any[]
}

export interface Settings {
  difficulty: 'EASY' | 'NORMAL' | 'HARD'
  soundEnabled: boolean
  musicEnabled: boolean
}

export interface GameState {
  currentScene: SceneType
  roster: Map<string, Character> // All created characters
  party: Party
  dungeon: Dungeon
  settings: Settings
}

export interface SaveData {
  version: string
  timestamp: number
  state: GameState
}
