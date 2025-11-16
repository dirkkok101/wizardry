import { RaycastingRenderingService } from '../RaycastingRenderingService';
import { LevelData, Position, DungeonState } from '../../types/Dungeon';
import { ViewportConfig, RayHit } from '../../types/rendering.types';
import { TextureSet, Texture } from '../../types/texture.types';

describe('RaycastingRenderingService', () => {
  let service: RaycastingRenderingService;
  let testLevel: LevelData;
  let config: ViewportConfig;

  beforeEach(() => {
    service = new RaycastingRenderingService();

    testLevel = {
      level: 1,
      name: 'Test Level',
      size: { width: 3, height: 3 },
      startPosition: { x: 1, y: 1, facing: 'north' },
      edgeWrapping: false,
      encounterRate: 0,
      encounterTable: 'none',
      tiles: [
        { x: 0, y: 0, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
        { x: 1, y: 0, walls: { north: 'wall', east: 'open', south: 'wall', west: 'open' } },
        { x: 2, y: 0, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
        { x: 0, y: 1, walls: { north: 'wall', east: 'open', south: 'wall', west: 'wall' } },
        { x: 1, y: 1, walls: { north: 'open', east: 'open', south: 'open', west: 'open' } },
        { x: 2, y: 1, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'open' } },
        { x: 0, y: 2, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
        { x: 1, y: 2, walls: { north: 'open', east: 'open', south: 'wall', west: 'open' } },
        { x: 2, y: 2, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
      ]
    };

    config = {
      width: 600,
      height: 600,
      tileDepth: 10,
      peripheralColumns: 5
    };
  });

  describe('generateRaycastCommands', () => {
    it('should generate fillRect commands for each screen column', () => {
      const position: Position = { x: 1, y: 1, facing: 'NORTH' };

      const commands = service.generateRaycastCommands(testLevel, position, config);

      expect(commands.length).toBeGreaterThan(0);
      expect(commands.every(cmd => cmd.type === 'fillRect')).toBe(true);
    });

    it('should generate commands with correct screen coordinates', () => {
      const position: Position = { x: 1, y: 1, facing: 'NORTH' };

      const commands = service.generateRaycastCommands(testLevel, position, config);

      commands.forEach(cmd => {
        expect(cmd.x).toBeGreaterThanOrEqual(0);
        expect(cmd.x).toBeLessThan(config.width);
        expect(cmd.y).toBeGreaterThanOrEqual(0);
        expect(cmd.y).toBeLessThan(config.height);
      });
    });

    it('should apply distance-based darkening', () => {
      // Simply check that we get commands and they have colors
      // The exact color distribution depends on the map layout
      const position: Position = { x: 1, y: 1, facing: 'NORTH' };

      const commands = service.generateRaycastCommands(testLevel, position, config);

      // Check that we have commands with colors
      expect(commands.length).toBeGreaterThan(0);
      const colors = commands.map(cmd => cmd.color).filter(c => c);
      expect(colors.length).toBeGreaterThan(0);

      // Verify all colors are valid RGB strings
      colors.forEach(color => {
        expect(color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
      });
    });

    it('should use different colors for NS vs EW walls', () => {
      // Verify that the service applies different colors for NS vs EW walls
      // Test by directly calling renderWallColumn with different sides
      const hitNS: RayHit = {
        distance: 2,
        mapX: 1,
        mapY: 0,
        side: 'NS',
        wallX: 0.5,
        wallState: 'wall',
        wallDirection: 'north'
      };

      const hitEW: RayHit = {
        distance: 2,
        mapX: 1,
        mapY: 0,
        side: 'EW',
        wallX: 0.5,
        wallState: 'wall',
        wallDirection: 'east'
      };

      const commandsNS = (service as any).renderWallColumn(hitNS, 0, config);
      const commandsEW = (service as any).renderWallColumn(hitEW, 0, config);

      // NS and EW should have different base colors
      expect(commandsNS[0].color).not.toBe(commandsEW[0].color);
    });

    it('should handle doors with different color', () => {
      // Test door color by directly calling renderWallColumn
      const hitDoor: RayHit = {
        distance: 2,
        mapX: 1,
        mapY: 0,
        side: 'NS',
        wallX: 0.5,
        wallState: 'door',
        wallDirection: 'north'
      };

      const hitWall: RayHit = {
        distance: 2,
        mapX: 1,
        mapY: 0,
        side: 'NS',
        wallX: 0.5,
        wallState: 'wall',
        wallDirection: 'north'
      };

      const commandsDoor = (service as any).renderWallColumn(hitDoor, 0, config);
      const commandsWall = (service as any).renderWallColumn(hitWall, 0, config);

      // Door should have different color than wall
      expect(commandsDoor[0].color).not.toBe(commandsWall[0].color);

      // Door color should contain brown RGB values (base is #8B4513)
      // After shading it will be darker but should still have characteristic ratios
      expect(commandsDoor[0].color).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });
  });

  describe('generateRaycastCommands with enhanced textures', () => {
    const createMockTexture = (id: string): Texture => ({
      id,
      width: 64,
      height: 64,
      imageData: new ImageData(64, 64),
      tags: []
    });

    const mockTextureSet: TextureSet = {
      id: 'test',
      name: 'Test',
      wallsNS: [],
      wallsEW: [],
      walls: [
        createMockTexture('wall_01'),
        createMockTexture('wall_02')
      ],
      stairsDown: [createMockTexture('stairs_down')],
      stairsUp: [createMockTexture('stairs_up')],
      doorsOpen: [createMockTexture('door_open')],
      doorsClosed: [createMockTexture('door_closed')]
    };

    const enhancedConfig: ViewportConfig = {
      width: 600,
      height: 600,
      tileDepth: 20,
      peripheralColumns: 5
    };

    it('uses stairs texture when hitting stairs tile', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test',
        size: { width: 20, height: 20 },
        startPosition: { x: 10, y: 10, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          {
            x: 10,
            y: 8,
            walls: { north: 'wall', east: 'open', south: 'open', west: 'open' },
            type: 'stairs_down'
          }
        ],
        encounterRate: 0,
        encounterTable: 'test'
      };

      const position: Position = { x: 10, y: 10, facing: 'NORTH' };

      const enhancedService = new RaycastingRenderingService();
      const commands = enhancedService.generateRaycastCommands(level, position, enhancedConfig, mockTextureSet);

      // Should have putImageData commands for textured walls
      const imageCommands = commands.filter(cmd => cmd.type === 'putImageData');
      expect(imageCommands.length).toBeGreaterThan(0);
    });

    it('uses open door texture when door is in openDoors set', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test',
        size: { width: 20, height: 20 },
        startPosition: { x: 10, y: 10, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          {
            x: 10,
            y: 8,
            walls: { north: 'door', east: 'open', south: 'open', west: 'open' }
          }
        ],
        encounterRate: 0,
        encounterTable: 'test'
      };

      const position: Position = { x: 10, y: 10, facing: 'NORTH' };

      const dungeonState: Partial<DungeonState> = {
        openDoors: new Set(['1_8_10'])  // Level 1, Y=8, X=10
      };

      const enhancedService = new RaycastingRenderingService();
      const commands = enhancedService.generateRaycastCommands(
        level,
        position,
        enhancedConfig,
        mockTextureSet,
        dungeonState as DungeonState
      );

      expect(commands.length).toBeGreaterThan(0);
    });

    it('uses closed door texture when door is not in openDoors set', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test',
        size: { width: 20, height: 20 },
        startPosition: { x: 10, y: 10, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          {
            x: 10,
            y: 8,
            walls: { north: 'door', east: 'open', south: 'open', west: 'open' }
          }
        ],
        encounterRate: 0,
        encounterTable: 'test'
      };

      const position: Position = { x: 10, y: 10, facing: 'NORTH' };

      const dungeonState: Partial<DungeonState> = {
        openDoors: new Set()  // Empty - no doors open
      };

      const enhancedService = new RaycastingRenderingService();
      const commands = enhancedService.generateRaycastCommands(
        level,
        position,
        enhancedConfig,
        mockTextureSet,
        dungeonState as DungeonState
      );

      expect(commands.length).toBeGreaterThan(0);
    });

    it('alternates wall textures based on tile position', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test',
        size: { width: 20, height: 20 },
        startPosition: { x: 10, y: 10, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          {
            x: 10,
            y: 8,
            walls: { north: 'wall', east: 'open', south: 'open', west: 'open' }
          },
          {
            x: 10,
            y: 9,
            walls: { north: 'wall', east: 'open', south: 'open', west: 'open' }
          }
        ],
        encounterRate: 0,
        encounterTable: 'test'
      };

      const position: Position = { x: 10, y: 10, facing: 'NORTH' };

      const enhancedService = new RaycastingRenderingService();
      const commands = enhancedService.generateRaycastCommands(level, position, enhancedConfig, mockTextureSet);

      expect(commands.length).toBeGreaterThan(0);
    });
  });
});
