import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NavigateToShopCommand } from '../../../../src/scenes/castle-menu-scene/commands/NavigateToShopCommand'
import { SceneType } from '../../../../src/types/SceneType'
import { SaveService } from '../../../../src/services/SaveService'
import { SceneNavigationService } from '../../../../src/services/SceneNavigationService'

describe('NavigateToShopCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should fail if already transitioning', async () => {
      const result = await NavigateToShopCommand.execute({ mode: 'TRANSITIONING' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Transition already in progress')
      expect(result.nextScene).toBe(SceneType.CASTLE_MENU)
    })

    it('should save game before navigation', async () => {
      const saveGameSpy = vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo').mockResolvedValue()

      await NavigateToShopCommand.execute({ mode: 'READY' })

      expect(saveGameSpy).toHaveBeenCalled()
      expect(transitionSpy).toHaveBeenCalledWith(
        SceneType.SHOP,
        expect.objectContaining({
          fadeTime: 300,
          data: { fromCastle: true }
        })
      )
    })

    it('should transition to SHOP scene', async () => {
      vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo').mockResolvedValue()

      const result = await NavigateToShopCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.SHOP)
      expect(transitionSpy).toHaveBeenCalledWith(SceneType.SHOP, expect.any(Object))
    })

    it('should return error if save fails', async () => {
      vi.spyOn(SaveService, 'saveGame').mockRejectedValue(new Error('Save failed'))

      const result = await NavigateToShopCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Save failed')
      expect(result.nextScene).toBe(SceneType.CASTLE_MENU)
    })

    it('should return error if navigation fails', async () => {
      vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      vi.spyOn(SceneNavigationService, 'transitionTo').mockRejectedValue(new Error('Navigation failed'))

      const result = await NavigateToShopCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Navigation failed')
    })
  })
})
