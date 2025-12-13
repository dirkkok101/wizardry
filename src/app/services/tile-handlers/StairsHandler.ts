/**
 * StairsHandler - Handles stairs_up and stairs_down tile effects
 *
 * Stairs provide vertical navigation between dungeon levels.
 * stairs_up on level 1 returns to castle.
 * stairs_down goes deeper into the dungeon.
 */

import { TileHandler, TileHandlerContext, TileHandlerResult, createNoEffectResult } from './TileHandler'
import { TileData, TileType, DungeonState } from '@models/Dungeon'
import { GameState } from '@models/GameState'
import { DungeonService } from '@services/DungeonService'

export class StairsUpHandler implements TileHandler {
  readonly tileType: TileType = 'stairs_up'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('stairs_up') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    // Can only go up if not on level 1
    if (dungeon.currentLevel <= 1) {
      // On level 1, stairs up lead to castle - return state with no dungeon
      // Component will handle scene transition
      return {
        state: {
          ...state,
          dungeon: undefined
        },
        messages: ['You ascend to the castle.'],
        continueProcessing: false
      }
    }

    // Go up one level
    const newLevel = dungeon.currentLevel - 1
    const levelData = DungeonService.loadLevel(newLevel)

    // Find stairs_down position on the level above (entry point)
    const stairsPos = this.findStairsDown(levelData)

    const newState: GameState = {
      ...state,
      dungeon: {
        ...dungeon,
        currentLevel: newLevel,
        position: stairsPos ?? {
          ...dungeon.position,
          x: dungeon.position.x,
          y: dungeon.position.y
        }
      }
    }

    return {
      state: newState,
      messages: [`Ascending to level ${newLevel}...`],
      continueProcessing: false // Don't check for encounters on stairs
    }
  }

  private findStairsDown(levelData: any): { x: number; y: number; facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' } | null {
    for (const tile of levelData.tiles) {
      if (tile.types?.includes('stairs_down')) {
        return { x: tile.x, y: tile.y, facing: 'NORTH' }
      }
    }
    return null
  }
}

export class StairsDownHandler implements TileHandler {
  readonly tileType: TileType = 'stairs_down'

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('stairs_down') ?? false
  }

  handle(context: TileHandlerContext): TileHandlerResult {
    const { state } = context
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return createNoEffectResult(state)
    }

    // Can only go down if not on level 10
    if (dungeon.currentLevel >= 10) {
      return {
        state,
        messages: ['You cannot descend further.'],
        continueProcessing: true
      }
    }

    // Go down one level
    const newLevel = dungeon.currentLevel + 1
    const levelData = DungeonService.loadLevel(newLevel)

    // Find stairs_up position on the level below (entry point)
    const stairsPos = this.findStairsUp(levelData)

    const newState: GameState = {
      ...state,
      dungeon: {
        ...dungeon,
        currentLevel: newLevel,
        position: stairsPos ?? {
          ...dungeon.position,
          x: dungeon.position.x,
          y: dungeon.position.y
        }
      }
    }

    return {
      state: newState,
      messages: [`Descending to level ${newLevel}...`],
      continueProcessing: false // Don't check for encounters on stairs
    }
  }

  private findStairsUp(levelData: any): { x: number; y: number; facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' } | null {
    for (const tile of levelData.tiles) {
      if (tile.types?.includes('stairs_up')) {
        return { x: tile.x, y: tile.y, facing: 'NORTH' }
      }
    }
    return null
  }
}
