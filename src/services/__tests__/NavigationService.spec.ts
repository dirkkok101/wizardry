import { NavigationService } from '../NavigationService'
import { GameState } from '../../types/GameState'
import { Position, TileData } from '../../types/Dungeon'

// Test helper
function createTestGameState(position?: Position): GameState {
  return {
    dungeon: {
      currentLevel: 1,
      position: position || { x: 0, y: 0, facing: 'NORTH' },
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

  describe('handleSpecialTile', () => {
    describe('teleporter', () => {
      it('teleports party to destination', () => {
        const tile: TileData = {
          x: 1,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: 'teleporter',
          destination: { x: 5, y: 5 }
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 1, y: 0, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        const result = NavigationService.handleSpecialTile(state, tile)

        expect(result.dungeon!.position.x).toBe(5)
        expect(result.dungeon!.position.y).toBe(5)
        expect(result.dungeon!.teleportCount).toBe(1)
      })

      it('prevents infinite teleport loops after 3 consecutive', () => {
        const tile: TileData = {
          x: 1,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: 'teleporter',
          destination: { x: 5, y: 5 }
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 1, y: 0, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 3,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        const result = NavigationService.handleSpecialTile(state, tile)

        // Should NOT teleport
        expect(result.dungeon!.position.x).toBe(1)
        expect(result.dungeon!.position.y).toBe(0)
        expect(result.dungeon!.teleportCount).toBe(3)
      })

      it('resets teleport count on non-teleporter tile', () => {
        const tile: TileData = {
          x: 1,
          y: 0,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' }
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 1, y: 0, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 2,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        const result = NavigationService.handleSpecialTile(state, tile)

        expect(result.dungeon!.teleportCount).toBe(0)
      })
    })

    describe('spinner', () => {
      it('randomizes party facing direction', () => {
        const tile: TileData = {
          x: 5,
          y: 5,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: 'spinner'
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 5, y: 5, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        const result = NavigationService.handleSpecialTile(state, tile)

        // Facing should be one of the four directions
        expect(['NORTH', 'SOUTH', 'EAST', 'WEST']).toContain(result.dungeon!.position.facing)
      })

      it('can change facing to different direction', () => {
        const tile: TileData = {
          x: 5,
          y: 5,
          walls: { north: 'open', south: 'open', east: 'open', west: 'open' },
          type: 'spinner'
        }

        const state: GameState = {
          ...createTestGameState(),
          dungeon: {
            currentLevel: 1,
            position: { x: 5, y: 5, facing: 'NORTH' },
            lightActive: false,
            lightRadius: 0,
            teleportCount: 0,
            visitedTiles: new Set(),
            defeatedEncounters: []
          }
        }

        // Run spinner 10 times, at least one should change facing
        let facingChanged = false
        for (let i = 0; i < 10; i++) {
          const result = NavigationService.handleSpecialTile(state, tile)
          if (result.dungeon!.position.facing !== 'NORTH') {
            facingChanged = true
            break
          }
        }

        expect(facingChanged).toBe(true)
      })
    })
  })
})
