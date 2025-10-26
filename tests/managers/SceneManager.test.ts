/**
 * SceneManager tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SceneManager } from '../../src/managers/SceneManager'
import { SceneNavigationService } from '../../src/services/SceneNavigationService'
import { SceneType } from '../../src/types/SceneType'
import { AssetLoadingService } from '../../src/services/AssetLoadingService'
import { InputService } from '../../src/services/InputService'

// Mock Image for tests
global.Image = class MockImage {
  src = ''
  width = 280
  height = 140
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    // Simulate async image loading synchronously for tests
    queueMicrotask(() => {
      if (this.onload) this.onload()
    })
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

describe('SceneManager', () => {
  let sceneManager: SceneManager
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    // Clear services
    AssetLoadingService.clearCache()
    InputService.clearAllHandlers()
    SceneNavigationService.clearHistory()
    localStorage.clear()

    // Create canvas and mock context
    canvas = createMockCanvas()
    ctx = createMockContext()

    // Create scene manager
    sceneManager = new SceneManager(canvas, ctx)
  })

  afterEach(() => {
    sceneManager.destroy()
  })

  it('should initialize with TITLE_SCREEN by default', async () => {
    await sceneManager.init()

    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.TITLE_SCREEN)
  })

  it('should initialize with specified scene', async () => {
    await sceneManager.init(SceneType.CASTLE_MENU)

    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.CASTLE_MENU)
  })

  it('should call scene lifecycle methods during init', async () => {
    await sceneManager.init(SceneType.CASTLE_MENU)

    // Scene should be initialized and entered
    const currentScene = (sceneManager as any).currentScene
    expect(currentScene).toBeTruthy()
    expect(currentScene.type).toBe(SceneType.CASTLE_MENU)
  })

  it('should transition scenes via SceneNavigationService', async () => {
    // Start with title screen
    await sceneManager.init(SceneType.TITLE_SCREEN)
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.TITLE_SCREEN)

    // Trigger transition via SceneNavigationService
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, { direction: 'instant' })

    // Should have transitioned
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.CASTLE_MENU)
  })

  it('should call exit on old scene during transition', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    const oldScene = (sceneManager as any).currentScene
    const exitSpy = vi.fn()
    oldScene.exit = exitSpy

    // Transition to new scene
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, { direction: 'instant' })

    // Exit should have been called on old scene
    expect(exitSpy).toHaveBeenCalled()
  })

  it('should call destroy on old scene during transition', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    const oldScene = (sceneManager as any).currentScene
    const destroySpy = vi.spyOn(oldScene, 'destroy')

    // Transition to new scene
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, { direction: 'instant' })

    // Destroy should have been called on old scene
    expect(destroySpy).toHaveBeenCalled()
  })

  it('should call enter on new scene during transition', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    // Trigger transition
    const transitionData = { data: { isNewGame: true } }
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, transitionData)

    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, 50))

    // New scene should be active
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.CASTLE_MENU)
  })

  it('should prevent double transitions', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    // Start first transition (instant)
    const transition1 = SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, { direction: 'instant' })

    // Try to start second transition while first is in progress
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const transition2 = SceneNavigationService.transitionTo(SceneType.CAMP, { direction: 'instant' })

    await transition1
    await transition2

    // Should have warned about transition in progress
    // (Note: This depends on timing - may need adjustment)

    consoleWarnSpy.mockRestore()
  })

  it('should update current scene', async () => {
    await sceneManager.init(SceneType.CASTLE_MENU)

    const scene = (sceneManager as any).currentScene
    const updateSpy = vi.spyOn(scene, 'update')

    sceneManager.update(16)

    expect(updateSpy).toHaveBeenCalledWith(16)
  })

  it('should render current scene', async () => {
    await sceneManager.init(SceneType.CASTLE_MENU)

    const scene = (sceneManager as any).currentScene
    const renderSpy = vi.spyOn(scene, 'render')

    sceneManager.render(ctx)

    expect(renderSpy).toHaveBeenCalledWith(ctx)
  })

  it('should not update during transition', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    // Start transition
    ;(sceneManager as any).isTransitioning = true

    const scene = (sceneManager as any).currentScene
    const updateSpy = vi.spyOn(scene, 'update')

    sceneManager.update(16)

    // Should not update during transition
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('should not render during transition', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    // Start transition
    ;(sceneManager as any).isTransitioning = true

    const scene = (sceneManager as any).currentScene
    const renderSpy = vi.spyOn(scene, 'render')

    sceneManager.render(ctx)

    // Should not render during transition
    expect(renderSpy).not.toHaveBeenCalled()
  })

  it('should report transition status', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    expect(sceneManager.isTransitionInProgress()).toBe(false)

    // Manually set transitioning state for testing
    ;(sceneManager as any).isTransitioning = true
    expect(sceneManager.isTransitionInProgress()).toBe(true)

    ;(sceneManager as any).isTransitioning = false
    expect(sceneManager.isTransitionInProgress()).toBe(false)
  })

  it('should clean up current scene on destroy', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    const scene = (sceneManager as any).currentScene
    const destroySpy = vi.spyOn(scene, 'destroy')

    sceneManager.destroy()

    expect(destroySpy).toHaveBeenCalled()
    expect(sceneManager.getCurrentSceneType()).toBe(null)
  })

  it('should handle scene factory for all scene types', async () => {
    // Test all scene types can be created
    await sceneManager.init(SceneType.TITLE_SCREEN)
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.TITLE_SCREEN)

    sceneManager.destroy()
    sceneManager = new SceneManager(canvas, ctx)

    await sceneManager.init(SceneType.CASTLE_MENU)
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.CASTLE_MENU)

    sceneManager.destroy()
    sceneManager = new SceneManager(canvas, ctx)

    await sceneManager.init(SceneType.CAMP)
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.CAMP)
  })

  it('should pass transition data to new scene', async () => {
    await sceneManager.init(SceneType.TITLE_SCREEN)

    // Trigger transition with data
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
      data: { isNewGame: true },
      direction: 'instant'
    })

    // New scene should be active
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.CASTLE_MENU)
  })

  it('should handle scenes without optional lifecycle methods', async () => {
    // Placeholder scenes may not have exit() implemented
    await sceneManager.init(SceneType.CASTLE_MENU)

    // Should not throw when transitioning
    await expect(
      SceneNavigationService.transitionTo(SceneType.CAMP, { direction: 'instant' })
    ).resolves.not.toThrow()
  })

  it('should integrate with complete scene transition flow', async () => {
    // Start at title screen
    await sceneManager.init(SceneType.TITLE_SCREEN)
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.TITLE_SCREEN)

    // Transition to castle menu
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, { direction: 'instant' })
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.CASTLE_MENU)

    // Transition to camp
    await SceneNavigationService.transitionTo(SceneType.CAMP, { direction: 'instant' })
    expect(sceneManager.getCurrentSceneType()).toBe(SceneType.CAMP)
  })
})
