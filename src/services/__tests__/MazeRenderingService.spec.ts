import { MazeRenderingService } from '../MazeRenderingService';
import { TileData, Position } from '../../types/Dungeon';
import { CanvasCommand, ViewportConfig } from '../../types/rendering.types';

// Helper to create test tile
function createTestTile(
  x: number,
  y: number,
  walls: {
    north: 'open' | 'wall' | 'door' | 'secret';
    east: 'open' | 'wall' | 'door' | 'secret';
    south: 'open' | 'wall' | 'door' | 'secret';
    west: 'open' | 'wall' | 'door' | 'secret';
  },
  relativeX: number = 0,
  relativeDepth: number = 1
): TileData & { relativeX: number; relativeDepth: number } {
  return {
    x,
    y,
    walls,
    relativeX,
    relativeDepth
  };
}

const testConfig: ViewportConfig = {
  width: 600,
  height: 600,
  tileDepth: 3
};

describe('MazeRenderingService', () => {
  describe('calculatePerspective', () => {
    it('returns scale 1.0 for depth 1 (near tile)', () => {
      const result = MazeRenderingService.calculatePerspective(1);

      expect(result.scale).toBe(1.0);
      expect(result.offsetY).toBe(0);
      expect(result.brightness).toBe(1.0);
    });

    it('returns scale 0.7 for depth 2 (mid tile)', () => {
      const result = MazeRenderingService.calculatePerspective(2);

      expect(result.scale).toBe(0.7);
      expect(result.offsetY).toBe(50);
      expect(result.brightness).toBe(0.7);
    });

    it('returns scale 0.4 for depth 3 (far tile)', () => {
      const result = MazeRenderingService.calculatePerspective(3);

      expect(result.scale).toBe(0.4);
      expect(result.offsetY).toBe(100);
      expect(result.brightness).toBe(0.5);
    });
  });

  describe('getRelativeWalls', () => {
    const walls = {
      north: 'wall' as const,
      east: 'door' as const,
      south: 'open' as const,
      west: 'wall' as const
    };

    it('returns correct relative walls when facing NORTH', () => {
      const result = MazeRenderingService.getRelativeWalls(walls, 'NORTH');

      expect(result.front).toBe('wall');  // north
      expect(result.left).toBe('wall');   // west
      expect(result.right).toBe('door');  // east
    });

    it('returns correct relative walls when facing EAST', () => {
      const result = MazeRenderingService.getRelativeWalls(walls, 'EAST');

      expect(result.front).toBe('door');  // east
      expect(result.left).toBe('wall');   // north
      expect(result.right).toBe('open');  // south
    });

    it('returns correct relative walls when facing SOUTH', () => {
      const result = MazeRenderingService.getRelativeWalls(walls, 'SOUTH');

      expect(result.front).toBe('open');  // south
      expect(result.left).toBe('door');   // east
      expect(result.right).toBe('wall');  // west
    });

    it('returns correct relative walls when facing WEST', () => {
      const result = MazeRenderingService.getRelativeWalls(walls, 'WEST');

      expect(result.front).toBe('wall');  // west
      expect(result.left).toBe('open');   // south
      expect(result.right).toBe('wall');  // north
    });
  });

  describe('renderTunnelFrames', () => {
    it('returns tunnel perspective commands', () => {
      const commands = MazeRenderingService.renderTunnelFrames(testConfig, 3);

      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0].type).toBe('line');
      expect(commands[0].color).toBe('#0f0');
    });

    it('creates perspective lines and horizontal rectangles', () => {
      const commands = MazeRenderingService.renderTunnelFrames(testConfig, 3);

      // 4 diagonal perspective lines + (3 depths × 4 lines per rectangle) = 4 + 12 = 16 lines
      expect(commands.length).toBe(16);
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true);
    });

    it('uses depth-based colors and brightness for rectangles', () => {
      const commands = MazeRenderingService.renderTunnelFrames(testConfig, 2);

      // 4 diagonal lines + (2 rectangles × 4 lines) = 4 + 8 = 12 lines
      expect(commands.length).toBe(12);

      // First 4 are diagonal perspective lines (all green, alpha 1.0)
      expect(commands.slice(0, 4).every(cmd => cmd.color === '#0f0')).toBe(true);
      expect(commands.slice(0, 4).every(cmd => cmd.alpha === 1.0)).toBe(true);
    });
  });

  describe('renderWall', () => {
    const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };

    it('renders left wall as wireframe lines', () => {
      const commands = MazeRenderingService.renderWall('left', 'wall', perspective, testConfig);

      expect(commands.length).toBeGreaterThan(0);
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true);
    });

    it('uses correct color for regular wall', () => {
      const commands = MazeRenderingService.renderWall('left', 'wall', perspective, testConfig);

      const wallCmd = commands.find(cmd => cmd.type === 'line');
      expect(wallCmd?.color).toBe('#0f0');
    });

    it('uses darker color for door', () => {
      const commands = MazeRenderingService.renderWall('left', 'door', perspective, testConfig);

      const doorCmd = commands.find(cmd => cmd.type === 'line');
      expect(doorCmd?.color).toBe('#080');
    });

    it('does not render secret walls (invisible)', () => {
      const commands = MazeRenderingService.renderWall('left', 'secret', perspective, testConfig);

      expect(commands).toHaveLength(0);
    });

    it('applies perspective brightness', () => {
      const fadedPerspective = { scale: 0.4, offsetY: 100, brightness: 0.5 };
      const commands = MazeRenderingService.renderWall('left', 'wall', fadedPerspective, testConfig);

      const wallCmd = commands.find(cmd => cmd.type === 'line');
      expect(wallCmd?.alpha).toBe(0.5);
    });

    it('renders front wall with 4 lines (wireframe rectangle)', () => {
      const commands = MazeRenderingService.renderWall('front', 'wall', perspective, testConfig);

      // Should have 4 lines for rectangle outline
      expect(commands.length).toBe(4);
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true);
    });
  });

  describe('renderTile', () => {
    const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };

    it('renders open corridor with no wall lines', () => {
      const tile = createTestTile(0, 0, {
        north: 'open',
        east: 'open',
        south: 'open',
        west: 'open'
      });

      const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, testConfig);

      // Open corridor has no walls, renderTile only returns wall commands
      // (perspective lines are added by generateView)
      expect(commands.length).toBe(0);
    });

    it('renders wall on left when left has wall', () => {
      const tile = createTestTile(0, 0, {
        north: 'open',
        east: 'open',
        south: 'open',
        west: 'wall'
      });

      const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, testConfig);

      // Should have left wall wireframe only (4 lines for rectangle)
      // Perspective lines are handled by generateView
      expect(commands.length).toBe(4);
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true);
    });

    it('renders front wall when facing wall', () => {
      const tile = createTestTile(0, 0, {
        north: 'wall',
        east: 'open',
        south: 'open',
        west: 'open'
      });

      const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, testConfig);

      // Should have front wall wireframe only (4 lines for rectangle)
      // Perspective lines are handled by generateView
      expect(commands.length).toBe(4);
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true);
    });

    it('renders door with darker color', () => {
      const tile = createTestTile(0, 0, {
        north: 'door',
        east: 'open',
        south: 'open',
        west: 'open'
      });

      const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, testConfig);

      const doorCmd = commands.find(cmd => cmd.color === '#080');
      expect(doorCmd).toBeDefined();
    });
  });

  describe('generateView', () => {
    it('returns empty array for no tiles', () => {
      const commands = MazeRenderingService.generateView([], 'NORTH', testConfig);

      expect(commands).toHaveLength(0);
    });

    it('renders 3 tiles with correct perspective', () => {
      const tiles = [
        createTestTile(10, 9, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 1),
        createTestTile(10, 8, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 2),
        createTestTile(10, 7, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 3)
      ];

      const commands = MazeRenderingService.generateView(tiles, 'NORTH', testConfig);

      // Should have commands (3 tiles × wall lines)
      expect(commands.length).toBeGreaterThan(0);
    });

    it('renders far tiles before near tiles (z-ordering)', () => {
      const tiles = [
        createTestTile(10, 9, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 1),
        createTestTile(10, 8, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 2),
        createTestTile(10, 7, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 3)
      ];

      const commands = MazeRenderingService.generateView(tiles, 'NORTH', testConfig);

      // Check that far tile walls (lower brightness) come before near tile walls
      const wallBrightnesses = commands
        .filter(cmd => cmd.alpha !== undefined)
        .map(cmd => cmd.alpha);

      // First wall commands should have lower brightness (far tiles)
      if (wallBrightnesses.length >= 2) {
        expect(wallBrightnesses[0]).toBeLessThan(wallBrightnesses[wallBrightnesses.length - 1]);
      }
    });

    it('handles single tile (light radius 1)', () => {
      const tiles = [
        createTestTile(10, 9, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 1)
      ];

      const commands = MazeRenderingService.generateView(tiles, 'NORTH', testConfig);

      expect(commands.length).toBeGreaterThan(0);
      // All commands should have full brightness for depth 1
      const hasFadedCommands = commands.some(cmd => cmd.alpha && cmd.alpha < 1.0);
      expect(hasFadedCommands).toBe(false);
    });

    it('renders 3×3 grid of tiles with walls', () => {
      const tiles = [
        // Depth 1
        createTestTile(9, 9, { north: 'open', east: 'wall', south: 'open', west: 'open' }, -1, 1),
        createTestTile(10, 9, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 1),
        createTestTile(11, 9, { north: 'open', east: 'open', south: 'open', west: 'wall' }, 1, 1),
        // Depth 2
        createTestTile(9, 8, { north: 'open', east: 'wall', south: 'open', west: 'open' }, -1, 2),
        createTestTile(10, 8, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 2),
        createTestTile(11, 8, { north: 'open', east: 'open', south: 'open', west: 'wall' }, 1, 2),
        // Depth 3
        createTestTile(9, 7, { north: 'open', east: 'wall', south: 'open', west: 'open' }, -1, 3),
        createTestTile(10, 7, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 3),
        createTestTile(11, 7, { north: 'open', east: 'open', south: 'open', west: 'wall' }, 1, 3)
      ];

      const commands = MazeRenderingService.generateView(tiles, 'NORTH', testConfig);

      // Should render walls from 9 tiles (each wall = 4 lines, 9 tiles with walls)
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('renderWall (wireframe)', () => {
    it('generates wireframe lines instead of fillRect for walls', () => {
      const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };
      const config = { width: 600, height: 600, tileDepth: 3 };

      const commands = MazeRenderingService.renderWall('left', 'wall', perspective, config);

      // Should generate 4 line commands (rectangle outline)
      expect(commands.length).toBe(4);
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true);

      // Should NOT contain any fillRect commands
      expect(commands.some(cmd => cmd.type === 'fillRect')).toBe(false);
    });

    it('uses correct color and lineWidth for depth', () => {
      const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };
      const config = { width: 600, height: 600, tileDepth: 3 };

      const commands = MazeRenderingService.renderWall('front', 'wall', perspective, config);

      // All lines should use green color
      expect(commands.every(cmd => cmd.color === '#0f0')).toBe(true);

      // All lines should have lineWidth of 2 (depth 1)
      expect(commands.every(cmd => cmd.lineWidth === 2)).toBe(true);
    });
  });

  describe('renderTile (with spatial positioning)', () => {
    const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };
    const config = { width: 600, height: 600, tileDepth: 3 };

    it('renders center column tile with all visible walls', () => {
      const tile: TileData & { relativeX: number; relativeDepth: number } = {
        x: 10, y: 9,
        walls: { north: 'wall', east: 'open', south: 'open', west: 'wall' },
        relativeX: 0,
        relativeDepth: 1
      };

      const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, config);

      // Center column: should render front and left walls (east is open)
      expect(commands.length).toBeGreaterThan(0);

      // Should have wall commands (4 lines per wall)
      const wallCount = commands.length / 4;
      expect(wallCount).toBeGreaterThanOrEqual(2); // front + left walls
    });

    it('renders left column tile with only right-facing wall visible', () => {
      const tile: TileData & { relativeX: number; relativeDepth: number } = {
        x: 9, y: 9,
        walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' },
        relativeX: -1,
        relativeDepth: 1
      };

      const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, config);

      // Left column: only render east wall (right side from player perspective)
      // This forms the left corridor wall seen from center
      expect(commands.length).toBeGreaterThan(0);
    });

    it('renders right column tile with only left-facing wall visible', () => {
      const tile: TileData & { relativeX: number; relativeDepth: number } = {
        x: 11, y: 9,
        walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' },
        relativeX: 1,
        relativeDepth: 1
      };

      const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, config);

      // Right column: only render west wall (left side from player perspective)
      // This forms the right corridor wall seen from center
      expect(commands.length).toBeGreaterThan(0);
    });

    it('positions walls with correct horizontal offset', () => {
      const leftTile: TileData & { relativeX: number; relativeDepth: number } = {
        x: 9, y: 9,
        walls: { north: 'open', east: 'wall', south: 'open', west: 'open' },
        relativeX: -1,
        relativeDepth: 1
      };

      const rightTile: TileData & { relativeX: number; relativeDepth: number } = {
        x: 11, y: 9,
        walls: { north: 'open', east: 'open', south: 'open', west: 'wall' },
        relativeX: 1,
        relativeDepth: 1
      };

      const leftCommands = MazeRenderingService.renderTile(leftTile, 'NORTH', perspective, config);
      const rightCommands = MazeRenderingService.renderTile(rightTile, 'NORTH', perspective, config);

      // Left and right walls should have different X positions
      expect(leftCommands[0].x).not.toEqual(rightCommands[0].x);
    });
  });
});
