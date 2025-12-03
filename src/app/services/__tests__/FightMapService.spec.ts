import { FightMapService } from '../FightMapService'
import { RandomService } from '../RandomService'

describe('FightMapService', () => {
  beforeEach(() => {
    FightMapService.resetAll()
    RandomService.resetSeed()
  })

  describe('initializeLevel', () => {
    it('should initialize level state with empty cleared tiles', () => {
      const roomTiles = [
        { x: 5, y: 5, isRoom: true },
        { x: 6, y: 5, isRoom: true },
        { x: 5, y: 6, isRoom: true }
      ]

      FightMapService.initializeLevel(1, roomTiles)

      // All room tiles should be encounter-eligible (not cleared)
      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)
      expect(FightMapService.canEncounter(1, 6, 5)).toBe(true)
      expect(FightMapService.canEncounter(1, 5, 6)).toBe(true)
    })

    it('should not allow encounters on corridor tiles (tiles not in roomTiles)', () => {
      const roomTiles = [{ x: 5, y: 5, isRoom: true }]

      FightMapService.initializeLevel(1, roomTiles)

      // Corridor at (0,0) should not be encounter-eligible
      expect(FightMapService.canEncounter(1, 0, 0)).toBe(false)
    })

    it('should handle multiple levels independently', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
      FightMapService.initializeLevel(2, [{ x: 10, y: 10, isRoom: true }])

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)
      expect(FightMapService.canEncounter(1, 10, 10)).toBe(false) // Not a room on level 1
      expect(FightMapService.canEncounter(2, 10, 10)).toBe(true)
      expect(FightMapService.canEncounter(2, 5, 5)).toBe(false) // Not a room on level 2
    })
  })

  describe('canEncounter', () => {
    it('should return true for uncleared room tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)
    })

    it('should return false for cleared tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
      FightMapService.markCleared(1, 5, 5)

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(false)
    })

    it('should return true for alarm tiles regardless of cleared state', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
      FightMapService.markCleared(1, 5, 5)
      FightMapService.setAlarm(1, 5, 5)

      // Even though tile was cleared, alarm forces encounter
      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)
    })

    it('should return false for uninitialized level', () => {
      expect(FightMapService.canEncounter(99, 5, 5)).toBe(false)
    })
  })

  describe('markCleared', () => {
    it('should mark tile as cleared', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)

      FightMapService.markCleared(1, 5, 5)

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(false)
    })

    it('should clear alarm tile when marked', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
      FightMapService.setAlarm(1, 5, 5)

      expect(FightMapService.isAlarmTile(1, 5, 5)).toBe(true)

      FightMapService.markCleared(1, 5, 5)

      expect(FightMapService.isAlarmTile(1, 5, 5)).toBe(false)
    })
  })

  describe('hasTreasure', () => {
    it('should return false for non-treasure tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])

      expect(FightMapService.hasTreasure(1, 5, 5)).toBe(false)
    })

    it('should return true for treasure room tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
      FightMapService.markTreasureRoom(1, 5, 5)

      expect(FightMapService.hasTreasure(1, 5, 5)).toBe(true)
    })
  })

  describe('spreadAlarm', () => {
    it('should set alarm on surrounding tiles within radius', () => {
      // Create a 5x5 grid of rooms centered at (10,10)
      const roomTiles = []
      for (let x = 8; x <= 12; x++) {
        for (let y = 8; y <= 12; y++) {
          roomTiles.push({ x, y, isRoom: true })
        }
      }
      FightMapService.initializeLevel(1, roomTiles)

      // Spread alarm with radius 1 from center (10,10)
      FightMapService.spreadAlarm(1, 10, 10, 1)

      // Center should be cleared (not alarm)
      expect(FightMapService.isAlarmTile(1, 10, 10)).toBe(false)
      expect(FightMapService.canEncounter(1, 10, 10)).toBe(false) // Cleared by spreadAlarm

      // Adjacent tiles should be alarm
      expect(FightMapService.isAlarmTile(1, 9, 10)).toBe(true)
      expect(FightMapService.isAlarmTile(1, 11, 10)).toBe(true)
      expect(FightMapService.isAlarmTile(1, 10, 9)).toBe(true)
      expect(FightMapService.isAlarmTile(1, 10, 11)).toBe(true)

      // Corner tiles within radius should also be alarm
      expect(FightMapService.isAlarmTile(1, 9, 9)).toBe(true)
      expect(FightMapService.isAlarmTile(1, 11, 11)).toBe(true)
    })

    it('should not set alarm outside map bounds', () => {
      FightMapService.initializeLevel(1, [{ x: 0, y: 0, isRoom: true }])

      // Spread alarm at corner - should not crash
      FightMapService.spreadAlarm(1, 0, 0, 2)

      // Center cleared
      expect(FightMapService.canEncounter(1, 0, 0)).toBe(false)
    })
  })

  describe('resetAll', () => {
    it('should clear all level states', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
      FightMapService.initializeLevel(2, [{ x: 10, y: 10, isRoom: true }])
      FightMapService.markTreasureRoom(1, 5, 5)
      FightMapService.setAlarm(2, 10, 10)

      FightMapService.resetAll()

      // All state should be gone
      expect(FightMapService.canEncounter(1, 5, 5)).toBe(false) // Level not initialized
      expect(FightMapService.hasTreasure(1, 5, 5)).toBe(false)
      expect(FightMapService.isAlarmTile(2, 10, 10)).toBe(false)
    })
  })

  describe('seedTreasureRooms', () => {
    it('should seed exactly 9 treasure rooms', () => {
      // Create enough rooms for seeding
      const roomTiles = []
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          roomTiles.push({ x, y, isRoom: true })
        }
      }
      FightMapService.initializeLevel(1, roomTiles)

      // Queue deterministic random values for seeding
      RandomService.queueNextValues([
        0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9 // 9 seeds
      ])

      FightMapService.seedTreasureRooms(1, roomTiles)

      // Count treasure rooms
      let treasureCount = 0
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          if (FightMapService.hasTreasure(1, x, y)) {
            treasureCount++
          }
        }
      }

      expect(treasureCount).toBe(9)
    })

    it('should not seed more than available rooms', () => {
      // Only 5 room tiles
      const roomTiles = [
        { x: 0, y: 0, isRoom: true },
        { x: 1, y: 0, isRoom: true },
        { x: 2, y: 0, isRoom: true },
        { x: 3, y: 0, isRoom: true },
        { x: 4, y: 0, isRoom: true }
      ]
      FightMapService.initializeLevel(1, roomTiles)

      FightMapService.seedTreasureRooms(1, roomTiles)

      // Should only have 5 treasure rooms (all available)
      let treasureCount = 0
      for (const tile of roomTiles) {
        if (FightMapService.hasTreasure(1, tile.x, tile.y)) {
          treasureCount++
        }
      }

      expect(treasureCount).toBe(5)
    })
  })

  describe('door-kick bypass behavior', () => {
    it('canEncounterDoorKick should return true even for cleared tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
      FightMapService.markCleared(1, 5, 5)

      // Normal encounter check fails (cleared)
      expect(FightMapService.canEncounter(1, 5, 5)).toBe(false)

      // Door-kick always eligible for room tiles (farming mechanic)
      expect(FightMapService.canEncounterDoorKick(1, 5, 5)).toBe(true)
    })

    it('canEncounterDoorKick should return false for corridor tiles', () => {
      // Tile not in room list
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])

      // Corridor tile at (0,0) - not eligible even for door kick
      expect(FightMapService.canEncounterDoorKick(1, 0, 0)).toBe(false)
    })
  })

  describe('getLevelState', () => {
    it('should return level state if initialized', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])

      const state = FightMapService.getLevelState(1)

      expect(state).toBeDefined()
      expect(state!.level).toBe(1)
    })

    it('should return undefined for uninitialized level', () => {
      expect(FightMapService.getLevelState(99)).toBeUndefined()
    })
  })
})
