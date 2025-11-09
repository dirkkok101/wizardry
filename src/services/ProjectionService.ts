import { Vector3, Vector2, PlayerState } from '../types/Dungeon'

/**
 * Service for perspective projection transformations
 * Implements 5-stage pipeline: World → View → Screen
 * Pure functions - no side effects
 */
export const ProjectionService = {
  /**
   * FOV in radians (90 degrees for Wizardry)
   */
  FOV: Math.PI / 2,

  /**
   * Stage 1-2: Transform world space point to view space (camera coordinates)
   * Camera is at origin looking down -Z axis
   */
  worldToView(point: Vector3, playerState: PlayerState): Vector3 {
    // Translate to camera origin
    const dx = point.x - playerState.gridX
    const dz = point.z - playerState.gridY

    // Transform to view space using direction vectors
    // dirX, dirY form the forward direction in game space
    // We need to rotate so forward direction becomes -Z axis
    // Right vector is perpendicular to direction: 90° clockwise from forward
    const rightX = -playerState.dirY
    const rightZ = playerState.dirX

    // Forward direction (in game space)
    const forwardX = playerState.dirX
    const forwardZ = playerState.dirY

    // Project world offset onto right and forward axes
    const viewX = dx * rightX + dz * rightZ
    const viewZ = -(dx * forwardX + dz * forwardZ) // Negate to make forward = -Z

    return {
      x: viewX,
      y: point.y, // Height stays same
      z: viewZ
    }
  },

  /**
   * Stage 3-5: Transform view space point to screen coordinates
   * Includes perspective division, NDC conversion, and viewport mapping
   * Returns null if point is clipped (behind camera or outside frustum)
   */
  viewToScreen(
    viewPoint: Vector3,
    config: { width: number; height: number }
  ): Vector2 | null {
    // Frustum culling - reject if behind camera
    if (viewPoint.z >= 0) return null

    // FOV scaling factor
    const S = 1.0 / Math.tan(this.FOV / 2)

    // Perspective projection: divide by -z
    const ndcX = (viewPoint.x * S) / -viewPoint.z
    const ndcY = (viewPoint.y * S) / -viewPoint.z

    // Frustum culling in NDC space [-1, 1]
    // Allow slight tolerance for floating point precision
    if (Math.abs(ndcX) > 1.001 || Math.abs(ndcY) > 1.001) return null

    // Convert NDC to screen coordinates
    const screenX = (ndcX + 1) * (config.width / 2)
    const screenY = (1 - ndcY) * (config.height / 2) // Flip Y axis

    return { x: screenX, y: screenY }
  },

  /**
   * Complete transformation: World → View → Screen
   * Convenience method combining both stages
   */
  projectPoint(
    worldPoint: Vector3,
    playerState: PlayerState,
    config: { width: number; height: number }
  ): Vector2 | null {
    const viewPoint = this.worldToView(worldPoint, playerState)
    return this.viewToScreen(viewPoint, config)
  }
}
