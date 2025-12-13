/**
 * TileHandler - Strategy pattern interface for tile effects
 *
 * Each tile type (teleporter, spinner, chute, pit, stairs, elevator, darkness)
 * has its own handler implementing this interface.
 *
 * Benefits:
 * - Open/Closed Principle: Add new tile types without modifying existing code
 * - Single Responsibility: Each handler manages one tile type
 * - Testability: Test handlers in isolation
 */

import { GameState } from '@models/GameState'
import { TileData, TileType, Position, Direction, ConditionResult, MessageStyle, Destination } from '@models/Dungeon'

/**
 * Context passed to tile handlers for decision making
 */
export interface TileHandlerContext {
  /** Current game state */
  state: GameState
  /** The tile being entered */
  tile: TileData
  /** Position before entering this tile */
  previousPosition: Position
  /** Current dungeon level */
  currentLevel: number
}

/**
 * Result from handling a tile effect
 */
export interface TileHandlerResult {
  /** Updated game state after tile effect */
  state: GameState
  /** Messages to display to the player */
  messages: string[]
  /** Whether movement should continue (for chained effects) */
  continueProcessing: boolean
  /** Entry message from tile (for letterbox display) */
  entryMessage?: string
  /** Style for entry message */
  entryMessageStyle?: MessageStyle
  /** Condition result if tile has conditional access */
  conditionResult?: ConditionResult
  /** Whether encounter check should be suppressed */
  suppressEncounter?: boolean
  /** Whether this tile triggers special UI (elevator dialog, etc.) */
  requiresUIInteraction?: boolean
  /** UI interaction type */
  uiInteractionType?: 'elevator' | 'stairs_choice'
  /** Available destinations for UI interaction */
  destinations?: Destination[]
}

/**
 * Interface for tile effect handlers
 */
export interface TileHandler {
  /** The tile type this handler manages */
  readonly tileType: TileType

  /**
   * Check if this handler can process the given tile
   */
  canHandle(tile: TileData): boolean

  /**
   * Process the tile effect and return the result
   */
  handle(context: TileHandlerContext): TileHandlerResult
}

/**
 * Priority order for tile handlers
 * Conditions must be checked before other effects
 */
export const TILE_HANDLER_PRIORITY: TileType[] = [
  // Conditions first (can block entry)
  // Note: Conditions are handled separately before this

  // Transportation effects
  'teleporter',
  'chute',
  'pit',
  'stairs_up',
  'stairs_down',
  'elevator',

  // Orientation effects
  'spinner',

  // Environmental effects
  'darkness_zone_start',
  'darkness',
  'anti_magic',

  // Interaction tiles (handled elsewhere)
  'searchable',
  'fixed_encounter',
  'message',
  'room'
]

/**
 * Create a default handler result (no effect)
 */
export function createNoEffectResult(state: GameState): TileHandlerResult {
  return {
    state,
    messages: [],
    continueProcessing: true
  }
}

/**
 * Create a handler result with updated state
 */
export function createStateUpdateResult(
  state: GameState,
  messages: string[] = []
): TileHandlerResult {
  return {
    state,
    messages,
    continueProcessing: true
  }
}
