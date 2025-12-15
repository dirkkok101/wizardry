/**
 * DungeonMovementOps - High-level movement operations
 *
 * Composes the split dungeon services to provide complete movement operations
 * that include position updates AND special tile effect handling.
 *
 * This is the primary interface for components that need movement operations.
 *
 * @see DungeonCoreMovementService - Position calculations
 * @see DungeonRotationService - Turn left/right
 * @see DungeonLevelService - Level transitions
 * @see SpecialTileEffectService - Tile effects
 */

import { GameState } from '@models/GameState'
import { Position, TileData } from '@models/Dungeon'
import { DungeonService } from '../DungeonService'
import {
  MovementResult,
  isDungeonState,
  getNextPosition,
  rotateDirection,
} from './DungeonCoreMovementService'
import { handleStairsTransition } from './DungeonLevelService'
import { handleSpecialTile } from './SpecialTileEffectService'

/**
 * Move party forward one tile (immutable state update)
 * @returns MovementResult with new state and any special tile effects
 */
export function moveForward(state: GameState): MovementResult {
  if (!state.dungeon || !isDungeonState(state.dungeon)) {
    throw new Error('Dungeon state not initialized or not in maze')
  }

  const previousPos = state.dungeon.position
  const level = DungeonService.loadLevel(state.dungeon.currentLevel)

  // Check for special action triggers BEFORE updating position
  // This only checks for stairs walls, not general movement validation
  const validation = DungeonService.canMove(level, previousPos, 'FORWARD', state.dungeon.openDoors, state.dungeon.currentLevel)

  if (validation.triggersSpecialAction === 'stairs') {
    return { state: handleStairsTransition(state, validation.destination) }
  }

  // Normal movement: calculate new position
  // Note: Wall validation is done by MazeComponent before calling this method
  const nextPos = getNextPosition(previousPos, previousPos.facing, false)

  const newState: GameState = {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: nextPos
    }
  }

  // Trigger special tile effects (passing previous position for retreat)
  const tile = DungeonService.getTile(level, nextPos.x, nextPos.y)
  const tileResult = handleSpecialTile(newState, tile, previousPos)

  return {
    state: tileResult.newState,
    specialTileResult: tileResult
  }
}

/**
 * Move party backward one tile
 * @returns MovementResult with new state and any special tile effects
 */
export function moveBackward(state: GameState): MovementResult {
  if (!state.dungeon || !isDungeonState(state.dungeon)) {
    throw new Error('Dungeon state not initialized or not in maze')
  }

  const previousPos = state.dungeon.position
  const nextPos = getNextPosition(previousPos, previousPos.facing, true)

  const newState: GameState = {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: nextPos
    }
  }

  // Trigger special tile effects
  const level = DungeonService.loadLevel(newState.dungeon!.currentLevel)
  const tile = DungeonService.getTile(level, nextPos.x, nextPos.y)
  const tileResult = handleSpecialTile(newState, tile, previousPos)

  return {
    state: tileResult.newState,
    specialTileResult: tileResult
  }
}

/**
 * Move party left without changing facing
 * @returns MovementResult with new state and any special tile effects
 */
export function strafeLeft(state: GameState): MovementResult {
  if (!state.dungeon || !isDungeonState(state.dungeon)) {
    throw new Error('Dungeon state not initialized or not in maze')
  }

  const previousPos = state.dungeon.position
  const leftDirection = rotateDirection(previousPos.facing, 'LEFT')
  const nextPos = getNextPosition(previousPos, leftDirection, false)

  const newState: GameState = {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: {
        ...nextPos,
        facing: previousPos.facing // Preserve original facing
      }
    }
  }

  // Trigger special tile effects
  const level = DungeonService.loadLevel(newState.dungeon!.currentLevel)
  const tile = DungeonService.getTile(level, nextPos.x, nextPos.y)
  const tileResult = handleSpecialTile(newState, tile, previousPos)

  return {
    state: tileResult.newState,
    specialTileResult: tileResult
  }
}

/**
 * Move party right without changing facing
 * @returns MovementResult with new state and any special tile effects
 */
export function strafeRight(state: GameState): MovementResult {
  if (!state.dungeon || !isDungeonState(state.dungeon)) {
    throw new Error('Dungeon state not initialized or not in maze')
  }

  const previousPos = state.dungeon.position
  const rightDirection = rotateDirection(previousPos.facing, 'RIGHT')
  const nextPos = getNextPosition(previousPos, rightDirection, false)

  const newState: GameState = {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: {
        ...nextPos,
        facing: previousPos.facing // Preserve original facing
      }
    }
  }

  // Trigger special tile effects
  const level = DungeonService.loadLevel(newState.dungeon!.currentLevel)
  const tile = DungeonService.getTile(level, nextPos.x, nextPos.y)
  const tileResult = handleSpecialTile(newState, tile, previousPos)

  return {
    state: tileResult.newState,
    specialTileResult: tileResult
  }
}

export const DungeonMovementOps = {
  moveForward,
  moveBackward,
  strafeLeft,
  strafeRight,
}
