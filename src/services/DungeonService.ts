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

    if (wallType === 'wall') {
      return {
        allowed: false,
        reason: 'You walk into a wall. Ouch!'
      }
    }

    if (wallType === 'door') {
      return {
        allowed: false,
        reason: 'A door blocks your way. Press K to kick it open.'
      }
    }

    if (wallType === 'secret') {
      return {
        allowed: false,
        reason: 'You walk into a wall. Ouch!' // Secret doors appear as walls
      }
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
}
