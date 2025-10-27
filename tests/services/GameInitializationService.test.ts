import { describe, it, expect } from 'vitest'
import { GameInitializationService } from '../../src/services/GameInitializationService'
import { SceneType } from '../../src/types/SceneType'

describe('GameInitializationService', () => {
  describe('createNewGame', () => {
    it('should create new game with empty party', () => {
      const gameState = GameInitializationService.createNewGame()

      expect(gameState).toBeDefined()
      expect(gameState.currentScene).toBe(SceneType.TITLE_SCREEN)
      expect(gameState.roster).toBeDefined()
      expect(gameState.roster.size).toBe(0)
      expect(gameState.party).toBeDefined()
      expect(gameState.party.inMaze).toBe(false)
      expect(gameState.party.members).toEqual([])
      expect(gameState.party.formation.frontRow).toEqual([])
      expect(gameState.party.formation.backRow).toEqual([])
      expect(gameState.dungeon).toBeDefined()
      expect(gameState.dungeon.currentLevel).toBe(1)
      expect(gameState.settings).toBeDefined()
      expect(gameState.settings.difficulty).toBe('NORMAL')
    })
  })
})
