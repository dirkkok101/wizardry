import { describe, it, expect, beforeEach } from 'vitest'
import { StartGameCommand } from '../../src/commands/StartGameCommand'
import { SceneType } from '../../src/types/SceneType'
import { SaveService } from '../../src/services/SaveService'
import { GameInitializationService } from '../../src/services/GameInitializationService'
import { SceneNavigationService } from '../../src/services/SceneNavigationService'

describe('StartGameCommand', () => {
  beforeEach(() => {
    localStorage.clear()
    SceneNavigationService.clearHistory()
  })

  describe('canExecute', () => {
    it('should return false when assets not loaded', () => {
      const canExecute = StartGameCommand.canExecute({ assetsLoaded: false })
      expect(canExecute).toBe(false)
    })

    it('should return true when assets loaded', () => {
      const canExecute = StartGameCommand.canExecute({ assetsLoaded: true })
      expect(canExecute).toBe(true)
    })
  })

  describe('execute - new game', () => {
    it('should create new game when no save exists', async () => {
      const result = await StartGameCommand.execute({ assetsLoaded: true })

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.CASTLE_MENU)
      expect(result.metadata?.isNewGame).toBe(true)
      expect(result.gameState).toBeDefined()
    })

    it('should transition to CASTLE_MENU', async () => {
      await StartGameCommand.execute({ assetsLoaded: true })

      const currentScene = SceneNavigationService.getCurrentScene()
      expect(currentScene).toBe(SceneType.CASTLE_MENU)
    })
  })

  describe('execute - load game', () => {
    it('should load existing save', async () => {
      // Create a save
      const gameState = GameInitializationService.createNewGame()
      await SaveService.saveGame(gameState)

      const result = await StartGameCommand.execute({ assetsLoaded: true })

      expect(result.success).toBe(true)
      expect(result.metadata?.isNewGame).toBe(false)
      expect(result.nextScene).toBe(SceneType.CASTLE_MENU)
    })

    it('should transition to CAMP when party in maze', async () => {
      // Create save with party in maze
      const gameState = GameInitializationService.createNewGame()
      gameState.party.inMaze = true
      await SaveService.saveGame(gameState)

      const result = await StartGameCommand.execute({ assetsLoaded: true })

      expect(result.nextScene).toBe(SceneType.CAMP)
    })
  })

  describe('execute - corrupted save', () => {
    it('should create new game when save corrupted', async () => {
      localStorage.setItem('wizardry_save', 'corrupted data')

      const result = await StartGameCommand.execute({ assetsLoaded: true })

      expect(result.success).toBe(true)
      expect(result.metadata?.isNewGame).toBe(true)
      expect(result.nextScene).toBe(SceneType.CASTLE_MENU)
    })
  })

  describe('execute - validation', () => {
    it('should fail when assets not loaded', async () => {
      const result = await StartGameCommand.execute({ assetsLoaded: false })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Assets not loaded')
      expect(result.nextScene).toBe(SceneType.TITLE_SCREEN)
    })
  })
})
