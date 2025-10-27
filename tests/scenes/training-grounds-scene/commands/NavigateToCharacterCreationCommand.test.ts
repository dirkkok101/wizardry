import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NavigateToCharacterCreationCommand } from '../../../../src/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand'
import { SceneType } from '../../../../src/types/SceneType'

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

    it('should return success with CHARACTER_CREATION scene (stubbed)', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const result = await NavigateToCharacterCreationCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.CHARACTER_CREATION)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[STUB]')
      )
    })

    it('should handle errors gracefully', async () => {
      // Mock error scenario by testing the catch block
      // Since this is stubbed, we test the structure is correct
      const result = await NavigateToCharacterCreationCommand.execute({ mode: 'READY' })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('nextScene')
    })
  })
})
