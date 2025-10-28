import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CastleMenuScene } from '../../src/scenes/castle-menu-scene/CastleMenuScene'
import { SceneType } from '../../src/types/SceneType'
import { NavigateToEdgeOfTownCommand } from '../../src/scenes/castle-menu-scene/commands/NavigateToEdgeOfTownCommand'
import { SaveService } from '../../src/services/SaveService'
import { SceneNavigationService } from '../../src/services/SceneNavigationService'

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

      // First button should start with 20px margin from left
      expect(buttons[0].x).toBe(20)

      // Last button should end with 20px margin from right
      const lastButton = buttons[buttons.length - 1]
      expect(lastButton.x + lastButton.width).toBe(canvas.width - 20)
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

  describe('navigation', () => {
    it('should pass READY mode to navigation commands, not TRANSITIONING', async () => {
      await scene.init(canvas, ctx)
      scene.enter()

      // Mock services to prevent actual navigation
      vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      vi.spyOn(SceneNavigationService, 'transitionTo').mockResolvedValue()

      // Spy on the command to check what context it receives
      const commandSpy = vi.spyOn(NavigateToEdgeOfTownCommand, 'execute')

      // Trigger navigation for Edge of Town
      await (scene as any).handleNavigation('e')

      // Command should have been called with mode: 'READY'
      // BUG: Currently it receives mode: 'TRANSITIONING' which causes it to fail
      expect(commandSpy).toHaveBeenCalledWith({ mode: 'READY' })
    })
  })
})
