import { Vector3, Vector2, PlayerState } from '@types/Dungeon'

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
   * Camera is at eye level (y=0.5) looking down -Z axis
   */
  worldToView(point: Vector3, playerState: PlayerState): Vector3 {
    // Translate to camera origin
    const dx = point.x - playerState.gridX
    const dz = point.z - playerState.gridY

    // Camera height (eye level)
    const CAMERA_HEIGHT = 0.5

    // Transform to view space using direction vectors
    // Forward direction (in game space): (dirX, dirY)
    const forwardX = playerState.dirX
    const forwardZ = playerState.dirY

    // Right vector is perpendicular to forward: 90° clockwise rotation
    // Formula: if forward = (fx, fy), then right = (fy, -fx)
    const rightX = forwardZ  // = dirY
    const rightZ = -forwardX // = -dirX

    // Project world offset onto right and forward axes
    const viewX = dx * rightX + dz * rightZ
    const viewZ = -(dx * forwardX + dz * forwardZ) // Negate to make forward = -Z

    return {
      x: viewX,
      y: point.y - CAMERA_HEIGHT, // Translate Y relative to eye level
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
    // Relaxed tolerance (1.15) allows peripheral walls to render to screen edges
    // This matches original Wizardry behavior where walls naturally extend off-screen
    if (Math.abs(ndcX) > 1.15 || Math.abs(ndcY) > 1.15) return null

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
    return this.viewToScreen(viewPoint, config);
  }
}
