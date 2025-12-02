import { VisibilityService } from '../VisibilityService'
import { LevelData, TileData, Position } from '@models/Dungeon'

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
        // Corridor has walls on east/west, so only center column is visible
        // No peripheral tiles visible since east/west walls block them
        expect(walls.length).toBeGreaterThanOrEqual(3)
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

  describe('level 1 visibility from (9,9) facing EAST', () => {
    let level1: LevelData

    beforeEach(async () => {
      const { DungeonService } = await import('../DungeonService')
      level1 = DungeonService.loadLevel(1)
    })

    it('should include (10,11) via forward-peripheral tracing from (9,11)', () => {
      const position: Position = { x: 9, y: 9, facing: 'EAST' }
      const { tiles } = VisibilityService.getVisibleGeometry(level1, position, 5, 5)

      const tileSet = new Set(tiles.map(t => `${t.x},${t.y}`))

      // Verify peripheral tiles at depth=0
      expect(tileSet.has('9,9')).toBe(true)   // Current position
      expect(tileSet.has('9,10')).toBe(true)  // Left offset=1
      expect(tileSet.has('9,11')).toBe(true)  // Left offset=2

      // Verify forward-traced tiles
      expect(tileSet.has('10,10')).toBe(true) // Via forward trace from (9,10)
      expect(tileSet.has('10,11')).toBe(true) // Via forward trace from (9,11) - THE KEY TEST
    })

    it('should include (10,11) east wall when visible from (9,9) facing EAST', () => {
      const position: Position = { x: 9, y: 9, facing: 'EAST' }
      const { walls, tiles } = VisibilityService.getVisibleGeometry(level1, position, 5, 5)

      // Verify tile is in tiles array
      const tileSet = new Set(tiles.map(t => `${t.x},${t.y}`))
      expect(tileSet.has('10,11')).toBe(true)

      // Verify east wall of (10, 11) is in walls array
      // Map data: (10, 11) has east=wall
      const eastWall = walls.find(w => w.gridX === 10 && w.gridY === 11 && w.side === 'east')
      expect(eastWall).toBeDefined()
      expect(eastWall?.wallType).toBe('wall')
    })

    it('should include all expected walls for (9,9) facing EAST scenario', () => {
      const position: Position = { x: 9, y: 9, facing: 'EAST' }
      const { walls } = VisibilityService.getVisibleGeometry(level1, position, 5, 5)

      // Map data for key tiles:
      // (9, 8):  east=wall, south=wall, west=door
      // (10, 9): south=wall
      // (11, 9): north=door, south=wall
      // (10, 10): east=wall
      // (10, 11): east=wall
      // (9, 11): west=wall

      // Helper to find wall
      const findWall = (gridX: number, gridY: number, side: string) =>
        walls.find(w => w.gridX === gridX && w.gridY === gridY && w.side === side)

      // Verify key walls that should be visible
      expect(findWall(9, 8, 'west')).toBeDefined()    // Door on right peripheral
      expect(findWall(10, 9, 'south')).toBeDefined()  // South wall at depth 1
      expect(findWall(11, 9, 'north')).toBeDefined()  // North door at depth 2
      expect(findWall(11, 9, 'south')).toBeDefined()  // South wall at depth 2
      expect(findWall(10, 10, 'east')).toBeDefined()  // East wall ahead-left
      expect(findWall(10, 11, 'east')).toBeDefined()  // East wall at forward-traced tile
      expect(findWall(9, 11, 'west')).toBeDefined()   // West wall at left offset=2
    })
  })

  describe('level 1 visibility from (0,0)', () => {
    let level1: LevelData

    beforeEach(async () => {
      const { DungeonService } = await import('../DungeonService')
      level1 = DungeonService.loadLevel(1)
    })

    it('facing NORTH from (0,0) should see tiles (0,0), (0,1), (0,2), (0,3), (0,4), (1,0)', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }
      const walls = VisibilityService.getVisibleWalls(level1, position, 5, 3)

      // Extract unique tiles from wall segments
      const visibleTiles = new Set<string>()
      walls.forEach(wall => {
        visibleTiles.add(`${wall.gridX},${wall.gridY}`)
      })

      // Should see exactly 6 tiles: center column + right peripheral at depth 0
      expect(visibleTiles.size).toBe(6)
      expect(visibleTiles.has('0,0')).toBe(true)
      expect(visibleTiles.has('0,1')).toBe(true)
      expect(visibleTiles.has('0,2')).toBe(true)
      expect(visibleTiles.has('0,3')).toBe(true)
      expect(visibleTiles.has('0,4')).toBe(true)
      expect(visibleTiles.has('1,0')).toBe(true)
    })

    it('facing EAST from (0,0) should see tiles (0,0), (1,0), (2,0), (3,0), (4,0), (0,1)', () => {
      const position: Position = { x: 0, y: 0, facing: 'EAST' }
      const walls = VisibilityService.getVisibleWalls(level1, position, 5, 3)

      // Extract unique tiles from wall segments
      const visibleTiles = new Set<string>()
      walls.forEach(wall => {
        visibleTiles.add(`${wall.gridX},${wall.gridY}`)
      })

      // Should see exactly 6 tiles: center column + left peripheral at depth 0
      expect(visibleTiles.size).toBe(6)
      expect(visibleTiles.has('0,0')).toBe(true)
      expect(visibleTiles.has('1,0')).toBe(true)
      expect(visibleTiles.has('2,0')).toBe(true)
      expect(visibleTiles.has('3,0')).toBe(true)
      expect(visibleTiles.has('4,0')).toBe(true)
      expect(visibleTiles.has('0,1')).toBe(true)
    })

    it('facing SOUTH from (0,0) should see tiles (0,0), (1,0)', () => {
      const position: Position = { x: 0, y: 0, facing: 'SOUTH' }
      const walls = VisibilityService.getVisibleWalls(level1, position, 5, 3)

      // Extract unique tiles from wall segments
      const visibleTiles = new Set<string>()
      walls.forEach(wall => {
        visibleTiles.add(`${wall.gridX},${wall.gridY}`)
      })

      // Should see exactly 2 tiles: current tile + right peripheral
      expect(visibleTiles.size).toBe(2)
      expect(visibleTiles.has('0,0')).toBe(true)
      expect(visibleTiles.has('1,0')).toBe(true)
    })

    it('facing WEST from (0,0) should see tiles (0,0), (0,1)', () => {
      const position: Position = { x: 0, y: 0, facing: 'WEST' }
      const walls = VisibilityService.getVisibleWalls(level1, position, 5, 3)

      // Extract unique tiles from wall segments
      const visibleTiles = new Set<string>()
      walls.forEach(wall => {
        visibleTiles.add(`${wall.gridX},${wall.gridY}`)
      })

      // Should see exactly 2 tiles: current tile + left peripheral
      expect(visibleTiles.size).toBe(2)
      expect(visibleTiles.has('0,0')).toBe(true)
      expect(visibleTiles.has('0,1')).toBe(true)
    })
  })

  describe('getVisibleTiles', () => {
    it('returns all visible tiles including empty tiles (all walls open)', () => {
      // Create a level with an empty tile (all walls open) in view
      const level: LevelData = {
        level: 1,
        name: 'Test Level with Empty Tile',
        size: { width: 5, height: 5 },
        startPosition: { x: 2, y: 0, facing: 'NORTH' },
        edgeWrapping: false,
        encounterRate: 0,
        encounterTable: '',
        tiles: [
          // Player starts at (2, 0), facing north
          { x: 2, y: 0, walls: { north: 'open', east: 'wall', south: 'wall', west: 'wall' } },
          // Empty tile directly ahead at (2, 1) - ALL walls open
          { x: 2, y: 1, walls: { north: 'open', east: 'open', south: 'open', west: 'open' } },
          // Tile ahead at (2, 2) with a wall to stop visibility
          { x: 2, y: 2, walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' } },
        ]
      }

      const position: Position = { x: 2, y: 0, facing: 'NORTH' }
      const tiles = VisibilityService.getVisibleTiles(level, position, 3, 1)

      // Should include all 3 tiles, INCLUDING the empty tile at (2, 1)
      const tileSet = new Set(tiles.map(([x, y]) => `${x},${y}`))

      expect(tileSet.has('2,0')).toBe(true)  // Player tile
      expect(tileSet.has('2,1')).toBe(true)  // Empty tile - THIS IS THE KEY TEST
      expect(tileSet.has('2,2')).toBe(true)  // Tile with north wall
    })

    it('returns visible tiles matching the visited set from traversal', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 5, height: 5 },
        startPosition: { x: 2, y: 2, facing: 'NORTH' },
        edgeWrapping: false,
        encounterRate: 0,
        encounterTable: '',
        tiles: [
          // Create corridor with walls on sides
          { x: 2, y: 2, walls: { north: 'open', east: 'wall', south: 'wall', west: 'wall' } },
          { x: 2, y: 3, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' } },
          { x: 2, y: 4, walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' } },
        ]
      }

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const tiles = VisibilityService.getVisibleTiles(level, position, 3, 1)

      expect(tiles.length).toBe(3)

      const tileSet = new Set(tiles.map(([x, y]) => `${x},${y}`))
      expect(tileSet.has('2,2')).toBe(true)
      expect(tileSet.has('2,3')).toBe(true)
      expect(tileSet.has('2,4')).toBe(true)
    })

    it('respects wall occlusion when returning visible tiles', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 5, height: 5 },
        startPosition: { x: 2, y: 2, facing: 'NORTH' },
        edgeWrapping: false,
        encounterRate: 0,
        encounterTable: '',
        tiles: [
          // Blocking wall ahead
          { x: 2, y: 2, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
          { x: 2, y: 3, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' } },
        ]
      }

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const tiles = VisibilityService.getVisibleTiles(level, position, 3, 1)

      // Should only see player tile due to blocking wall
      expect(tiles.length).toBe(1)
      expect(tiles[0]).toEqual([2, 2])
    })
  })

  describe('getVisibleGeometry', () => {
    it('returns both walls and tiles from single traversal', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 5, height: 5 },
        startPosition: { x: 2, y: 2, facing: 'NORTH' },
        edgeWrapping: false,
        encounterRate: 0,
        encounterTable: '',
        tiles: [
          { x: 2, y: 2, walls: { north: 'open', east: 'wall', south: 'wall', west: 'wall' } },
          { x: 2, y: 3, walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' } },
        ]
      }

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const { walls, tiles } = VisibilityService.getVisibleGeometry(level, position, 3, 1)

      // Should have walls and tiles from both visible positions
      expect(walls.length).toBeGreaterThan(0)
      expect(tiles.length).toBe(2)

      const tileSet = new Set(tiles.map(t => `${t.x},${t.y}`))
      expect(tileSet.has('2,2')).toBe(true)
      expect(tileSet.has('2,3')).toBe(true)
    })

    it('ensures walls and tiles are always in sync', () => {
      // This is the bug scenario: facing a wall at depth=0
      // Both walls AND tiles should include depth=1 tiles
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 5, height: 5 },
        startPosition: { x: 2, y: 2, facing: 'NORTH' },
        edgeWrapping: false,
        encounterRate: 0,
        encounterTable: '',
        tiles: [
          // Current tile with wall ahead
          { x: 2, y: 2, walls: { north: 'wall', east: 'open', south: 'wall', west: 'open' } },
          // Tiles to left and right at depth 0
          { x: 1, y: 2, walls: { north: 'wall', east: 'open', south: 'wall', west: 'wall' } },
          { x: 3, y: 2, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'open' } },
          // Tiles at depth 1 (should be visible due to open side walls)
          { x: 1, y: 3, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
          { x: 2, y: 3, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
          { x: 3, y: 3, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
        ]
      }

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const { walls, tiles } = VisibilityService.getVisibleGeometry(level, position, 5, 3)

      // Extract tile coordinates from walls
      const wallTiles = new Set<string>()
      walls.forEach(wall => {
        wallTiles.add(`${wall.gridX},${wall.gridY}`)
      })

      // Extract tile coordinates from tiles array
      const floorTiles = new Set(tiles.map(t => `${t.x},${t.y}`))

      // Critical: every tile with walls should also have floor/ceiling
      wallTiles.forEach(tile => {
        expect(floorTiles.has(tile)).toBe(true)
      })
    })

    describe('level 1 bug fix: facing EAST from (0,1)', () => {
      let level1: LevelData

      beforeEach(async () => {
        const { DungeonService } = await import('../DungeonService')
        level1 = DungeonService.loadLevel(1)
      })

      it('returns matching walls and tiles when facing a wall at depth=0', () => {
        // This is the exact bug scenario reported by the user
        const position: Position = { x: 0, y: 1, facing: 'EAST' }
        const { walls, tiles } = VisibilityService.getVisibleGeometry(level1, position, 5, 5)

        // Extract tile coordinates from walls
        const wallTiles = new Set<string>()
        walls.forEach(wall => {
          wallTiles.add(`${wall.gridX},${wall.gridY}`)
        })

        // Extract tile coordinates from tiles array
        const floorTiles = new Set(tiles.map(t => `${t.x},${t.y}`))

        // Critical assertion: every tile with walls must have floor/ceiling
        // This was the bug - tiles like (1,0) had walls but no floor/ceiling
        wallTiles.forEach(tile => {
          expect(floorTiles.has(tile)).toBe(true)
        })

        // Verify specific tiles are included
        expect(floorTiles.has('0,1')).toBe(true)  // Current tile
        expect(floorTiles.has('0,0')).toBe(true)  // Right peripheral
      })

      it('should see tiles through peripheral passages (forward-peripheral visibility)', () => {
        // Bug: Tile (1,0) is NOT visible even though there's a clear passage through (0,0)
        // Map layout:
        //   (0,1): east=WALL (blocks center), south=open → can see (0,0)
        //   (0,0): east=open → leads to (1,0)
        //   (1,0): west=open → accessible from (0,0)
        // Expected: Should see (0,0), (1,0), (0,1), (0,2)
        const position: Position = { x: 0, y: 1, facing: 'EAST' }
        const { tiles } = VisibilityService.getVisibleGeometry(level1, position, 5, 5)

        const tileSet = new Set(tiles.map(t => `${t.x},${t.y}`))

        // Expected visible tiles
        expect(tileSet.has('0,1')).toBe(true)  // Current tile
        expect(tileSet.has('0,0')).toBe(true)  // Right peripheral (south of player)
        expect(tileSet.has('0,2')).toBe(true)  // Left peripheral (north of player)
        expect(tileSet.has('1,0')).toBe(true)  // Through (0,0) - THE FIX

        // Should NOT see tiles blocked by walls
        expect(tileSet.has('1,1')).toBe(false) // Blocked by (0,1).east = wall
      })

      it('should NOT create north wall for (0,0) since north is open', () => {
        const position: Position = { x: 0, y: 1, facing: 'EAST' }
        const { walls } = VisibilityService.getVisibleGeometry(level1, position, 5, 5)

        const tile00NorthWall = walls.find(w =>
          w.gridX === 0 && w.gridY === 0 && w.side === 'north'
        )
        expect(tile00NorthWall).toBeUndefined()

        // Should have south and west walls for (0,0)
        const tile00SouthWall = walls.find(w =>
          w.gridX === 0 && w.gridY === 0 && w.side === 'south'
        )
        const tile00WestWall = walls.find(w =>
          w.gridX === 0 && w.gridY === 0 && w.side === 'west'
        )
        expect(tile00SouthWall).toBeDefined()
        expect(tile00WestWall).toBeDefined()
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

  describe('darkness tile visibility limiting', () => {
    // Create a test level with darkness tiles starting at y=2
    const createLevelWithDarkness = (): LevelData => ({
      level: 1,
      name: 'Darkness Test Level',
      size: { width: 5, height: 10 },
      startPosition: { x: 2, y: 0, facing: 'north' },
      edgeWrapping: false,
      encounterRate: 0,
      encounterTable: '',
      tiles: [
        // Normal tiles at y=0, y=1
        { x: 2, y: 0, walls: { north: 'open', east: 'wall', south: 'wall', west: 'wall' } },
        { x: 2, y: 1, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' } },
        // Darkness tiles starting at y=2
        { x: 2, y: 2, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' }, type: 'darkness' },
        { x: 2, y: 3, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' }, type: 'darkness' },
        { x: 2, y: 4, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' }, type: 'darkness' },
        { x: 2, y: 5, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' }, type: 'darkness' },
        { x: 2, y: 6, walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' }, type: 'darkness' },
      ]
    })

    it('returns darknessDepth property for each visible tile', () => {
      const level = createLevelWithDarkness()
      const position: Position = { x: 2, y: 0, facing: 'NORTH' }

      const { tiles } = VisibilityService.getVisibleGeometry(level, position, 5, 1)

      // All tiles should have darknessDepth property (now using VisibleTileInfo)
      tiles.forEach(tile => {
        expect(tile).toHaveProperty('darknessDepth')
        expect(typeof tile.darknessDepth).toBe('number')
      })
    })

    it('returns darknessDepth 0 for normal tiles', () => {
      const level = createLevelWithDarkness()
      const position: Position = { x: 2, y: 0, facing: 'NORTH' }

      const { tiles } = VisibilityService.getVisibleGeometry(level, position, 5, 1)

      // Tiles at y=0 and y=1 are normal - should have darknessDepth 0
      const tile0 = tiles.find(t => t.x === 2 && t.y === 0)
      const tile1 = tiles.find(t => t.x === 2 && t.y === 1)

      expect(tile0?.darknessDepth).toBe(0)
      expect(tile1?.darknessDepth).toBe(0)
    })

    it('returns incrementing darknessDepth when entering darkness zone', () => {
      const level = createLevelWithDarkness()
      const position: Position = { x: 2, y: 0, facing: 'NORTH' }

      const { tiles } = VisibilityService.getVisibleGeometry(level, position, 6, 1)

      // Darkness starts at y=2
      const tile2 = tiles.find(t => t.x === 2 && t.y === 2)
      const tile3 = tiles.find(t => t.x === 2 && t.y === 3)

      expect(tile2?.darknessDepth).toBe(1)  // First darkness tile
      expect(tile3?.darknessDepth).toBe(2)  // Second darkness tile
    })

    it('limits visibility to 2 tiles into darkness zone', () => {
      const level = createLevelWithDarkness()
      const position: Position = { x: 2, y: 0, facing: 'NORTH' }

      // Request 6 tiles deep - but should stop after 2 tiles into darkness
      const { tiles } = VisibilityService.getVisibleGeometry(level, position, 6, 1)

      const tileCoords = tiles.map(t => `${t.x},${t.y}`)

      // Should see: (2,0), (2,1) normal + (2,2), (2,3) darkness = 4 tiles
      expect(tileCoords).toContain('2,0')  // Normal
      expect(tileCoords).toContain('2,1')  // Normal
      expect(tileCoords).toContain('2,2')  // Darkness depth 1
      expect(tileCoords).toContain('2,3')  // Darkness depth 2

      // Should NOT see tiles beyond 2 into darkness
      expect(tileCoords).not.toContain('2,4')  // Beyond darkness limit
      expect(tileCoords).not.toContain('2,5')  // Beyond darkness limit
    })

    it('includes darknessDepth on wall segments', () => {
      const level = createLevelWithDarkness()
      const position: Position = { x: 2, y: 0, facing: 'NORTH' }

      const { walls } = VisibilityService.getVisibleGeometry(level, position, 5, 1)

      // All walls should have darknessDepth property
      walls.forEach(wall => {
        expect(wall).toHaveProperty('darknessDepth')
        expect(typeof wall.darknessDepth).toBe('number')
      })

      // Walls at darkness tiles should have matching darknessDepth
      const wallsAtY2 = walls.filter(w => w.gridY === 2)
      wallsAtY2.forEach(wall => {
        expect(wall.darknessDepth).toBe(1)  // First darkness tile
      })
    })

    it('resets darknessDepth when exiting darkness zone', () => {
      // Create level: normal -> darkness -> normal
      const level: LevelData = {
        level: 1,
        name: 'Darkness Exit Test',
        size: { width: 5, height: 6 },
        startPosition: { x: 2, y: 0, facing: 'north' },
        edgeWrapping: false,
        encounterRate: 0,
        encounterTable: '',
        tiles: [
          { x: 2, y: 0, walls: { north: 'open', east: 'wall', south: 'wall', west: 'wall' } },  // Normal
          { x: 2, y: 1, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' }, type: 'darkness' },  // Darkness
          { x: 2, y: 2, walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' } },  // Normal again
        ]
      }

      const position: Position = { x: 2, y: 0, facing: 'NORTH' }
      const { tiles } = VisibilityService.getVisibleGeometry(level, position, 5, 1)

      const tile0 = tiles.find(t => t.x === 2 && t.y === 0)
      const tile1 = tiles.find(t => t.x === 2 && t.y === 1)
      const tile2 = tiles.find(t => t.x === 2 && t.y === 2)

      expect(tile0?.darknessDepth).toBe(0)  // Normal
      expect(tile1?.darknessDepth).toBe(1)  // Darkness
      expect(tile2?.darknessDepth).toBe(0)  // Back to normal - depth resets
    })
  })
})
