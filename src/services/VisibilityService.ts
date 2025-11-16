import { LevelData, Position, WallSegment, WallType } from '../types/Dungeon'
import { DungeonService } from './DungeonService'

/**
 * Service for determining visible walls using flood-fill algorithm
 * Pure functions - no side effects
 */
export const VisibilityService = {
  /**
   * Get visible wall segments from player's perspective.
   *
   * Uses hybrid grid-based traversal with early stopping for Wizardry-style
   * peripheral vision rendering. Only returns walls within map bounds - edge
   * wrapping is for movement topology, not rendering visibility.
   *
   * @param level - Level data including tiles and size
   * @param position - Player position and facing direction
   * @param maxDepth - Maximum viewing distance (typically 5 tiles)
   * @param peripheralColumns - Number of columns in peripheral vision (3 = left, center, right)
   * @returns Array of wall segments sorted back-to-front for painter's algorithm
   */
  getVisibleWalls(
    level: LevelData,
    position: Position,
    maxDepth: number = 5,
    peripheralColumns: number = 3
  ): WallSegment[] {
    const walls: WallSegment[] = []
    const visited = new Set<string>()

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

    // Helper to add walls from a tile
    const addTileWalls = (tileX: number, tileY: number) => {
      const wrapped = wrapCoords(tileX, tileY)
      const tile = DungeonService.getTile(level, wrapped.x, wrapped.y)

      // Add all 4 walls if they're not open
      if (tile.walls.north !== 'open') {
        walls.push(this.createWallSegment(wrapped.x, wrapped.y, 'north', position, tile.walls.north, level.size))
      }
      if (tile.walls.south !== 'open') {
        walls.push(this.createWallSegment(wrapped.x, wrapped.y, 'south', position, tile.walls.south, level.size))
      }
      if (tile.walls.east !== 'open') {
        walls.push(this.createWallSegment(wrapped.x, wrapped.y, 'east', position, tile.walls.east, level.size))
      }
      if (tile.walls.west !== 'open') {
        walls.push(this.createWallSegment(wrapped.x, wrapped.y, 'west', position, tile.walls.west, level.size))
      }
    }

    // Calculate perpendicular direction based on facing
    // perpX/perpY represent "right" direction from player's perspective
    let perpX = 0, perpY = 0
    let forwardX = 0, forwardY = 0

    switch (position.facing) {
      case 'NORTH':
        forwardX = 0; forwardY = 1   // Forward = +Y
        perpX = 1; perpY = 0          // Right = +X
        break
      case 'EAST':
        forwardX = 1; forwardY = 0    // Forward = +X
        perpX = 0; perpY = -1         // Right = -Y
        break
      case 'SOUTH':
        forwardX = 0; forwardY = -1   // Forward = -Y
        perpX = -1; perpY = 0         // Right = -X
        break
      case 'WEST':
        forwardX = -1; forwardY = 0   // Forward = -X
        perpX = 0; perpY = 1          // Right = +Y
        break
    }

    // Calculate column offsets: peripheralColumns=3 means [-1, 0, 1]
    const columnOffsets: number[] = []
    if (peripheralColumns === 1) {
      columnOffsets.push(0)  // Center only
    } else {
      const halfWidth = Math.floor(peripheralColumns / 2)
      for (let i = -halfWidth; i <= halfWidth; i++) {
        columnOffsets.push(i)
      }
    }

    // Iterate through depth levels (0 = player tile, 1 = one ahead, etc.)
    for (let depth = 0; depth < maxDepth; depth++) {
      // Calculate forward position at this depth
      const forwardPos = {
        x: position.x + forwardX * depth,
        y: position.y + forwardY * depth
      }

      // For each column in the grid
      for (const colOffset of columnOffsets) {
        const tileX = forwardPos.x + perpX * colOffset
        const tileY = forwardPos.y + perpY * colOffset

        // Skip out-of-bounds tiles (edge wrapping is for movement, not visibility)
        if (tileX < 0 || tileX >= level.size.width ||
            tileY < 0 || tileY >= level.size.height) {
          continue
        }

        const key = `${tileX},${tileY}`

        if (!visited.has(key)) {
          addTileWalls(tileX, tileY)
          visited.add(key)
        }
      }

      // Check if center column is blocked (stops forward traversal)
      const centerTile = DungeonService.getTile(level, forwardPos.x, forwardPos.y)
      const facingWall = position.facing === 'NORTH' ? centerTile.walls.north :
                        position.facing === 'EAST' ? centerTile.walls.east :
                        position.facing === 'SOUTH' ? centerTile.walls.south :
                        centerTile.walls.west

      // If facing a wall in center column, don't continue deeper
      if (depth > 0 && facingWall !== 'open') {
        break
      }
    }

    // Calculate wall distance range for logging
    const minDist = walls.length > 0 ? Math.min(...walls.map(w => w.distance)) : 0
    const maxDist = walls.length > 0 ? Math.max(...walls.map(w => w.distance)) : 0

    console.log(`[Visibility] Player at (${position.x}, ${position.y}) facing ${position.facing}`)
    console.log(`[Visibility] Found ${walls.length} walls from ${visited.size} tiles using ${peripheralColumns}-column grid`)
    if (walls.length > 0) {
      console.log(`[Visibility] Wall distances: min=${minDist.toFixed(2)} max=${maxDist.toFixed(2)}`)
    }
    console.log(`[Visibility] First 10 visited tiles:`, Array.from(visited).slice(0, 10).map(t => `(${t})`).join(', '))

    // Sort by distance (back-to-front for painter's algorithm)
    walls.sort((a, b) => b.distance - a.distance)

    return walls
  },

  /**
   * Create wall segment from grid position and side
   * Converts grid coordinates to world space (tile corners at grid positions, each tile = 1.0 units)
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

    // Convert grid to world coordinates (tile corners at grid positions, each tile = 1.0 units)
    // COORDINATE SYSTEM: Grid (x,y) is bottom-left corner, tile extends to (x+1,y+1)
    // NORTH = +Y direction, walls are at tile edges
    if (side === 'north') {
      // North wall at top edge (+Y direction)
      x1 = unwrappedX
      z1 = unwrappedY + 1
      x2 = unwrappedX + 1
      z2 = unwrappedY + 1
      isVertical = true
    } else if (side === 'south') {
      // South wall at bottom edge (-Y direction)
      x1 = unwrappedX
      z1 = unwrappedY
      x2 = unwrappedX + 1
      z2 = unwrappedY
      isVertical = true
    } else if (side === 'east') {
      // East wall at right edge (+X direction)
      x1 = unwrappedX + 1
      z1 = unwrappedY
      x2 = unwrappedX + 1
      z2 = unwrappedY + 1
      isVertical = false
    } else { // west
      // West wall at left edge (-X direction)
      x1 = unwrappedX
      z1 = unwrappedY
      x2 = unwrappedX
      z2 = unwrappedY + 1
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
      wallType,
      gridX,
      gridY,
      side
    }
  }
}
