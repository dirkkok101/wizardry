// ============================================================================
// DUNGEON RAYCASTING RENDERER - COMPLETE TYPESCRIPT IMPLEMENTATION
// Optimized for cell-based map layout with explicit wall definitions
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type WallState = 'open' | 'wall' | 'door';
type Direction = 'north' | 'east' | 'south' | 'west';

interface WallConfiguration {
  north: WallState;
  east: WallState;
  south: WallState;
  west: WallState;
}

interface Position {
  x: number;
  y: number;
}

interface Tile {
  x: number;
  y: number;
  walls: WallConfiguration;
  type?: string;
  [key: string]: any; // Additional properties from map data
}

interface MapData {
  level: number;
  name: string;
  size: {
    width: number;
    height: number;
  };
  startPosition: {
    x: number;
    y: number;
    facing: Direction;
  };
  edgeWrapping: boolean;
  tiles: Tile[];
}

interface Vector2 {
  x: number;
  y: number;
}

interface RayHit {
  distance: number;
  mapX: number;
  mapY: number;
  side: 'NS' | 'EW'; // North-South wall or East-West wall
  wallX: number; // Exact hit position on wall (0-1)
  wallState: WallState;
  wallDirection: Direction; // Which wall of the tile was hit
}

interface Player {
  position: Vector2; // World position (can have decimals)
  direction: Vector2; // Direction vector
  plane: Vector2; // Camera plane (perpendicular to direction)
  facing: Direction; // Cardinal direction (for discrete movement)
}

// ============================================================================
// MAP CLASS - Handles map data and tile queries
// ============================================================================

class DungeonMap {
  private tiles: Map<string, Tile> = new Map();
  private width: number;
  private height: number;
  private edgeWrapping: boolean;

  constructor(mapData: MapData) {
    this.width = mapData.size.width;
    this.height = mapData.size.height;
    this.edgeWrapping = mapData.edgeWrapping;

    // Index tiles by position for fast lookup
    for (const tile of mapData.tiles) {
      this.tiles.set(`${tile.x},${tile.y}`, tile);
    }
  }

  // Get tile at position (with edge wrapping support)
  getTile(x: number, y: number): Tile | undefined {
    if (this.edgeWrapping) {
      x = ((x % this.width) + this.width) % this.width;
      y = ((y % this.height) + this.height) % this.height;
    }
    
    return this.tiles.get(`${x},${y}`);
  }

  // Check if there's a wall in a specific direction from a position
  hasWall(x: number, y: number, direction: Direction): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return true; // Out of bounds = wall
    
    const wallState = tile.walls[direction];
    return wallState === 'wall' || wallState === 'door';
  }

  // Get wall state in a specific direction
  getWallState(x: number, y: number, direction: Direction): WallState {
    const tile = this.getTile(x, y);
    if (!tile) return 'wall';
    return tile.walls[direction];
  }

  // Check if position is valid (considering edge wrapping)
  isValid(x: number, y: number): boolean {
    if (this.edgeWrapping) return true;
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}

// ============================================================================
// PLAYER CONTROLLER - Handles player state and movement
// ============================================================================

class PlayerController {
  private player: Player;
  private map: DungeonMap;
  private moveSpeed: number = 0.1;
  private rotSpeed: number = Math.PI / 2; // 90 degrees

  constructor(startPos: Position, startFacing: Direction, map: DungeonMap) {
    const dir = this.facingToVector(startFacing);
    
    this.player = {
      position: { x: startPos.x + 0.5, y: startPos.y + 0.5 }, // Center of tile
      direction: dir,
      plane: this.getPerpendicular(dir, 0.66), // FOV ~66 degrees
      facing: startFacing
    };
    
    this.map = map;
  }

  // Convert cardinal direction to vector
  private facingToVector(facing: Direction): Vector2 {
    const vectors: Record<Direction, Vector2> = {
      north: { x: 0, y: -1 },
      east: { x: 1, y: 0 },
      south: { x: 0, y: 1 },
      west: { x: -1, y: 0 }
    };
    return vectors[facing];
  }

