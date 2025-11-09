import { LevelData, Position, WallSegment, WallType } from '../types/Dungeon'
import { DungeonService } from './DungeonService'

/**
 * Service for determining visible walls using flood-fill algorithm
 * Pure functions - no side effects
 */
export const VisibilityService = {
  /**
   * Get all visible wall segments from player position using flood-fill
   * Returns walls sorted back-to-front for painter's algorithm
   */
  getVisibleWalls(
    level: LevelData,
    position: Position,
    maxDepth: number = 5
  ): WallSegment[] {
    const walls: WallSegment[] = []
    const visited = new Set<string>()
    const queue: { x: number; y: number; depth: number }[] = []

    // Start from player's grid position
    queue.push({ x: position.x, y: position.y, depth: 0 })
    visited.add(`${position.x},${position.y}`)

    while (queue.length > 0) {
      const current = queue.shift()!
      const { x, y, depth } = current

      if (depth >= maxDepth) continue

      const tile = DungeonService.getTile(level, x, y)

      // Check all 4 walls of current cell
      // North wall (y-1)
      if (tile.walls.north !== 'open') {
        walls.push(this.createWallSegment(x, y, 'north', position, tile.walls.north))
      } else if (!visited.has(`${x},${y - 1}`)) {
        queue.push({ x, y: y - 1, depth: depth + 1 })
        visited.add(`${x},${y - 1}`)
      }

      // South wall (y+1)
      if (tile.walls.south !== 'open') {
        walls.push(this.createWallSegment(x, y, 'south', position, tile.walls.south))
      } else if (!visited.has(`${x},${y + 1}`)) {
        queue.push({ x, y: y + 1, depth: depth + 1 })
        visited.add(`${x},${y + 1}`)
      }

      // East wall (x+1)
      if (tile.walls.east !== 'open') {
        walls.push(this.createWallSegment(x, y, 'east', position, tile.walls.east))
      } else if (!visited.has(`${x + 1},${y}`)) {
        queue.push({ x: x + 1, y, depth: depth + 1 })
        visited.add(`${x + 1},${y}`)
      }

      // West wall (x-1)
      if (tile.walls.west !== 'open') {
        walls.push(this.createWallSegment(x, y, 'west', position, tile.walls.west))
      } else if (!visited.has(`${x - 1},${y}`)) {
        queue.push({ x: x - 1, y, depth: depth + 1 })
        visited.add(`${x - 1},${y}`)
      }
    }

    // Sort by distance (back-to-front for painter's algorithm)
    walls.sort((a, b) => b.distance - a.distance)

    return walls
  },

  /**
   * Create wall segment from grid position and side
   * Converts grid coordinates to world space (each tile = 1 unit, centered at grid position)
   */
  createWallSegment(
    gridX: number,
    gridY: number,
    side: 'north' | 'south' | 'east' | 'west',
    playerPos: Position,
    wallType: WallType
  ): WallSegment {
    let x1: number, z1: number, x2: number, z2: number
    let isVertical: boolean

    // Convert grid to world coordinates (tile center at gridX, gridY)
    // Each tile is 1.0 units
    if (side === 'north') {
      x1 = gridX - 0.5
      z1 = gridY - 0.5
      x2 = gridX + 0.5
      z2 = gridY - 0.5
      isVertical = true
    } else if (side === 'south') {
      x1 = gridX - 0.5
      z1 = gridY + 0.5
      x2 = gridX + 0.5
      z2 = gridY + 0.5
      isVertical = true
    } else if (side === 'east') {
      x1 = gridX + 0.5
      z1 = gridY - 0.5
      x2 = gridX + 0.5
      z2 = gridY + 0.5
      isVertical = false
    } else { // west
      x1 = gridX - 0.5
      z1 = gridY - 0.5
      x2 = gridX - 0.5
      z2 = gridY + 0.5
      isVertical = false
    }

    // Calculate distance from player (use midpoint of wall)
    const midX = (x1 + x2) / 2
    const midZ = (z1 + z2) / 2
    const dx = midX - playerPos.x
    const dz = midZ - playerPos.y
    const distance = Math.sqrt(dx * dx + dz * dz)

    return {
      x1,
      z1,
      x2,
      z2,
      height: 1.0,
      distance,
      isVertical,
      wallType
    }
  }
}
