import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LeaveTrainingGroundsCommand } from '../../../../src/scenes/training-grounds-scene/commands/LeaveTrainingGroundsCommand'
import { SceneType } from '../../../../src/types/SceneType'
import { SaveService } from '../../../../src/services/SaveService'
import { SceneNavigationService } from '../../../../src/services/SceneNavigationService'

describe('LeaveTrainingGroundsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should fail if already transitioning', async () => {
      const result = await LeaveTrainingGroundsCommand.execute({ mode: 'TRANSITIONING' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Transition already in progress')
      expect(result.nextScene).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('should save game before navigation', async () => {
      const saveGameSpy = vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo').mockResolvedValue()

      await LeaveTrainingGroundsCommand.execute({ mode: 'READY' })

      expect(saveGameSpy).toHaveBeenCalled()
      expect(transitionSpy).toHaveBeenCalledWith(
        SceneType.CASTLE_MENU,
        expect.objectContaining({
          fadeTime: 300,
          data: { fromTrainingGrounds: true }
        })
      )
    })

    it('should transition to CASTLE_MENU scene', async () => {
      vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo').mockResolvedValue()

      const result = await LeaveTrainingGroundsCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.CASTLE_MENU)
      expect(transitionSpy).toHaveBeenCalledWith(SceneType.CASTLE_MENU, expect.any(Object))
    })

    it('should return error if save fails', async () => {
      vi.spyOn(SaveService, 'saveGame').mockRejectedValue(new Error('Save failed'))

      const result = await LeaveTrainingGroundsCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Save failed')
      expect(result.nextScene).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('should return error if navigation fails', async () => {
      vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      vi.spyOn(SceneNavigationService, 'transitionTo').mockRejectedValue(new Error('Navigation failed'))

      const result = await LeaveTrainingGroundsCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Navigation failed')
    })
  })
})
