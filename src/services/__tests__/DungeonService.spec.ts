import { DungeonService } from '../DungeonService'
import { Position } from '../../types/Dungeon'

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

  describe('getVisibleTiles', () => {
    let level: ReturnType<typeof DungeonService.loadLevel>

    beforeEach(() => {
      level = DungeonService.loadLevel(1)
    })

    it('returns 3×3 grid when facing NORTH with light radius 3', () => {
      const position: Position = { x: 10, y: 10, facing: 'NORTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(9) // 3 columns × 3 depths

      // Check center column tiles
      const centerTiles = tiles.filter(t => t.relativeX === 0)
      expect(centerTiles).toHaveLength(3)
      expect(centerTiles[0]).toMatchObject({ x: 10, y: 9, relativeDepth: 1 })
      expect(centerTiles[1]).toMatchObject({ x: 10, y: 8, relativeDepth: 2 })
      expect(centerTiles[2]).toMatchObject({ x: 10, y: 7, relativeDepth: 3 })
    })

    it('returns 3×1 grid when light radius is 1', () => {
      const position: Position = { x: 10, y: 10, facing: 'NORTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 1)

      expect(tiles).toHaveLength(3) // 3 columns × 1 depth
      const centerTile = tiles.find(t => t.relativeX === 0)
      expect(centerTile).toMatchObject({ x: 10, y: 9 })
    })

    it('returns 3×2 grid when light radius is 2', () => {
      const position: Position = { x: 10, y: 10, facing: 'NORTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 2)

      expect(tiles).toHaveLength(6) // 3 columns × 2 depths
      const centerTiles = tiles.filter(t => t.relativeX === 0)
      expect(centerTiles[0]).toMatchObject({ x: 10, y: 9 })
      expect(centerTiles[1]).toMatchObject({ x: 10, y: 8 })
    })

    it('returns tiles ahead when facing EAST', () => {
      const position: Position = { x: 10, y: 10, facing: 'EAST' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(9) // 3 columns × 3 depths
      const centerTiles = tiles.filter(t => t.relativeX === 0)
      expect(centerTiles[0]).toMatchObject({ x: 11, y: 10 }) // Near
      expect(centerTiles[1]).toMatchObject({ x: 12, y: 10 }) // Mid
      expect(centerTiles[2]).toMatchObject({ x: 13, y: 10 }) // Far
    })

    it('returns tiles ahead when facing SOUTH', () => {
      const position: Position = { x: 10, y: 10, facing: 'SOUTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(9) // 3 columns × 3 depths
      const centerTiles = tiles.filter(t => t.relativeX === 0)
      expect(centerTiles[0]).toMatchObject({ x: 10, y: 11 }) // Near
      expect(centerTiles[1]).toMatchObject({ x: 10, y: 12 }) // Mid
      expect(centerTiles[2]).toMatchObject({ x: 10, y: 13 }) // Far
    })

    it('returns tiles ahead when facing WEST', () => {
      const position: Position = { x: 10, y: 10, facing: 'WEST' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(9) // 3 columns × 3 depths
      const centerTiles = tiles.filter(t => t.relativeX === 0)
      expect(centerTiles[0]).toMatchObject({ x: 9, y: 10 }) // Near
      expect(centerTiles[1]).toMatchObject({ x: 8, y: 10 }) // Mid
      expect(centerTiles[2]).toMatchObject({ x: 7, y: 10 }) // Far
    })

    it('handles edge wrapping when moving east from x=19', () => {
      const position: Position = { x: 19, y: 10, facing: 'EAST' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(9) // 3 columns × 3 depths
      const centerTiles = tiles.filter(t => t.relativeX === 0)
      expect(centerTiles[0]).toMatchObject({ x: 0, y: 10 })  // Wraps to 0
      expect(centerTiles[1]).toMatchObject({ x: 1, y: 10 })
      expect(centerTiles[2]).toMatchObject({ x: 2, y: 10 })
    })

    it('handles edge wrapping when moving north from y=19', () => {
      const position: Position = { x: 10, y: 19, facing: 'NORTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(9) // 3 columns × 3 depths
      const centerTiles = tiles.filter(t => t.relativeX === 0)
      expect(centerTiles[0]).toMatchObject({ x: 10, y: 18 })  // North means going backward (y decreases from wrapping)
      expect(centerTiles[1]).toMatchObject({ x: 10, y: 17 })
      expect(centerTiles[2]).toMatchObject({ x: 10, y: 16 })
    })
  })

  describe('getVisibleTiles (3-column grid)', () => {
    it('returns 3 columns × 3 depths = 9 tiles with light radius 3', () => {
      const level = DungeonService.loadLevel(1);
      const position: Position = { x: 10, y: 10, facing: 'NORTH' };

      const tiles = DungeonService.getVisibleTiles(level, position, 3);

      expect(tiles).toHaveLength(9);

      // Verify structure: 3 depths × 3 columns
      const depth1 = tiles.filter(t => t.relativeDepth === 1);
      const depth2 = tiles.filter(t => t.relativeDepth === 2);
      const depth3 = tiles.filter(t => t.relativeDepth === 3);

      expect(depth1).toHaveLength(3);
      expect(depth2).toHaveLength(3);
      expect(depth3).toHaveLength(3);
    });

    it('returns tiles with correct relativeX values', () => {
      const level = DungeonService.loadLevel(1);
      const position: Position = { x: 10, y: 10, facing: 'NORTH' };

      const tiles = DungeonService.getVisibleTiles(level, position, 3);

      // Each depth should have left (-1), center (0), right (1)
      for (let depth = 1; depth <= 3; depth++) {
        const depthTiles = tiles.filter(t => t.relativeDepth === depth);
        const relativeXValues = depthTiles.map(t => t.relativeX).sort();

        expect(relativeXValues).toEqual([-1, 0, 1]);
      }
    });

    it('returns correct world coordinates for each column', () => {
      const level = DungeonService.loadLevel(1);
      const position: Position = { x: 10, y: 10, facing: 'NORTH' };

      const tiles = DungeonService.getVisibleTiles(level, position, 3);

      // Check depth 1 tiles
      const leftTile = tiles.find(t => t.relativeX === -1 && t.relativeDepth === 1);
      const centerTile = tiles.find(t => t.relativeX === 0 && t.relativeDepth === 1);
      const rightTile = tiles.find(t => t.relativeX === 1 && t.relativeDepth === 1);

      expect(leftTile).toEqual(expect.objectContaining({ x: 9, y: 9 }));
      expect(centerTile).toEqual(expect.objectContaining({ x: 10, y: 9 }));
      expect(rightTile).toEqual(expect.objectContaining({ x: 11, y: 9 }));
    });

    it('respects light radius limit', () => {
      const level = DungeonService.loadLevel(1);
      const position: Position = { x: 10, y: 10, facing: 'NORTH' };

      const tiles2 = DungeonService.getVisibleTiles(level, position, 2);
      const tiles1 = DungeonService.getVisibleTiles(level, position, 1);

      expect(tiles2).toHaveLength(6); // 3 columns × 2 depths
      expect(tiles1).toHaveLength(3); // 3 columns × 1 depth
    });
  });

  describe('transformToWorldCoords', () => {
    it('transforms relative coords when facing NORTH', () => {
      const position: Position = { x: 10, y: 10, level: 1, facing: 'NORTH' };

      // Center ahead (0, 1)
      expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 10, y: 9 });

      // Left ahead (-1, 1)
      expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 9, y: 9 });

      // Right ahead (1, 1)
      expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 11, y: 9 });
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
      expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 10, y: 11 });

      // Left ahead (-1, 1)
      expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 11, y: 11 });

      // Right ahead (1, 1)
      expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 9, y: 11 });
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

      // Up edge wraps to 19
      expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 0, y: 19 });
    });
  });
})
