import { Position, Direction, PlayerState } from '../types/Dungeon'

/**
 * Service for managing PlayerState transformations
 * Pure functions for converting Position to PlayerState with direction vectors
 */
export const PlayerStateService = {
  /**
   * Convert Direction enum to radians
   * 0 = NORTH (pointing -Y), π/2 = EAST (pointing +X), π = SOUTH (pointing +Y), 3π/2 = WEST (pointing -X)
   */
  directionToAngle(direction: Direction): number {
    switch (direction) {
      case 'NORTH': return 0
      case 'EAST': return Math.PI / 2
      case 'SOUTH': return Math.PI
      case 'WEST': return (3 * Math.PI) / 2
    }
  },

  /**
   * Create PlayerState from discrete Position
   * Pre-computes direction vectors for efficient rendering
   * Uses game coordinate system: NORTH = (0, -1), EAST = (1, 0), SOUTH = (0, 1), WEST = (-1, 0)
   */
  fromPosition(position: Position): PlayerState {
    const angle = this.directionToAngle(position.facing)

    // Convert angle to direction vector using game coordinate system
    // NORTH (angle=0) points in -Y direction
    const dirX = Math.sin(angle)
    const dirY = -Math.cos(angle)

    // Camera plane perpendicular to direction
    // For 90° FOV, plane length = tan(45°) = 1.0
    const fov = Math.PI / 2
    const planeLength = Math.tan(fov / 2)
    const planeX = dirY * planeLength
    const planeY = dirX * planeLength

    return {
      gridX: position.x,
      gridY: position.y,
      angle,
      dirX,
      dirY,
      planeX,
      planeY
    }
  },

  /**
   * Update direction vectors after angle changes
   * Returns new PlayerState (immutable)
   */
  updateDirectionVectors(playerState: PlayerState): PlayerState {
    // Convert angle to direction vector using game coordinate system
    const dirX = Math.sin(playerState.angle)
    const dirY = -Math.cos(playerState.angle)

    const fov = Math.PI / 2
    const planeLength = Math.tan(fov / 2)
    const planeX = dirY * planeLength
    const planeY = dirX * planeLength

    return {
      ...playerState,
      dirX,
      dirY,
      planeX,
      planeY
    }
  }
}
