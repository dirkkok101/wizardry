import { DungeonRotationService, turnLeft, turnRight, rotateDirection } from '../DungeonRotationService'
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

describe('DungeonRotationService', () => {
  describe('rotateDirection', () => {
    it('rotates LEFT from NORTH to WEST', () => {
      expect(rotateDirection('NORTH', 'LEFT')).toBe('WEST')
    })

    it('rotates LEFT from WEST to SOUTH', () => {
      expect(rotateDirection('WEST', 'LEFT')).toBe('SOUTH')
    })

    it('rotates LEFT from SOUTH to EAST', () => {
      expect(rotateDirection('SOUTH', 'LEFT')).toBe('EAST')
    })

    it('rotates LEFT from EAST to NORTH', () => {
      expect(rotateDirection('EAST', 'LEFT')).toBe('NORTH')
    })

    it('rotates RIGHT from NORTH to EAST', () => {
      expect(rotateDirection('NORTH', 'RIGHT')).toBe('EAST')
    })

    it('rotates RIGHT from EAST to SOUTH', () => {
      expect(rotateDirection('EAST', 'RIGHT')).toBe('SOUTH')
    })

    it('rotates RIGHT from SOUTH to WEST', () => {
      expect(rotateDirection('SOUTH', 'RIGHT')).toBe('WEST')
    })

    it('rotates RIGHT from WEST to NORTH', () => {
      expect(rotateDirection('WEST', 'RIGHT')).toBe('NORTH')
    })
  })

  describe('turnLeft', () => {
    it('rotates from NORTH to WEST', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('WEST')
    })

    it('rotates from WEST to SOUTH', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' })
      const newState = turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('SOUTH')
    })

    it('rotates from SOUTH to EAST', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'SOUTH' })
      const newState = turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('EAST')
    })

    it('rotates from EAST to NORTH', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' })
      const newState = turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('NORTH')
    })

    it('preserves position when turning', () => {
      const state = createTestGameState({ x: 5, y: 7, facing: 'NORTH' })
      const newState = turnLeft(state)

      expect(newState.dungeon!.position.x).toBe(5)
      expect(newState.dungeon!.position.y).toBe(7)
    })
  })

  describe('turnRight', () => {
    it('rotates from NORTH to EAST', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('EAST')
    })

    it('rotates from EAST to SOUTH', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' })
      const newState = turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('SOUTH')
    })

    it('rotates from SOUTH to WEST', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'SOUTH' })
      const newState = turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('WEST')
    })

    it('rotates from WEST to NORTH', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' })
      const newState = turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('NORTH')
    })

    it('preserves position when turning', () => {
      const state = createTestGameState({ x: 3, y: 9, facing: 'EAST' })
      const newState = turnRight(state)

      expect(newState.dungeon!.position.x).toBe(3)
      expect(newState.dungeon!.position.y).toBe(9)
    })
  })

  describe('DungeonRotationService static methods', () => {
    it('exposes turnLeft as static method', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = DungeonRotationService.turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('WEST')
    })

    it('exposes turnRight as static method', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = DungeonRotationService.turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('EAST')
    })
  })
})
