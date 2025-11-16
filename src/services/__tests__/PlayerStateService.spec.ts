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

  describe('rotation at position (0,0)', () => {
    describe('starting from NORTH', () => {
      const startPos = { x: 0, y: 0, facing: 'NORTH' as const }

      it('maintains camera position when turning right to EAST', () => {
        const north = PlayerStateService.fromPosition(startPos)
        const east = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'EAST' })

        // Grid position unchanged
        expect(east.gridX).toBe(0)
        expect(east.gridY).toBe(0)

        // Camera position (gridX+0.5, gridY+0.5) unchanged
        expect(east.gridX + 0.5).toBe(0.5)
        expect(east.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to EAST
        expect(east.dirX).toBeCloseTo(1)
        expect(east.dirY).toBeCloseTo(0)
        expect(east.planeX).toBeCloseTo(0)
        expect(east.planeY).toBeCloseTo(1)
        expect(east.angle).toBeCloseTo(Math.PI / 2)
      })

      it('maintains camera position when turning left to WEST', () => {
        const north = PlayerStateService.fromPosition(startPos)
        const west = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'WEST' })

        // Grid position unchanged
        expect(west.gridX).toBe(0)
        expect(west.gridY).toBe(0)

        // Camera position unchanged
        expect(west.gridX + 0.5).toBe(0.5)
        expect(west.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to WEST
        expect(west.dirX).toBeCloseTo(-1)
        expect(west.dirY).toBeCloseTo(0)
        expect(west.planeX).toBeCloseTo(0)
        expect(west.planeY).toBeCloseTo(-1)
        expect(west.angle).toBeCloseTo((3 * Math.PI) / 2)
      })

      it('maintains camera position when turning around to SOUTH', () => {
        const north = PlayerStateService.fromPosition(startPos)
        const south = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'SOUTH' })

        // Grid position unchanged
        expect(south.gridX).toBe(0)
        expect(south.gridY).toBe(0)

        // Camera position unchanged
        expect(south.gridX + 0.5).toBe(0.5)
        expect(south.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to SOUTH
        expect(south.dirX).toBeCloseTo(0)
        expect(south.dirY).toBeCloseTo(-1)
        expect(south.planeX).toBeCloseTo(-1)
        expect(south.planeY).toBeCloseTo(0)
        expect(south.angle).toBeCloseTo(Math.PI)
      })
    })

    describe('starting from EAST', () => {
      const startPos = { x: 0, y: 0, facing: 'EAST' as const }

      it('maintains camera position when turning right to SOUTH', () => {
        const east = PlayerStateService.fromPosition(startPos)
        const south = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'SOUTH' })

        // Grid position unchanged
        expect(south.gridX).toBe(0)
        expect(south.gridY).toBe(0)

        // Camera position unchanged
        expect(south.gridX + 0.5).toBe(0.5)
        expect(south.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to SOUTH
        expect(south.dirX).toBeCloseTo(0)
        expect(south.dirY).toBeCloseTo(-1)
        expect(south.planeX).toBeCloseTo(-1)
        expect(south.planeY).toBeCloseTo(0)
        expect(south.angle).toBeCloseTo(Math.PI)
      })

      it('maintains camera position when turning left to NORTH', () => {
        const east = PlayerStateService.fromPosition(startPos)
        const north = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })

        // Grid position unchanged
        expect(north.gridX).toBe(0)
        expect(north.gridY).toBe(0)

        // Camera position unchanged
        expect(north.gridX + 0.5).toBe(0.5)
        expect(north.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to NORTH
        expect(north.dirX).toBeCloseTo(0)
        expect(north.dirY).toBeCloseTo(1)
        expect(north.planeX).toBeCloseTo(1)
        expect(north.planeY).toBeCloseTo(0)
        expect(north.angle).toBeCloseTo(0)
      })

      it('maintains camera position when turning around to WEST', () => {
        const east = PlayerStateService.fromPosition(startPos)
        const west = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'WEST' })

        // Grid position unchanged
        expect(west.gridX).toBe(0)
        expect(west.gridY).toBe(0)

        // Camera position unchanged
        expect(west.gridX + 0.5).toBe(0.5)
        expect(west.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to WEST
        expect(west.dirX).toBeCloseTo(-1)
        expect(west.dirY).toBeCloseTo(0)
        expect(west.planeX).toBeCloseTo(0)
        expect(west.planeY).toBeCloseTo(-1)
        expect(west.angle).toBeCloseTo((3 * Math.PI) / 2)
      })
    })
  })
})
