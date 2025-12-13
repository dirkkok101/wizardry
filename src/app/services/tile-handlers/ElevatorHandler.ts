/**
 * ElevatorHandler - Handles elevator tile effects
 *
 * Elevators allow the party to choose their destination from a list.
 * Unlike stairs, elevators can skip multiple levels.
 * UI interaction is required to select destination.
 */

import { TileHandler, TileHandlerContext, TileHandlerResult, createNoEffectResult } from './TileHandler'
import { TileData, TileType, DungeonState } from '@models/Dungeon'
import { GameState } from '@models/GameState'

export class ElevatorHandler implements TileHandler {
  readonly tileType: TileType = 'elevator'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('elevator') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state, tile } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    // Elevators require UI interaction to select destination
    // Return result that signals component to show elevator dialog
    const destinations = tile.destinations ?? []

    if (destinations.length === 0) {
      return {
        state,
        messages: ['The elevator mechanism is broken.'],
        continueProcessing: true
      }
    }

    return {
      state,
      messages: [],
      continueProcessing: false, // Wait for player choice
      requiresUIInteraction: true,
      uiInteractionType: 'elevator',
      destinations
    }
  }

  /**
   * Execute elevator transition to selected destination
   * Called by component after player selects destination
   */
  static executeTransition(state: GameState, destinationLevel: number, x?: number, y?: number): GameState {
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return state
    }

    return {
      ...state,
      dungeon: {
        ...dungeon,
        currentLevel: destinationLevel,
        position: {
          ...dungeon.position,
          x: x ?? dungeon.position.x,
          y: y ?? dungeon.position.y
        }
      }
    }
  }
}
