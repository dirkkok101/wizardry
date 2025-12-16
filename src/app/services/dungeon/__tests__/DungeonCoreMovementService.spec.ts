import { DungeonCoreMovementService, getFacingDelta, getNextPosition, isDungeonState } from '../DungeonCoreMovementService'
import { GameState } from '@models/GameState'
import { Position } from '@models/Dungeon'

// Test helper
function createTestGameState(position?: Position): GameState {
  return {
    dungeon: {
      currentLevel: 1,
      position: position || { x: 0, y: 0, facing: 'NORTH' },
      lightActive: false,
      lightRadius: 3,
      lightSpellType: undefined,
      lightDurationRemaining: undefined,
      inDarknessZone: false,
      teleportCount: 0,
      visitedTiles: new Set(),
      defeatedEncounters: [],
      unlockedDoors: new Set(),
      openDoors: new Set()
    }
  } as GameState
}

describe('DungeonCoreMovementService', () => {
  describe('isDungeonState', () => {
    it('returns true for valid dungeon state', () => {
      const state = createTestGameState()
      expect(isDungeonState(state.dungeon)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isDungeonState(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isDungeonState(undefined)).toBe(false)
    })
  })

  describe('getFacingDelta', () => {
    it('returns {0, 1} for NORTH', () => {
      const delta = getFacingDelta('NORTH')
      expect(delta).toEqual({ x: 0, y: 1 })
    })

    it('returns {0, -1} for SOUTH', () => {
      const delta = getFacingDelta('SOUTH')
      expect(delta).toEqual({ x: 0, y: -1 })
    })

    it('returns {1, 0} for EAST', () => {
      const delta = getFacingDelta('EAST')
      expect(delta).toEqual({ x: 1, y: 0 })
    })

    it('returns {-1, 0} for WEST', () => {
      const delta = getFacingDelta('WEST')
      expect(delta).toEqual({ x: -1, y: 0 })
    })
  })

  describe('getNextPosition', () => {
    it('increments y when facing north (forward)', () => {
      const pos = { x: 10, y: 10, facing: 'NORTH' as const }
      const next = getNextPosition(pos, 'NORTH', false)

      expect(next.y).toBe(11)
      expect(next.x).toBe(10)
      expect(next.facing).toBe('NORTH')
    })

    it('decrements y when facing south (forward)', () => {
      const pos = { x: 10, y: 10, facing: 'SOUTH' as const }
      const next = getNextPosition(pos, 'SOUTH', false)

      expect(next.y).toBe(9)
      expect(next.x).toBe(10)
    })

    it('increments x when facing east (forward)', () => {
      const pos = { x: 10, y: 10, facing: 'EAST' as const }
      const next = getNextPosition(pos, 'EAST', false)

      expect(next.x).toBe(11)
      expect(next.y).toBe(10)
    })

    it('decrements x when facing west (forward)', () => {
      const pos = { x: 10, y: 10, facing: 'WEST' as const }
      const next = getNextPosition(pos, 'WEST', false)

      expect(next.x).toBe(9)
      expect(next.y).toBe(10)
    })

    it('wraps x from 19 to 0 when moving east', () => {
      const pos = { x: 19, y: 10, facing: 'EAST' as const }
      const next = getNextPosition(pos, 'EAST', false)

      expect(next.x).toBe(0)
    })

    it('wraps x from 0 to 19 when moving west', () => {
      const pos = { x: 0, y: 10, facing: 'WEST' as const }
      const next = getNextPosition(pos, 'WEST', false)

      expect(next.x).toBe(19)
    })

    it('wraps y from 19 to 0 when moving north', () => {
      const pos = { x: 10, y: 19, facing: 'NORTH' as const }
      const next = getNextPosition(pos, 'NORTH', false)

      expect(next.y).toBe(0)
    })

    it('wraps y from 0 to 19 when moving south', () => {
      const pos = { x: 10, y: 0, facing: 'SOUTH' as const }
      const next = getNextPosition(pos, 'SOUTH', false)

      expect(next.y).toBe(19)
    })

    it('moves backward (north facing, backward movement)', () => {
      const pos = { x: 10, y: 10, facing: 'NORTH' as const }
      const next = getNextPosition(pos, 'NORTH', true)

      expect(next.y).toBe(9)
      expect(next.x).toBe(10)
    })

    it('moves backward (south facing, backward movement)', () => {
      const pos = { x: 10, y: 10, facing: 'SOUTH' as const }
      const next = getNextPosition(pos, 'SOUTH', true)

      expect(next.y).toBe(11)
      expect(next.x).toBe(10)
    })

    it('moves backward with wrapping', () => {
      const pos = { x: 10, y: 0, facing: 'NORTH' as const }
      const next = getNextPosition(pos, 'NORTH', true)

      expect(next.y).toBe(19)
    })
  })

  describe('rotateDirection', () => {
    it('rotates LEFT from NORTH to WEST', () => {
      expect(DungeonCoreMovementService.rotateDirection('NORTH', 'LEFT')).toBe('WEST')
    })

    it('rotates LEFT from WEST to SOUTH', () => {
      expect(DungeonCoreMovementService.rotateDirection('WEST', 'LEFT')).toBe('SOUTH')
    })

    it('rotates LEFT from SOUTH to EAST', () => {
      expect(DungeonCoreMovementService.rotateDirection('SOUTH', 'LEFT')).toBe('EAST')
    })

    it('rotates LEFT from EAST to NORTH', () => {
      expect(DungeonCoreMovementService.rotateDirection('EAST', 'LEFT')).toBe('NORTH')
    })

    it('rotates RIGHT from NORTH to EAST', () => {
      expect(DungeonCoreMovementService.rotateDirection('NORTH', 'RIGHT')).toBe('EAST')
    })

    it('rotates RIGHT from EAST to SOUTH', () => {
      expect(DungeonCoreMovementService.rotateDirection('EAST', 'RIGHT')).toBe('SOUTH')
    })

    it('rotates RIGHT from SOUTH to WEST', () => {
      expect(DungeonCoreMovementService.rotateDirection('SOUTH', 'RIGHT')).toBe('WEST')
    })

    it('rotates RIGHT from WEST to NORTH', () => {
      expect(DungeonCoreMovementService.rotateDirection('WEST', 'RIGHT')).toBe('NORTH')
    })
  })
})
