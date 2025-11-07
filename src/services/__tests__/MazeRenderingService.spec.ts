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
});