  // Convert vector back to cardinal direction
  private vectorToFacing(dir: Vector2): Direction {
    const angle = Math.atan2(dir.y, dir.x);
    const normalized = ((angle + Math.PI * 2) % (Math.PI * 2));
    
    if (normalized < Math.PI / 4 || normalized >= 7 * Math.PI / 4) return 'east';
    if (normalized >= Math.PI / 4 && normalized < 3 * Math.PI / 4) return 'south';
    if (normalized >= 3 * Math.PI / 4 && normalized < 5 * Math.PI / 4) return 'west';
    return 'north';
  }

  // Get perpendicular vector for camera plane
  private getPerpendicular(v: Vector2, scale: number): Vector2 {
    return { x: -v.y * scale, y: v.x * scale };
  }

  // Rotate player by angle (in radians)
  private rotateVector(v: Vector2, angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    };
  }

  // Turn player left or right (90 degrees)
  turn(direction: 'left' | 'right'): void {
    const angle = direction === 'left' ? -this.rotSpeed : this.rotSpeed;
    
    this.player.direction = this.rotateVector(this.player.direction, angle);
    this.player.plane = this.rotateVector(this.player.plane, angle);
    this.player.facing = this.vectorToFacing(this.player.direction);
  }

  // Move player forward or backward
  move(direction: 'forward' | 'backward'): boolean {
    const multiplier = direction === 'forward' ? 1 : -1;
    const newX = this.player.position.x + this.player.direction.x * this.moveSpeed * multiplier;
    const newY = this.player.position.y + this.player.direction.y * this.moveSpeed * multiplier;

    // Check collision with walls
    const tileX = Math.floor(newX);
    const tileY = Math.floor(newY);
    
    if (!this.checkCollision(tileX, tileY)) {
      this.player.position.x = newX;
      this.player.position.y = newY;
      return true;
    }
    
    return false;
  }

  // Strafe left or right
  strafe(direction: 'left' | 'right'): boolean {
    const multiplier = direction === 'right' ? 1 : -1;
    const strafeDir = this.getPerpendicular(this.player.direction, 1);
    
    const newX = this.player.position.x + strafeDir.x * this.moveSpeed * multiplier;
    const newY = this.player.position.y + strafeDir.y * this.moveSpeed * multiplier;

    const tileX = Math.floor(newX);
    const tileY = Math.floor(newY);
    
    if (!this.checkCollision(tileX, tileY)) {
      this.player.position.x = newX;
      this.player.position.y = newY;
      return true;
    }
    
    return false;
  }

  // Check if position has collision
  private checkCollision(tileX: number, tileY: number): boolean {
    const tile = this.map.getTile(tileX, tileY);
    if (!tile) return true;

    // Check all walls of the tile
    return tile.walls.north === 'wall' || 
           tile.walls.south === 'wall' || 
           tile.walls.east === 'wall' || 
           tile.walls.west === 'wall';
  }

  getPlayer(): Player {
    return this.player;
  }

  getPosition(): Vector2 {
    return this.player.position;
  }

  getDirection(): Vector2 {
    return this.player.direction;
  }

  getPlane(): Vector2 {
    return this.player.plane;
  }

  getFacing(): Direction {
    return this.player.facing;
  }
}

// ============================================================================
// RAYCASTER - Core DDA raycasting algorithm
// ============================================================================

class Raycaster {
  private map: DungeonMap;
  private maxRayDistance: number = 20;

  constructor(map: DungeonMap) {
    this.map = map;
  }

  // Cast a single ray and return hit information
  castRay(
    pos: Vector2,
    dir: Vector2,
    plane: Vector2,
    screenX: number,
    screenWidth: number
  ): RayHit | null {
    // Calculate ray direction for this screen column
    const cameraX = 2 * screenX / screenWidth - 1; // x in camera space (-1 to 1)
    const rayDirX = dir.x + plane.x * cameraX;
    const rayDirY = dir.y + plane.y * cameraX;

    // Current map tile
    let mapX = Math.floor(pos.x);
    let mapY = Math.floor(pos.y);

    // Length of ray from one x or y-side to next x or y-side
    const deltaDistX = Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(1 / rayDirY);

    // Calculate step and initial sideDist
    let stepX: number;
    let stepY: number;
    let sideDistX: number;
    let sideDistY: number;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (pos.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - pos.x) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (pos.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - pos.y) * deltaDistY;
    }

    // DDA algorithm
    let hit = false;
    let side: 'NS' | 'EW' = 'NS';
    let steps = 0;

