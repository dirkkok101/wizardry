import { LevelData, TileData, WallType } from '../types/Dungeon';
import { PlayerState } from '../types/Dungeon';
import { RayHit, WallDirection } from '../types/rendering.types';

/**
 * Raycasting service using DDA (Digital Differential Analyzer) algorithm.
 * Casts rays through grid-based dungeon to determine wall intersections.
 *
 * Algorithm:
 * 1. Initialize ray direction and grid position
 * 2. Calculate delta distances (distance to cross one grid unit)
 * 3. Step through grid, always moving to nearest grid line
 * 4. Check for wall at each grid crossing
 * 5. Calculate perpendicular distance (prevents fisheye distortion)
 *
 * Reference: docs/research/renderer/raycasting-algorithms-pseudocode.md
 */
export class RaycastingService {
  private readonly maxRaySteps: number;

  constructor(maxRaySteps: number = 20) {
    this.maxRaySteps = maxRaySteps;
  }

  /**
   * Cast a single ray and return first wall hit.
   *
   * @param level - Level data with tiles
   * @param playerState - Player position and direction vectors
   * @param rayDirX - Ray X direction component
   * @param rayDirY - Ray Y direction component
   * @returns RayHit if wall found, null otherwise
   */
  castRay(
    level: LevelData,
    playerState: PlayerState,
    rayDirX: number,
    rayDirY: number
  ): RayHit | null {
    // Player position (continuous coordinates)
    const posX = playerState.gridX + 0.5;
    const posY = playerState.gridY + 0.5;

    // Current map tile
    let mapX = Math.floor(posX);
    let mapY = Math.floor(posY);

    // Length of ray from one x or y-side to next x or y-side
    const deltaDistX = Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(1 / rayDirY);

    // Calculate step direction and initial sideDist
    let stepX: number;
    let stepY: number;
    let sideDistX: number;
    let sideDistY: number;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (posX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - posX) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (posY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - posY) * deltaDistY;
    }

    // DDA algorithm - step through grid
    let hit = false;
    let side: 'NS' | 'EW' = 'NS';
    let steps = 0;

    while (!hit && steps < this.maxRaySteps) {
      // Jump to next map square (always to nearest grid line)
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 'NS'; // Vertical wall (north-south)
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 'EW'; // Horizontal wall (east-west)
      }

      // Determine which wall face we hit
      const wallDirection = this.getWallDirection(side, stepX, stepY);

      // Check if ray hit a wall
      if (this.hasWall(level, mapX, mapY, wallDirection)) {
        hit = true;
      }

      steps++;
    }

    if (!hit) {
      return null;
    }

    // Calculate perpendicular wall distance (prevents fisheye effect)
    let perpWallDist: number;
    if (side === 'NS') {
      perpWallDist = sideDistX - deltaDistX;
    } else {
      perpWallDist = sideDistY - deltaDistY;
    }

    // Calculate exact hit position on wall (0-1) for texture mapping
    let wallX: number;
    if (side === 'NS') {
      wallX = posY + perpWallDist * rayDirY;
    } else {
      wallX = posX + perpWallDist * rayDirX;
    }
    wallX -= Math.floor(wallX);

    // Get wall state
    const wallDirection = this.getWallDirection(side, stepX, stepY);
    const wallState = this.getWallState(level, mapX, mapY, wallDirection);

    // Get tile data for additional information
    const tileData = this.getTile(level, mapX, mapY);

    return {
      distance: perpWallDist,
      mapX,
      mapY,
      side,
      wallX,
      wallState,
      wallDirection,
      tileType: tileData?.type  // NEW: Include tile type
    };
  }

  /**
   * Check if there's a wall at the specified position and direction.
   *
   * @param level - Level data
   * @param mapX - Grid X coordinate
   * @param mapY - Grid Y coordinate
   * @param direction - Wall direction to check
   * @returns true if wall exists, false otherwise
   */
  private hasWall(
    level: LevelData,
    mapX: number,
    mapY: number,
    direction: WallDirection
  ): boolean {
    const tile = this.getTile(level, mapX, mapY);
    if (!tile) {
      return true; // Out of bounds = wall
    }

    const wallState = tile.walls[direction];
    return wallState !== 'open';
  }

  /**
   * Get wall state at specified position and direction.
   *
   * @param level - Level data
   * @param mapX - Grid X coordinate
   * @param mapY - Grid Y coordinate
   * @param direction - Wall direction to check
   * @returns Wall state
   */
  private getWallState(
    level: LevelData,
    mapX: number,
    mapY: number,
    direction: WallDirection
  ): WallType {
    const tile = this.getTile(level, mapX, mapY);
    if (!tile) {
      return 'wall';
    }
    return tile.walls[direction];
  }

  /**
   * Get tile at grid coordinates.
   *
   * @param level - Level data
   * @param x - Grid X coordinate
   * @param y - Grid Y coordinate
   * @returns Tile data or undefined
   */
  private getTile(level: LevelData, x: number, y: number): TileData | undefined {
    // Handle edge wrapping if enabled
    if (level.edgeWrapping) {
      x = ((x % level.size.width) + level.size.width) % level.size.width;
      y = ((y % level.size.height) + level.size.height) % level.size.height;
    }

    return level.tiles.find(tile => tile.x === x && tile.y === y);
  }

  /**
   * Determine which wall face was hit based on ray side and step direction.
   *
   * Logic (Wizardry coordinate system: +Y=NORTH, +X=EAST):
   * - Stepping +X (moving EAST) enters tile from WEST side
   * - Stepping -X (moving WEST) enters tile from EAST side
   * - Stepping +Y (moving NORTH) enters tile from SOUTH side
   * - Stepping -Y (moving SOUTH) enters tile from NORTH side
   *
   * @param side - Wall orientation (NS or EW)
   * @param stepX - X step direction (-1 or 1)
   * @param stepY - Y step direction (-1 or 1)
   * @returns Wall direction
   */
  private getWallDirection(side: 'NS' | 'EW', stepX: number, stepY: number): WallDirection {
    if (side === 'NS') {
      // Vertical wall - stepped in X direction
      return stepX > 0 ? 'west' : 'east';
    } else {
      // Horizontal wall - stepped in Y direction
      return stepY > 0 ? 'south' : 'north';
    }
  }
}
