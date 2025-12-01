import { LevelData, Position, WallSegment, WallType } from '@models/Dungeon'
import { DungeonService } from './DungeonService'

/**
 * Service for determining visible walls using flood-fill algorithm
 * Pure functions - no side effects
 */
export const VisibilityService = {
  /**
   * Get visible tile coordinates from player's perspective.
   * Returns all tiles that would be visible, including empty tiles (all walls open).
   *
   * Uses the same traversal logic as getVisibleWalls but returns tile coordinates
   * instead of wall segments.
   *
   * @param level - Level data including tiles and size
   * @param position - Player position and facing direction
   * @param maxDepth - Maximum viewing distance (typically 5 tiles)
   * @param peripheralColumns - Number of columns in peripheral vision (3 = left, center, right)
   * @returns Array of [gridX, gridY] coordinates for all visible tiles
   */
  getVisibleTiles(
    level: LevelData,
    position: Position,
    maxDepth: number = 5,
    peripheralColumns: number = 3
  ): Array<[number, number]> {
    const visited = new Set<string>()

    // Calculate perpendicular direction based on facing
    let perpX = 0, perpY = 0
    let forwardX = 0, forwardY = 0

    switch (position.facing) {
      case 'NORTH':
        forwardX = 0; forwardY = 1
        perpX = 1; perpY = 0
        break
      case 'EAST':
        forwardX = 1; forwardY = 0
        perpX = 0; perpY = -1
        break
      case 'SOUTH':
        forwardX = 0; forwardY = -1
        perpX = -1; perpY = 0
        break
      case 'WEST':
        forwardX = -1; forwardY = 0
        perpX = 0; perpY = 1
        break
    }

    // Helper function to get perpendicular wall direction
    const getPerpendicularWall = (offset: number): 'north' | 'south' | 'east' | 'west' => {
      switch (position.facing) {
        case 'NORTH':
          return offset < 0 ? 'west' : 'east'
        case 'EAST':
          return offset < 0 ? 'north' : 'south'
        case 'SOUTH':
          return offset < 0 ? 'east' : 'west'
        case 'WEST':
          return offset < 0 ? 'south' : 'north'
      }
    }

    // Iterate through depth levels
    for (let depth = 0; depth < maxDepth; depth++) {
      const centerX = position.x + forwardX * depth
      const centerY = position.y + forwardY * depth

      // Skip if center is out of bounds
      if (centerX < 0 || centerX >= level.size.width ||
          centerY < 0 || centerY >= level.size.height) {
        break
      }

      const centerKey = `${centerX},${centerY}`
      const centerTile = DungeonService.getTile(level, centerX, centerY)

      // Always add center column tile
      if (!visited.has(centerKey)) {
        visited.add(centerKey)
      }

      // Add peripheral tiles
      if (peripheralColumns >= 3) {
        const halfWidth = Math.floor(peripheralColumns / 2)

        for (const direction of [-1, 1]) {
          let canSeeNext = true

          for (let offset = 1; offset <= halfWidth && canSeeNext; offset++) {
            const actualOffset = direction * offset
            const tileX = centerX + perpX * actualOffset
            const tileY = centerY + perpY * actualOffset
            const tileKey = `${tileX},${tileY}`

            if (tileX < 0 || tileX >= level.size.width ||
                tileY < 0 || tileY >= level.size.height) {
              canSeeNext = false
              continue
            }

            const prevTileX = centerX + perpX * (actualOffset - direction)
            const prevTileY = centerY + perpY * (actualOffset - direction)
            const prevTile = DungeonService.getTile(level, prevTileX, prevTileY)
            const wallDir = getPerpendicularWall(direction)
            const wallOpen = prevTile.walls[wallDir] === 'open'

            if (visited.has(tileKey)) {
              canSeeNext = wallOpen
              continue
            }

            if (wallOpen) {
              visited.add(tileKey)
            } else {
              canSeeNext = false
            }
          }
        }
      }

      // Check forward wall to determine if we continue deeper
      // For TILE visibility (unlike wall visibility), we stop immediately when blocked
      // because we can't see the floor/ceiling of tiles beyond a wall
      const facingWall = position.facing === 'NORTH' ? centerTile.walls.north :
                        position.facing === 'EAST' ? centerTile.walls.east :
                        position.facing === 'SOUTH' ? centerTile.walls.south :
                        centerTile.walls.west

      if (facingWall !== 'open') {
        break
      }
    }

    // Convert visited Set to array of coordinate tuples
    return Array.from(visited).map(key => {
      const [x, y] = key.split(',').map(Number)
      return [x, y] as [number, number]
    })
  },

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

    // Helper function to get perpendicular wall direction
    const getPerpendicularWall = (offset: number): 'north' | 'south' | 'east' | 'west' => {
      // offset -1 = left, +1 = right from player's perspective
      switch (position.facing) {
        case 'NORTH':
          return offset < 0 ? 'west' : 'east'
        case 'EAST':
          return offset < 0 ? 'north' : 'south'
        case 'SOUTH':
          return offset < 0 ? 'east' : 'west'
        case 'WEST':
          return offset < 0 ? 'south' : 'north'
      }
    }

    // Iterate through depth levels (0 = player tile, 1 = one ahead, etc.)
    for (let depth = 0; depth < maxDepth; depth++) {
      // Calculate center column position at this depth
      const centerX = position.x + forwardX * depth
      const centerY = position.y + forwardY * depth

      // Skip if center is out of bounds
      if (centerX < 0 || centerX >= level.size.width ||
          centerY < 0 || centerY >= level.size.height) {
        break
      }

      const centerKey = `${centerX},${centerY}`
      const centerTile = DungeonService.getTile(level, centerX, centerY)

      // Always add center column tile
      if (!visited.has(centerKey)) {
        addTileWalls(centerX, centerY)
        visited.add(centerKey)
      }

      // Add peripheral tiles only if there's an opening connecting them to center
      // Uses progressive visibility: offset ±1 needs center→±1 open, offset ±2 needs both center→±1 and ±1→±2 open
      if (peripheralColumns >= 3) {
        const halfWidth = Math.floor(peripheralColumns / 2)

        // Process each side (left = negative offsets, right = positive offsets)
        for (const direction of [-1, 1]) {
          let canSeeNext = true  // Track if we can see the next tile in this direction

          for (let offset = 1; offset <= halfWidth && canSeeNext; offset++) {
            const actualOffset = direction * offset
            const tileX = centerX + perpX * actualOffset
            const tileY = centerY + perpY * actualOffset
            const tileKey = `${tileX},${tileY}`

            // Check bounds
            if (tileX < 0 || tileX >= level.size.width ||
                tileY < 0 || tileY >= level.size.height) {
              canSeeNext = false
              continue
            }

            // Get the previous tile (one step closer to center) and check wall direction
            const prevTileX = centerX + perpX * (actualOffset - direction)
            const prevTileY = centerY + perpY * (actualOffset - direction)
            const prevTile = DungeonService.getTile(level, prevTileX, prevTileY)
            const wallDir = getPerpendicularWall(direction)
            const wallOpen = prevTile.walls[wallDir] === 'open'

            // Skip if already visited, but still update visibility for further tiles
            if (visited.has(tileKey)) {
              canSeeNext = wallOpen
              continue
            }

            if (wallOpen) {
              addTileWalls(tileX, tileY)
              visited.add(tileKey)
            } else {
              // Wall blocks further visibility in this direction
              canSeeNext = false
            }
          }
        }
      }

      // Determine forward wall direction
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
