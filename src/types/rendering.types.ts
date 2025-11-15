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
