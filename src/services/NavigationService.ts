import { GameState } from '../types/GameState'
import { Position, Direction } from '../types/Dungeon'

export const NavigationService = {
  /**
   * Move party forward one tile (immutable state update)
   */
  moveForward(state: GameState): GameState {
    if (!state.dungeon) {
      throw new Error('Dungeon state not initialized')
    }

    const currentPos = state.dungeon.position
    const nextPos = this.getNextPosition(currentPos, currentPos.facing, false)

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: nextPos
      }
    }
  },

  /**
   * Calculate next position based on direction and movement
   * @param position Current position
   * @param direction Direction to move (NORTH/SOUTH/EAST/WEST)
   * @param reverse If true, move opposite direction
   */
  getNextPosition(position: Position, direction: Direction, reverse: boolean): Position {
    let { x, y } = position
    const multiplier = reverse ? -1 : 1

    switch (direction) {
      case 'NORTH':
        y = this.wrapCoordinate(y + (1 * multiplier), 20)
        break
      case 'SOUTH':
        y = this.wrapCoordinate(y - (1 * multiplier), 20)
        break
      case 'EAST':
        x = this.wrapCoordinate(x + (1 * multiplier), 20)
        break
      case 'WEST':
        x = this.wrapCoordinate(x - (1 * multiplier), 20)
        break
    }

    return { x, y, facing: position.facing }
  },

  /**
   * Wrap coordinate within 0-19 range (edge wrapping)
   */
  wrapCoordinate(value: number, max: number): number {
    if (value < 0) return max - 1
    if (value >= max) return 0
    return value
  },

  /**
   * Turn party left 90 degrees
   */
  turnLeft(state: GameState): GameState {
    if (!state.dungeon) throw new Error('Dungeon state not initialized')

    const newFacing = this.rotateDirection(state.dungeon.position.facing, 'LEFT')

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
  },

  /**
   * Turn party right 90 degrees
   */
  turnRight(state: GameState): GameState {
    if (!state.dungeon) throw new Error('Dungeon state not initialized')

    const newFacing = this.rotateDirection(state.dungeon.position.facing, 'RIGHT')

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
  },

  /**
   * Rotate direction 90 degrees left or right
   */
  rotateDirection(current: Direction, rotation: 'LEFT' | 'RIGHT'): Direction {
    const directions: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST']
    const currentIndex = directions.indexOf(current)

    if (rotation === 'LEFT') {
      return directions[(currentIndex + 3) % 4] // -1 mod 4 = +3 mod 4
    } else {
      return directions[(currentIndex + 1) % 4]
    }
  },

  /**
   * Move party left without changing facing
   */
  strafeLeft(state: GameState): GameState {
    if (!state.dungeon) throw new Error('Dungeon state not initialized')

    const currentPos = state.dungeon.position
    const leftDirection = this.rotateDirection(currentPos.facing, 'LEFT')
    const nextPos = this.getNextPosition(currentPos, leftDirection, false)

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: {
          ...nextPos,
          facing: currentPos.facing // Preserve original facing
        }
      }
    }
  },

  /**
   * Move party right without changing facing
   */
  strafeRight(state: GameState): GameState {
    if (!state.dungeon) throw new Error('Dungeon state not initialized')

    const currentPos = state.dungeon.position
    const rightDirection = this.rotateDirection(currentPos.facing, 'RIGHT')
    const nextPos = this.getNextPosition(currentPos, rightDirection, false)

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: {
          ...nextPos,
          facing: currentPos.facing // Preserve original facing
        }
      }
    }
  },

  /**
   * Move party backward one tile
   */
  moveBackward(state: GameState): GameState {
    if (!state.dungeon) throw new Error('Dungeon state not initialized')

    const currentPos = state.dungeon.position
    const nextPos = this.getNextPosition(currentPos, currentPos.facing, true)

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: nextPos
      }
    }
  },
}
