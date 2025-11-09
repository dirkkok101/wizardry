import { TileData, Position, Direction } from '../types/Dungeon';
import { CanvasCommand, ViewportConfig, PerspectiveScale, RelativeWalls } from '../types/rendering.types';

/**
 * Calculate perspective scaling for tile at given depth
 * @param depth - Tile depth (1 = near, 2 = mid, 3 = far)
 * @returns Perspective scale parameters
 */
export function calculatePerspective(depth: number): PerspectiveScale {
  const scales = [1.0, 0.7, 0.4];
  const offsets = [0, 50, 100];
  const brightness = [1.0, 0.7, 0.5];

  const index = depth - 1;  // Convert 1-based to 0-based

  return {
    scale: scales[index] ?? 0.4,
    offsetY: offsets[index] ?? 100,
    brightness: brightness[index] ?? 0.5
  };
}

/**
 * Get wireframe color based on depth (distance from player)
 * @param depth - Tile depth (1 = near, 2 = mid, 3 = far)
 * @returns Hex color string
 */
export function getColorForDepth(depth: number): string {
  const colors = ['#0f0', '#0c0', '#090'];
  return colors[depth - 1] ?? '#060';
}

/**
 * Get line width based on depth (thinner lines at distance)
 * @param depth - Tile depth (1 = near, 2 = mid, 3 = far)
 * @returns Line width in pixels
 */
export function getLineWidthForDepth(depth: number): number {
  const widths = [2, 1.5, 1];
  return widths[depth - 1] ?? 1;
}

/**
 * Generate 4 line commands to draw a rectangle outline (wireframe)
 * @param x - Top-left X coordinate
 * @param y - Top-left Y coordinate
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @param color - Line color
 * @param lineWidth - Line thickness
 * @param alpha - Opacity (0-1)
 * @returns Array of 4 line commands (top, right, bottom, left)
 */
export function generateRectangleOutline(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  lineWidth: number,
  alpha: number
): CanvasCommand[] {
  return [
    // Top edge
    { type: 'line', x, y, x2: x + width, y2: y, color, lineWidth, alpha },
    // Right edge
    { type: 'line', x: x + width, y, x2: x + width, y2: y + height, color, lineWidth, alpha },
    // Bottom edge
    { type: 'line', x: x + width, y: y + height, x2: x, y2: y + height, color, lineWidth, alpha },
    // Left edge
    { type: 'line', x, y: y + height, x2: x, y2: y, color, lineWidth, alpha }
  ];
}

/**
 * Convert absolute wall directions to relative (front, left, right)
 * @param walls - Tile walls in absolute directions
 * @param facing - Direction player is facing
 * @returns Walls relative to player perspective
 */
export function getRelativeWalls(
  walls: { north: any; east: any; south: any; west: any },
  facing: Direction
): RelativeWalls {
  // Define mapping for each facing direction
  const directionMap = {
    NORTH: { front: 'north', left: 'west', right: 'east' },
    EAST: { front: 'east', left: 'north', right: 'south' },
    SOUTH: { front: 'south', left: 'east', right: 'west' },
    WEST: { front: 'west', left: 'south', right: 'north' }
  } as const;

  const mapping = directionMap[facing];

  return {
    front: walls[mapping.front],
    left: walls[mapping.left],
    right: walls[mapping.right]
  };
}

/**
 * Draw perspective grid for authentic Wizardry wireframe
 * Creates converging lines and horizontal cross-sections
 * @param config - Viewport configuration
 * @param tileDepth - How many tiles deep to render (1-3)
 * @returns Array of line commands creating 3D tunnel perspective
 */
export function renderTunnelFrames(config: ViewportConfig, tileDepth: number): CanvasCommand[] {
  const commands: CanvasCommand[] = [];
  const centerX = config.width / 2;
  const centerY = config.height / 2;

  // Viewport edges (outermost frame)
  const viewportWidth = 450;
  const viewportHeight = 200;  // Reduced height for more authentic proportions

  const outerLeft = centerX - viewportWidth / 2;
  const outerRight = centerX + viewportWidth / 2;
  const outerTop = centerY - viewportHeight / 2;
  const outerBottom = centerY + viewportHeight / 2;

  // Draw 4 diagonal perspective lines from viewport edges to vanishing point
  // These create the tunnel edges converging toward center
  commands.push(
    // Top-left to center
    { type: 'line', x: outerLeft, y: outerTop, x2: centerX, y2: centerY,
      color: '#0f0', lineWidth: 2, alpha: 1.0 },
    // Top-right to center
    { type: 'line', x: outerRight, y: outerTop, x2: centerX, y2: centerY,
      color: '#0f0', lineWidth: 2, alpha: 1.0 },
    // Bottom-left to center
    { type: 'line', x: outerLeft, y: outerBottom, x2: centerX, y2: centerY,
      color: '#0f0', lineWidth: 2, alpha: 1.0 },
    // Bottom-right to center
    { type: 'line', x: outerRight, y: outerBottom, x2: centerX, y2: centerY,
      color: '#0f0', lineWidth: 2, alpha: 1.0 }
  );

  // Draw horizontal cross-section rectangles at each depth
  for (let depth = 1; depth <= tileDepth; depth++) {
    const perspective = calculatePerspective(depth);
    const color = getColorForDepth(depth);
    const lineWidth = getLineWidthForDepth(depth);

    // Calculate rectangle size - much narrower height for authentic look
    const rectWidth = viewportWidth * perspective.scale;
    const rectHeight = viewportHeight * perspective.scale;

    const x = centerX - rectWidth / 2;
    const y = centerY - rectHeight / 2;

    // Draw horizontal rectangle outline for this depth
    commands.push(...generateRectangleOutline(
      x, y, rectWidth, rectHeight,
      color, lineWidth, perspective.brightness
    ));
  }

  return commands;
}

