import { MazeRenderingService } from '../MazeRenderingService';
import { TileData, Position } from '../../types/Dungeon';
import { CanvasCommand, ViewportConfig } from '../../types/rendering.types';

// Helper to create test tile
function createTestTile(x: number, y: number, walls: {
  north: 'open' | 'wall' | 'door' | 'secret';
  east: 'open' | 'wall' | 'door' | 'secret';
  south: 'open' | 'wall' | 'door' | 'secret';
  west: 'open' | 'wall' | 'door' | 'secret';
}): TileData {
  return {
    x,
    y,
    walls
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

  describe('renderCorridor', () => {
    const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };

    it('returns corridor line commands', () => {
      const commands = MazeRenderingService.renderCorridor(perspective, testConfig);

      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0].type).toBe('line');
      expect(commands[0].color).toBe('#0f0');
    });

    it('applies perspective brightness to lines', () => {
      const fadedPerspective = { scale: 0.4, offsetY: 100, brightness: 0.5 };
      const commands = MazeRenderingService.renderCorridor(fadedPerspective, testConfig);

      expect(commands[0].alpha).toBe(0.5);
    });

    it('creates 4 lines for corridor walls (left/right perspective)', () => {
      const commands = MazeRenderingService.renderCorridor(perspective, testConfig);

      // 2 lines for left wall, 2 for right wall (creating depth)
      expect(commands.length).toBe(4);
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true);
    });
  });

  describe('renderWall', () => {
    const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };

    it('renders left wall as filled rectangle', () => {
      const commands = MazeRenderingService.renderWall('left', 'wall', perspective, testConfig);

      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some(cmd => cmd.type === 'fillRect')).toBe(true);
    });

    it('uses correct color for regular wall', () => {
      const commands = MazeRenderingService.renderWall('left', 'wall', perspective, testConfig);

      const wallCmd = commands.find(cmd => cmd.type === 'fillRect');
      expect(wallCmd?.color).toBe('#0f0');
    });

    it('uses darker color for door', () => {
      const commands = MazeRenderingService.renderWall('left', 'door', perspective, testConfig);

      const doorCmd = commands.find(cmd => cmd.type === 'fillRect');
      expect(doorCmd?.color).toBe('#080');
    });

    it('does not render secret walls (invisible)', () => {
      const commands = MazeRenderingService.renderWall('left', 'secret', perspective, testConfig);

      expect(commands).toHaveLength(0);
    });

    it('applies perspective brightness', () => {
      const fadedPerspective = { scale: 0.4, offsetY: 100, brightness: 0.5 };
      const commands = MazeRenderingService.renderWall('left', 'wall', fadedPerspective, testConfig);

      const wallCmd = commands.find(cmd => cmd.type === 'fillRect');
      expect(wallCmd?.alpha).toBe(0.5);
    });

    it('renders front wall at full width', () => {
      const commands = MazeRenderingService.renderWall('front', 'wall', perspective, testConfig);

      const wallCmd = commands.find(cmd => cmd.type === 'fillRect');
      expect(wallCmd?.width).toBeGreaterThan(300); // Should be near full width
    });
  });
});
