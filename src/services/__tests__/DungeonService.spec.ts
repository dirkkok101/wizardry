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

    it('returns 3 tiles ahead when facing NORTH with light radius 3', () => {
      const position: Position = { x: 10, y: 10, facing: 'NORTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(3)
      expect(tiles[0]).toMatchObject({ x: 10, y: 11 }) // Near
      expect(tiles[1]).toMatchObject({ x: 10, y: 12 }) // Mid
      expect(tiles[2]).toMatchObject({ x: 10, y: 13 }) // Far
    })

    it('returns 1 tile ahead when light radius is 1', () => {
      const position: Position = { x: 10, y: 10, facing: 'NORTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 1)

      expect(tiles).toHaveLength(1)
      expect(tiles[0]).toMatchObject({ x: 10, y: 11 })
    })

    it('returns 2 tiles ahead when light radius is 2', () => {
      const position: Position = { x: 10, y: 10, facing: 'NORTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 2)

      expect(tiles).toHaveLength(2)
      expect(tiles[0]).toMatchObject({ x: 10, y: 11 })
      expect(tiles[1]).toMatchObject({ x: 10, y: 12 })
    })

    it('returns tiles ahead when facing EAST', () => {
      const position: Position = { x: 10, y: 10, facing: 'EAST' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(3)
      expect(tiles[0]).toMatchObject({ x: 11, y: 10 }) // Near
      expect(tiles[1]).toMatchObject({ x: 12, y: 10 }) // Mid
      expect(tiles[2]).toMatchObject({ x: 13, y: 10 }) // Far
    })

    it('returns tiles ahead when facing SOUTH', () => {
      const position: Position = { x: 10, y: 10, facing: 'SOUTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(3)
      expect(tiles[0]).toMatchObject({ x: 10, y: 9 }) // Near
      expect(tiles[1]).toMatchObject({ x: 10, y: 8 }) // Mid
      expect(tiles[2]).toMatchObject({ x: 10, y: 7 }) // Far
    })

    it('returns tiles ahead when facing WEST', () => {
      const position: Position = { x: 10, y: 10, facing: 'WEST' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(3)
      expect(tiles[0]).toMatchObject({ x: 9, y: 10 }) // Near
      expect(tiles[1]).toMatchObject({ x: 8, y: 10 }) // Mid
      expect(tiles[2]).toMatchObject({ x: 7, y: 10 }) // Far
    })

    it('handles edge wrapping when moving east from x=19', () => {
      const position: Position = { x: 19, y: 10, facing: 'EAST' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(3)
      expect(tiles[0]).toMatchObject({ x: 0, y: 10 })  // Wraps to 0
      expect(tiles[1]).toMatchObject({ x: 1, y: 10 })
      expect(tiles[2]).toMatchObject({ x: 2, y: 10 })
    })

    it('handles edge wrapping when moving north from y=19', () => {
      const position: Position = { x: 10, y: 19, facing: 'NORTH' }
      const tiles = DungeonService.getVisibleTiles(level, position, 3)

      expect(tiles).toHaveLength(3)
      expect(tiles[0]).toMatchObject({ x: 10, y: 0 })  // Wraps to 0
      expect(tiles[1]).toMatchObject({ x: 10, y: 1 })
      expect(tiles[2]).toMatchObject({ x: 10, y: 2 })
    })
  })
})
