import { VisibilityService } from '../VisibilityService'
import { LevelData, TileData, Position } from '../../types/Dungeon'

describe('VisibilityService', () => {
  const createTestLevel = (): LevelData => ({
    level: 1,
    name: 'Test Level',
    size: { width: 5, height: 5 },
    startPosition: { x: 2, y: 2, facing: 'north' },
    edgeWrapping: false,
    encounterRate: 0,
    encounterTable: '',
    tiles: [
      // Create 5x5 grid with walls on borders
      // Player at (2, 2) facing NORTH
      ...Array.from({ length: 5 }, (_, y) =>
        Array.from({ length: 5 }, (_, x): TileData => ({
          x, y,
          walls: {
            north: y === 0 ? 'wall' : 'open',
            south: y === 4 ? 'wall' : 'open',
            east: x === 4 ? 'wall' : 'open',
            west: x === 0 ? 'wall' : 'open'
          }
        }))
      ).flat()
    ]
  })

  describe('getVisibleWalls', () => {
    it('finds walls around player position', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const walls = VisibilityService.getVisibleWalls(level, position, 3)

      expect(walls.length).toBeGreaterThan(0)
      expect(walls.every(w => w.distance >= 0)).toBe(true)
    })

    it('finds north wall when player at (2,1) facing north', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 1, facing: 'NORTH' }

      const walls = VisibilityService.getVisibleWalls(level, position, 2)

      // Should find north wall at y=0
      const northWalls = walls.filter(w => w.z1 === -0.5 && w.z2 === -0.5)
      expect(northWalls.length).toBeGreaterThan(0)
    })

    it('sorts walls by distance (back to front)', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const walls = VisibilityService.getVisibleWalls(level, position, 3)

      // Verify sorted in descending distance order
      for (let i = 0; i < walls.length - 1; i++) {
        expect(walls[i].distance).toBeGreaterThanOrEqual(walls[i + 1].distance)
      }
    })

    it('respects maxDepth parameter', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const wallsDepth2 = VisibilityService.getVisibleWalls(level, position, 2)
      const wallsDepth4 = VisibilityService.getVisibleWalls(level, position, 4)

      // More depth = more walls visible
      expect(wallsDepth4.length).toBeGreaterThanOrEqual(wallsDepth2.length)
    })

    it('does not traverse through walls', () => {
      // Create level with blocking wall at (2,1) north side
      const level = createTestLevel()
      level.tiles.find(t => t.x === 2 && t.y === 1)!.walls.north = 'wall'

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const walls = VisibilityService.getVisibleWalls(level, position, 5)

      // Should not see walls beyond the blocking wall
      const beyondWalls = walls.filter(w => w.z1 < -1.5 || w.z2 < -1.5)
      expect(beyondWalls.length).toBe(0)
    })

    describe('edge wrapping', () => {
      const createWrappingLevel = (): LevelData => ({
        level: 1,
        name: 'Wrapping Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: true,
        encounterRate: 0,
        encounterTable: '',
        tiles: [
          // Tile at (0, 19) - start position for north wrapping test
          { x: 0, y: 19, walls: { north: 'open', east: 'wall', south: 'wall', west: 'wall' } },
          // Tile at (0, 0) - wraps from north of (0, 19)
          { x: 0, y: 0, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' } },
          // Tile at (0, 1) - two tiles north (wrapping)
          { x: 0, y: 1, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' } },
          // Tile at (0, 2) - three tiles north (wrapping)
          { x: 0, y: 2, walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' } },
          // Tile at (19, 10) - wraps from west of (0, 10)
          { x: 19, y: 10, walls: { north: 'wall', east: 'open', south: 'wall', west: 'wall' } },
          // Tile at (0, 10) - wraps to east
          { x: 0, y: 10, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'open' } },
          // Fill in other required tiles with default walls
          ...Array.from({ length: 20 }, (_, y) =>
            Array.from({ length: 20 }, (_, x): TileData => {
              // Skip tiles we defined above
              if ((x === 0 && (y === 0 || y === 1 || y === 2 || y === 19 || y === 10)) ||
                  (x === 19 && y === 10)) {
                return null as any
              }
              return {
                x, y,
                walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }
              }
            })
          ).flat().filter(t => t !== null)
        ]
      })

      it('wraps coordinates when player at (0, 19) facing NORTH with edgeWrapping: true', () => {
        const level = createWrappingLevel()
        const position: Position = { x: 0, y: 19, facing: 'NORTH' }

        const walls = VisibilityService.getVisibleWalls(level, position, 3)

        // Should traverse from (0,19) north to (0,0), (0,1), (0,2) via wrapping
        // Should find walls from these unwrapped tiles
        // Expected: walls at (0,19) left/right + walls from tiles (0,0), (0,1), (0,2) after wrapping
        expect(walls.length).toBeGreaterThan(3)
      })

      it('wraps coordinates when player at (19, 10) facing EAST with edgeWrapping: true', () => {
        const level = createWrappingLevel()
        const position: Position = { x: 19, y: 10, facing: 'EAST' }

        const walls = VisibilityService.getVisibleWalls(level, position, 2)

        // Should traverse from (19,10) east to (0,10) via wrapping
        // Should find east wall at (19, 10) and walls from (0, 10)
        expect(walls.length).toBeGreaterThan(0)
      })

      it('wraps coordinates when player at (0, 10) facing WEST with edgeWrapping: true', () => {
        const level = createWrappingLevel()
        const position: Position = { x: 0, y: 10, facing: 'WEST' }

        const walls = VisibilityService.getVisibleWalls(level, position, 2)

        // Should traverse from (0,10) west to (19,10) via wrapping
        expect(walls.length).toBeGreaterThan(0)
      })

      it('does not wrap when edgeWrapping: false', () => {
        const level = createWrappingLevel()
        level.edgeWrapping = false
        const position: Position = { x: 0, y: 0, facing: 'NORTH' }

        const walls = VisibilityService.getVisibleWalls(level, position, 3)

        // Should stop at map boundary, not traverse to y=19
        // Should only see walls from tiles within bounds
        // With wrapping disabled from (0,0) going north, should hit boundary immediately
        expect(walls.length).toBeGreaterThan(0)

        // Should not find any walls at wrapped positions (y > 15)
        const wrappedWalls = walls.filter(w => {
          const centerZ = (w.z1 + w.z2) / 2
          return centerZ > 15
        })
        expect(wrappedWalls.length).toBe(0)
      })

      it('handles south wrapping at (10, 19) facing SOUTH', () => {
        const level: LevelData = {
          ...createWrappingLevel(),
          tiles: [
            { x: 10, y: 19, walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' } },
            { x: 10, y: 0, walls: { north: 'open', east: 'wall', south: 'wall', west: 'wall' } },
            { x: 10, y: 1, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' } },
            ...Array.from({ length: 20 }, (_, y) =>
              Array.from({ length: 20 }, (_, x): TileData => {
                if (x === 10 && (y === 19 || y === 0 || y === 1)) return null as any
                return { x, y, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } }
              })
            ).flat().filter(t => t !== null)
          ]
        }

        const position: Position = { x: 10, y: 19, facing: 'SOUTH' }
        const walls = VisibilityService.getVisibleWalls(level, position, 2)

        // Should wrap from y=19 south to y=0, y=1
        expect(walls.length).toBeGreaterThan(0)
      })
    })
  })

  describe('createWallSegment', () => {
    const levelSize = { width: 20, height: 20 }

    it('creates north wall segment correctly', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const wall = VisibilityService.createWallSegment(3, 5, 'north', position, 'wall', levelSize)

      expect(wall.x1).toBe(2.5)  // 3 - 0.5
      expect(wall.z1).toBe(4.5)  // 5 - 0.5
      expect(wall.x2).toBe(3.5)  // 3 + 0.5
      expect(wall.z2).toBe(4.5)
      expect(wall.isVertical).toBe(true)
      expect(wall.height).toBe(1.0)
    })

    it('creates east wall segment correctly', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const wall = VisibilityService.createWallSegment(3, 5, 'east', position, 'wall', levelSize)

      expect(wall.x1).toBe(3.5)
      expect(wall.z1).toBe(4.5)
      expect(wall.x2).toBe(3.5)
      expect(wall.z2).toBe(5.5)
      expect(wall.isVertical).toBe(false)
    })

    it('calculates distance from player position', () => {
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const nearWall = VisibilityService.createWallSegment(2, 1, 'north', position, 'wall', levelSize)
      const farWall = VisibilityService.createWallSegment(2, 0, 'north', position, 'wall', levelSize)

      expect(farWall.distance).toBeGreaterThan(nearWall.distance)
    })

    it('preserves wallType for rendering', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const solidWall = VisibilityService.createWallSegment(1, 1, 'north', position, 'wall', levelSize)
      const door = VisibilityService.createWallSegment(1, 2, 'north', position, 'door', levelSize)

      expect(solidWall.wallType).toBe('wall')
      expect(door.wallType).toBe('door')
    })

    describe('edge wrapping coordinate unwrapping', () => {
      it('unwraps Y coordinate when wall wraps north (player at 0, wall at 19)', () => {
        const position: Position = { x: 0, y: 0, facing: 'NORTH' }

        // Wall at tile (0, 19) should unwrap to tile y=-1 (1 tile north of player)
        // North wall edge is at tile center - 0.5
        const wall = VisibilityService.createWallSegment(0, 19, 'north', position, 'wall', levelSize)

        expect(wall.z1).toBe(-1.5)  // Unwrapped tile: 19 - 20 = -1, north wall edge at -1 - 0.5 = -1.5
        expect(wall.z2).toBe(-1.5)  // Same for both corners (north wall is horizontal)
      })

      it('unwraps Y coordinate when wall wraps south (player at 19, wall at 0)', () => {
        const position: Position = { x: 10, y: 19, facing: 'SOUTH' }

        // Wall at tile (10, 0) should unwrap to z=20 (1 tile south of player at 19)
        const wall = VisibilityService.createWallSegment(10, 0, 'south', position, 'wall', levelSize)

        expect(wall.z1).toBe(20.5)  // Unwrapped: 0 + 20 = 20, wall south edge at 20 + 0.5 = 20.5
        expect(wall.z2).toBe(20.5)
      })

      it('unwraps X coordinate when wall wraps east (player at 19, wall at 0)', () => {
        const position: Position = { x: 19, y: 10, facing: 'EAST' }

        // Wall at tile (0, 10) should unwrap to x=20 (1 tile east of player at 19)
        const wall = VisibilityService.createWallSegment(0, 10, 'east', position, 'wall', levelSize)

        expect(wall.x1).toBe(20.5)  // Unwrapped: 0 + 20 = 20, wall east edge at 20 + 0.5 = 20.5
        expect(wall.x2).toBe(20.5)
      })

      it('unwraps X coordinate when wall wraps west (player at 0, wall at 19)', () => {
        const position: Position = { x: 0, y: 10, facing: 'WEST' }

        // Wall at tile (19, 10) should unwrap to tile x=-1 (1 tile west of player at 0)
        // West wall edge is at tile center - 0.5
        const wall = VisibilityService.createWallSegment(19, 10, 'west', position, 'wall', levelSize)

        expect(wall.x1).toBe(-1.5)  // Unwrapped tile: 19 - 20 = -1, west wall edge at -1 - 0.5 = -1.5
        expect(wall.x2).toBe(-1.5)
      })

      it('does not unwrap coordinates when distance is less than half map size', () => {
        const position: Position = { x: 5, y: 5, facing: 'NORTH' }

        // Wall at tile (5, 10) is 5 tiles away, no unwrapping needed
        const wall = VisibilityService.createWallSegment(5, 10, 'north', position, 'wall', levelSize)

        expect(wall.z1).toBe(9.5)   // Normal: 10 - 0.5 = 9.5
        expect(wall.z2).toBe(9.5)
      })
    })
  })
})
