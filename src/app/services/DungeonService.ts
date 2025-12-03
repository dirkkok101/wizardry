import { LevelData, TileData, Position, Direction, WallType, MovementValidation, TileWalls, TileType } from '@models/Dungeon'
import { RoomTileInfo } from './FightMapService'
import { ValidatedLevelDataSchema } from '@validation/dungeon-schemas'
import { ZodError } from 'zod'

// Import JSON data
import level1Data from '@data/maps/level1.json'

const LEVEL_DATA_MAP: Record<number, any> = {
  1: level1Data,
  // Levels 2-10 to be added when JSON files created
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
      throw new Error(
        `Failed to load level ${level}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  },

  /**
   * Format Zod validation errors into readable messages
   */
  formatZodError(error: ZodError): string {
    if (!error.issues || error.issues.length === 0) {
      return error.message || 'Unknown validation error'
    }
    return error.issues
      .map((err: any) => `${err.path.join('.')}: ${err.message}`)
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

    // Doors allow passage (original Wizardry: walking into door = implicit kick)
    if (wallType === 'door') {
      return { allowed: true };
    }

    // Locked doors still block (future feature: kicking to unlock)
    if (wallType === 'locked_door') {
      return {
        allowed: false,
        reason: 'A locked door blocks your way.'
      };
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
   * Get all room tiles from a level for FIGHTMAP initialization
   * Room tiles are tiles with 'room' in their types array
   */
  getRoomTiles(level: LevelData): RoomTileInfo[] {
    return level.tiles
      .filter(tile => tile.types?.includes('room'))
      .map(tile => ({
        x: tile.x,
        y: tile.y,
        isRoom: true
      }))
  },

  /**
   * Check if a specific tile is a room tile
   */
  isRoomTile(level: LevelData, x: number, y: number): boolean {
    const tile = this.getTile(level, x, y)
    return tile.types?.includes('room') ?? false
  },

  /**
   * Check if a tile has a fixed encounter configuration
   */
  hasFixedEncounter(level: LevelData, x: number, y: number): boolean {
    const tile = this.getTile(level, x, y)
    return tile.types?.includes('fixed_encounter') === true &&
      tile.aux0 !== undefined &&
      tile.aux0 > 0
  },

  /**
   * Get fixed encounter configuration from tile data
   * Returns undefined if tile has no fixed encounter or aux values
   */
  getFixedEncounterConfig(level: LevelData, x: number, y: number): { aux0: number; aux1: number; aux2: number } | undefined {
    const tile = this.getTile(level, x, y)

    // Must have fixed_encounter type and aux0 defined
    if (!tile.types?.includes('fixed_encounter') || tile.aux0 === undefined) {
      return undefined
    }

    return {
      aux0: tile.aux0,
      aux1: tile.aux1 ?? 0,  // Default to 0 (no random range)
      aux2: tile.aux2 ?? 0   // Default to 0 (first monster in table)
    }
  },

  /**
   * Get all tiles with fixed encounter configurations
   * Used during FIGHTMAP initialization to set up countdown tracking
   */
  getFixedEncounterTiles(level: LevelData): Array<{ x: number; y: number; aux0: number; aux1: number; aux2: number }> {
    return level.tiles
      .filter(tile =>
        tile.types?.includes('fixed_encounter') &&
        tile.aux0 !== undefined &&
        tile.aux0 > 0
      )
      .map(tile => ({
        x: tile.x,
        y: tile.y,
        aux0: tile.aux0!,
        aux1: tile.aux1 ?? 0,
        aux2: tile.aux2 ?? 0
      }))
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
