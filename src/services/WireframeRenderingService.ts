import { LevelData, PlayerState, Position, WallSegment, Vector3, WallType } from '../types/Dungeon'
import { CanvasCommand } from '../types/rendering.types'
import { ViewportConfig } from '../types/rendering.types'
import { VisibilityService } from './VisibilityService'
import { PlayerStateService } from './PlayerStateService'
import { ProjectionService } from './ProjectionService'

/**
 * Service for generating wireframe 3D rendering commands
 * Replaces MazeRenderingService with flood-fill + perspective projection
 * Pure functions - no side effects
 */
export const WireframeRenderingService = {
  /**
   * Generate canvas drawing commands for wireframe view
   * Main entry point for rendering system
   */
  generateWireframeCommands(
    level: LevelData,
    position: Position,
    config: ViewportConfig
  ): CanvasCommand[] {
    const commands: CanvasCommand[] = []

    // Get player state with direction vectors
    const playerState = PlayerStateService.fromPosition(position)

    // Find visible walls using flood-fill
    const walls = VisibilityService.getVisibleWalls(level, position, config.tileDepth)

    // Render each wall quad (already sorted back-to-front)
    for (const wall of walls) {
      const wallCommands = this.renderWallQuad(wall, playerState, config)
      commands.push(...wallCommands)
    }

    return commands
  },

  /**
   * Render a single wall quad as 4 line segments (wireframe outline)
   */
  renderWallQuad(
    wall: WallSegment,
    playerState: PlayerState,
    config: ViewportConfig
  ): CanvasCommand[] {
    const commands: CanvasCommand[] = []

    // Define 4 corners of wall quad in world space
    const bottomLeft: Vector3 = { x: wall.x1, y: 0, z: wall.z1 }
    const bottomRight: Vector3 = { x: wall.x2, y: 0, z: wall.z2 }
    const topRight: Vector3 = { x: wall.x2, y: wall.height, z: wall.z2 }
    const topLeft: Vector3 = { x: wall.x1, y: wall.height, z: wall.z1 }

    // Project to screen space
    const p1 = ProjectionService.projectPoint(bottomLeft, playerState, config)
    const p2 = ProjectionService.projectPoint(bottomRight, playerState, config)
    const p3 = ProjectionService.projectPoint(topRight, playerState, config)
    const p4 = ProjectionService.projectPoint(topLeft, playerState, config)

    // Skip if any point is clipped
    if (!p1 || !p2 || !p3 || !p4) return commands

    // Get color and alpha based on wall type and distance
    const color = this.getWallColor(wall.wallType, wall.distance)
    const alpha = this.calculateAlpha(wall.distance)

    // Draw 4 edges of quad
    const edges = [
      [p1, p2], // Bottom edge
      [p2, p3], // Right edge
      [p3, p4], // Top edge
      [p4, p1]  // Left edge
    ]

    for (const [start, end] of edges) {
      commands.push({
        type: 'line',
        x: start.x,
        y: start.y,
        x2: end.x,
        y2: end.y,
        color,
        lineWidth: this.getLineWidth(wall.distance),
        alpha
      })
    }

    return commands
  },

  /**
   * Get wall color based on type and distance
   */
  getWallColor(wallType: WallType, distance: number): string {
    // Base colors by wall type
    let baseColor: string
    if (wallType === 'door') {
      baseColor = '#080' // Dark green for doors
    } else if (wallType === 'locked_door') {
      baseColor = '#800' // Red for locked doors
    } else if (wallType === 'secret') {
      return '#000' // Black (invisible) for secret doors
    } else {
      // Normal walls - fade with distance
      if (distance < 1.5) {
        baseColor = '#0f0' // Bright green (near)
      } else if (distance < 2.5) {
        baseColor = '#0c0' // Medium green (mid)
      } else {
        baseColor = '#090' // Dim green (far)
      }
    }

    return baseColor
  },

  /**
   * Calculate alpha transparency based on distance
   */
  calculateAlpha(distance: number): number {
    return 1.0 / (1 + distance * 0.15)
  },

  /**
   * Get line width based on distance (thinner at distance)
   */
  getLineWidth(distance: number): number {
    if (distance < 1.5) return 2
    if (distance < 3.0) return 1.5
    return 1
  }
}
