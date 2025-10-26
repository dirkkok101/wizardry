/**
 * TitleScreenScene tests - Canvas-based testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TitleScreenScene } from '../../../src/scenes/title-screen-scene/TitleScreenScene'
import { AssetLoadingService } from '../../../src/services/AssetLoadingService'
import { InputService } from '../../../src/services/InputService'
import { SaveService } from '../../../src/services/SaveService'
import { StartGameCommand } from '../../../src/scenes/title-screen-scene/commands/StartGameCommand'

// Mock Image for tests
global.Image = class MockImage {
  src = ''
  width = 280
  height = 140
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 10)
  }
} as any

// Mock canvas and context
function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  return canvas
}

function createMockContext(): CanvasRenderingContext2D {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    imageSmoothingEnabled: true,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn()
  } as unknown as CanvasRenderingContext2D
  return ctx
}

describe('TitleScreenScene', () => {
  let scene: TitleScreenScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    // Clear services
    AssetLoadingService.clearCache()
    InputService.clearAllHandlers()
    localStorage.clear()

    // Create canvas and mock context
    canvas = createMockCanvas()
    ctx = createMockContext()

    // Create scene
    scene = new TitleScreenScene()
  })

  afterEach(() => {
    scene.destroy()
  })

  it('should initialize with LOADING state', () => {
    // Check state before init completes
    const initPromise = scene.init(canvas, ctx)

    // Scene should be in LOADING mode initially
    expect((scene as any).mode).toBe('LOADING')
    expect((scene as any).assetsLoaded).toBe(false)

    return initPromise
  })

  it('should load title bitmap during init', async () => {
    await scene.init(canvas, ctx)

    // Wait for asset loading
    await new Promise(resolve => setTimeout(resolve, 50))

    // Title bitmap should be loaded
    expect((scene as any).titleBitmap).toBeTruthy()
    expect((scene as any).titleBitmap).toBeInstanceOf(Image)
  })

  it('should transition to READY state after assets load', async () => {
    await scene.init(canvas, ctx)

    // Wait for all assets to load
    await new Promise(resolve => {
      const check = () => {
        if ((scene as any).mode === 'READY') {
          resolve(true)
        } else {
          setTimeout(check, 10)
        }
      }
      check()
    })

    expect((scene as any).mode).toBe('READY')
    expect((scene as any).assetsLoaded).toBe(true)
    expect((scene as any).button.disabled).toBe(false)
    expect((scene as any).button.text).toBe('(S)TART')
  })

  it('should detect save data', async () => {
    // Create mock save data
    localStorage.setItem('wizardry_save', JSON.stringify({
      version: '1.0.0',
      timestamp: Date.now(),
      state: { party: { inMaze: false } }
    }))

    await scene.init(canvas, ctx)

    // Wait for save detection
    await new Promise(resolve => setTimeout(resolve, 50))

    expect((scene as any).saveDataDetected).toBe(true)
  })

  it('should register keyboard handler when ready', async () => {
    const onKeyPressSpy = vi.spyOn(InputService, 'onKeyPress')

    await scene.init(canvas, ctx)

    // Wait for READY state
    await new Promise(resolve => {
      const check = () => {
        if ((scene as any).mode === 'READY') {
          resolve(true)
        } else {
          setTimeout(check, 10)
        }
      }
      check()
    })

    // Should have registered S key handler
    expect(onKeyPressSpy).toHaveBeenCalledWith('s', expect.any(Function))
  })

  it('should handle button click when ready', async () => {
    const executeSpy = vi.spyOn(StartGameCommand, 'execute')
    executeSpy.mockResolvedValue({
      success: true,
      nextScene: 'CASTLE_MENU' as any,
      metadata: { isNewGame: true }
    })

    await scene.init(canvas, ctx)

    // Wait for READY state
    await new Promise(resolve => {
      const check = () => {
        if ((scene as any).mode === 'READY') {
          resolve(true)
        } else {
          setTimeout(check, 10)
        }
      }
      check()
    })

    // Simulate button click
    await (scene as any).handleStart()

    expect(executeSpy).toHaveBeenCalledWith({
      assetsLoaded: true,
      saveDataDetected: false,
      mode: 'TRANSITIONING'
    })
  })

  it('should not allow start when assets not loaded', () => {
    const executeSpy = vi.spyOn(StartGameCommand, 'execute')

    // Don't wait for init - start while still loading
    scene.init(canvas, ctx)

    // Try to start immediately (assets not loaded yet)
    ;(scene as any).handleStart()

    // Should not execute command
    expect(executeSpy).not.toHaveBeenCalled()
  })

  it('should not allow start when already transitioning', async () => {
    const executeSpy = vi.spyOn(StartGameCommand, 'execute')
    executeSpy.mockResolvedValue({
      success: true,
      nextScene: 'CASTLE_MENU' as any,
      metadata: { isNewGame: true }
    })

    await scene.init(canvas, ctx)

    // Wait for READY state
    await new Promise(resolve => {
      const check = () => {
        if ((scene as any).mode === 'READY') {
          resolve(true)
        } else {
          setTimeout(check, 10)
        }
      }
      check()
    })

    // Start once
    const promise1 = (scene as any).handleStart()

    // Try to start again immediately
    await (scene as any).handleStart()

    await promise1

    // Should only have been called once
    expect(executeSpy).toHaveBeenCalledTimes(1)
  })

  it('should render without errors', async () => {
    await scene.init(canvas, ctx)

    // Should not throw
    expect(() => scene.render(ctx)).not.toThrow()
  })

  it('should update animation state', async () => {
    await scene.init(canvas, ctx)

    const initialPulseTime = (scene as any).pulseTime

    // Update with 16ms delta (60fps)
    scene.update(16)

    const updatedPulseTime = (scene as any).pulseTime

    expect(updatedPulseTime).toBeGreaterThan(initialPulseTime)
  })

  it('should detect button hover', async () => {
    await scene.init(canvas, ctx)

    // Wait for READY state
    await new Promise(resolve => {
      const check = () => {
        if ((scene as any).mode === 'READY') {
          resolve(true)
        } else {
          setTimeout(check, 10)
        }
      }
      check()
    })

    // Set mouse position over button
    const button = (scene as any).button
    ;(scene as any).mouseX = button.x + button.width / 2
    ;(scene as any).mouseY = button.y + button.height / 2

    // Update to check hover
    scene.update(16)

    expect((scene as any).button.hovered).toBe(true)
  })

  it('should clean up event handlers on destroy', async () => {
    await scene.init(canvas, ctx)

    // Wait for READY state
    await new Promise(resolve => {
      const check = () => {
        if ((scene as any).mode === 'READY') {
          resolve(true)
        } else {
          setTimeout(check, 10)
        }
      }
      check()
    })

    // Should have unsubscribe function
    expect((scene as any).unsubscribeKeyPress).toBeTruthy()

    // Destroy should call it
    scene.destroy()

    // After destroy, unsubscribe should have been called
    // (we can't easily verify this, but we can check it doesn't throw)
    expect(() => scene.destroy()).not.toThrow()
  })

  it('should handle asset loading errors gracefully', async () => {
    // Mock a failing image load
    global.Image = class MockImage {
      src = ''
      width = 280
      height = 140
      onload: (() => void) | null = null
      onerror: ((e: any) => void) | null = null

      constructor() {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Load failed'))
        }, 10)
      }
    } as any

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    scene = new TitleScreenScene()
    await scene.init(canvas, ctx)

    // Wait a bit for error to occur
    await new Promise(resolve => setTimeout(resolve, 50))

    // Should have logged error
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
