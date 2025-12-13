/**
 * TeleporterHandler - Handles teleporter tile effects
 *
 * Teleporters instantly transport the party to a destination.
 * Includes loop prevention (max 3 consecutive teleports).
 */

import { TileHandler, TileHandlerContext, TileHandlerResult, createNoEffectResult } from './TileHandler'
import { TileData, TileType, DungeonState } from '@models/Dungeon'
import { GameState } from '@models/GameState'

export class TeleporterHandler implements TileHandler {
  readonly tileType: TileType = 'teleporter'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('teleporter') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state, tile } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    // Prevent infinite loops - max 3 consecutive teleports
    if (dungeon.teleportCount >= 3) {
      return {
        state,
        messages: ['The teleporter fizzles out...'],
        continueProcessing: true
      }
    }

    // Validate destination exists
    if (!tile.destination || tile.destination.x === undefined || tile.destination.y === undefined) {
      return createNoEffectResult(state)
    }

    // Execute teleport
    const newState: GameState = {
      ...state,
      dungeon: {
        ...dungeon,
        position: {
          ...dungeon.position,
          x: tile.destination.x,
          y: tile.destination.y
        },
        teleportCount: dungeon.teleportCount + 1
      }
    }

    return {
      state: newState,
      messages: [],
      continueProcessing: true // Check for effects at destination
    }
  }
}
