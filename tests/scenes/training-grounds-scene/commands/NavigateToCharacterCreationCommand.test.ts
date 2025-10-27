import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NavigateToCharacterCreationCommand } from '../../../../src/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand'
import { SceneType } from '../../../../src/types/SceneType'
import { SceneNavigationService } from '../../../../src/services/SceneNavigationService'

// Mock SceneNavigationService
vi.mock('../../../../src/services/SceneNavigationService', () => ({
  SceneNavigationService: {
    transitionTo: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('NavigateToCharacterCreationCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should fail if already transitioning', async () => {
      const result = await NavigateToCharacterCreationCommand.execute({ mode: 'TRANSITIONING' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Transition already in progress')
      expect(result.nextScene).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('should navigate to CHARACTER_CREATION scene when ready', async () => {
      const result = await NavigateToCharacterCreationCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.CHARACTER_CREATION)
      expect(SceneNavigationService.transitionTo).toHaveBeenCalledWith(
        SceneType.CHARACTER_CREATION,
        { direction: 'fade' }
      )
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(SceneNavigationService.transitionTo).mockRejectedValueOnce(new Error('Navigation failed'))

      const result = await NavigateToCharacterCreationCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Navigation failed')
      expect(result.nextScene).toBe(SceneType.TRAINING_GROUNDS)
    })
  })
})