/**
 * Render a wall on specified side using wireframe lines
 * @param side - Which side (left, right, front)
 * @param wallType - Type of wall
 * @param perspective - Perspective scale parameters
 * @param config - Viewport configuration
 * @param depth - Distance from player (1-3)
 * @param relativeX - Column offset (-1, 0, 1)
 * @returns Array of line drawing commands for wireframe wall
 */
export function renderWall(
  side: 'left' | 'right' | 'front',
  wallType: 'open' | 'wall' | 'door' | 'secret' | 'locked_door',
  perspective: PerspectiveScale,
  config: ViewportConfig,
  depth: number = 1,
  relativeX: number = 0
): CanvasCommand[] {
  // Secret walls are invisible
  if (wallType === 'secret' || wallType === 'open') {
    return [];
  }

  const commands: CanvasCommand[] = [];
  const centerX = config.width / 2;
  const centerY = config.height / 2;

  // Door uses darker green, locked door uses red
  const baseColor = wallType === 'locked_door' ? '#800' :
                    wallType === 'door' ? '#080' :
                    getColorForDepth(depth);

  const lineWidth = getLineWidthForDepth(depth);

  const wallOffset = 200 * perspective.scale;
  const wallHeight = 200 * perspective.scale;
  const depthY = centerY + perspective.offsetY;

  // Calculate horizontal offset based on column position
  const columnOffset = relativeX * wallOffset;

  if (side === 'left') {
    // Left wall wireframe
    commands.push(...generateRectangleOutline(
      centerX - wallOffset - 50 + columnOffset,
      depthY - wallHeight / 2,
      50,
      wallHeight,
      baseColor,
      lineWidth,
      perspective.brightness
    ));
  } else if (side === 'right') {
    // Right wall wireframe
    commands.push(...generateRectangleOutline(
      centerX + wallOffset + columnOffset,
      depthY - wallHeight / 2,
      50,
      wallHeight,
      baseColor,
      lineWidth,
      perspective.brightness
    ));
  } else if (side === 'front') {
    // Front wall (dead end) - full width wireframe
    commands.push(...generateRectangleOutline(
      centerX - wallOffset + columnOffset,
      depthY - wallHeight / 2,
      wallOffset * 2,
      wallHeight,
      baseColor,
      lineWidth,
      perspective.brightness
    ));
  }

  return commands;
}

/**
 * Render a single tile with all its walls
 * @param tile - Tile data with walls and relative positioning
 * @param facing - Direction player is facing
 * @param perspective - Perspective scale parameters
 * @param config - Viewport configuration
 * @returns Array of drawing commands for the tile
 */
export function renderTile(
  tile: TileData & { relativeX: number; relativeDepth: number },
  facing: Direction,
  perspective: PerspectiveScale,
  config: ViewportConfig
): CanvasCommand[] {
  const commands: CanvasCommand[] = [];

  // Get walls relative to player facing
  const walls = getRelativeWalls(tile.walls, facing);

  // Determine which walls to render based on column position
  const relativeX = tile.relativeX;
  const depth = tile.relativeDepth;

  if (relativeX === -1) {
    // Left column: only render right wall (forms left corridor edge)
    if (walls.right !== 'open') {
      commands.push(...renderWall('left', walls.right, perspective, config, depth, relativeX));
    }
  } else if (relativeX === 0) {
    // Center column: render all visible walls
    if (walls.front !== 'open') {
      commands.push(...renderWall('front', walls.front, perspective, config, depth, relativeX));
    }
    if (walls.left !== 'open') {
      commands.push(...renderWall('left', walls.left, perspective, config, depth, relativeX));
    }
    if (walls.right !== 'open') {
      commands.push(...renderWall('right', walls.right, perspective, config, depth, relativeX));
    }
  } else if (relativeX === 1) {
    // Right column: only render left wall (forms right corridor edge)
    if (walls.left !== 'open') {
      commands.push(...renderWall('right', walls.left, perspective, config, depth, relativeX));
    }
  }

  return commands;
}

/**
 * Generate complete view of maze from player perspective
 * @param tiles - Array of visible tiles (near to far) with spatial positioning
 * @param facing - Direction player is facing
 * @param config - Viewport configuration
 * @returns Complete array of drawing commands
 */
export function generateView(
  tiles: (TileData & { relativeX: number; relativeDepth: number })[],
  facing: Direction,
  config: ViewportConfig
): CanvasCommand[] {
  if (tiles.length === 0) {
    return [];
  }

  const commands: CanvasCommand[] = [];

  // Draw horizontal tunnel frames first (creates the 3D tunnel cross-sections)
  const maxDepth = Math.max(...tiles.map(t => t.relativeDepth));
  commands.push(...renderTunnelFrames(config, maxDepth));

  // Sort tiles by depth (far to near for correct z-ordering)
  const sortedTiles = [...tiles].sort((a, b) => b.relativeDepth - a.relativeDepth);

  // Render tiles from far to near for correct z-ordering
  for (const tile of sortedTiles) {
    const depth = tile.relativeDepth;
    const perspective = calculatePerspective(depth);

    commands.push(...renderTile(tile, facing, perspective, config));
  }

  return commands;
}

export const MazeRenderingService = {
  calculatePerspective,
  getRelativeWalls,
  getColorForDepth,
  getLineWidthForDepth,
  generateRectangleOutline,
  renderTunnelFrames,
  renderWall,
  renderTile,
  generateView
};
