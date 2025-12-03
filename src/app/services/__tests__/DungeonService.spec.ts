import { DungeonService } from '../DungeonService'
import { Position, LevelData, TileData } from '@models/Dungeon'
import { LevelFileSchema, ValidatedLevelDataSchema } from '@validation/dungeon-schemas'

describe('DungeonService', () => {
  describe('loadLevel', () => {
    it('loads level 1 map data with 20x20 grid', () => {
      const level = DungeonService.loadLevel(1)

      expect(level.level).toBe(1)
      expect(level.size).toEqual({ width: 20, height: 20 })
      expect(level.encounterTable).toBe('level_1_monsters')
      expect(level.tiles.length).toBeGreaterThan(0)
    })

    it('throws error for invalid level', () => {
      expect(() => DungeonService.loadLevel(0)).toThrow()
      expect(() => DungeonService.loadLevel(2)).toThrow()  // Level 2 JSON not yet created
      expect(() => DungeonService.loadLevel(11)).toThrow()
    })
  })

  describe('getTile', () => {
    it('returns tile at specific coordinates', () => {
      const level = DungeonService.loadLevel(1)
      const tile = DungeonService.getTile(level, 0, 0)

      expect(tile.x).toBe(0)
      expect(tile.y).toBe(0)
      // Tile (0,0) now uses wall-based stairs, not tile type
      expect(tile.walls.west).toBe('stairs_up')
    })

    it('returns tile with correct wall configuration', () => {
      const level = DungeonService.loadLevel(1)
      const tile = DungeonService.getTile(level, 7, 0)

      expect(tile.walls.north).toBe('door')
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
      const position: Position = { x: 0, y: 0, facing: 'SOUTH' }
      const result = DungeonService.canMove(level, position, 'FORWARD')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('wall')
    })

    it('allows movement through door (original Wizardry behavior)', () => {
      const position: Position = { x: 7, y: 0, facing: 'NORTH' }
      const result = DungeonService.canMove(level, position, 'FORWARD')

      // Walking into a door moves through it (implicit kick)
      expect(result.allowed).toBe(true)
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

  describe('Integration tests', () => {
    it('successfully loads and validates level1.json with no errors', () => {
      // This verifies the actual data file passes all Zod validation rules
      expect(() => DungeonService.loadLevel(1)).not.toThrow()

      const level = DungeonService.loadLevel(1)

      // Verify basic structure
      expect(level.level).toBe(1)
      expect(level.size).toEqual({ width: 20, height: 20 })
      expect(level.tiles).toBeTruthy()
      expect(level.tiles.length).toBeGreaterThan(0)

      // Verify no duplicate coordinates (Zod refinement catches this)
      const coords = new Set<string>()
      for (const tile of level.tiles) {
        const key = `${tile.x},${tile.y}`
        expect(coords.has(key)).toBe(false) // No duplicates
        coords.add(key)
      }

      // Verify direction was transformed to uppercase
      expect(level.startPosition.facing).toMatch(/^(NORTH|SOUTH|EAST|WEST)$/)
    })

    // Note: level2.json not yet created - uncomment when available
    // it('successfully loads level2.json with no validation errors', () => {
    //   expect(() => DungeonService.loadLevel(2)).not.toThrow()
    //   const level = DungeonService.loadLevel(2)
    //   expect(level.level).toBe(2)
    // })
  })

  describe('Zod validation', () => {
    describe('LevelFileSchema', () => {
      it('accepts valid level file structure', () => {
        const validData = {
          levels: [
            {
              level: 1,
              name: 'Test Level',
              size: { width: 20, height: 20 },
              startPosition: { x: 0, y: 0, facing: 'north' },
              edgeWrapping: true,
              tiles: [],
              encounterRate: 0.1,
              encounterTable: 'test_table'
            }
          ]
        }

        const result = LevelFileSchema.safeParse(validData)
        expect(result.success).toBe(true)
      })

      it('rejects missing levels array', () => {
        const invalidData = {
          level: 1,
          name: 'Test Level'
        }

        const result = LevelFileSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })

      it('rejects empty levels array', () => {
        const invalidData = {
          levels: []
        }

        const result = LevelFileSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
      })
    })

    describe('ValidatedLevelDataSchema', () => {
      it('accepts valid level with all required fields', () => {
        const validLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [
            {
              x: 0,
              y: 0,
              walls: {
                north: 'open',
                east: 'wall',
                south: 'wall',
                west: 'wall'
              }
            }
          ],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(validLevel)
        expect(result.success).toBe(true)
      })

      it('rejects level number outside 1-10 range', () => {
        const invalidLevel = {
          level: 11,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
      })

      it('rejects tile coordinates outside 0-19 range', () => {
        const invalidLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [
            {
              x: 25,  // Invalid: > 19
              y: 10,
              walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' }
            }
          ],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
      })

      it('rejects invalid wall type', () => {
        const invalidLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [
            {
              x: 0,
              y: 0,
              walls: {
                north: 'invalid_wall_type',
                east: 'wall',
                south: 'wall',
                west: 'wall'
              }
            }
          ],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
      })

      it('rejects invalid facing direction', () => {
        const invalidLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'northeast' },  // Invalid
          edgeWrapping: true,
          tiles: [],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
      })

      it('rejects encounter rate outside 0-1 range', () => {
        const invalidLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [],
          encounterRate: 1.5,  // Invalid: > 1
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
      })

      it('rejects missing required tile walls', () => {
        const invalidLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [
            {
              x: 0,
              y: 0,
              walls: {
                north: 'wall',
                east: 'wall'
                // Missing south and west
              }
            }
          ],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
      })

      it('rejects stairs wall without destination', () => {
        const invalidLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [
            {
              x: 0,
              y: 0,
              walls: {
                north: 'stairs_up',
                east: 'wall',
                south: 'wall',
                west: 'wall'
              }
              // Missing destination
            }
          ],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toContain('stairs')
        }
      })

      it('rejects duplicate tile coordinates', () => {
        const invalidLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [
            {
              x: 5,
              y: 10,
              walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' }
            },
            {
              x: 5,
              y: 10,  // Duplicate!
              walls: { north: 'open', east: 'open', south: 'open', west: 'open' }
            }
          ],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toContain('Duplicate')
        }
      })

      it('rejects non-20x20 level size', () => {
        const invalidLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 15, height: 15 },  // Invalid: not 20x20
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidLevel)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.message).toContain('20x20')
        }
      })

      it('accepts stairs wall with valid destination', () => {
        const validLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [
            {
              x: 0,
              y: 0,
              walls: {
                north: 'stairs_down',
                east: 'wall',
                south: 'wall',
                west: 'wall'
              },
              destination: { level: 2, x: 0, y: 0 }
            }
          ],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(validLevel)
        expect(result.success).toBe(true)
      })

      it('accepts all valid wall types', () => {
        const validLevel = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [
            {
              x: 0,
              y: 0,
              walls: { north: 'open', east: 'wall', south: 'door', west: 'secret' }
            },
            {
              x: 1,
              y: 0,
              walls: { north: 'locked_door', east: 'illusion', south: 'wall', west: 'open' }
            }
          ],
          encounterRate: 0.1,
          encounterTable: 'test_table'
        }

        const result = ValidatedLevelDataSchema.safeParse(validLevel)
        expect(result.success).toBe(true)
      })
    })

    describe('formatZodError', () => {
      it('formats validation errors into readable messages', () => {
        const invalidData = {
          level: 'not a number',
          name: '',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'north' },
          edgeWrapping: true,
          tiles: [],
          encounterRate: 0.1,
          encounterTable: 'test'
        }

        const result = ValidatedLevelDataSchema.safeParse(invalidData)
        expect(result.success).toBe(false)

        if (!result.success) {
          const formatted = DungeonService.formatZodError(result.error)
          expect(formatted).toBeTruthy()
          expect(typeof formatted).toBe('string')
        }
      })
    })
  })
})