    while (!hit && steps < this.maxRayDistance) {
      // Jump to next map square
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 'NS';
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 'EW';
      }

      // Check if ray hit a wall
      if (this.checkWallHit(mapX, mapY, side, stepX, stepY)) {
        hit = true;
      }

      steps++;
    }

    if (!hit) return null;

    // Calculate distance (perpendicular distance to avoid fisheye effect)
    let perpWallDist: number;
    if (side === 'NS') {
      perpWallDist = sideDistX - deltaDistX;
    } else {
      perpWallDist = sideDistY - deltaDistY;
    }

    // Calculate exact hit position on wall (0-1)
    let wallX: number;
    if (side === 'NS') {
      wallX = pos.y + perpWallDist * rayDirY;
    } else {
      wallX = pos.x + perpWallDist * rayDirX;
    }
    wallX -= Math.floor(wallX);

    // Determine which wall direction was hit
    const wallDirection = this.getWallDirection(side, stepX, stepY);
    const wallState = this.map.getWallState(mapX, mapY, wallDirection);

    return {
      distance: perpWallDist,
      mapX,
      mapY,
      side,
      wallX,
      wallState,
      wallDirection
    };
  }

  // Check if there's a wall at this position based on ray direction
  private checkWallHit(mapX: number, mapY: number, side: 'NS' | 'EW', stepX: number, stepY: number): boolean {
    const tile = this.map.getTile(mapX, mapY);
    if (!tile) return true;

    // Determine which wall of the tile we're checking
    const wallDir = this.getWallDirection(side, stepX, stepY);
    const wallState = tile.walls[wallDir];

    return wallState === 'wall' || wallState === 'door';
  }

  // Get the wall direction based on ray side and step
  private getWallDirection(side: 'NS' | 'EW', stepX: number, stepY: number): Direction {
    if (side === 'NS') {
      return stepX > 0 ? 'west' : 'east';
    } else {
      return stepY > 0 ? 'north' : 'south';
    }
  }
}

// ============================================================================
// RENDERER - Handles drawing to canvas
// ============================================================================

class DungeonRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raycaster: Raycaster;
  private screenWidth: number;
  private screenHeight: number;
  private renderDistance: number = 10;

  // Color configuration
  private colors = {
    ceiling: '#1a1a1a',
    floor: '#2a2a2a',
    wallNS: '#666666',
    wallEW: '#444444',
    door: '#8B4513'
  };

  constructor(canvas: HTMLCanvasElement, raycaster: Raycaster) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.raycaster = raycaster;
    this.screenWidth = canvas.width;
    this.screenHeight = canvas.height;
  }

  // Main render function
  render(player: Player): void {
    // Clear screen
    this.clearScreen();

    // Draw floor and ceiling
    this.drawBackground();

    // Cast rays for each vertical stripe
    for (let x = 0; x < this.screenWidth; x++) {
      const hit = this.raycaster.castRay(
        player.position,
        player.direction,
        player.plane,
        x,
        this.screenWidth
      );

      if (hit && hit.distance < this.renderDistance) {
        this.drawWallStripe(x, hit);
      }
    }
  }

  // Clear the screen
  private clearScreen(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
  }

  // Draw floor and ceiling
  private drawBackground(): void {
    // Ceiling
    this.ctx.fillStyle = this.colors.ceiling;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight / 2);

    // Floor
    this.ctx.fillStyle = this.colors.floor;
    this.ctx.fillRect(0, this.screenHeight / 2, this.screenWidth, this.screenHeight / 2);
  }

  // Draw a vertical stripe of wall
  private drawWallStripe(x: number, hit: RayHit): void {
    // Calculate wall height on screen
    const lineHeight = this.screenHeight / hit.distance;

    // Calculate drawing bounds
    const drawStart = Math.max(0, -lineHeight / 2 + this.screenHeight / 2);
    const drawEnd = Math.min(this.screenHeight, lineHeight / 2 + this.screenHeight / 2);

    // Choose wall color based on orientation and type
    let color: string;
    if (hit.wallState === 'door') {
      color = this.colors.door;
    } else {
      color = hit.side === 'NS' ? this.colors.wallNS : this.colors.wallEW;
    }

    // Apply distance-based darkening (fog effect)
    const brightness = this.calculateBrightness(hit.distance);
    const shadedColor = this.shadeColor(color, brightness);

    // Draw the vertical line
    this.ctx.fillStyle = shadedColor;
    this.ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
  }

  // Calculate brightness based on distance
  private calculateBrightness(distance: number): number {
    const minBrightness = 0.2;
    const maxBrightness = 1.0;
    const fogStart = 1.0;
    const fogEnd = this.renderDistance;

    if (distance <= fogStart) return maxBrightness;
    if (distance >= fogEnd) return minBrightness;

    const factor = (distance - fogStart) / (fogEnd - fogStart);
    return maxBrightness - (factor * (maxBrightness - minBrightness));
  }

  // Apply brightness to a color
  private shadeColor(color: string, brightness: number): string {
    // Parse hex color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Apply brightness
    const shadedR = Math.floor(r * brightness);
    const shadedG = Math.floor(g * brightness);
    const shadedB = Math.floor(b * brightness);

    return `rgb(${shadedR}, ${shadedG}, ${shadedB})`;
  }

  // Update render distance
  setRenderDistance(distance: number): void {
    this.renderDistance = distance;
  }

  // Update colors
  setColors(colors: Partial<typeof this.colors>): void {
    this.colors = { ...this.colors, ...colors };
  }
}

