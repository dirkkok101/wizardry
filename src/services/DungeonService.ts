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
}
