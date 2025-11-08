import { Character } from './Character'
import { SceneType } from './SceneType'
import { DungeonState } from './Dungeon'
import { CombatState } from './Combat'

/**
 * Party represents the player's adventuring party.
 *
 * Design Decision: Party is ALWAYS present in GameState (never null).
 * An empty party has members: [] rather than being null.
 * This simplifies state management by eliminating null checks.
 *
 * Use `party.members.length === 0` to check for empty party,
 * not `party === null`.
 */
export interface Party {
  members: string[] // Character IDs (1-6). Empty array = no active party
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
  gold: number // Party's shared gold pool for services (inn, temple, shop)
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
  dungeon: DungeonState
  settings: Settings
  encounterTriggered?: boolean // Set to true when an encounter is triggered (e.g., by kicking a door)
  combat?: CombatState // Active combat state (undefined when not in combat)
}

export interface SaveData {
  version: string
  schemaVersion: number
  timestamp: number
  state: GameState
}
