import { RaycastingService } from '../RaycastingService';
import { LevelData, TileData, PlayerState } from '../../types/Dungeon';

describe('RaycastingService', () => {
  let service: RaycastingService;
  let testLevel: LevelData;

  beforeEach(() => {
    service = new RaycastingService();

    // Create simple 3x3 test level
    testLevel = {
      level: 1,
      name: 'Test Level',
      size: { width: 3, height: 3 },
      startPosition: { x: 1, y: 1, facing: 'north' },
      edgeWrapping: false,
      encounterRate: 0,
      encounterTable: '',
      tiles: [
        // Row 0
        { x: 0, y: 0, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
        { x: 1, y: 0, walls: { north: 'wall', east: 'open', south: 'wall', west: 'open' } },
        { x: 2, y: 0, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
        // Row 1
        { x: 0, y: 1, walls: { north: 'wall', east: 'open', south: 'wall', west: 'wall' } },
        { x: 1, y: 1, walls: { north: 'open', east: 'open', south: 'open', west: 'open' } },
        { x: 2, y: 1, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'open' } },
        // Row 2
        { x: 0, y: 2, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
        { x: 1, y: 2, walls: { north: 'open', east: 'open', south: 'wall', west: 'open' } },
        { x: 2, y: 2, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
      ]
    };
  });

  describe('castRay', () => {
    it('should hit north wall when facing north', () => {
      const playerState: PlayerState = {
        gridX: 1,
        gridY: 1,
        angle: 0,
        dirX: 0,
        dirY: 1,
        planeX: 1,
        planeY: 0
      };

      const hit = service.castRay(testLevel, playerState, 0, 1);

      expect(hit).not.toBeNull();
      expect(hit!.mapX).toBe(1);
      expect(hit!.mapY).toBe(2);
      expect(hit!.wallDirection).toBe('south');
      expect(hit!.distance).toBeCloseTo(0.5, 1);
    });

    it('should return null when ray does not hit wall', () => {
      const playerState: PlayerState = {
        gridX: 1,
        gridY: 1,
        angle: 0,
        dirX: 0,
        dirY: 1,
        planeX: 1,
        planeY: 0
      };

      // Ray pointing into open space with maxSteps too low to reach wall
      const serviceWithLowSteps = new RaycastingService(0); // maxSteps = 0, won't step at all
      const hit = serviceWithLowSteps.castRay(testLevel, playerState, 0, 1);

      expect(hit).toBeNull();
    });
  });

  describe('hasWall', () => {
    it('should detect wall at tile boundary', () => {
      const hasWall = (service as any).hasWall(testLevel, 1, 2, 'south');
      expect(hasWall).toBe(true);
    });

    it('should detect open at tile boundary', () => {
      const hasWall = (service as any).hasWall(testLevel, 1, 1, 'north');
      expect(hasWall).toBe(false);
    });

    it('should return true for out of bounds', () => {
      const hasWall = (service as any).hasWall(testLevel, -1, -1, 'north');
      expect(hasWall).toBe(true);
    });
  });

  describe('getWallDirection', () => {
    it('should return west when stepping +X on NS wall', () => {
      const direction = (service as any).getWallDirection('NS', 1, 0);
      expect(direction).toBe('west');
    });

    it('should return east when stepping -X on NS wall', () => {
      const direction = (service as any).getWallDirection('NS', -1, 0);
      expect(direction).toBe('east');
    });

    it('should return south when stepping +Y on EW wall', () => {
      const direction = (service as any).getWallDirection('EW', 0, 1);
      expect(direction).toBe('south');
    });

    it('should return north when stepping -Y on EW wall', () => {
      const direction = (service as any).getWallDirection('EW', 0, -1);
      expect(direction).toBe('north');
    });
  });

  describe('edge wrapping', () => {
    it('should wrap coordinates for toroidal maps', () => {
      const wrappingLevel: LevelData = {
        ...testLevel,
        edgeWrapping: true
      };

      const playerState: PlayerState = {
        gridX: 0,
        gridY: 1,
        angle: Math.PI * 3/2, // Facing west
        dirX: -1,
        dirY: 0,
        planeX: 0,
        planeY: 0.66
      };

      // Ray should wrap to east edge
      const hit = service.castRay(wrappingLevel, playerState, -1, 0);

      expect(hit).not.toBeNull();
      expect(hit!.wallDirection).toBe('east');
    });
  });

  describe('door detection', () => {
    it('should detect doors as walls', () => {
      const levelWithDoor: LevelData = {
        ...testLevel,
        tiles: testLevel.tiles.map(tile =>
          tile.x === 1 && tile.y === 2
            ? { ...tile, walls: { ...tile.walls, south: 'door' } }
            : tile
        )
      };

      const playerState: PlayerState = {
        gridX: 1,
        gridY: 1,
        angle: 0,
        dirX: 0,
        dirY: 1,
        planeX: 1,
        planeY: 0
      };

      const hit = service.castRay(levelWithDoor, playerState, 0, 1);

      expect(hit).not.toBeNull();
      expect(hit!.wallState).toBe('door');
    });
  });

  describe('perpendicular distance', () => {
    it('should calculate perpendicular distance not euclidean', () => {
      const playerState: PlayerState = {
        gridX: 1,
        gridY: 1,
        angle: 0,
        dirX: 0,
        dirY: 1,
        planeX: 1,
        planeY: 0
      };

      // Cast ray at 45 degree angle
      const rayDirX = 0.5;
      const rayDirY = 0.866; // ~60 degrees from north

      const hit = service.castRay(testLevel, playerState, rayDirX, rayDirY);

      expect(hit).not.toBeNull();

      // Perpendicular distance should be less than euclidean
      const euclidean = Math.sqrt(
        Math.pow(hit!.mapX + 0.5 - (playerState.gridX + 0.5), 2) +
        Math.pow(hit!.mapY + 0.5 - (playerState.gridY + 0.5), 2)
      );

      expect(hit!.distance).toBeLessThan(euclidean);
    });
  });

  describe('castRay with tile types', () => {
    it('includes tile type in ray hit for stairs', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 10, y: 10, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          {
            x: 10,
            y: 10,
            walls: { north: 'open', east: 'open', south: 'open', west: 'open' }
          },
          {
            x: 10,
            y: 11,
            walls: { north: 'open', east: 'open', south: 'wall', west: 'open' },
            type: 'stairs_down'  // Special tile type - wall on south side
          }
        ],
        encounterRate: 0,
        encounterTable: 'test'
      };

      const playerState: PlayerState = {
        gridX: 10,
        gridY: 10,
        angle: 0,  // Facing north
        dirX: 0,
        dirY: 1,  // Moving in +Y direction (north in Wizardry coords)
        planeX: 0.66,
        planeY: 0
      };

      const hit = service.castRay(level, playerState, 0, 1);

      expect(hit).not.toBeNull();
      expect(hit!.mapX).toBe(10);
      expect(hit!.mapY).toBe(11);
      expect(hit!.tileType).toBe('stairs_down');
    });

    it('includes undefined tileType for normal tiles', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 10, y: 10, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          {
            x: 10,
            y: 10,
            walls: { north: 'open', east: 'open', south: 'open', west: 'open' }
          },
          {
            x: 10,
            y: 11,
            walls: { north: 'open', east: 'open', south: 'wall', west: 'open' }
            // No type field - normal tile
          }
        ],
        encounterRate: 0,
        encounterTable: 'test'
      };

      const playerState: PlayerState = {
        gridX: 10,
        gridY: 10,
        angle: 0,
        dirX: 0,
        dirY: 1,
        planeX: 0.66,
        planeY: 0
      };

      const hit = service.castRay(level, playerState, 0, 1);

      expect(hit).not.toBeNull();
      expect(hit!.mapX).toBe(10);
      expect(hit!.mapY).toBe(11);
      expect(hit!.tileType).toBeUndefined();
    });
  });
});
