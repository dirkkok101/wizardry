/**
 * DungeonCoreMovementService - Core position calculations and movement
 *
 * Handles the fundamental movement mechanics:
 * - Type guards and state assertions
 * - Position calculations (forward, backward, strafe)
 * - Direction deltas for compass directions
 *
 * This is the "physics" layer of dungeon navigation.
 *
 * @see docs/services/DungeonMovementService.md
 */

import { GameState } from '@models/GameState'
import { Position, Direction, DungeonState, TileData, TileType, SpecialTileResult } from '@models/Dungeon'
import { DungeonService } from '../DungeonService'

/**
 * Result from movement operations, includes state and any special tile effects
 */
export interface MovementResult {
  state: GameState
  specialTileResult?: SpecialTileResult
}

/**
 * Type guard to check if dungeon is DungeonState
 */
export function isDungeonState(dungeon: unknown): dungeon is DungeonState {
  return dungeon !== null && typeof dungeon === 'object' && 'position' in dungeon
}

/**
 * Assert that dungeon state exists and is valid
 * @throws Error if dungeon state is not initialized
 */
export function requireDungeon(state: GameState): DungeonState {
  if (!state.dungeon || !isDungeonState(state.dungeon)) {
    throw new Error('Operation requires dungeon state but dungeon is not initialized')
  }
  return state.dungeon
}

/**
 * Helper to check if tile has a specific type
 */
export function tileHasType(tile: TileData, type: TileType): boolean {
  return tile.types?.includes(type) ?? false
}

/**
 * Get direction delta for facing direction
 * @param facing Current facing direction
 * @returns {x, y} delta for movement in that direction
 */
export function getFacingDelta(facing: Direction): { x: number; y: number } {
  switch (facing) {
    case 'NORTH':
      return { x: 0, y: 1 }
    case 'SOUTH':
      return { x: 0, y: -1 }
    case 'EAST':
      return { x: 1, y: 0 }
    case 'WEST':
      return { x: -1, y: 0 }
  }
}

/**
 * Calculate next position based on direction and movement
 * @param position Current position
 * @param direction Direction to move (NORTH/SOUTH/EAST/WEST)
 * @param reverse If true, move opposite direction
 */
export function getNextPosition(position: Position, direction: Direction, reverse: boolean): Position {
  let { x, y } = position
  const multiplier = reverse ? -1 : 1

  switch (direction) {
    case 'NORTH':
      y = DungeonService.wrapCoordinate(y + (1 * multiplier))
      break
    case 'SOUTH':
      y = DungeonService.wrapCoordinate(y - (1 * multiplier))
      break
    case 'EAST':
      x = DungeonService.wrapCoordinate(x + (1 * multiplier))
      break
    case 'WEST':
      x = DungeonService.wrapCoordinate(x - (1 * multiplier))
      break
  }

  return { x, y, facing: position.facing }
}

/**
 * Rotate direction 90 degrees left or right
 * Note: Also exported from DungeonRotationService, duplicated here to avoid circular imports
 */
export function rotateDirection(current: Direction, rotation: 'LEFT' | 'RIGHT'): Direction {
  const directions: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST']
  const currentIndex = directions.indexOf(current)

  if (rotation === 'LEFT') {
    return directions[(currentIndex + 3) % 4] // -1 mod 4 = +3 mod 4
  } else {
    return directions[(currentIndex + 1) % 4]
  }
}

export const DungeonCoreMovementService = {
  isDungeonState,
  requireDungeon,
  tileHasType,
  getFacingDelta,
  getNextPosition,
  rotateDirection,
}
