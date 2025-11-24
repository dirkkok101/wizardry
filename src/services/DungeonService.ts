import { LevelData, TileData, Position, Direction, WallType, MovementValidation, TileWalls } from '../types/Dungeon'
import { ValidatedLevelDataSchema } from '../schemas/dungeon-schemas'
import { ZodError } from 'zod'

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
   * Load dungeon level data from JSON with Zod validation
   * @throws {Error} If level is invalid or data structure is incorrect
   */
  loadLevel(level: number): LevelData {
    if (level < 1 || level > 10) {
      throw new Error(`Invalid dungeon level: ${level}. Must be 1-10.`)
    }

    const rawData = LEVEL_DATA_MAP[level]
    if (!rawData) {
      throw new Error(`Map data not found for level ${level}`)
    }

    try {
      // Parse JSON structure (levels[0] contains the level)
      const levelData = rawData.levels[0]

      // Validate with all business logic rules (includes direction transform)
      const levelValidation = ValidatedLevelDataSchema.safeParse(levelData)
      if (!levelValidation.success) {
        throw new Error(`Invalid level data for level ${level}: ${this.formatZodError(levelValidation.error)}`)
      }

      // Schema validates structure and transforms lowercase direction to uppercase
      return levelValidation.data as LevelData
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Unexpected error loading level ${level}: ${String(error)}`)
    }
  },

  /**
   * Format Zod validation errors into readable messages
   */
  formatZodError(error: ZodError): string {
    if (!error.errors || error.errors.length === 0) {
      return error.message || 'Unknown validation error'
    }
    return error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('; ')
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
  canMove(level: LevelData, position: Position, moveDirection: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT', openDoors?: Set<string>, currentLevel?: number): MovementValidation {
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

    // Check doors - allow passage if open, block if closed
    if (wallType === 'door' || wallType === 'locked_door') {
      const doorKey = `${currentLevel}_${position.y}_${position.x}`;
      const isOpen = openDoors?.has(doorKey) ?? false;

      if (isOpen) {
        return { allowed: true }; // Door is open, allow passage
      }

      return {
        allowed: false,
        reason: 'A door blocks your way. Press O to open it.'
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
