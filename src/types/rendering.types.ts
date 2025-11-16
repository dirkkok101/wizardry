/**
 * Canvas viewport configuration
 */
export interface ViewportConfig {
  width: number;           // Canvas width in pixels (e.g., 600)
  height: number;          // Canvas height in pixels (e.g., 600)
  tileDepth: number;       // Number of tiles to render (3 = near, mid, far)
  peripheralColumns: number; // Number of columns to show (1 = center only, 3 = Wizardry-style left/center/right)
}

/**
 * Wall direction for raycasting (lowercase for TileWalls keys)
 */
export type WallDirection = 'north' | 'east' | 'south' | 'west';

/**
 * Result of casting a single ray through the dungeon grid.
 * Used by DDA raycasting algorithm to determine wall intersections.
 */
export interface RayHit {
  /** Perpendicular distance to wall (prevents fisheye distortion) */
  distance: number;

  /** Grid X coordinate of hit tile */
  mapX: number;

  /** Grid Y coordinate of hit tile */
  mapY: number;

  /** Wall orientation: NS (north-south/vertical) or EW (east-west/horizontal) */
  side: 'NS' | 'EW';

  /** Exact hit position on wall (0-1) for texture mapping */
  wallX: number;

  /** Type of wall hit (wall, door, secret, etc.) */
  wallState: import('./Dungeon').WallType;

  /** Which wall face was hit (north, east, south, west) */
  wallDirection: WallDirection;

  /** Tile type at hit location (for stairs, special tiles, etc.) */
  tileType?: import('./Dungeon').TileType;
}
