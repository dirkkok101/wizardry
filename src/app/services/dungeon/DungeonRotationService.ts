/**
 * DungeonRotationService - Direction rotation and turning
 *
 * Handles party rotation in the dungeon:
 * - Turn left (90 degrees counter-clockwise)
 * - Turn right (90 degrees clockwise)
 * - Direction rotation calculations
 *
 * @see docs/services/DungeonMovementService.md
 */

import { GameState } from '@models/GameState'
import { Direction } from '@models/Dungeon'
import { isDungeonState } from './DungeonCoreMovementService'

/**
 * Rotate direction 90 degrees left or right
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

/**
 * Turn party left 90 degrees
 */
export function turnLeft(state: GameState): GameState {
  if (!state.dungeon || !isDungeonState(state.dungeon)) {
    throw new Error('Dungeon state not initialized or not in maze')
  }

  const newFacing = rotateDirection(state.dungeon.position.facing, 'LEFT')

  return {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: {
        ...state.dungeon.position,
        facing: newFacing
      }
    }
  }
}

/**
 * Turn party right 90 degrees
 */
export function turnRight(state: GameState): GameState {
  if (!state.dungeon || !isDungeonState(state.dungeon)) {
    throw new Error('Dungeon state not initialized or not in maze')
  }

  const newFacing = rotateDirection(state.dungeon.position.facing, 'RIGHT')

  return {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: {
        ...state.dungeon.position,
        facing: newFacing
      }
    }
  }
}

export const DungeonRotationService = {
  rotateDirection,
  turnLeft,
  turnRight,
}
