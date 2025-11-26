import { GameInitializationService } from '../GameInitializationService'
import { SceneType } from '@types/SceneType'
import { RaceService } from '../RaceService'
import { ClassService } from '../ClassService'
import * as fs from 'fs'
import * as path from 'path'

describe('GameInitializationService', () => {
  beforeEach(() => {
    // Mock fetch to load real data files from data/ directory
    global.fetch = jest.fn((url: string) => {
      const urlPath = url.toString()

      // Extract filename from URL (e.g., '/assets/races/human.json' -> 'human.json')
      const match = urlPath.match(/\/(races|classes|spells|monsters|items)\/([^/]+\.json)/)
      if (match) {
        const [, directory, filename] = match
        const dataPath = path.join(__dirname, '../../../../data', directory, filename)

        try {
          const fileContent = fs.readFileSync(dataPath, 'utf-8')
          const jsonData = JSON.parse(fileContent)

          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(jsonData)
          } as Response)
        } catch (error) {
          return Promise.reject(new Error(`File not found: ${dataPath}`))
        }
      }

      return Promise.reject(new Error(`Not found: ${urlPath}`))
    }) as jest.Mock
  })

  describe('createNewGame', () => {
    it('should create new game with empty party', () => {
      const gameState = GameInitializationService.createNewGame()

      expect(gameState).toBeDefined()
      expect(gameState.currentScene).toBe(SceneType.TITLE_SCREEN)
      expect(gameState.roster).toBeDefined()
      expect(gameState.roster.size).toBe(0)
      expect(gameState.party).toBeDefined()
      expect(gameState.party.light).toBe(false)
      expect(gameState.party.members).toEqual([])
      expect(gameState.party.formation.frontRow).toEqual([])
      expect(gameState.party.formation.backRow).toEqual([])
      expect(gameState.party.position.level).toBe(1)
      expect(gameState.party.position.x).toBe(0)
      expect(gameState.party.position.y).toBe(0)
      expect(gameState.party.position.facing).toBe('NORTH')
      expect(gameState.dungeon).toBeDefined()
      expect(gameState.dungeon.currentLevel).toBe(1)
      expect(gameState.settings).toBeDefined()
      expect(gameState.settings.difficulty).toBe('NORMAL')
    })
  })

  describe('initializeGame', () => {
    it('should initialize RaceService and ClassService in parallel', async () => {
      await GameInitializationService.initializeGame()

      // Verify services are actually initialized
      expect(RaceService.isInitialized()).toBe(true)
      expect(ClassService.isInitialized()).toBe(true)
    })

    it('should handle initialization errors gracefully', async () => {
      // Save original methods
      const originalRaceInit = RaceService.initialize

      // Mock only for error test
      RaceService.initialize = jest.fn().mockRejectedValue(new Error('Failed to load race data'))

      await expect(GameInitializationService.initializeGame()).rejects.toThrow('Failed to load race data')

      // Restore original method
      RaceService.initialize = originalRaceInit
    })

    it('initializes party with zero gold', () => {
      const state = GameInitializationService.createNewGame()

      expect(state.party.gold).toBe(0)
    })
  })
})
