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

  describe('deleteSave', () => {
    it('should delete save from localStorage', async () => {
      const gameState = GameInitializationService.createNewGame()
      await service.saveGame(gameState, 1)

      expect(await service.hasSaveData(1)).toBe(true)

      await service.deleteSave(1)

      expect(await service.hasSaveData(1)).toBe(false)
    })
  })

  describe('getSlotMetadata', () => {
    it('should return null when slot is empty', async () => {
      const metadata = await service.getSlotMetadata(1)
      expect(metadata).toBeNull()
    })

    it('should return null when save data is corrupted (invalid JSON)', async () => {
      localStorage.setItem('wizardry_save_1', 'invalid json')
      const metadata = await service.getSlotMetadata(1)
      expect(metadata).toBeNull()
    })

    it('should return null when save data missing required fields', async () => {
      localStorage.setItem('wizardry_save_1', JSON.stringify({ incomplete: true }))
      const metadata = await service.getSlotMetadata(1)
      expect(metadata).toBeNull()
    })

    it('should return metadata for valid save', async () => {
      const gameState = GameInitializationService.createNewGame()
      await service.saveGame(gameState, 1)

      const metadata = await service.getSlotMetadata(1)

      expect(metadata).toBeDefined()
      expect(metadata?.slotId).toBe(1)
      expect(metadata?.partySize).toBe(0)
      expect(metadata?.partyGold).toBe(100) // Initial game state has 100 gold
      expect(metadata?.currentScene).toBeDefined()
    })
  })

  describe('loadGame - error handling', () => {
    it('should throw error for save with missing state field', async () => {
      localStorage.setItem('wizardry_save_1', JSON.stringify({ version: '1.0.0', timestamp: Date.now() }))

      await expect(
        service.loadGame()
      ).rejects.toThrow('corrupted')
    })

    it('should re-throw non-SyntaxError errors', async () => {
      // Save valid JSON but with a structure that triggers a different error
      localStorage.setItem('wizardry_save_1', JSON.stringify({ state: null, version: '1.0.0' }))

      await expect(
        service.loadGame()
      ).rejects.toThrow('corrupted')
    })
  })

  describe('schema version validation', () => {
    it('should save game with current schema version', async () => {
      const gameState = GameInitializationService.createNewGame()
      await service.saveGame(gameState, 1)

      const saved = localStorage.getItem('wizardry_save_1')
      const saveData = JSON.parse(saved!)

      expect(saveData.schemaVersion).toBe(2)
    })

    it('should automatically clear save with incompatible schema version', async () => {
      // Create a save with old schema version (v1)
      const gameState = GameInitializationService.createNewGame()
      const oldSaveData = {
        version: '1.0.0',
        schemaVersion: 1,
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries()),
          dungeon: {
            ...gameState.dungeon,
            visitedTiles: Array.from(gameState.dungeon.visitedTiles.entries())
          }
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(oldSaveData))

      // Spy on console.log to verify logging
      const consoleSpy = jest.spyOn(console, 'log')

      const loaded = await service.loadGame(1)

      // Should return null and clear the save
      expect(loaded).toBeNull()
      expect(await service.hasSaveData(1)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Save file schema mismatch (expected 2, got 1), clearing incompatible save'
      )

      consoleSpy.mockRestore()
    })

    it('should load save with current schema version', async () => {
      const gameState = GameInitializationService.createNewGame()
      await service.saveGame(gameState, 1)

      const loaded = await service.loadGame(1)

      expect(loaded).toEqual(gameState)
      expect(await service.hasSaveData(1)).toBe(true)
    })

    it('should handle missing schemaVersion field as incompatible', async () => {
      // Create a save without schemaVersion field (very old save)
      const gameState = GameInitializationService.createNewGame()
      const oldSaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries()),
          dungeon: {
            ...gameState.dungeon,
            visitedTiles: Array.from(gameState.dungeon.visitedTiles.entries())
          }
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(oldSaveData))

      const consoleSpy = jest.spyOn(console, 'log')

      const loaded = await service.loadGame(1)

      // Should return null and clear the save
      expect(loaded).toBeNull()
      expect(await service.hasSaveData(1)).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Save file schema mismatch (expected 2, got undefined), clearing incompatible save'
      )

      consoleSpy.mockRestore()
    })

    it('should return null metadata for saves with incompatible schema version', async () => {
      // Create a save with old schema version (v1)
      const gameState = GameInitializationService.createNewGame()
      const oldSaveData = {
        version: '1.0.0',
        schemaVersion: 1,
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries()),
          dungeon: {
            ...gameState.dungeon,
            visitedTiles: Array.from(gameState.dungeon.visitedTiles.entries())
          }
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(oldSaveData))

      const metadata = await service.getSlotMetadata(1)

      // Should return null for incompatible schema
      expect(metadata).toBeNull()
    })
  })
})
