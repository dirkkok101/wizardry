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

export const MazeRenderingService = {
  calculatePerspective,
  getRelativeWalls
};
