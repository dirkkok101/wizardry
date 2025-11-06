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
}
