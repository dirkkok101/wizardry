import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NavigateToCharacterListCommand } from '../../../../src/scenes/training-grounds-scene/commands/NavigateToCharacterListCommand'
import { SceneType } from '../../../../src/types/SceneType'

describe('NavigateToCharacterListCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should fail if already transitioning', async () => {
      const result = await NavigateToCharacterListCommand.execute({ mode: 'TRANSITIONING' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Transition already in progress')
      expect(result.nextScene).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('should return success with CHARACTER_LIST scene (stubbed)', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const result = await NavigateToCharacterListCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.CHARACTER_LIST)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[STUB]')
      )
    })

    it('should handle errors gracefully', async () => {
      const result = await NavigateToCharacterListCommand.execute({ mode: 'READY' })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('nextScene')
    })
  })
})
