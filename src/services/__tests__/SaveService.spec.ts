import { TestBed } from '@angular/core/testing';
import { SaveService } from '../SaveService'
import { GameInitializationService } from '../GameInitializationService'

describe('SaveService', () => {
  let service: SaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SaveService]
    });
    service = TestBed.inject(SaveService);
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('checkForSaveData', () => {
    it('should return false when no save exists', async () => {
      const exists = await service.checkForSaveData()
      expect(exists).toBe(false)
    })

    it('should return true when save exists', async () => {
      const gameState = GameInitializationService.createNewGame()
      await service.saveGame(gameState)

      const exists = await service.checkForSaveData()
      expect(exists).toBe(true)
    })
  })

  describe('saveGame', () => {
    it('should save game to localStorage', async () => {
      const gameState = GameInitializationService.createNewGame()

      await service.saveGame(gameState)

      const saved = localStorage.getItem('wizardry_save_1')
      expect(saved).toBeTruthy()
    })
  })

  describe('loadGame', () => {
    it('should load game from localStorage', async () => {
      const gameState = GameInitializationService.createNewGame()
      await service.saveGame(gameState)

      const loaded = await service.loadGame()

      expect(loaded).toEqual(gameState)
    })

    it('should return null when no save exists', async () => {
      const loaded = await service.loadGame()
      expect(loaded).toBeNull()
    })

    it('should throw error when save is corrupted', async () => {
      localStorage.setItem('wizardry_save_1', 'invalid json')

      await expect(
        service.loadGame()
      ).rejects.toThrow('corrupted')
    })
  })

  describe('validateSaveData', () => {
    it('should return true for valid save', async () => {
      const gameState = GameInitializationService.createNewGame()
      await service.saveGame(gameState)

      const isValid = await service.validateSaveData()
      expect(isValid).toBe(true)
    })

    it('should return false for invalid save', async () => {
      localStorage.setItem('wizardry_save_1', 'invalid')

      const isValid = await service.validateSaveData()
      expect(isValid).toBe(false)
    })
  })

  describe('hasSaveData', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('returns false when no save exists', async () => {
      const result = await service.hasSaveData(1);
      expect(result).toBe(false);
    });

    it('returns true when save exists', async () => {
      const gameState = GameInitializationService.createNewGame();
      await service.saveGame(gameState, 1);

      const result = await service.hasSaveData(1);
      expect(result).toBe(true);
    });

    it('checks specific save slot', async () => {
      const gameState = GameInitializationService.createNewGame();
      await service.saveGame(gameState, 1);

      expect(await service.hasSaveData(1)).toBe(true);
      expect(await service.hasSaveData(2)).toBe(false);
    });
  })
})
