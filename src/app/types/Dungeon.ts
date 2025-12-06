// Dungeon navigation and tile types

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'
export type WallType =
  | 'open'
  | 'wall'
  | 'door'
  | 'secret'
  | 'locked_door'
  | 'illusion'
  | 'stairs_up'      // NEW
  | 'stairs_down'   // NEW
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
  | 'room'  // Room tiles for encounter mechanics (12.5% door-kick encounters)

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
  types?: TileType[]
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

export type LightSpellType = 'MILWA' | 'LOMILWA'

export interface DungeonState {
  currentLevel: number
  position: Position
  lightActive: boolean
  lightRadius: number
  lightSpellType?: LightSpellType   // Which light spell is active (undefined = no spell)
  lightDurationRemaining?: number   // Steps remaining until light expires
  inDarknessZone: boolean           // Currently in a darkness zone tile
  teleportCount: number             // track consecutive teleports (max 3)
  visitedTiles: Set<string>         // "level-x-y"
  defeatedEncounters: string[]      // encounter IDs
  unlockedDoors: Set<string>        // "level_y_x" - doors unlocked by kicking
  openDoors: Set<string>            // "level_y_x" - doors currently open
  lootedTiles: Set<string>          // "level_x_y" - searchable tiles already looted
  latumapicActive: boolean          // LATUMAPIC active - monsters identified for expedition
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
  triggersSpecialAction?: 'stairs' | 'teleporter' | 'pit' | 'chute'  // NEW
  destination?: Destination  // NEW
}

export interface SpecialTileResult {
  newState: any  // GameState (avoid circular import)
  messages: string[]
}

// Simplified dungeon representation for testing
export interface Tile {
  types?: string[]
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

/**
 * 3D point in world space
 */
export interface Vector3 {
  x: number  // Horizontal position
  y: number  // Vertical position (height)
  z: number  // Depth
}

/**
 * 2D point in screen space
 */
export interface Vector2 {
  x: number  // Screen X coordinate
  y: number  // Screen Y coordinate
}

/**
 * Information about a visible tile including darkness state.
 * Used when rendering tiles with variable brightness based on darkness depth.
 */
export interface VisibleTileInfo {
  x: number
  y: number
  darknessDepth: number  // 0 = normal tile, 1+ = tiles deep into darkness zone
}

/**
 * Combined visibility result containing both walls and tiles.
 * Single traversal produces both, ensuring they're always in sync.
 */
export interface VisibleGeometry {
  walls: WallSegment[]
  tiles: Array<VisibleTileInfo>
}

/**
 * Wall segment in world space
 * Represents a quad (4 corners) to be rendered
 */
export interface WallSegment {
  // Bottom edge endpoints in world space
  x1: number
  z1: number
  x2: number
  z2: number

  // Wall properties
  height: number       // Wall height (typically 1.0)
  distance: number     // Distance from camera (for z-ordering)
  isVertical: boolean  // true = N/S wall, false = E/W wall
  wallType: WallType   // Wall type for coloring

  // Grid position and orientation (for texture selection)
  gridX: number        // Map X coordinate
  gridY: number        // Map Y coordinate
  side: 'north' | 'south' | 'east' | 'west'  // Wall orientation

  // Darkness state
  darknessDepth: number  // 0 = normal tile, 1+ = tiles deep into darkness zone
}

/**
 * Enhanced player state with pre-computed direction vectors
 * for efficient perspective transformation
 */
export interface PlayerState {
  // Grid position (discrete)
  gridX: number
  gridY: number

  // Orientation (radians: 0=North, π/2=East, π=South, 3π/2=West)
  angle: number

  // Pre-computed direction vectors (updated when angle changes)
  dirX: number   // cos(angle)
  dirY: number   // sin(angle)

  // Camera plane (perpendicular to direction, scaled by FOV)
  planeX: number
  planeY: number
}
