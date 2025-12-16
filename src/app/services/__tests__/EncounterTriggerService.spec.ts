import { EncounterTriggerService, EncounterContext, EncounterCheckResult } from '../EncounterTriggerService'
import { FightMapService } from '../FightMapService'
import { RandomService } from '../RandomService'
import { MonsterGroup, MonsterInstance, CombatantStatus } from '@models/Combat'

describe('EncounterTriggerService', () => {
  beforeEach(() => {
    FightMapService.resetAll()
    RandomService.resetSeed()
  })

  describe('checkForEncounter - priority chain', () => {
    const createContext = (overrides: Partial<EncounterContext> = {}): EncounterContext => ({
      level: 1,
      x: 5,
      y: 5,
      isDoorKick: false,
      chestAlarmActive: false,
      isRoomTile: true,
      ...overrides
    })

    describe('Priority 1: Chest alarm trap', () => {
      it('should trigger encounter when chest alarm is active', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])

        const result = EncounterTriggerService.checkForEncounter(
          createContext({ chestAlarmActive: true })
        )

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('chest_trap')
        expect(result.guaranteedFight).toBe(true)
      })

      it('should take priority over all other triggers', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        FightMapService.markTreasureRoom(1, 5, 5)
        FightMapService.setAlarm(1, 5, 5)

        const result = EncounterTriggerService.checkForEncounter(
          createContext({ chestAlarmActive: true })
        )

        expect(result.reason).toBe('chest_trap')
      })
    })

    describe('Priority 2: Alarm tiles', () => {
      it('should trigger encounter on alarm tiles', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        FightMapService.setAlarm(1, 5, 5)

        const result = EncounterTriggerService.checkForEncounter(createContext())

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('alarm')
        expect(result.guaranteedFight).toBe(true)
      })

      it('should take priority over treasure rooms', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        FightMapService.setAlarm(1, 5, 5)
        FightMapService.markTreasureRoom(1, 5, 5)

        const result = EncounterTriggerService.checkForEncounter(createContext())

        expect(result.reason).toBe('alarm')
      })
    })

    describe('Priority 3: Fixed encounter squares', () => {
      it('should trigger on fixed encounter tiles when not yet triggered', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])

        const result = EncounterTriggerService.checkForEncounter(
          createContext({
            fixedEncounterConfig: { encounterId: 'kobold', repeatable: false, triggered: false }
          })
        )

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('fixed')
        expect(result.guaranteedFight).toBe(true)
        expect(result.fixedEncounterConfig).toBeDefined()
      })

      it('should NOT trigger on fixed encounter tiles already triggered', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        // Queue random values that won't trigger random encounter
        RandomService.queueNextValues([0.5]) // 50 != 35 (no random trigger)

        const result = EncounterTriggerService.checkForEncounter(
          createContext({
            fixedEncounterConfig: { encounterId: 'kobold', repeatable: false, triggered: true }
          })
        )

        expect(result.trigger).toBe(false)
      })

      it('should trigger on fixed encounter tiles even in corridors (non-room)', () => {
        // Initialize without room tiles - this is a corridor
        FightMapService.initializeLevel(1, [])

        const result = EncounterTriggerService.checkForEncounter(
          createContext({
            isRoomTile: false,  // Corridor, not a room
            fixedEncounterConfig: { encounterId: 'kobold', repeatable: false, triggered: false }
          })
        )

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('fixed')
        expect(result.guaranteedFight).toBe(true)
      })
    })

    describe('Priority 4: Treasure rooms', () => {
      it('should trigger on treasure room tiles if not cleared', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        FightMapService.markTreasureRoom(1, 5, 5)

        const result = EncounterTriggerService.checkForEncounter(createContext())

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('treasure_room')
        expect(result.guaranteedFight).toBe(true)
      })

      it('should NOT trigger on treasure room if already cleared', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        FightMapService.markTreasureRoom(1, 5, 5)
        FightMapService.markCleared(1, 5, 5)
        // Queue random value that won't trigger random encounter
        RandomService.queueNextValues([0.5])

        const result = EncounterTriggerService.checkForEncounter(createContext())

        expect(result.trigger).toBe(false)
      })
    })

    describe('Priority 5: Door kick + Room', () => {
      it('should check 12.5% chance when door kick into room', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        // Queue value that triggers door kick: need roll=3 from random(0,7)
        // RandomService.random(0,7) = floor(queuedValue * 8), so 3/8 = 0.375 gives 3
        RandomService.queueNextValues([0.4]) // 0.4 * 8 = 3.2, floor = 3 = target

        const result = EncounterTriggerService.checkForEncounter(
          createContext({ isDoorKick: true })
        )

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('door_kick')
        expect(result.guaranteedFight).toBe(false)
      })

      it('should work even on cleared tiles (farming mechanic)', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        FightMapService.markCleared(1, 5, 5)
        // Queue value that triggers door kick: 0.4 * 8 = 3.2, floor = 3 = target
        RandomService.queueNextValues([0.4])

        const result = EncounterTriggerService.checkForEncounter(
          createContext({ isDoorKick: true })
        )

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('door_kick')
      })

      it('should NOT trigger on corridor tiles (non-room)', () => {
        FightMapService.initializeLevel(1, []) // No room tiles
        RandomService.queueNextValues([0.05, 0.5]) // Would trigger if room, then random check

        const result = EncounterTriggerService.checkForEncounter(
          createContext({ isDoorKick: true, isRoomTile: false })
        )

        expect(result.trigger).toBe(false)
      })

      it('should NOT trigger when roll fails (> 12.5%)', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        // Queue value that doesn't trigger door kick, then random
        RandomService.queueNextValues([0.5, 0.5]) // 50% > 12.5%, 50 != 35

        const result = EncounterTriggerService.checkForEncounter(
          createContext({ isDoorKick: true })
        )

        expect(result.trigger).toBe(false)
      })
    })

    describe('Priority 6: Random movement (1%)', () => {
      it('should trigger on exact 1/99 roll', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        // Queue value that triggers random encounter (35/99 = ~0.3535)
        RandomService.queueNextValues([35 / 99])

        const result = EncounterTriggerService.checkForEncounter(createContext())

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('random')
        expect(result.guaranteedFight).toBe(false)
      })

      it('should NOT trigger when roll misses', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        FightMapService.markCleared(1, 5, 5) // Clear tile so only random can trigger
        RandomService.queueNextValues([0.5]) // 50/99 ≈ 49.5 != 35

        const result = EncounterTriggerService.checkForEncounter(createContext())

        expect(result.trigger).toBe(false)
      })

      it('should apply to ALL tile types including corridors', () => {
        FightMapService.initializeLevel(1, []) // No rooms
        // Queue value that triggers random encounter
        RandomService.queueNextValues([35 / 99])

        const result = EncounterTriggerService.checkForEncounter(
          createContext({ isRoomTile: false })
        )

        expect(result.trigger).toBe(true)
        expect(result.reason).toBe('random')
      })
    })

    describe('No trigger scenarios', () => {
      it('should return no trigger when all checks fail', () => {
        FightMapService.initializeLevel(1, [{ x: 5, y: 5, isRoom: true }])
        FightMapService.markCleared(1, 5, 5)
        RandomService.queueNextValues([0.5]) // Won't trigger random

        const result = EncounterTriggerService.checkForEncounter(createContext())

        expect(result.trigger).toBe(false)
        expect(result.reason).toBeUndefined()
      })
    })
  })

  describe('checkRandomEncounter', () => {
    it('should return true approximately 1% of the time', () => {
      const trials = 10000
      let triggers = 0

      for (let i = 0; i < trials; i++) {
        if (EncounterTriggerService.checkRandomEncounter()) {
          triggers++
        }
      }

      // Expected: ~101 triggers (1/99 ≈ 1.01%)
      // Allow reasonable variance
      expect(triggers).toBeGreaterThan(50)
      expect(triggers).toBeLessThan(200)
    })
  })

  describe('checkDoorKickEncounter', () => {
    it('should return true approximately 12.5% of the time', () => {
      const trials = 10000
      let triggers = 0

      for (let i = 0; i < trials; i++) {
        if (EncounterTriggerService.checkDoorKickEncounter()) {
          triggers++
        }
      }

      // Expected: ~1250 triggers (12.5%)
      // Allow reasonable variance
      expect(triggers).toBeGreaterThan(1000)
      expect(triggers).toBeLessThan(1500)
    })
  })

  describe('createAlarmCombatState', () => {
    const createTestMonsterInstance = (id: string): MonsterInstance => ({
      id,
      monsterId: 'kobold',
      name: 'Kobold',
      unidentifiedName: 'Humanoid',
      hp: 5,
      maxHp: 5,
      ac: 8,
      damage: [{ dice: '1d4', min: 1, max: 4 }],
      xp: 10,
      gold: 5,
      status: 'ALIVE' as CombatantStatus,
      level: 1
    })

    const createTestMonsterGroup = (): MonsterGroup => ({
      id: 'A',
      monsters: [createTestMonsterInstance('monster-1')],
      formation: 'front',
      identified: false
    })

    it('should create combat state with correct dungeon level', () => {
      const groups = [createTestMonsterGroup()]
      const result = EncounterTriggerService.createAlarmCombatState(5, groups)

      expect(result.dungeonLevel).toBe(5)
    })

    it('should include monster groups in state', () => {
      const groups = [createTestMonsterGroup()]
      const result = EncounterTriggerService.createAlarmCombatState(1, groups)

      expect(result.monsterGroups).toBe(groups)
      expect(result.monsterGroups.length).toBe(1)
    })

    it('should initialize roundNumber to 1', () => {
      const groups = [createTestMonsterGroup()]
      const result = EncounterTriggerService.createAlarmCombatState(1, groups)

      expect(result.roundNumber).toBe(1)
    })

    it('should set canFlee to true', () => {
      const groups = [createTestMonsterGroup()]
      const result = EncounterTriggerService.createAlarmCombatState(1, groups)

      expect(result.canFlee).toBe(true)
    })

    it('should set encounterReason to alarm', () => {
      const groups = [createTestMonsterGroup()]
      const result = EncounterTriggerService.createAlarmCombatState(1, groups)

      expect(result.encounterReason).toBe('alarm')
    })

    it('should include alarm message in combat log', () => {
      const groups = [createTestMonsterGroup()]
      const result = EncounterTriggerService.createAlarmCombatState(1, groups)

      expect(result.combatLog).toContain('An alarm trap has been triggered!')
    })

    it('should initialize empty command queue', () => {
      const groups = [createTestMonsterGroup()]
      const result = EncounterTriggerService.createAlarmCombatState(1, groups)

      expect(result.commandQueue).toEqual([])
    })

    it('should initialize empty status effect maps', () => {
      const groups = [createTestMonsterGroup()]
      const result = EncounterTriggerService.createAlarmCombatState(1, groups)

      expect(result.statusEffects).toBeInstanceOf(Map)
      expect(result.statusEffects.size).toBe(0)
      expect(result.acModifiers).toBeInstanceOf(Map)
      expect(result.acModifiers.size).toBe(0)
      expect(result.statusDurations).toBeInstanceOf(Map)
      expect(result.statusDurations.size).toBe(0)
    })
  })
})
