// Dungeon navigation and tile types

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'
export type WallType = 'open' | 'wall' | 'door' | 'secret' | 'locked_door'
export type TileType =
  | 'stairs_up'
  | 'stairs_down'
  | 'teleporter'
  | 'spinner'
  | 'chute'
  | 'pit'
  | 'darkness_zone_start'
  | 'darkness'
  | 'anti_magic'
  | 'searchable'
  | 'fixed_encounter'
  | 'message'
  | 'elevator'
  | 'door'  // For tile-based door tests
  | 'locked_tile'  // For locked tile areas

export interface Position {
  x: number          // 0-19
  y: number          // 0-19
  facing: Direction
}

export interface TileWalls {
  north: WallType
  east: WallType
  south: WallType
  west: WallType
}

export interface Destination {
  type?: 'castle' | 'level'
  level?: number
  x?: number
  y?: number
}

export interface TileData {
  x: number
  y: number
  walls: TileWalls
  type?: TileType
  destination?: Destination
  message?: string
  item?: string
  promptSearch?: boolean
  encounterId?: string
  repeatable?: boolean
  cannotFlee?: boolean
  isOneWay?: boolean
  destinations?: Destination[]  // For elevator
  locked?: boolean  // For door tiles (test compatibility)
}

export interface LevelData {
  level: number
  name: string
  size: {
    width: number
    height: number
  }
  startPosition: {
    x: number
    y: number
    facing: string  // lowercase in JSON, convert to Direction
  }
  edgeWrapping: boolean
  tiles: TileData[]
  encounterRate: number
  encounterTable: string
}

export interface DungeonState {
  currentLevel: number
  position: Position
  lightActive: boolean
  lightRadius: number
  teleportCount: number            // track consecutive teleports (max 3)
  visitedTiles: Set<string>        // "level-x-y"
  defeatedEncounters: string[]     // encounter IDs
  unlockedDoors: Set<string>       // "level_y_x" - doors unlocked by kicking
}

export interface EncounterTable {
  levelId: string
  encounterRate: number
  monsters: MonsterEntry[]
}

export interface MonsterEntry {
  monsterId: string
  weight: number
}

export interface MovementValidation {
  allowed: boolean
  reason?: string
}

export interface SpecialTileResult {
  newState: any  // GameState (avoid circular import)
  messages: string[]
}

// Simplified dungeon representation for testing
export interface Tile {
  type?: string
  locked?: boolean
  searchContent?: {
    itemId: string
    message?: string
  }
  [key: string]: any
}

export interface Level {
  id: number
  width: number
  height: number
  tiles: Tile[][]
}
