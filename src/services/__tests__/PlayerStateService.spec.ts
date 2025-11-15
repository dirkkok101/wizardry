import { PlayerStateService } from '../PlayerStateService'
import { Position } from '../../types/Dungeon'

describe('PlayerStateService', () => {
  describe('fromPosition', () => {
    it('creates PlayerState from Position facing NORTH', () => {
      const position: Position = { x: 5, y: 10, facing: 'NORTH' }

      const playerState = PlayerStateService.fromPosition(position)

      expect(playerState.gridX).toBe(5)
      expect(playerState.gridY).toBe(10)
      expect(playerState.angle).toBeCloseTo(0)
      expect(playerState.dirX).toBeCloseTo(0)
      expect(playerState.dirY).toBeCloseTo(1)
    })

    it('creates PlayerState from Position facing EAST', () => {
      const position: Position = { x: 3, y: 7, facing: 'EAST' }

      const playerState = PlayerStateService.fromPosition(position)

      expect(playerState.angle).toBeCloseTo(Math.PI / 2)
      expect(playerState.dirX).toBeCloseTo(1)
      expect(playerState.dirY).toBeCloseTo(0)
    })

    it('creates PlayerState from Position facing SOUTH', () => {
      const position: Position = { x: 8, y: 2, facing: 'SOUTH' }

      const playerState = PlayerStateService.fromPosition(position)

      expect(playerState.angle).toBeCloseTo(Math.PI)
      expect(playerState.dirX).toBeCloseTo(0)
      expect(playerState.dirY).toBeCloseTo(-1)
    })

    it('creates PlayerState from Position facing WEST', () => {
      const position: Position = { x: 1, y: 9, facing: 'WEST' }

      const playerState = PlayerStateService.fromPosition(position)

      expect(playerState.angle).toBeCloseTo((3 * Math.PI) / 2)
      expect(playerState.dirX).toBeCloseTo(-1)
      expect(playerState.dirY).toBeCloseTo(0)
    })

    it('pre-computes camera plane perpendicular to direction', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const playerState = PlayerStateService.fromPosition(position)

      // For 90° FOV, plane length should be tan(45°) = 1.0
      // Perpendicular to (0, +1) is (+1, 0) for leftward plane
      expect(playerState.planeX).toBeCloseTo(1)
      expect(playerState.planeY).toBeCloseTo(0)
    })
  })

  describe('updateDirectionVectors', () => {
    it('updates direction vectors when angle changes', () => {
      const playerState = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })

      // Turn 90° to the right (EAST)
      playerState.angle = Math.PI / 2
      const updated = PlayerStateService.updateDirectionVectors(playerState)

      expect(updated.dirX).toBeCloseTo(1)
      expect(updated.dirY).toBeCloseTo(0)
      expect(updated.planeX).toBeCloseTo(0)
      expect(updated.planeY).toBeCloseTo(1)
    })

    it('handles arbitrary angles', () => {
      const playerState = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })

      // Turn 45° (halfway between NORTH and EAST)
      playerState.angle = Math.PI / 4
      const updated = PlayerStateService.updateDirectionVectors(playerState)

      // At 45°, direction should be halfway between NORTH(0,+1) and EAST(1,0)
      expect(updated.dirX).toBeCloseTo(Math.sin(Math.PI / 4))
      expect(updated.dirY).toBeCloseTo(Math.cos(Math.PI / 4))
    })
  })
})
