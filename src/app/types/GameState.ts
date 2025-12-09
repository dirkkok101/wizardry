import { Character } from './Character'
import { SceneType } from './SceneType'
import { DungeonState } from './Dungeon'
import { CombatState } from './Combat'
import { Chest } from './Chest'

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
  // Position is now tracked in dungeon.position (DungeonState)
  // dungeon.currentLevel for level, dungeon.position for x, y, facing
  light: boolean // Party has light active (LOMILWA spell or torch)
  gold: number // Party's shared gold pool for services (inn, temple, shop)
}

export interface Settings {
  difficulty: 'EASY' | 'NORMAL' | 'HARD'
  soundEnabled: boolean
  musicEnabled: boolean
  encountersEnabled: boolean // Set to false to disable random encounters (useful for testing rendering/movement)
}

/**
 * Body represents a dead character's corpse left in the dungeon.
 * Bodies must be recovered by a new party and brought to the Temple for resurrection.
 *
 * In original Wizardry (1981), when a party wipes, all dead characters' bodies
 * remain at the death location. A new party must be formed to recover them.
 */
export interface Body {
  characterId: string // ID of the dead character
  level: number // Dungeon level where character died (1-10)
  x: number // X coordinate (0-19)
  y: number // Y coordinate (0-19)
  gold?: number // Gold to recover when body is retrieved (split from party gold on abandonment)
}

/**
 * Combat rewards pending display after chest interaction.
 * Stored in GameState to persist across scene transitions.
 */
export interface PendingCombatRewards {
  totalXP: number
  xpPerCharacter: number
  livingCharacterCount: number
  monstersDefeated: number
}

export interface GameState {
  currentScene: SceneType
  roster: Map<string, Character> // All created characters
  party: Party
  dungeon?: DungeonState // Optional: undefined when in castle/town
  settings: Settings
  encounterTriggered?: boolean // Set to true when an encounter is triggered (e.g., by kicking a door)
  combat?: CombatState // Active combat state (undefined when not in combat)
  bodies?: Map<string, Body> // Dead character bodies left in dungeon (characterId -> body location)
  pendingChest?: Chest // Chest awaiting player interaction (from combat victory or exploration)
  pendingCombatRewards?: PendingCombatRewards // Combat rewards awaiting victory summary display
  /**
   * Chest alarm flag - set when an ALARM trap is triggered.
   * When player returns to maze, triggers immediate combat encounter.
   * Per Apple II reference: Alarm triggers combat with new monster group.
   */
  chestAlarmActive?: boolean
}

export interface SaveData {
  version: string
  schemaVersion: number
  timestamp: number
  state: GameState
}
