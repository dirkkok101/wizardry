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
    visited.add(`${position.x},${position.y}`);

    // Helper to wrap coordinates if edge wrapping is enabled
    const wrapCoords = (x: number, y: number): { x: number; y: number } => {
      if (!level.edgeWrapping) {
        return { x, y }
      }
      return {
        x: ((x % level.size.width) + level.size.width) % level.size.width,
        y: ((y % level.size.height) + level.size.height) % level.size.height
      }
    }

    let iterationCount = 0;
    const tilesVisited: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!
      const { x, y, depth } = current
      iterationCount++;
      tilesVisited.push(`(${x},${y},d=${depth})`);

      const tile = DungeonService.getTile(level, x, y)

      // Don't traverse beyond maxDepth, but DO render walls at maxDepth
      const stopTraversal = depth >= maxDepth

      // Check all 4 walls of current cell
      // North wall (y+1) - NORTH = +Y in our coordinate system
      if (tile.walls.north !== 'open') {
        walls.push(this.createWallSegment(x, y, 'north', position, tile.walls.north, level.size))
      } else if (!stopTraversal) {
        const wrapped = wrapCoords(x, y + 1)
        const key = `${wrapped.x},${wrapped.y}`
        if (!visited.has(key)) {
          queue.push({ x: wrapped.x, y: wrapped.y, depth: depth + 1 })
          visited.add(key)
        }
      }

      // South wall (y-1) - SOUTH = -Y in our coordinate system
      if (tile.walls.south !== 'open') {
        walls.push(this.createWallSegment(x, y, 'south', position, tile.walls.south, level.size))
      } else if (!stopTraversal) {
        const wrapped = wrapCoords(x, y - 1)
        const key = `${wrapped.x},${wrapped.y}`
        if (!visited.has(key)) {
          queue.push({ x: wrapped.x, y: wrapped.y, depth: depth + 1 })
          visited.add(key)
        }
      }

      // East wall (x+1)
      if (tile.walls.east !== 'open') {
        walls.push(this.createWallSegment(x, y, 'east', position, tile.walls.east, level.size))
      } else if (!stopTraversal) {
        const wrapped = wrapCoords(x + 1, y)
        const key = `${wrapped.x},${wrapped.y}`
        if (!visited.has(key)) {
          queue.push({ x: wrapped.x, y: wrapped.y, depth: depth + 1 })
          visited.add(key)
        }
      }

      // West wall (x-1)
      if (tile.walls.west !== 'open') {
        walls.push(this.createWallSegment(x, y, 'west', position, tile.walls.west, level.size))
      } else if (!stopTraversal) {
        const wrapped = wrapCoords(x - 1, y)
        const key = `${wrapped.x},${wrapped.y}`
        if (!visited.has(key)) {
          queue.push({ x: wrapped.x, y: wrapped.y, depth: depth + 1 })
          visited.add(key)
        }
      }
    }

    // Calculate wall distance range
    const minDist = walls.length > 0 ? Math.min(...walls.map(w => w.distance)) : 0;
    const maxDist = walls.length > 0 ? Math.max(...walls.map(w => w.distance)) : 0;

    console.log(`[Visibility] Found ${walls.length} walls from ${visited.size} tiles (${iterationCount} iterations)`);
    console.log(`[Visibility] Tiles visited: ${tilesVisited.join(' ')}`);
    if (walls.length > 0) {
      console.log(`[Visibility] Wall distances: min=${minDist.toFixed(2)} max=${maxDist.toFixed(2)}`);
      const wallList = walls.map(w => `(${w.x1.toFixed(1)},${w.z1.toFixed(1)})->(${w.x2.toFixed(1)},${w.z2.toFixed(1)}) d=${w.distance.toFixed(2)}`);
      console.log(`[Visibility] Walls: ${wallList.join(', ')}`);
    }

    // Sort by distance (back-to-front for painter's algorithm)
    walls.sort((a, b) => b.distance - a.distance)

    return walls
  },

  /**
   * Create wall segment from grid position and side
   * Converts grid coordinates to world space (each tile = 1 unit, centered at grid position)
   * Unwraps coordinates when edge wrapping creates shorter paths
   */
  createWallSegment(
    gridX: number,
    gridY: number,
    side: 'north' | 'south' | 'east' | 'west',
    playerPos: Position,
    wallType: WallType,
    levelSize: { width: number; height: number }
  ): WallSegment {
    // Unwrap coordinates if edge wrapping creates a shorter path
    // If distance > mapSize/2, the coordinate is wrapped and should be unwrapped
    let unwrappedX = gridX
    let unwrappedY = gridY

    const deltaX = gridX - playerPos.x
    const deltaY = gridY - playerPos.y

    // Check X axis: if distance > width/2, unwrap by subtracting width
    if (Math.abs(deltaX) > levelSize.width / 2) {
      unwrappedX = deltaX > 0 ? gridX - levelSize.width : gridX + levelSize.width
    }

    // Check Y axis: if distance > height/2, unwrap by subtracting height
    if (Math.abs(deltaY) > levelSize.height / 2) {
      unwrappedY = deltaY > 0 ? gridY - levelSize.height : gridY + levelSize.height
    }

    let x1: number, z1: number, x2: number, z2: number
    let isVertical: boolean

    // Convert unwrapped grid to world coordinates (tile center at unwrappedX, unwrappedY)
    // Each tile is 1.0 units
    // COORDINATE SYSTEM: NORTH = +Y, SOUTH = -Y
    if (side === 'north') {
      // North wall is at the +Y edge of the tile
      x1 = unwrappedX - 0.5
      z1 = unwrappedY + 0.5
      x2 = unwrappedX + 0.5
      z2 = unwrappedY + 0.5
      isVertical = true
    } else if (side === 'south') {
      // South wall is at the -Y edge of the tile
      x1 = unwrappedX - 0.5
      z1 = unwrappedY - 0.5
      x2 = unwrappedX + 0.5
      z2 = unwrappedY - 0.5
      isVertical = true
    } else if (side === 'east') {
      x1 = unwrappedX + 0.5
      z1 = unwrappedY - 0.5
      x2 = unwrappedX + 0.5
      z2 = unwrappedY + 0.5
      isVertical = false
    } else { // west
      x1 = unwrappedX - 0.5
      z1 = unwrappedY - 0.5
      x2 = unwrappedX - 0.5
      z2 = unwrappedY + 0.5
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
