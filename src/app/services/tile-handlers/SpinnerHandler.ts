/**
 * SpinnerHandler - Handles spinner tile effects
 *
 * Spinners randomly change the party's facing direction.
 * Classic Wizardry disorientation mechanic.
 */

import { TileHandler, TileHandlerContext, TileHandlerResult, createNoEffectResult } from './TileHandler'
import { TileData, TileType, Direction, DungeonState } from '@models/Dungeon'
import { GameState } from '@models/GameState'
import { RandomService } from '@services/RandomService'

export class SpinnerHandler implements TileHandler {
  readonly tileType: TileType = 'spinner'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('spinner') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    // Pick a random direction
    const directions: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST']
    const randomDirection = RandomService.pickRandom(directions)

    const newState: GameState = {
      ...state,
      dungeon: {
        ...dungeon,
        position: {
          ...dungeon.position,
          facing: randomDirection
        }
      }
    }

    return {
      state: newState,
      messages: [],
      continueProcessing: true
    }
  }
}
