import { DungeonService } from '../DungeonService'

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
})
