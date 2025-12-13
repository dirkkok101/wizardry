/**
 * DarknessHandler - Handles darkness zone tile effects
 *
 * Darkness zones extinguish light spells and limit visibility.
 * Handles both entry (darkness_zone_start, darkness) and exit.
 */

import { TileHandler, TileHandlerContext, TileHandlerResult, createNoEffectResult } from './TileHandler'
import { TileData, TileType, DungeonState } from '@models/Dungeon'
import { GameState } from '@models/GameState'
import { LightService } from '@services/LightService'

export class DarknessZoneStartHandler implements TileHandler {
  readonly tileType: TileType = 'darkness_zone_start'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('darkness_zone_start') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state, tile } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    // Check if entering darkness zone
    const isNowInDarkness = LightService.isDarknessTile(tile.types)
    const wasInDarkness = dungeon.inDarknessZone

    if (!wasInDarkness && isNowInDarkness) {
      // Entering darkness zone
      const result = LightService.enterDarknessZone(dungeon)
      const messages: string[] = []

      if (dungeon.lightActive) {
        messages.push('An unnatural darkness engulfs you! Your light spell is extinguished!')
      } else {
        messages.push('You enter an area of impenetrable darkness.')
      }

      return {
        state: {
          ...state,
          dungeon: result.state
        },
        messages,
        continueProcessing: true
      }
    }

    return createNoEffectResult(state)
  }
}

export class DarknessHandler implements TileHandler {
  readonly tileType: TileType = 'darkness'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('darkness') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state, tile } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    const isNowInDarkness = LightService.isDarknessTile(tile.types)
    const wasInDarkness = dungeon.inDarknessZone

    // Case 1: Entering darkness zone
    if (!wasInDarkness && isNowInDarkness) {
      const result = LightService.enterDarknessZone(dungeon)
      const messages: string[] = []

      if (dungeon.lightActive) {
        messages.push('An unnatural darkness engulfs you! Your light spell is extinguished!')
      } else {
        messages.push('You enter an area of impenetrable darkness.')
      }

      return {
        state: {
          ...state,
          dungeon: result.state
        },
        messages,
        continueProcessing: true
      }
    }

    // Case 2: Exiting darkness zone
    if (wasInDarkness && !isNowInDarkness) {
      const exitedState = LightService.exitDarknessZone(dungeon)
      const decrementResult = LightService.decrementLightDuration(exitedState)

      return {
        state: {
          ...state,
          dungeon: decrementResult.state
        },
        messages: ['You emerge from the darkness.'],
        continueProcessing: true
      }
    }

    // Case 3: Moving within darkness zone - no change
    return createNoEffectResult(state)
  }
}

/**
 * LightStateProcessor - Processes light state changes for non-darkness tiles
 * Not a tile handler per se, but handles light duration decrement
 */
export class LightStateProcessor {
  /**
   * Process light state after movement to any tile
   * Handles duration decrement for normal tiles
   */
  static processLightState(state: GameState, tileTypes: TileType[] | undefined): GameState {
    const dungeon = state.dungeon as DungeonState
    if (!dungeon) return state

    const isNowInDarkness = LightService.isDarknessTile(tileTypes)
    const wasInDarkness = dungeon.inDarknessZone

    // Case 1: Entering darkness zone (handled by DarknessHandler)
    if (!wasInDarkness && isNowInDarkness) {
      const result = LightService.enterDarknessZone(dungeon)
      return { ...state, dungeon: result.state }
    }

    // Case 2: Exiting darkness zone
    if (wasInDarkness && !isNowInDarkness) {
      const exitedState = LightService.exitDarknessZone(dungeon)
      const decrementResult = LightService.decrementLightDuration(exitedState)
      return { ...state, dungeon: decrementResult.state }
    }

    // Case 3: Moving in normal zone - decrement light duration
    if (!isNowInDarkness) {
      const result = LightService.decrementLightDuration(dungeon)
      return { ...state, dungeon: result.state }
    }

    // Case 4: Moving within darkness zone - no change
    return state
  }
}
