import { describe, it, expect } from 'vitest'
import { GameInitializationService } from '../../src/services/GameInitializationService'

describe('GameInitializationService', () => {
  describe('createNewGame', () => {
    it('should create new game with empty party', () => {
      const gameState = GameInitializationService.createNewGame()

      expect(gameState).toBeDefined()
      expect(gameState.party).toBeDefined()
      expect(gameState.party.inMaze).toBe(false)
      expect(gameState.gold).toBe(0)
    })
  })
})
