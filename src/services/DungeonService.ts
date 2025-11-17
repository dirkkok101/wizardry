import { LevelData, TileData, Position, Direction, WallType, MovementValidation, TileWalls } from '../types/Dungeon'

// Import JSON data
import level1Data from '../../data/maps/level1.json'
import level2Data from '../../data/maps/level2.json'
import level3Data from '../../data/maps/level3.json'

const LEVEL_DATA_MAP: Record<number, any> = {
  1: level1Data,
  2: level2Data,
  3: level3Data,
  // Levels 4-10 to be added when JSON files created
}

export const DungeonService = {
  /**
   * Load dungeon level data from JSON
   */
  loadLevel(level: number): LevelData {
    if (level < 1 || level > 10) {
      throw new Error(`Invalid dungeon level: ${level}. Must be 1-10.`)
    }

    const rawData = LEVEL_DATA_MAP[level]
    if (!rawData) {
      throw new Error(`Map data not found for level ${level}`)
    }

    // Parse JSON structure (levels[0] contains the level)
    const levelData = rawData.levels[0]

    return {
      level: levelData.level,
      name: levelData.name,
      size: levelData.size,
      startPosition: {
        x: levelData.startPosition.x,
        y: levelData.startPosition.y,
        facing: levelData.startPosition.facing.toUpperCase() as Direction
      },
      edgeWrapping: levelData.edgeWrapping,
      tiles: levelData.tiles,
      encounterRate: levelData.encounterRate,
      encounterTable: levelData.encounterTable
    }
  },

  /**
   * Get tile at specific coordinates
   * Returns default empty tile if not found in data
   */
  getTile(level: LevelData, x: number, y: number): TileData {
    const tile = level.tiles.find(t => t.x === x && t.y === y)

    if (tile) {
      return tile
    }

    // Return default tile (all walls)
    console.log(`[DungeonService] getTile - No tile data for (${x},${y}), returning default (all walls)`);
    return {
      x,
      y,
      walls: {
        north: 'wall',
        east: 'wall',
        south: 'wall',
        west: 'wall'
      }
    }
  },

  /**
   * Check if movement is allowed from current position
   */
  canMove(level: LevelData, position: Position, moveDirection: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT'): MovementValidation {
    const tile = this.getTile(level, position.x, position.y)

    // Determine which wall to check based on facing and move direction
    const wallDirection = this.getWallDirectionForMovement(position.facing, moveDirection)
    const wallType = tile.walls[wallDirection]

    // Block solid walls
    if (wallType === 'wall') {
      return {
        allowed: false,
        reason: 'You walk into a wall. Ouch!'
      }
    }

    // Block doors (requires kicking)
    if (wallType === 'door' || wallType === 'locked_door') {
      return {
        allowed: false,
        reason: 'A door blocks your way. Press K to kick it open.'
      }
    }

    // Block secret doors (appear as walls)
    if (wallType === 'secret') {
      return {
        allowed: false,
        reason: 'You walk into a wall. Ouch!'
      }
    }

    // NEW: Allow passage through stairs walls and trigger special action
    if (wallType === 'stairs_up' || wallType === 'stairs_down') {
      return {
        allowed: true,
        triggersSpecialAction: 'stairs',
        destination: tile.destination
      }
    }

    // Allow passage through illusions and open spaces
    if (wallType === 'illusion') {
      return { allowed: true }
    }

    return { allowed: true }
  },

  /**
   * Validate that all stairs walls have destination data
   * Returns array of error messages (empty if valid)
   */
  validateStairsWalls(level: LevelData): string[] {
    const errors: string[] = []

    for (const tile of level.tiles) {
      // Check if any wall on this tile is a stairs type
      const hasStairsWall = Object.values(tile.walls).some(
        wallType => wallType === 'stairs_up' || wallType === 'stairs_down'
      )

      // If has stairs wall but no destination, that's an error
      if (hasStairsWall && !tile.destination) {
        errors.push(`Tile (${tile.x}, ${tile.y}) has stairs wall but no destination`)
      }
    }

    return errors
  },

  /**
   * Helper: determine which wall to check based on facing and movement
   */
  getWallDirectionForMovement(facing: Direction, moveDirection: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT'): keyof TileWalls {
    const directionMap: Record<Direction, Record<string, keyof TileWalls>> = {
      'NORTH': { FORWARD: 'north', BACKWARD: 'south', STRAFE_LEFT: 'west', STRAFE_RIGHT: 'east' },
      'SOUTH': { FORWARD: 'south', BACKWARD: 'north', STRAFE_LEFT: 'east', STRAFE_RIGHT: 'west' },
      'EAST': { FORWARD: 'east', BACKWARD: 'west', STRAFE_LEFT: 'north', STRAFE_RIGHT: 'south' },
      'WEST': { FORWARD: 'west', BACKWARD: 'east', STRAFE_LEFT: 'south', STRAFE_RIGHT: 'north' }
    }

    return directionMap[facing][moveDirection]
  },

  /**
   * Transform relative coordinates (from player perspective) to world coordinates
   * @param position - Player position with facing direction
   * @param relativeX - Horizontal offset (-1 = left, 0 = center, 1 = right)
   * @param relativeY - Forward offset (1 = one tile ahead, 2 = two tiles ahead, etc.)
   * @returns World coordinates with edge wrapping
   */
  transformToWorldCoords(
    position: Position,
    relativeX: number,
    relativeY: number
  ): { x: number; y: number } {
    let worldX = position.x;
    let worldY = position.y;

    switch (position.facing) {
      case 'NORTH':
        // North: forward = +Y, left = -X
        worldX = position.x + relativeX;
        worldY = position.y + relativeY;
        break;
      case 'EAST':
        // East: forward = +X, left = -Y
        worldX = position.x + relativeY;
        worldY = position.y + relativeX;
        break;
      case 'SOUTH':
        // South: forward = -Y, left = +X
        worldX = position.x - relativeX;
        worldY = position.y - relativeY;
        break;
      case 'WEST':
        // West: forward = -X, left = +Y
        worldX = position.x - relativeY;
        worldY = position.y - relativeX;
        break;
    }

    // Handle edge wrapping (maps are 20×20 with wrapping enabled)
    worldX = ((worldX % 20) + 20) % 20;
    worldY = ((worldY % 20) + 20) % 20;

    return { x: worldX, y: worldY };
  },
}

/**
 * Calculate position ahead by given distance based on facing direction
 */
function getPositionAhead(position: Position, distance: number): { x: number; y: number } {
  let x = position.x
  let y = position.y

  switch (position.facing) {
    case 'NORTH':
      y = (y + distance) % 20  // Wrap at 20
      break
    case 'SOUTH':
      y = (y - distance + 20) % 20  // Wrap with negative handling
      break
    case 'EAST':
      x = (x + distance) % 20
      break
    case 'WEST':
      x = (x - distance + 20) % 20
      break
  }

  return { x, y }
}
