import { DungeonService } from '../DungeonService'
import { Position, LevelData, TileData } from '../../types/Dungeon'

describe('DungeonService', () => {
  describe('loadLevel', () => {
    it('loads level 1 map data with 20x20 grid', () => {
      const level = DungeonService.loadLevel(1)

      expect(level.level).toBe(1)
      expect(level.size).toEqual({ width: 20, height: 20 })
      expect(level.encounterTable).toBe('level_1_monsters')
      expect(level.tiles.length).toBeGreaterThan(0)
    })

    it('loads level 2 map data', () => {
      const level = DungeonService.loadLevel(2)

      expect(level.level).toBe(2)
      expect(level.size).toEqual({ width: 20, height: 20 })
    })

    it('throws error for invalid level', () => {
      expect(() => DungeonService.loadLevel(0)).toThrow()
      expect(() => DungeonService.loadLevel(11)).toThrow()
    })
  })

  describe('getTile', () => {
    it('returns tile at specific coordinates', () => {
      const level = DungeonService.loadLevel(1)
      const tile = DungeonService.getTile(level, 0, 0)

      expect(tile.x).toBe(0)
      expect(tile.y).toBe(0)
      expect(tile.type).toBe('stairs_up')
    })

    it('returns tile with correct wall configuration', () => {
      const level = DungeonService.loadLevel(1)
      const tile = DungeonService.getTile(level, 2, 0)

      expect(tile.walls.east).toBe('door')
    })

    it('returns default tile for coordinates with no tile data', () => {
      const level = DungeonService.loadLevel(1)
      const tile = DungeonService.getTile(level, 19, 19)

      // Should return a default tile if not in tiles array
      expect(tile.x).toBe(19)
      expect(tile.y).toBe(19)
    })
  })

  describe('canMove', () => {
    const level = DungeonService.loadLevel(1)

    it('allows movement when no wall blocks path (facing north with open north)', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }
      const result = DungeonService.canMove(level, position, 'FORWARD')

      expect(result.allowed).toBe(true)
    })

    it('blocks movement when wall present', () => {
      const position: Position = { x: 0, y: 0, facing: 'EAST' }
      const result = DungeonService.canMove(level, position, 'FORWARD')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('wall')
    })

    it('blocks movement when door present', () => {
      const position: Position = { x: 2, y: 0, facing: 'EAST' }
      const result = DungeonService.canMove(level, position, 'FORWARD')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('door')
    })

    it('allows backward movement', () => {
      const position: Position = { x: 5, y: 1, facing: 'NORTH' }
      const result = DungeonService.canMove(level, position, 'BACKWARD')

      // Moving backward from facing north = checking south wall
      expect(result.allowed).toBeDefined()
    })
  })

  describe('transformToWorldCoords', () => {
    it('transforms relative coords when facing NORTH', () => {
      const position: Position = { x: 10, y: 10, level: 1, facing: 'NORTH' };

      // Center ahead (0, 1)
      expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 10, y: 11 });

      // Left ahead (-1, 1)
      expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 9, y: 11 });

      // Right ahead (1, 1)
      expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 11, y: 11 });
    });

    it('transforms relative coords when facing EAST', () => {
      const position: Position = { x: 10, y: 10, level: 1, facing: 'EAST' };

      // Center ahead (0, 1)
      expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 11, y: 10 });

      // Left ahead (-1, 1)
      expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 11, y: 9 });

      // Right ahead (1, 1)
      expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 11, y: 11 });
    });

    it('transforms relative coords when facing SOUTH', () => {
      const position: Position = { x: 10, y: 10, level: 1, facing: 'SOUTH' };

      // Center ahead (0, 1)
      expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 10, y: 9 });

      // Left ahead (-1, 1)
      expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 11, y: 9 });

      // Right ahead (1, 1)
      expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 9, y: 9 });
    });

    it('transforms relative coords when facing WEST', () => {
      const position: Position = { x: 10, y: 10, level: 1, facing: 'WEST' };

      // Center ahead (0, 1)
      expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 9, y: 10 });

      // Left ahead (-1, 1)
      expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 9, y: 11 });

      // Right ahead (1, 1)
      expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 9, y: 9 });
    });

    it('handles edge wrapping at boundaries', () => {
      const position: Position = { x: 0, y: 0, level: 1, facing: 'NORTH' };

      // Left edge wraps to 19
      expect(DungeonService.transformToWorldCoords(position, -1, 0)).toEqual({ x: 19, y: 0 });

      // North from 0 goes to 1
      expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 0, y: 1 });
    });
  });

  describe('canMove with stairs walls', () => {
    const createTestLevel = (): LevelData => ({
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      startPosition: { x: 0, y: 0, facing: 'north' },
      edgeWrapping: true,
      tiles: [],
      encounterRate: 0.1,
      encounterTable: 'test_table'
    })

    it('allows movement through stairs_up wall and marks special action', () => {
      const level = createTestLevel()
      const tile: TileData = {
        x: 0,
        y: 1,
        walls: {
          north: 'stairs_up',
          south: 'open',
          east: 'open',
          west: 'wall'
        },
        destination: { type: 'castle' }
      }

      // Add tile to level (player is standing on this tile)
      level.tiles.push(tile)

      // Player at (0,1) facing NORTH, so they check the north wall of tile (0,1)
      const position: Position = { x: 0, y: 1, facing: 'NORTH' }
      const result = DungeonService.canMove(level, position, 'FORWARD')

      expect(result.allowed).toBe(true)
      expect(result.triggersSpecialAction).toBe('stairs')
      expect(result.destination).toEqual({ type: 'castle' })
    })

    it('allows movement through stairs_down wall and passes destination', () => {
      const level = createTestLevel()
      const tile: TileData = {
        x: 5,
        y: 11,
        walls: {
          north: 'stairs_down',
          south: 'wall',
          east: 'wall',
          west: 'wall'
        },
        destination: { level: 2, x: 10, y: 5 }
      }

      // Add tile to level (player is standing on this tile)
      level.tiles.push(tile)

      // Player at (5,11) facing NORTH, so they check the north wall of tile (5,11)
      const position: Position = { x: 5, y: 11, facing: 'NORTH' }
      const result = DungeonService.canMove(level, position, 'FORWARD')

      expect(result.allowed).toBe(true)
      expect(result.triggersSpecialAction).toBe('stairs')
      expect(result.destination?.level).toBe(2)
      expect(result.destination?.x).toBe(10)
      expect(result.destination?.y).toBe(5)
    })

    it('still blocks regular wall types', () => {
      const level = createTestLevel()
      const tile: TileData = {
        x: 0,
        y: 1,
        walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }
      }

      // Add tile to level (player is standing on this tile)
      level.tiles.push(tile)

      // Player at (0,1) facing NORTH, so they check the north wall of tile (0,1)
      const position: Position = { x: 0, y: 1, facing: 'NORTH' }
      const result = DungeonService.canMove(level, position, 'FORWARD')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('wall')
    })
  })
})
