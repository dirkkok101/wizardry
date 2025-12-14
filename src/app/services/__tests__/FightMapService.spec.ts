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
        { x: 5, y: 5, isRoom: true, hasDoor: true },
        { x: 6, y: 5, isRoom: true, hasDoor: true },
        { x: 5, y: 6, isRoom: true, hasDoor: true }
      ]

      FightMapService.initializeLevel(1, roomTiles)

      // All room tiles should be encounter-eligible (not cleared)
      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)
      expect(FightMapService.canEncounter(1, 6, 5)).toBe(true)
      expect(FightMapService.canEncounter(1, 5, 6)).toBe(true)
    })

    it('should not allow encounters on corridor tiles (tiles not in roomTiles)', () => {
      const roomTiles = [{ x: 5, y: 5, isRoom: true, hasDoor: true }]

      FightMapService.initializeLevel(1, roomTiles)

      // Corridor at (0,0) should not be encounter-eligible
      expect(FightMapService.canEncounter(1, 0, 0)).toBe(false)
    })

    it('should handle multiple levels independently', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])
      FightMapService.initializeLevel(2, [{ x: 10, y: 10, isRoom: true, hasDoor: true }])

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)
      expect(FightMapService.canEncounter(1, 10, 10)).toBe(false) // Not a room on level 1
      expect(FightMapService.canEncounter(2, 10, 10)).toBe(true)
      expect(FightMapService.canEncounter(2, 5, 5)).toBe(false) // Not a room on level 2
    })
  })

  describe('canEncounter', () => {
    it('should return true for uncleared room tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)
    })

    it('should return false for cleared tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])
      FightMapService.markCleared(1, 5, 5)

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(false)
    })

    it('should return true for alarm tiles regardless of cleared state', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])
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
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(true)

      FightMapService.markCleared(1, 5, 5)

      expect(FightMapService.canEncounter(1, 5, 5)).toBe(false)
    })

    it('should clear alarm tile when marked', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])
      FightMapService.setAlarm(1, 5, 5)

      expect(FightMapService.isAlarmTile(1, 5, 5)).toBe(true)

      FightMapService.markCleared(1, 5, 5)

      expect(FightMapService.isAlarmTile(1, 5, 5)).toBe(false)
    })
  })

  describe('hasTreasure', () => {
    it('should return false for non-treasure tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])

      expect(FightMapService.hasTreasure(1, 5, 5)).toBe(false)
    })

    it('should return true for treasure room tiles', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])
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
          roomTiles.push({ x, y, isRoom: true, hasDoor: true })
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
      FightMapService.initializeLevel(1, [{ x: 0, y: 0, isRoom: true, hasDoor: true }])

      // Spread alarm at corner - should not crash
      FightMapService.spreadAlarm(1, 0, 0, 2)

      // Center cleared
      expect(FightMapService.canEncounter(1, 0, 0)).toBe(false)
    })
  })

  describe('resetAll', () => {
    it('should clear all level states', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])
      FightMapService.initializeLevel(2, [{ x: 10, y: 10, isRoom: true, hasDoor: true }])
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
          roomTiles.push({ x, y, isRoom: true, hasDoor: true })
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
        { x: 0, y: 0, isRoom: true, hasDoor: true },
        { x: 1, y: 0, isRoom: true, hasDoor: true },
        { x: 2, y: 0, isRoom: true, hasDoor: true },
        { x: 3, y: 0, isRoom: true, hasDoor: true },
        { x: 4, y: 0, isRoom: true, hasDoor: true }
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
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])
      FightMapService.markCleared(1, 5, 5)

      // Normal encounter check fails (cleared)
      expect(FightMapService.canEncounter(1, 5, 5)).toBe(false)

      // Door-kick always eligible for room tiles (farming mechanic)
      expect(FightMapService.canEncounterDoorKick(1, 5, 5)).toBe(true)
    })

    it('canEncounterDoorKick should return false for corridor tiles', () => {
      // Tile not in room list
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])

      // Corridor tile at (0,0) - not eligible even for door kick
      expect(FightMapService.canEncounterDoorKick(1, 0, 0)).toBe(false)
    })
  })

  describe('getLevelState', () => {
    it('should return level state if initialized', () => {
      FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])

      const state = FightMapService.getLevelState(1)

      expect(state).toBeDefined()
      expect(state!.level).toBe(1)
    })

    it('should return undefined for uninitialized level', () => {
      expect(FightMapService.getLevelState(99)).toBeUndefined()
    })
  })

  describe('fixed encounters', () => {
    describe('initializeFixedEncounter', () => {
      it('should initialize fixed encounter with triggered=false', () => {
        FightMapService.initializeLevel(1, [{ x: 13, y: 5, isRoom: true, hasDoor: true }])
        FightMapService.initializeFixedEncounter(1, 13, 5, {
          encounterId: 'murphy_ghost',
          repeatable: true,
          cannotFlee: true
        })

        const config = FightMapService.getFixedEncounterConfig(1, 13, 5)

        expect(config).toBeDefined()
        expect(config!.encounterId).toBe('murphy_ghost')
        expect(config!.repeatable).toBe(true)
        expect(config!.cannotFlee).toBe(true)
        expect(config!.triggered).toBe(false)
      })
    })

    describe('markFixedEncounterTriggered', () => {
      it('should set triggered=true after encounter', () => {
        FightMapService.initializeLevel(1, [{ x: 13, y: 5, isRoom: true, hasDoor: true }])
        FightMapService.initializeFixedEncounter(1, 13, 5, {
          encounterId: 'murphy_ghost',
          repeatable: true
        })

        FightMapService.markFixedEncounterTriggered(1, 13, 5)

        const config = FightMapService.getFixedEncounterConfig(1, 13, 5)
        expect(config!.triggered).toBe(true)
      })
    })

    describe('getFixedEncounterConfig', () => {
      it('should return config for repeatable encounter even when triggered', () => {
        FightMapService.initializeLevel(1, [{ x: 13, y: 5, isRoom: true, hasDoor: true }])
        FightMapService.initializeFixedEncounter(1, 13, 5, {
          encounterId: 'murphy_ghost',
          repeatable: true
        })
        FightMapService.markFixedEncounterTriggered(1, 13, 5)

        // Repeatable encounter should still return config even when triggered
        const config = FightMapService.getFixedEncounterConfig(1, 13, 5)
        expect(config).toBeDefined()
        expect(config!.triggered).toBe(true)
      })

      it('should return undefined for non-repeatable encounter when triggered', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true, hasDoor: true }])
        FightMapService.initializeFixedEncounter(1, 5, 5, {
          encounterId: 'one_time_boss',
          repeatable: false
        })
        FightMapService.markFixedEncounterTriggered(1, 5, 5)

        // Non-repeatable encounter should return undefined when triggered
        const config = FightMapService.getFixedEncounterConfig(1, 5, 5)
        expect(config).toBeUndefined()
      })
    })

    describe('resetRepeatableEncounters', () => {
      it('should reset triggered flag on repeatable encounters only', () => {
        FightMapService.initializeLevel(1, [
          { x: 13, y: 5, isRoom: true, hasDoor: true },
          { x: 5, y: 5, isRoom: true, hasDoor: true }
        ])
        // Murphy's Ghost - repeatable
        FightMapService.initializeFixedEncounter(1, 13, 5, {
          encounterId: 'murphy_ghost',
          repeatable: true
        })
        // One-time boss - not repeatable
        FightMapService.initializeFixedEncounter(1, 5, 5, {
          encounterId: 'one_time_boss',
          repeatable: false
        })

        // Trigger both encounters
        FightMapService.markFixedEncounterTriggered(1, 13, 5)
        FightMapService.markFixedEncounterTriggered(1, 5, 5)

        // Reset repeatable encounters (simulates level re-entry)
        FightMapService.resetRepeatableEncounters(1)

        // Murphy's Ghost should have triggered reset to false
        const murphyConfig = FightMapService.getFixedEncounterConfig(1, 13, 5)
        expect(murphyConfig).toBeDefined()
        expect(murphyConfig!.triggered).toBe(false)

        // One-time boss should still be undefined (triggered and non-repeatable)
        const bossConfig = FightMapService.getFixedEncounterConfig(1, 5, 5)
        expect(bossConfig).toBeUndefined()
      })

      it('should not affect other levels', () => {
        FightMapService.initializeLevel(1, [{ x: 13, y: 5, isRoom: true, hasDoor: true }])
        FightMapService.initializeLevel(2, [{ x: 10, y: 10, isRoom: true, hasDoor: true }])
        FightMapService.initializeFixedEncounter(1, 13, 5, {
          encounterId: 'murphy_ghost',
          repeatable: true
        })
        FightMapService.initializeFixedEncounter(2, 10, 10, {
          encounterId: 'level2_repeatable',
          repeatable: true
        })

        // Trigger both
        FightMapService.markFixedEncounterTriggered(1, 13, 5)
        FightMapService.markFixedEncounterTriggered(2, 10, 10)

        // Reset only level 1
        FightMapService.resetRepeatableEncounters(1)

        // Level 1 should be reset
        const level1Config = FightMapService.getFixedEncounterConfig(1, 13, 5)
        expect(level1Config!.triggered).toBe(false)

        // Level 2 should still be triggered
        const level2Config = FightMapService.getFixedEncounterConfig(2, 10, 10)
        expect(level2Config!.triggered).toBe(true)
      })
    })

    describe('expedition reset behavior', () => {
      it('should reset triggered state when resetAll followed by fresh init (new expedition)', () => {
        const roomTiles = [{ x: 13, y: 5, isRoom: true, hasDoor: true }]

        // Expedition 1: Initialize and trigger Murphy's Ghost
        FightMapService.initializeLevel(1, roomTiles)
        FightMapService.initializeFixedEncounter(1, 13, 5, {
          encounterId: 'murphy_ghost',
          repeatable: true,
          cannotFlee: true
        })
        FightMapService.markFixedEncounterTriggered(1, 13, 5)

        // Verify triggered in expedition 1
        const configExp1 = FightMapService.getFixedEncounterConfig(1, 13, 5)
        expect(configExp1?.triggered).toBe(true)

        // Return to castle (simulated) - this clears all state
        FightMapService.resetAll()

        // Verify state is completely cleared
        expect(FightMapService.getLevelState(1)).toBeUndefined()

        // Expedition 2: Fresh initialization (simulates entering maze from castle)
        FightMapService.initializeLevel(1, roomTiles)
        FightMapService.initializeFixedEncounter(1, 13, 5, {
          encounterId: 'murphy_ghost',
          repeatable: true,
          cannotFlee: true
        })

        // Verify triggered is reset to false in new expedition
        const configExp2 = FightMapService.getFixedEncounterConfig(1, 13, 5)
        expect(configExp2?.triggered).toBe(false)

        // Verify encounter would trigger (hasActiveFixedEncounter returns true)
        expect(FightMapService.hasActiveFixedEncounter(1, 13, 5)).toBe(true)
      })

      it('should clear state for all levels on resetAll', () => {
        // Initialize multiple levels
        FightMapService.initializeLevel(1, [{ x: 13, y: 5, isRoom: true, hasDoor: true }])
        FightMapService.initializeLevel(2, [{ x: 10, y: 10, isRoom: true, hasDoor: true }])
        FightMapService.initializeFixedEncounter(1, 13, 5, {
          encounterId: 'murphy_ghost',
          repeatable: true
        })
        FightMapService.initializeFixedEncounter(2, 10, 10, {
          encounterId: 'level2_encounter',
          repeatable: true
        })

        // Trigger both
        FightMapService.markFixedEncounterTriggered(1, 13, 5)
        FightMapService.markFixedEncounterTriggered(2, 10, 10)

        // Return to castle - should clear ALL levels
        FightMapService.resetAll()

        // Verify both levels are cleared
        expect(FightMapService.getLevelState(1)).toBeUndefined()
        expect(FightMapService.getLevelState(2)).toBeUndefined()
      })
    })
  })
})
