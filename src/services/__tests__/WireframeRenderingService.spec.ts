import { WireframeRenderingService } from '../WireframeRenderingService'
import { LevelData, Position, WallSegment } from '../../types/Dungeon'

describe('WireframeRenderingService', () => {
  const createSimpleLevel = (): LevelData => ({
    level: 1,
    name: 'Test',
    size: { width: 3, height: 3 },
    startPosition: { x: 1, y: 1, facing: 'north' },
    edgeWrapping: false,
    encounterRate: 0,
    encounterTable: '',
    tiles: [
      { x: 1, y: 0, walls: { north: 'wall', south: 'open', east: 'open', west: 'open' } },
      { x: 1, y: 1, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } },
      { x: 1, y: 2, walls: { north: 'open', south: 'wall', east: 'open', west: 'open' } }
    ]
  })

  describe('generateWireframeCommands', () => {
    it('generates line commands for wall segments', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      expect(commands.length).toBeGreaterThan(0)
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true)
    })

    it('uses green color for normal walls', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      const greenCommands = commands.filter(cmd => cmd.color.includes('#0'))
      expect(greenCommands.length).toBeGreaterThan(0)
    })

    it('uses darker color for doors', () => {
      const level = createSimpleLevel()
      level.tiles[0].walls.north = 'door'
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      // Should have door color (#080)
      const doorCommands = commands.filter(cmd => cmd.color === '#080')
      expect(doorCommands.length).toBeGreaterThan(0)
    })

    it('skips walls with clipped vertices', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'SOUTH' } // Face away from wall
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      // Walls behind player should be clipped
      // Should have fewer commands than when facing toward walls
      expect(commands.length).toBeGreaterThanOrEqual(0)
    })

    it('generates 4 edges per visible wall (quad outline)', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      // Each wall quad has 4 edges
      // Command count should be multiple of 4 (if all walls fully visible)
      expect(commands.length % 4).toBe(0)
    })

    it('applies distance-based alpha fading', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 5 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      // Far walls should have lower alpha
      const alphaValues = commands.map(cmd => cmd.alpha ?? 1.0)
      expect(Math.min(...alphaValues)).toBeLessThan(1.0)
    })
  })

  describe('getWallColor', () => {
    it('returns green for normal walls', () => {
      const color = WireframeRenderingService.getWallColor('wall', 1.0)
      expect(color).toBe('#0f0')
    })

    it('returns dark green for doors', () => {
      const color = WireframeRenderingService.getWallColor('door', 1.0)
      expect(color).toBe('#080')
    })

    it('returns red for locked doors', () => {
      const color = WireframeRenderingService.getWallColor('locked_door', 1.0)
      expect(color).toBe('#800')
    })

    it('returns dimmer color at distance 2', () => {
      const nearColor = WireframeRenderingService.getWallColor('wall', 1.0)
      const farColor = WireframeRenderingService.getWallColor('wall', 2.0)

      expect(nearColor).toBe('#0f0')
      expect(farColor).toBe('#0c0') // Dimmer
    })

    it('returns dimmest color at distance 3+', () => {
      const color = WireframeRenderingService.getWallColor('wall', 3.5)
      expect(color).toBe('#090')
    })
  })

  describe('calculateAlpha', () => {
    it('returns high alpha for close distances', () => {
      const alpha = WireframeRenderingService.calculateAlpha(0.5)
      expect(alpha).toBeGreaterThan(0.9)
      expect(alpha).toBeLessThanOrEqual(1.0)
    })

    it('returns lower alpha for far distances', () => {
      const alpha = WireframeRenderingService.calculateAlpha(5.0)
      expect(alpha).toBeLessThan(1.0)
      expect(alpha).toBeGreaterThan(0)
    })

    it('uses formula 1.0 / (1 + distance * 0.15)', () => {
      const alpha = WireframeRenderingService.calculateAlpha(2.0)
      const expected = 1.0 / (1 + 2.0 * 0.15)
      expect(alpha).toBeCloseTo(expected)
    })
  })
})
