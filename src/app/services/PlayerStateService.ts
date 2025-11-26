import { Position, Direction, PlayerState } from '@models/Dungeon'

/**
 * Service for managing PlayerState transformations
 * Pure functions for converting Position to PlayerState with direction vectors
 */
export const PlayerStateService = {
  /**
   * Convert Direction enum to radians
   * 0 = NORTH (pointing +Y), π/2 = EAST (pointing +X), π = SOUTH (pointing -Y), 3π/2 = WEST (pointing -X)
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
   * Uses game coordinate system: NORTH = (0, +1), EAST = (1, 0), SOUTH = (0, -1), WEST = (-1, 0)
   */
  fromPosition(position: Position): PlayerState {
    const angle = this.directionToAngle(position.facing)

    // Convert angle to direction vector using game coordinate system
    // NORTH (angle=0) points in +Y direction
    let dirX = Math.sin(angle)
    let dirY = Math.cos(angle)

    // Clamp near-zero values to exactly zero to avoid floating point errors
    // sin(π) and cos(3π/2) can return tiny negative values like -1.8e-16
    if (Math.abs(dirX) < 1e-10) dirX = 0
    if (Math.abs(dirY) < 1e-10) dirY = 0

    // Camera plane perpendicular to direction (points to left edge of viewport)
    // For 90° FOV, plane length = tan(45°) = 1.0
    const fov = Math.PI / 2
    const planeLength = Math.tan(fov / 2)
    const planeX = -dirY * planeLength
    const planeY = -dirX * planeLength

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
    let dirX = Math.sin(playerState.angle)
    let dirY = Math.cos(playerState.angle)

    // Clamp near-zero values to exactly zero to avoid floating point errors
    if (Math.abs(dirX) < 1e-10) dirX = 0
    if (Math.abs(dirY) < 1e-10) dirY = 0

    const fov = Math.PI / 2
    const planeLength = Math.tan(fov / 2)
    const planeX = -dirY * planeLength
    const planeY = -dirX * planeLength

    return {
      ...playerState,
      dirX,
      dirY,
      planeX,
      planeY
    }
  }
}
