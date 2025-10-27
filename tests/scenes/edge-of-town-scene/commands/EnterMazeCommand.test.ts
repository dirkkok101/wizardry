import { describe, it, expect } from 'vitest'
import { EnterMazeCommand } from '../../../../src/scenes/edge-of-town-scene/commands/EnterMazeCommand'
import { createTestCharacter, createGameState } from '../../../helpers/test-factories'
import { CharacterStatus } from '../../../../src/types/CharacterStatus'
import { SceneType } from '../../../../src/types/SceneType'

describe('EnterMazeCommand', () => {
  describe('validation', () => {
    it('should fail with empty party', async () => {
      const gameState = createGameState() // Empty party by default

      const context = {
        mode: 'READY' as const,
        gameState
      }

      const result = await EnterMazeCommand.execute(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('need a party')
    })

    it('should fail with dead party member', async () => {
      // Create characters with one dead
      const char1 = createTestCharacter({ name: 'Fighter', status: CharacterStatus.DEAD })
      const char2 = createTestCharacter({ name: 'Mage' })

      const gameState = createGameState()
      gameState.roster.set(char1.id, char1)
      gameState.roster.set(char2.id, char2)
      gameState.party.members = [char1.id, char2.id]

      const context = {
        mode: 'READY' as const,
        gameState
      }

      const result = await EnterMazeCommand.execute(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('dead')
    })

    it('should fail when already transitioning', async () => {
      const char1 = createTestCharacter()
      const gameState = createGameState()
      gameState.roster.set(char1.id, char1)
      gameState.party.members = [char1.id]

      const context = {
        mode: 'TRANSITIONING' as const,
        gameState
      }

      const result = await EnterMazeCommand.execute(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('in progress')
    })

    it('should succeed with healthy party', async () => {
      const char1 = createTestCharacter({ name: 'Fighter', status: CharacterStatus.GOOD })
      const char2 = createTestCharacter({ name: 'Mage', status: CharacterStatus.GOOD })

      const gameState = createGameState()
      gameState.roster.set(char1.id, char1)
      gameState.roster.set(char2.id, char2)
      gameState.party.members = [char1.id, char2.id]

      const context = {
        mode: 'READY' as const,
        gameState
      }

      const result = await EnterMazeCommand.execute(context)

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.CAMP)
    })
  })
})
