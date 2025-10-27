import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TrainingGroundsScene } from '../../src/scenes/training-grounds-scene/TrainingGroundsScene'
import { SceneType } from '../../src/types/SceneType'

// Mock AssetLoadingService to prevent actual image loading in tests
vi.mock('../../src/services/AssetLoadingService', () => ({
  AssetLoadingService: {
    loadTrainingGroundsAssets: vi.fn().mockResolvedValue({
      width: 640,
      height: 480,
      src: 'fake-training-grounds.png'
    } as HTMLImageElement)
  }
}))

describe('TrainingGroundsScene', () => {
  let scene: TrainingGroundsScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new TrainingGroundsScene()
  })

  afterEach(() => {
    scene.destroy?.()
  })

  it('should have correct scene type', () => {
    expect(scene.type).toBe(SceneType.TRAINING_GROUNDS)
  })

  describe('init', () => {
    it('should initialize canvas reference', async () => {
      await scene.init(canvas, ctx)
      expect(scene['canvas']).toBe(canvas)
    })

    it('should create input manager', async () => {
      await scene.init(canvas, ctx)
      expect(scene['inputManager']).toBeDefined()
    })

    it('should have 4 buttons', async () => {
      await scene.init(canvas, ctx)
      expect(scene['buttons'].length).toBe(4)
    })

    it('should have all required navigation keys', async () => {
      await scene.init(canvas, ctx)
      const keys = scene['buttons'].map(btn => btn.key)
      expect(keys).toContain('c') // Create
      expect(keys).toContain('i') // Inspect
      expect(keys).toContain('r') // Roster
      expect(keys).toContain('b') // Back
    })

    it('should have correct button labels', async () => {
      await scene.init(canvas, ctx)
      const labels = scene['buttons'].map(btn => btn.text)
      expect(labels).toEqual(['(C)REATE', '(I)NSPECT', '(R)OSTER', '(B)ACK'])
    })

    it('should position buttons vertically centered', async () => {
      await scene.init(canvas, ctx)
      const buttons = scene['buttons']

      // All buttons at same X position (centered)
      const buttonX = buttons[0].x
      buttons.forEach(btn => expect(btn.x).toBe(buttonX))

      // Buttons should be centered horizontally
      const expectedX = (canvas.width - buttons[0].width) / 2
      expect(buttonX).toBe(expectedX)

      // Buttons spaced vertically with 20px spacing
      for (let i = 0; i < buttons.length - 1; i++) {
        const spacing = buttons[i + 1].y - (buttons[i].y + buttons[i].height)
        expect(spacing).toBe(20)
      }
    })
  })

  describe('enter', () => {
    it('should set mode to READY', async () => {
      await scene.init(canvas, ctx)
      scene.enter()
      expect(scene['mode']).toBe('READY')
    })
  })

  describe('update', () => {
    it('should update hover states', async () => {
      await scene.init(canvas, ctx)
      scene['mouseX'] = 400
      scene['mouseY'] = 250

      scene.update(16)

      // Should have updated hover states based on mouse position
      expect(scene['buttons'].some(btn => btn.hovered !== undefined)).toBe(true)
    })

    it('should update button hover states on mouse movement', async () => {
      await scene.init(canvas, ctx)
      const buttons = scene['buttons']

      // Initially no buttons hovered
      expect(buttons.every(btn => !btn.hovered)).toBe(true)

      // Move mouse over first button
      scene['mouseX'] = buttons[0].x + 10
      scene['mouseY'] = buttons[0].y + 10
      scene.update(16)

      // First button should be hovered
      expect(buttons[0].hovered).toBe(true)
      expect(buttons.slice(1).every(btn => !btn.hovered)).toBe(true)

      // Move mouse to second button
      scene['mouseX'] = buttons[1].x + 10
      scene['mouseY'] = buttons[1].y + 10
      scene.update(16)

      // Second button should be hovered, first should not
      expect(buttons[0].hovered).toBe(false)
      expect(buttons[1].hovered).toBe(true)
    })
  })

  describe('render', () => {
    it('should clear screen with background color', async () => {
      await scene.init(canvas, ctx)
      const fillRectSpy = vi.spyOn(ctx, 'fillRect')

      scene.render(ctx)

      expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 800, 600)
    })

    it('should render buttons using ButtonRenderer', async () => {
      await scene.init(canvas, ctx)
      const fillRectSpy = vi.spyOn(ctx, 'fillRect')

      scene.render(ctx)

      // Should clear screen and render buttons (multiple fillRect calls)
      expect(fillRectSpy).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should destroy input manager', async () => {
      await scene.init(canvas, ctx)
      const destroySpy = vi.spyOn(scene['inputManager'], 'destroy')

      scene.destroy?.()

      expect(destroySpy).toHaveBeenCalled()
    })
  })
})
