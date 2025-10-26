import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CastleMenuScene } from '../../src/scenes/castle-menu-scene/CastleMenuScene'
import { SceneType } from '../../src/types/SceneType'

// Mock AssetLoadingService to prevent actual image loading in tests
vi.mock('../../src/services/AssetLoadingService', () => ({
  AssetLoadingService: {
    loadCastleMenuAssets: vi.fn().mockResolvedValue({
      width: 640,
      height: 480,
      src: 'fake-image.png'
    } as HTMLImageElement)
  }
}))

describe('CastleMenuScene', () => {
  let scene: CastleMenuScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new CastleMenuScene()
  })

  afterEach(() => {
    scene.destroy?.()
  })

  it('should have correct scene type', () => {
    expect(scene.type).toBe(SceneType.CASTLE_MENU)
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

    it('should have 5 buttons', async () => {
      await scene.init(canvas, ctx)
      expect(scene['buttons'].length).toBe(5)
    })

    it('should have all required navigation keys', async () => {
      await scene.init(canvas, ctx)
      const keys = scene['buttons'].map(btn => btn.key)
      expect(keys).toContain('g')
      expect(keys).toContain('t')
      expect(keys).toContain('b')
      expect(keys).toContain('a')
      expect(keys).toContain('e')
    })

    it('should use abbreviated button labels', async () => {
      await scene.init(canvas, ctx)
      const labels = scene['buttons'].map(btn => btn.text)
      expect(labels).toEqual(['(G)TAVERN', '(T)EMPLE', '(B)SHOP', '(A)INN', '(E)DGE'])
    })

    it('should position buttons horizontally at bottom', async () => {
      await scene.init(canvas, ctx)
      const buttons = scene['buttons']

      // All buttons at same Y position
      const buttonY = buttons[0].y
      buttons.forEach(btn => expect(btn.y).toBe(buttonY))

      // Buttons should be near bottom (within 100px of canvas height)
      expect(buttonY).toBeGreaterThan(canvas.height - 100)

      // Buttons spaced 20px apart
      for (let i = 0; i < buttons.length - 1; i++) {
        const spacing = buttons[i + 1].x - (buttons[i].x + buttons[i].width)
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
  })

  describe('render', () => {
    it('should clear screen with background color', async () => {
      await scene.init(canvas, ctx)
      const fillRectSpy = vi.spyOn(ctx, 'fillRect')

      scene.render(ctx)

      expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 800, 600)
    })

    it('should render title text', async () => {
      await scene.init(canvas, ctx)
      const fillTextSpy = vi.spyOn(ctx, 'fillText')

      scene.render(ctx)

      expect(fillTextSpy).toHaveBeenCalledWith('CASTLE', expect.any(Number), expect.any(Number))
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
