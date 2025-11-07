import { NavigationService } from '../NavigationService'
import { GameState } from '../../types/GameState'
import { Position } from '../../types/Dungeon'

// Test helper
function createTestGameState(position: Position): GameState {
  return {
    dungeon: {
      currentLevel: 1,
      position,
      lightActive: false,
      lightRadius: 1,
      teleportCount: 0,
      visitedTiles: new Set(),
      defeatedEncounters: []
    }
  } as GameState
}

describe('NavigationService', () => {
  describe('moveForward', () => {
    it('increments y when facing north', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.y).toBe(11)
      expect(newState.dungeon!.position.x).toBe(10)
    })

    it('decrements y when facing south', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'SOUTH' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.y).toBe(9)
    })

    it('increments x when facing east', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.x).toBe(11)
    })

    it('decrements x when facing west', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.x).toBe(9)
    })

    it('wraps x from 19 to 0 when moving east', () => {
      const state = createTestGameState({ x: 19, y: 10, facing: 'EAST' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.x).toBe(0)
    })

    it('wraps x from 0 to 19 when moving west', () => {
      const state = createTestGameState({ x: 0, y: 10, facing: 'WEST' })
      const newState = NavigationService.moveForward(state)

      expect(newState.dungeon!.position.x).toBe(19)
    })
  })

  describe('turnLeft', () => {
    it('rotates from NORTH to WEST', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = NavigationService.turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('WEST')
    })

    it('rotates from WEST to SOUTH', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' })
      const newState = NavigationService.turnLeft(state)

      expect(newState.dungeon!.position.facing).toBe('SOUTH')
    })
  })

  describe('turnRight', () => {
    it('rotates from NORTH to EAST', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = NavigationService.turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('EAST')
    })

    it('rotates from EAST to SOUTH', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' })
      const newState = NavigationService.turnRight(state)

      expect(newState.dungeon!.position.facing).toBe('SOUTH')
    })
  })

  describe('strafeLeft', () => {
    it('moves west when facing north', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' })
      const newState = NavigationService.strafeLeft(state)

      expect(newState.dungeon!.position.x).toBe(9)
      expect(newState.dungeon!.position.y).toBe(10)
      expect(newState.dungeon!.position.facing).toBe('NORTH')
    })
  })
})
