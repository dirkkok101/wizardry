import { SaveService } from '../SaveService'
import { GameInitializationService } from '../GameInitializationService'

describe('SaveService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('checkForSaveData', () => {
    it('should return false when no save exists', async () => {
      const exists = await SaveService.checkForSaveData()
      expect(exists).toBe(false)
    })

    it('should return true when save exists', async () => {
      const gameState = GameInitializationService.createNewGame()
      await SaveService.saveGame(gameState)

      const exists = await SaveService.checkForSaveData()
      expect(exists).toBe(true)
    })
  })

  describe('saveGame', () => {
    it('should save game to localStorage', async () => {
      const gameState = GameInitializationService.createNewGame()

      await SaveService.saveGame(gameState)

      const saved = localStorage.getItem('wizardry_save')
      expect(saved).toBeTruthy()
    })
  })

  describe('loadGame', () => {
    it('should load game from localStorage', async () => {
      const gameState = GameInitializationService.createNewGame()
      await SaveService.saveGame(gameState)

      const loaded = await SaveService.loadGame()

      expect(loaded).toEqual(gameState)
    })

    it('should throw error when no save exists', async () => {
      await expect(
        SaveService.loadGame()
      ).rejects.toThrow('No save data found')
    })

    it('should throw error when save is corrupted', async () => {
      localStorage.setItem('wizardry_save', 'invalid json')

      await expect(
        SaveService.loadGame()
      ).rejects.toThrow('corrupted')
    })
  })

  describe('validateSaveData', () => {
    it('should return true for valid save', async () => {
      const gameState = GameInitializationService.createNewGame()
      await SaveService.saveGame(gameState)

      const isValid = await SaveService.validateSaveData()
      expect(isValid).toBe(true)
    })

    it('should return false for invalid save', async () => {
      localStorage.setItem('wizardry_save', 'invalid')

      const isValid = await SaveService.validateSaveData()
      expect(isValid).toBe(false)
    })
  })
})
