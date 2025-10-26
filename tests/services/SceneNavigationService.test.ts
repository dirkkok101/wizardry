import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SceneNavigationService } from '../../src/services/SceneNavigationService'
import { SceneType } from '../../src/types/SceneType'

describe('SceneNavigationService', () => {
  beforeEach(() => {
    SceneNavigationService.clearHistory()
  })

  describe('transitionTo', () => {
    it('should transition to new scene', async () => {
      await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)

      const currentScene = SceneNavigationService.getCurrentScene()
      expect(currentScene).toBe(SceneType.CASTLE_MENU)
    })

    it('should add scene to history', async () => {
      await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)

      const history = SceneNavigationService.getNavigationHistory()
      expect(history).toContain(SceneType.CASTLE_MENU)
    })

    it('should call onSceneEnter handler', async () => {
      const enterSpy = vi.fn()
      SceneNavigationService.onSceneEnter(SceneType.CASTLE_MENU, enterSpy)

      await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)

      expect(enterSpy).toHaveBeenCalled()
    })
  })

  describe('getCurrentScene', () => {
    it('should return TITLE_SCREEN initially', () => {
      const currentScene = SceneNavigationService.getCurrentScene()
      expect(currentScene).toBe(SceneType.TITLE_SCREEN)
    })
  })

  describe('canTransitionTo', () => {
    it('should allow valid transitions', () => {
      const canGo = SceneNavigationService.canTransitionTo(
        SceneType.CASTLE_MENU,
        SceneType.TITLE_SCREEN
      )
      expect(canGo).toBe(true)
    })
  })

  describe('goBack', () => {
    it('should navigate to previous scene', async () => {
      await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)
      await SceneNavigationService.transitionTo(SceneType.CAMP)

      await SceneNavigationService.goBack()

      const currentScene = SceneNavigationService.getCurrentScene()
      expect(currentScene).toBe(SceneType.CASTLE_MENU)
    })

    it('should throw error when no history', async () => {
      await expect(
        SceneNavigationService.goBack()
      ).rejects.toThrow('No history')
    })
  })

  describe('clearHistory', () => {
    it('should clear navigation history', async () => {
      await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)

      SceneNavigationService.clearHistory()

      const history = SceneNavigationService.getNavigationHistory()
      expect(history).toHaveLength(0)
    })
  })
})
