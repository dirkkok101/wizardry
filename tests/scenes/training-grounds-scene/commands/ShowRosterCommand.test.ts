import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ShowRosterCommand } from '../../../../src/scenes/training-grounds-scene/commands/ShowRosterCommand'
import { SceneType } from '../../../../src/types/SceneType'
import { SceneNavigationService } from '../../../../src/services/SceneNavigationService'

vi.mock('../../../../src/services/SceneNavigationService', () => ({
  SceneNavigationService: {
    transitionTo: vi.fn().mockResolvedValue(undefined)
  }
}))

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

    it('should navigate to CHARACTER_LIST scene', async () => {
      const result = await ShowRosterCommand.execute({ mode: 'READY' })

      expect(SceneNavigationService.transitionTo).toHaveBeenCalledWith(
        SceneType.CHARACTER_LIST,
        expect.objectContaining({
          fadeTime: 300
        })
      )
      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.CHARACTER_LIST)
    })

    it('should pass correct title in transition data', async () => {
      await ShowRosterCommand.execute({ mode: 'READY' })

      const call = (SceneNavigationService.transitionTo as any).mock.calls[0]
      expect(call[1].data.title).toBe('CHARACTER ROSTER')
    })

    it('should pass correct empty message in transition data', async () => {
      await ShowRosterCommand.execute({ mode: 'READY' })

      const call = (SceneNavigationService.transitionTo as any).mock.calls[0]
      expect(call[1].data.emptyMessage).toBe('No characters in roster')
    })

    it('should pass null filter to show all characters', async () => {
      await ShowRosterCommand.execute({ mode: 'READY' })

      const call = (SceneNavigationService.transitionTo as any).mock.calls[0]
      expect(call[1].data.filter).toBeNull()
    })

    it('should pass returnTo as TRAINING_GROUNDS', async () => {
      await ShowRosterCommand.execute({ mode: 'READY' })

      const call = (SceneNavigationService.transitionTo as any).mock.calls[0]
      expect(call[1].data.returnTo).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('should pass onSelect callback that navigates to CHARACTER_INSPECTION', async () => {
      await ShowRosterCommand.execute({ mode: 'READY' })

      const call = (SceneNavigationService.transitionTo as any).mock.calls[0]
      const onSelect = call[1].data.onSelect
      expect(onSelect).toBeDefined()
      expect(typeof onSelect).toBe('function')

      // Call the onSelect callback with a mock character
      const mockCharacter = { id: 'test-char', name: 'Test' }
      onSelect(mockCharacter)

      // Should navigate to CHARACTER_INSPECTION
      expect(SceneNavigationService.transitionTo).toHaveBeenCalledWith(
        SceneType.CHARACTER_INSPECTION,
        expect.objectContaining({
          fadeTime: 300,
          data: expect.objectContaining({
            character: mockCharacter,
            mode: 'inspect',
            returnTo: SceneType.CHARACTER_LIST
          })
        })
      )
    })

    it('should handle errors gracefully', async () => {
      // Mock a failure scenario
      vi.mocked(SceneNavigationService.transitionTo).mockRejectedValueOnce(
        new Error('Navigation failed')
      )

      const result = await ShowRosterCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(false)
      expect(result.nextScene).toBe(SceneType.TRAINING_GROUNDS)
      expect(result.error).toBe('Navigation failed')
    })
  })
})
