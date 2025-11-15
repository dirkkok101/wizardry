/**
 * Canvas drawing command - represents a single draw operation
 */
export interface CanvasCommand {
  type: 'line' | 'rect' | 'fillRect' | 'fillPolygon' | 'text';
  x: number;
  y: number;
  x2?: number;          // For lines (end point)
  y2?: number;          // For lines (end point)
  width?: number;       // For rectangles
  height?: number;      // For rectangles
  points?: { x: number; y: number }[];  // For polygons
  color: string;        // e.g., '#0f0', '#080'
  lineWidth?: number;   // 1-3px
  alpha?: number;       // 0.0-1.0 for distance fading
}

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
 * Perspective scaling parameters for depth rendering
 */
export interface PerspectiveScale {
  scale: number;        // Size multiplier (1.0 = full size, 0.4 = far)
  offsetY: number;      // Vertical offset for depth illusion
  brightness: number;   // Alpha value for distance fading (1.0 = bright, 0.5 = dim)
}

/**
 * Relative wall directions from player perspective
 */
export interface RelativeWalls {
  front: import('./Dungeon').WallType;
  left: import('./Dungeon').WallType;
  right: import('./Dungeon').WallType;
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
}

/**
 * Configuration for raycasting viewport rendering.
 */
export interface RaycastConfig {
  /** Screen width in pixels */
  screenWidth: number;

  /** Screen height in pixels */
  screenHeight: number;

  /** Maximum ray travel distance in tiles */
  maxRenderDistance: number;

  /** Maximum DDA steps before terminating ray */
  maxRaySteps: number;
}