// ============================================================================
// GAME CLASS - Main game loop and initialization
// ============================================================================

class DungeonGame {
  private canvas: HTMLCanvasElement;
  private map: DungeonMap;
  private player: PlayerController;
  private raycaster: Raycaster;
  private renderer: DungeonRenderer;
  private isRunning: boolean = false;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement, mapData: MapData) {
    this.canvas = canvas;
    this.map = new DungeonMap(mapData);
    
    // Initialize player
    this.player = new PlayerController(
      mapData.startPosition,
      mapData.startPosition.facing,
      this.map
    );

    // Initialize raycaster and renderer
    this.raycaster = new Raycaster(this.map);
    this.renderer = new DungeonRenderer(canvas, this.raycaster);

    // Setup input handling
    this.setupInput();
  }

  // Setup keyboard input
  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.player.move('forward');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.player.move('backward');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.player.turn('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.player.turn('right');
          break;
        case 'q':
        case 'Q':
          this.player.strafe('left');
          break;
        case 'e':
        case 'E':
          this.player.strafe('right');
          break;
      }
    });
  }

  // Game loop
  private loop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update game state (if needed)
    this.update(deltaTime);

    // Render
    this.render();

    // Continue loop
    if (this.isRunning) {
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  // Update game state
  private update(deltaTime: number): void {
    // Add any update logic here (animations, entities, etc.)
  }

  // Render frame
  private render(): void {
    this.renderer.render(this.player.getPlayer());
  }

  // Start the game
  start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  // Stop the game
  stop(): void {
    this.isRunning = false;
  }

  // Get player controller for external access
  getPlayer(): PlayerController {
    return this.player;
  }

  // Get map for external access
  getMap(): DungeonMap {
    return this.map;
  }

  // Get renderer for external access
  getRenderer(): DungeonRenderer {
    return this.renderer;
  }
}

// ============================================================================
// INITIALIZATION EXAMPLE
// ============================================================================

/*
// Example usage:
async function initGame() {
  // Load map data from JSON
  const response = await fetch('path/to/map.json');
  const mapData = await response.json();
  
  // Get canvas element
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  canvas.width = 800;
  canvas.height = 600;
  
  // Create and start game
  const game = new DungeonGame(canvas, mapData.levels[0]);
  game.start();
  
  // Optional: Customize renderer
  game.getRenderer().setRenderDistance(15);
  game.getRenderer().setColors({
    wallNS: '#8B7355',
    wallEW: '#6B5345',
    door: '#CD853F'
  });
}

// Controls:
// Arrow Keys / WASD - Move forward/backward and turn
// Q/E - Strafe left/right
*/

// ============================================================================
// EXPORT CLASSES
// ============================================================================

export {
  DungeonGame,
  DungeonMap,
  PlayerController,
  Raycaster,
  DungeonRenderer,
  // Types
  type MapData,
  type Tile,
  type Player,
  type RayHit,
  type Position,
  type Vector2,
  type Direction,
  type WallState
};
