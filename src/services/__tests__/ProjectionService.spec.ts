import { ProjectionService } from '../ProjectionService'
import { PlayerStateService } from '../PlayerStateService'
import { Vector3 } from '../../types/Dungeon'

describe('ProjectionService', () => {
  describe('worldToView', () => {
    it('transforms world point to view space (camera at origin)', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' })
      const worldPoint: Vector3 = { x: 5, y: 0, z: 7 } // 2 tiles in front (north = +Y)

      const viewPoint = ProjectionService.worldToView(worldPoint, playerState)

      // Player at (5,5), point at (5,7) = 2 units north
      // In view space: camera looks down -Z, so point should be at z=-2
      expect(viewPoint.x).toBeCloseTo(0)
      expect(viewPoint.y).toBeCloseTo(-0.5) // y=0 with camera at 0.5 = -0.5
      expect(viewPoint.z).toBeCloseTo(-2)
    })

    it('handles rotation for EAST facing', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'EAST' })
      const worldPoint: Vector3 = { x: 7, y: 0, z: 5 } // 2 tiles east

      const viewPoint = ProjectionService.worldToView(worldPoint, playerState)

      expect(viewPoint.x).toBeCloseTo(0)
      expect(viewPoint.z).toBeCloseTo(-2)
    })

    it('preserves Y coordinate (height)', () => {
      const playerState = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })
      const worldPoint: Vector3 = { x: 0, y: 2.5, z: 1 } // 1 tile north

      const viewPoint = ProjectionService.worldToView(worldPoint, playerState)

      expect(viewPoint.y).toBeCloseTo(2.0) // 2.5 - 0.5 camera height
    })

    it('handles points to the left of player', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' })
      const worldPoint: Vector3 = { x: 4, y: 0, z: 7 } // 1 left, 2 forward (north)

      const viewPoint = ProjectionService.worldToView(worldPoint, playerState)

      expect(viewPoint.x).toBeCloseTo(-1)
      expect(viewPoint.z).toBeCloseTo(-2)
    })
  })

  describe('viewToScreen', () => {
    const config = { width: 600, height: 600 }

    it('projects point in front of camera to screen center', () => {
      const viewPoint: Vector3 = { x: 0, y: 0, z: -5 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.x).toBeCloseTo(300) // Center X
      expect(screenPoint!.y).toBeCloseTo(300) // Center Y
    })

    it('rejects points behind camera (z >= 0)', () => {
      const viewPoint: Vector3 = { x: 0, y: 0, z: 1 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).toBeNull()
    })

    it('projects point to the right correctly', () => {
      const viewPoint: Vector3 = { x: 1, y: 0, z: -2 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.x).toBeGreaterThan(300) // Right of center
    })

    it('projects point to the left correctly', () => {
      const viewPoint: Vector3 = { x: -1, y: 0, z: -2 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.x).toBeLessThan(300) // Left of center
    })

    it('projects point above horizon correctly', () => {
      const viewPoint: Vector3 = { x: 0, y: 1, z: -2 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.y).toBeLessThan(300) // Above center (Y inverted)
    })

    it('projects point below horizon correctly', () => {
      const viewPoint: Vector3 = { x: 0, y: -0.5, z: -2 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.y).toBeGreaterThan(300) // Below center
    })

    it('handles perspective division (closer = larger)', () => {
      const nearPoint: Vector3 = { x: 1, y: 0, z: -1 }
      const farPoint: Vector3 = { x: 1, y: 0, z: -4 }

      const nearScreen = ProjectionService.viewToScreen(nearPoint, config)
      const farScreen = ProjectionService.viewToScreen(farPoint, config)

      // Near point should be farther from center (larger on screen)
      const nearOffset = Math.abs(nearScreen!.x - 300)
      const farOffset = Math.abs(farScreen!.x - 300)
      expect(nearOffset).toBeGreaterThan(farOffset)
    })

    it('clips points outside frustum', () => {
      const viewPoint: Vector3 = { x: 10, y: 0, z: -1 } // Way off to the side

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      // Should be clipped (outside NDC bounds)
      expect(screenPoint).toBeNull()
    })
  })

  describe('projectPoint (full pipeline)', () => {
    const config = { width: 600, height: 600 }

    it('projects wall corner from world to screen', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' })
      const wallCorner: Vector3 = { x: 5.5, y: 1.0, z: 6.5 } // Top-right corner 1.5 tiles ahead (north)

      const screenPoint = ProjectionService.projectPoint(wallCorner, playerState, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.x).toBeGreaterThan(300) // Right of center
      expect(screenPoint!.y).toBeLessThan(300) // Above horizon
    })

    it('returns null for points behind player', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' })
      const behindPoint: Vector3 = { x: 5, y: 0, z: 3 } // Behind player (south of position)

      const screenPoint = ProjectionService.projectPoint(behindPoint, playerState, config)

      expect(screenPoint).toBeNull()
    })
  })
})
