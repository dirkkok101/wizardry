import { LevelData, Position } from '../types/Dungeon';
import { CanvasCommand, ViewportConfig } from '../types/rendering.types';
import { RaycastingService } from './RaycastingService';
import { PlayerStateService } from './PlayerStateService';
import { RayHit } from '../types/rendering.types';

/**
 * Raycasting rendering service that generates canvas commands.
 *
 * Casts one ray per screen column, calculates wall heights based on
 * perpendicular distance, and generates fillRect commands with
 * distance-based shading.
 *
 * Reference: docs/research/renderer/dungeon-renderer-implementation.ts
 */
export class RaycastingRenderingService {
  private readonly raycaster: RaycastingService;

  // Color configuration (matching wireframe aesthetic)
  private readonly colors = {
    wallNS: '#666666',      // Vertical walls (lighter)
    wallEW: '#444444',      // Horizontal walls (darker)
    door: '#8B4513',        // Brown
    lockedDoor: '#8B0000',  // Dark red
    secretDoor: '#000000'   // Black (invisible)
  };

  constructor() {
    this.raycaster = new RaycastingService(20);
  }

  /**
   * Generate canvas commands for raycasting rendering.
   *
   * @param level - Level data
   * @param position - Player position
   * @param config - Viewport configuration
   * @returns Array of canvas commands
   */
  generateRaycastCommands(
    level: LevelData,
    position: Position,
    config: ViewportConfig
  ): CanvasCommand[] {
    const commands: CanvasCommand[] = [];

    // Convert discrete position to continuous player state with vectors
    const playerState = PlayerStateService.fromPosition(position);

    // Cast one ray per screen column
    for (let x = 0; x < config.width; x++) {
      // Calculate ray direction for this column
      const cameraX = (2 * x / config.width) - 1; // Range: -1 to +1
      const rayDirX = playerState.dirX + playerState.planeX * cameraX;
      const rayDirY = playerState.dirY + playerState.planeY * cameraX;

      // Cast ray
      const hit = this.raycaster.castRay(level, playerState, rayDirX, rayDirY);

      if (hit && hit.distance < config.tileDepth) {
        // Render this wall column
        const columnCommands = this.renderWallColumn(hit, x, config);
        commands.push(...columnCommands);
      }
    }

    return commands;
  }

  /**
   * Render a single wall column.
   *
   * @param hit - Ray hit data
   * @param screenX - Screen X coordinate
   * @param config - Viewport configuration
   * @returns Canvas commands for this column
   */
  private renderWallColumn(
    hit: RayHit,
    screenX: number,
    config: ViewportConfig
  ): CanvasCommand[] {
    // Calculate wall height based on perpendicular distance
    const lineHeight = config.height / hit.distance;

    // Calculate drawing bounds (centered on screen)
    const drawStart = Math.max(0, -lineHeight / 2 + config.height / 2);
    const drawEnd = Math.min(config.height, lineHeight / 2 + config.height / 2);

    // Choose base color based on wall type and orientation
    let baseColor: string;

    switch (hit.wallState) {
      case 'door':
        baseColor = this.colors.door;
        break;
      case 'locked_door':
        baseColor = this.colors.lockedDoor;
        break;
      case 'secret':
        baseColor = this.colors.secretDoor;
        break;
      default:
        // Regular wall - darker for EW, lighter for NS
        baseColor = hit.side === 'NS' ? this.colors.wallNS : this.colors.wallEW;
    }

    // Apply distance-based darkening (fog)
    const brightness = this.calculateBrightness(hit.distance, config.tileDepth);
    const shadedColor = this.shadeColor(baseColor, brightness);

    // Generate fillRect command for this column
    return [{
      type: 'fillRect',
      x: screenX,
      y: Math.floor(drawStart),
      width: 1,
      height: Math.ceil(drawEnd - drawStart),
      color: shadedColor,
      alpha: 1.0
    }];
  }

  /**
   * Calculate brightness based on distance (linear fog).
   *
   * @param distance - Distance to wall
   * @param maxDistance - Maximum render distance
   * @returns Brightness factor (0.2 to 1.0)
   */
  private calculateBrightness(distance: number, maxDistance: number): number {
    const minBrightness = 0.2;
    const maxBrightness = 1.0;
    const fogStart = 1.0;
    const fogEnd = maxDistance;

    if (distance <= fogStart) {
      return maxBrightness;
    }

    if (distance >= fogEnd) {
      return minBrightness;
    }

    const factor = (distance - fogStart) / (fogEnd - fogStart);
    return maxBrightness - (factor * (maxBrightness - minBrightness));
  }

  /**
   * Apply brightness to a hex color.
   *
   * @param hexColor - Hex color string (#RRGGBB)
   * @param brightness - Brightness factor (0-1)
   * @returns RGB color string
   */
  private shadeColor(hexColor: string, brightness: number): string {
    // Parse hex color
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Apply brightness
    const shadedR = Math.floor(r * brightness);
    const shadedG = Math.floor(g * brightness);
    const shadedB = Math.floor(b * brightness);

    return `rgb(${shadedR}, ${shadedG}, ${shadedB})`;
  }
}
