import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SceneManager } from '../../src/managers/SceneManager'
import { TitleScreenScene } from '../../src/scenes/title-screen-scene/TitleScreenScene'
import { SceneNavigationService } from '../../src/services/SceneNavigationService'
import { SaveService } from '../../src/services/SaveService'
import { AssetLoadingService } from '../../src/services/AssetLoadingService'
import { InputService } from '../../src/services/InputService'
import { SceneType } from '../../src/types/SceneType'

// Mock Canvas and Image for tests
global.Image = class MockImage {
  src = ''
  onload: (() => void) | null = null
  constructor() {
    setTimeout(() => this.onload?.(), 10)
  }
} as any

// Helper to create mock canvas
function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  return canvas
}

// Helper to wait for async state changes
async function waitFor(condition: () => boolean, timeout = 2000): Promise<void> {
  const startTime = Date.now()
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

describe('Title Screen Flow - Integration Tests', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  let sceneManager: SceneManager

  beforeEach(() => {
    // Clear all state
    localStorage.clear()
    SceneNavigationService.clearHistory()
    AssetLoadingService.clearCache()
    InputService.clearAllHandlers()
    InputService.setInputEnabled(true)

    // Create fresh canvas
    canvas = createMockCanvas()
    ctx = canvas.getContext('2d')!
  })

  afterEach(() => {
    if (sceneManager) {
      sceneManager.destroy()
    }
  })

  describe('New Game Flow', () => {
    it('should complete full flow from title screen to castle menu', async () => {
      // Initialize SceneManager with TitleScreen
      sceneManager = new SceneManager(canvas, ctx)
      await sceneManager.init()

      // 1. Verify we're on title screen
      expect(SceneNavigationService.getCurrentScene()).toBe(SceneType.TITLE_SCREEN)

      // 2. Wait for assets to load
      await waitFor(() => AssetLoadingService.isAssetLoaded('title_bitmap'))

      // 3. Verify title screen is ready
      const titleScene = (sceneManager as any).currentScene as TitleScreenScene
      await waitFor(() => (titleScene as any).mode === 'READY')
      expect((titleScene as any).mode).toBe('READY')

      // 4. Trigger start game
      const startPromise = (titleScene as any).handleStart()

      // 5. Wait for transition to complete
      await waitFor(() => SceneNavigationService.getCurrentScene() === SceneType.CASTLE_MENU, 3000)

      await startPromise

      // 6. Verify we're now on Castle Menu
      expect(SceneNavigationService.getCurrentScene()).toBe(SceneType.CASTLE_MENU)
    })
  })

  describe('Load Game Flow', () => {
    it('should load save with party in maze and go to camp', async () => {
      // Create save with party IN maze
      localStorage.setItem('wizardry_save', JSON.stringify({
        version: '1.0.0',
        timestamp: Date.now(),
        state: {
          party: { inMaze: true },
          gold: 100
        }
      }))

      sceneManager = new SceneManager(canvas, ctx)
      await sceneManager.init()

      // Wait for ready state
      await waitFor(() => AssetLoadingService.isAssetLoaded('title_bitmap'))
      const titleScene = (sceneManager as any).currentScene as TitleScreenScene
      await waitFor(() => (titleScene as any).mode === 'READY')

      // Start game
      await (titleScene as any).handleStart()

      // Wait for transition
      await waitFor(() => SceneNavigationService.getCurrentScene() === SceneType.CAMP, 3000)

      // Should load to camp (in maze)
      expect(SceneNavigationService.getCurrentScene()).toBe(SceneType.CAMP)
    })
  })

  describe('Corrupted Save Handling', () => {
    it('should create new game when save corrupted', async () => {
      // Create corrupted save
      localStorage.setItem('wizardry_save', 'invalid json {{{')

      sceneManager = new SceneManager(canvas, ctx)
      await sceneManager.init()

      // Wait for ready state
      await waitFor(() => AssetLoadingService.isAssetLoaded('title_bitmap'))
      const titleScene = (sceneManager as any).currentScene as TitleScreenScene
      await waitFor(() => (titleScene as any).mode === 'READY')

      // Start game
      await (titleScene as any).handleStart()

      // Wait for transition
      await waitFor(() => SceneNavigationService.getCurrentScene() === SceneType.CASTLE_MENU, 3000)

      // Should create new game and go to castle menu
      expect(SceneNavigationService.getCurrentScene()).toBe(SceneType.CASTLE_MENU)
    })
  })
})
