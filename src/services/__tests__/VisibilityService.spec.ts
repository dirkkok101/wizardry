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

    it('finds forward walls when player at (2,2) facing north', () => {
      const level = createTestLevel()
      // Add a wall ahead of player
      level.tiles.find(t => t.x === 2 && t.y === 3)!.walls.north = 'wall'

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const walls = VisibilityService.getVisibleWalls(level, position, 3, 3)

      // Should find walls in forward direction (3-column grid)
      expect(walls.length).toBeGreaterThan(0)

      // All walls should be at or ahead of player (z >= 2)
      walls.forEach(w => {
        const wallZ = (w.z1 + w.z2) / 2
        expect(wallZ).toBeGreaterThanOrEqual(1.5) // Closest wall is at player tile edges
      })
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
      const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

      // Should not see walls beyond the blocking wall
      const beyondWalls = walls.filter(w => w.z1 < -1.5 || w.z2 < -1.5)
      expect(beyondWalls.length).toBe(0)
    })

    it('respects peripheralColumns parameter (1 column = center only)', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const walls1Col = VisibilityService.getVisibleWalls(level, position, 3, 1)
      const walls3Col = VisibilityService.getVisibleWalls(level, position, 3, 3)

      // 3 columns should show more walls than 1 column (includes peripherals)
      expect(walls3Col.length).toBeGreaterThan(walls1Col.length)
    })

    it('shows peripheral walls with peripheralColumns=3 when facing wall', () => {
      // Create level with blocking wall directly ahead at (2,3) north
      // but add walls to peripheral tiles that should be visible
      const level = createTestLevel()

      // Add wall ahead to block forward view
      level.tiles.find(t => t.x === 2 && t.y === 3)!.walls.north = 'wall'

      // Add walls to left and right peripheral tiles
      level.tiles.find(t => t.x === 1 && t.y === 2)!.walls.west = 'wall'
      level.tiles.find(t => t.x === 3 && t.y === 2)!.walls.east = 'wall'
      level.tiles.find(t => t.x === 1 && t.y === 3)!.walls.west = 'door'
      level.tiles.find(t => t.x === 3 && t.y === 3)!.walls.east = 'door'

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const walls = VisibilityService.getVisibleWalls(level, position, 2, 3)

      // Should find walls from peripheral tiles even though center may be blocked
      // Including left/right walls from tiles at depth 0 and 1
      expect(walls.length).toBeGreaterThan(0)

      // Should include peripheral walls (doors)
      const peripheralDoors = walls.filter(w => w.wallType === 'door')
      expect(peripheralDoors.length).toBeGreaterThan(0)
    })

    it('calculates correct column offsets for peripheralColumns=3', () => {
      // When facing NORTH from (2,2), with peripheralColumns=3:
      // - Left column: x=1
      // - Center column: x=2
      // - Right column: x=3
      const level = createTestLevel()

      // Add distinctive walls to left and right tiles
      level.tiles.find(t => t.x === 1 && t.y === 2)!.walls.west = 'door'
      level.tiles.find(t => t.x === 3 && t.y === 2)!.walls.east = 'locked_door'

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const walls = VisibilityService.getVisibleWalls(level, position, 1, 3)

      // Should find both peripheral walls (left door + right locked door)
      const leftDoor = walls.find(w => w.wallType === 'door')
      const rightDoor = walls.find(w => w.wallType === 'locked_door')

      expect(leftDoor).toBeDefined()
      expect(rightDoor).toBeDefined()
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

    describe('edge wrapping visibility', () => {
      it('does not include wrapped tiles when player is at map edge', () => {
        // Create test level with 20x20 size
        const level: LevelData = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'NORTH' },
          edgeWrapping: true,
          tiles: [
            {
              x: 0,
              y: 0,
              walls: { north: 'open', east: 'open', south: 'wall', west: 'wall' }
            },
            {
              x: 1,
              y: 0,
              walls: { north: 'wall', east: 'open', south: 'wall', west: 'open' }
            },
            {
              x: 0,
              y: 1,
              walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' }
            },
            {
              x: 19,
              y: 0,
              walls: { north: 'open', east: 'wall', south: 'wall', west: 'open' }
            }
          ],
          encounterRate: 0.1,
          encounterTable: []
        }

        const position: Position = { x: 0, y: 0, facing: 'NORTH' }
        const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

        // Extract unique grid coordinates from walls
        const uniqueTiles = new Set<string>()
        walls.forEach(wall => {
          uniqueTiles.add(`${wall.gridX},${wall.gridY}`)
        })

        // Should NOT include tile (19, 0) even though edgeWrapping is true
        expect(uniqueTiles.has('19,0')).toBe(false)
        expect(uniqueTiles.has('19,1')).toBe(false)
        expect(uniqueTiles.has('19,2')).toBe(false)
        expect(uniqueTiles.has('19,3')).toBe(false)
        expect(uniqueTiles.has('19,4')).toBe(false)

        // Should only include tiles in bounds: (0,y) and (1,y)
        const tiles = Array.from(uniqueTiles)
        tiles.forEach(tile => {
          const [x] = tile.split(',').map(Number)
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThan(level.size.width)
        })

        // Verify we do see expected tiles
        expect(uniqueTiles.has('0,0')).toBe(true)
        expect(uniqueTiles.has('1,0')).toBe(true)
        expect(uniqueTiles.has('0,1')).toBe(true)
      })

      it('does not include negative coordinates when facing west from edge', () => {
        const level: LevelData = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 0, y: 0, facing: 'WEST' },
          edgeWrapping: true,
          tiles: [
            {
              x: 0,
              y: 0,
              walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' }
            }
          ],
          encounterRate: 0.1,
          encounterTable: []
        }

        const position: Position = { x: 0, y: 0, facing: 'WEST' }
        const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

        const uniqueTiles = new Set<string>()
        walls.forEach(wall => {
          uniqueTiles.add(`${wall.gridX},${wall.gridY}`)
        })

        // Should NOT include wrapped tiles from x=19
        expect(uniqueTiles.has('19,0')).toBe(false)
        expect(uniqueTiles.has('19,1')).toBe(false)

        // Should only see tiles at x=0 (no negative x coordinates)
        uniqueTiles.forEach(tile => {
          const [x] = tile.split(',').map(Number)
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThan(level.size.width)
        })

        // Verify we do see the starting tile
        expect(uniqueTiles.has('0,0')).toBe(true)
      })

      it('handles player at northeast corner (19, 19)', () => {
        const level: LevelData = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 19, y: 19, facing: 'NORTH' },
          edgeWrapping: true,
          tiles: [
            {
              x: 19,
              y: 19,
              walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' }
            }
          ],
          encounterRate: 0.1,
          encounterTable: []
        }

        const position: Position = { x: 19, y: 19, facing: 'NORTH' }
        const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

        const uniqueTiles = new Set<string>()
        walls.forEach(wall => {
          uniqueTiles.add(`${wall.gridX},${wall.gridY}`)
        })

        // Should not wrap to x=0 or y=0
        expect(uniqueTiles.has('0,0')).toBe(false)
        expect(uniqueTiles.has('0,19')).toBe(false)
        expect(uniqueTiles.has('19,0')).toBe(false)

        // All visible tiles should be near (19,19)
        uniqueTiles.forEach(tile => {
          const [x, y] = tile.split(',').map(Number)
          expect(x).toBeGreaterThanOrEqual(17)
          expect(x).toBeLessThan(20)
          expect(y).toBeGreaterThanOrEqual(17)
          expect(y).toBeLessThan(20)
        })
      })

      it('handles player at center of map with no wrapping needed', () => {
        const level: LevelData = {
          level: 1,
          name: 'Test Level',
          size: { width: 20, height: 20 },
          startPosition: { x: 10, y: 10, facing: 'NORTH' },
          edgeWrapping: true,
          tiles: [
            { x: 9, y: 10, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
            { x: 10, y: 10, walls: { north: 'open', east: 'open', south: 'wall', west: 'open' } },
            { x: 11, y: 10, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
            { x: 10, y: 11, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' } }
          ],
          encounterRate: 0.1,
          encounterTable: []
        }

        const position: Position = { x: 10, y: 10, facing: 'NORTH' }
        const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

        const uniqueTiles = new Set<string>()
        walls.forEach(wall => {
          uniqueTiles.add(`${wall.gridX},${wall.gridY}`)
        })

        // Should see tiles around (10,10) normally
        expect(uniqueTiles.has('10,10')).toBe(true)
        expect(uniqueTiles.has('9,10')).toBe(true)
        expect(uniqueTiles.has('11,10')).toBe(true)
        expect(uniqueTiles.has('10,11')).toBe(true)

        // No edge tiles should appear
        expect(uniqueTiles.has('0,10')).toBe(false)
        expect(uniqueTiles.has('19,10')).toBe(false)
      })
    })
  })

  describe('createWallSegment', () => {
    const levelSize = { width: 20, height: 20 }

    it('creates north wall segment correctly', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const wall = VisibilityService.createWallSegment(3, 5, 'north', position, 'wall', levelSize)

      // North wall at top edge: z = gridY + 1 = 6
      expect(wall.x1).toBe(3)   // gridX
      expect(wall.z1).toBe(6)   // gridY + 1 (north = +Y direction)
      expect(wall.x2).toBe(4)   // gridX + 1
      expect(wall.z2).toBe(6)   // gridY + 1
      expect(wall.isVertical).toBe(true)
      expect(wall.height).toBe(1.0)
    })

    it('creates east wall segment correctly', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const wall = VisibilityService.createWallSegment(3, 5, 'east', position, 'wall', levelSize)

      // East wall at right edge: x = gridX + 1 = 4
      expect(wall.x1).toBe(4)   // gridX + 1
      expect(wall.z1).toBe(5)   // gridY
      expect(wall.x2).toBe(4)   // gridX + 1
      expect(wall.z2).toBe(6)   // gridY + 1
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

        // Wall at tile (0, 19) should unwrap to tile y=-1 (1 tile south of player)
        const wall = VisibilityService.createWallSegment(0, 19, 'north', position, 'wall', levelSize)

        // Unwrapped tile: 19 - 20 = -1, north wall at -1 + 1 = 0
        expect(wall.z1).toBe(0)
        expect(wall.z2).toBe(0)
      })

      it('unwraps Y coordinate when wall wraps south (player at 19, wall at 0)', () => {
        const position: Position = { x: 10, y: 19, facing: 'SOUTH' }

        // Wall at tile (10, 0) should unwrap to z=20 (1 tile south of player at 19)
        const wall = VisibilityService.createWallSegment(10, 0, 'south', position, 'wall', levelSize)

        // Unwrapped: 0 + 20 = 20, south wall at bottom edge: 20
        expect(wall.z1).toBe(20)
        expect(wall.z2).toBe(20)
      })

      it('unwraps X coordinate when wall wraps east (player at 19, wall at 0)', () => {
        const position: Position = { x: 19, y: 10, facing: 'EAST' }

        // Wall at tile (0, 10) should unwrap to x=20 (1 tile east of player at 19)
        const wall = VisibilityService.createWallSegment(0, 10, 'east', position, 'wall', levelSize)

        // Unwrapped: 0 + 20 = 20, east wall at right edge: 20 + 1 = 21
        expect(wall.x1).toBe(21)
        expect(wall.x2).toBe(21)
      })

      it('unwraps X coordinate when wall wraps west (player at 0, wall at 19)', () => {
        const position: Position = { x: 0, y: 10, facing: 'WEST' }

        // Wall at tile (19, 10) should unwrap to tile x=-1 (1 tile west of player at 0)
        const wall = VisibilityService.createWallSegment(19, 10, 'west', position, 'wall', levelSize)

        // Unwrapped tile: 19 - 20 = -1, west wall at left edge: -1
        expect(wall.x1).toBe(-1)
        expect(wall.x2).toBe(-1)
      })

      it('does not unwrap coordinates when distance is less than half map size', () => {
        const position: Position = { x: 5, y: 5, facing: 'NORTH' }

        // Wall at tile (5, 10) is 5 tiles away, no unwrapping needed
        const wall = VisibilityService.createWallSegment(5, 10, 'north', position, 'wall', levelSize)

        // North wall at top edge: 10 + 1 = 11
        expect(wall.z1).toBe(11)
        expect(wall.z2).toBe(11)
      })
    })
  })
})
