import { Character } from './Character'
import { SceneType } from './SceneType'

/**
 * Core game state structure
 */
export interface Party {
  members: string[] // Character IDs (1-6)
  formation: {
    frontRow: string[] // Max 3 character IDs
    backRow: string[] // Max 3 character IDs
  }
  position: {
    level: number // Dungeon level (1-10)
    x: number // X coordinate (0-19)
    y: number // Y coordinate (0-19)
    facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'
  }
  light: boolean // Party has light active (LOMILWA spell or torch)
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
