import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShowRosterCommand } from '../../../../src/scenes/training-grounds-scene/commands/ShowRosterCommand'
import { SceneType } from '../../../../src/types/SceneType'

describe('ShowRosterCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should fail if already transitioning', async () => {
      const result = await ShowRosterCommand.execute({ mode: 'TRANSITIONING' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Transition already in progress')
      expect(result.nextScene).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('should return success with CHARACTER_LIST scene (stubbed)', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const result = await ShowRosterCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.CHARACTER_LIST)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[STUB]')
      )
    })

    it('should handle errors gracefully', async () => {
      const result = await ShowRosterCommand.execute({ mode: 'READY' })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('nextScene')
    })
  })
})
