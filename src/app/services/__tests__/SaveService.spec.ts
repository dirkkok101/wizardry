import { TestBed } from '@angular/core/testing';
import { SaveService } from '../SaveService'
import { GameInitializationService } from '../GameInitializationService'
import { StorageQuotaError, StorageUnavailableError, SaveVersionError } from '../save/SaveErrors'

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
      expect(metadata?.partyGold).toBe(0) // Initial game state has 0 gold
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

    it('should migrate save with old schema version instead of clearing', async () => {
      // Create a save with old schema version (v1)
      const gameState = GameInitializationService.createNewGame()
      const oldSaveData = {
        version: '1.0.0',
        schemaVersion: 1,
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries()),
          // dungeon may be undefined when player starts in castle
          dungeon: gameState.dungeon ? {
            ...gameState.dungeon,
            visitedTiles: Array.from(gameState.dungeon.visitedTiles)
          } : undefined
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(oldSaveData))

      // Spy on console.log to verify logging
      const consoleSpy = jest.spyOn(console, 'log')

      const loaded = await service.loadGame(1)

      // Should migrate and load successfully (not return null)
      expect(loaded).not.toBeNull()
      expect(await service.hasSaveData(1)).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Save migrated from v1 to v2')
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

    it('should migrate save with missing schemaVersion field (treated as v1)', async () => {
      // Create a save without schemaVersion field (very old save)
      const gameState = GameInitializationService.createNewGame()
      const oldSaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries()),
          // dungeon may be undefined when player starts in castle
          dungeon: gameState.dungeon ? {
            ...gameState.dungeon,
            visitedTiles: Array.from(gameState.dungeon.visitedTiles)
          } : undefined
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(oldSaveData))

      const consoleSpy = jest.spyOn(console, 'log')

      const loaded = await service.loadGame(1)

      // Should migrate and load successfully (not return null)
      expect(loaded).not.toBeNull()
      expect(await service.hasSaveData(1)).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Save migrated from v1 to v2')
      )

      consoleSpy.mockRestore()
    })

    it('should return null metadata for saves with old schema version', async () => {
      // Create a save with old schema version (v1)
      // Note: getSlotMetadata doesn't run migrations, just checks version
      const gameState = GameInitializationService.createNewGame()
      const oldSaveData = {
        version: '1.0.0',
        schemaVersion: 1,
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries()),
          // dungeon may be undefined when player starts in castle
          dungeon: gameState.dungeon ? {
            ...gameState.dungeon,
            visitedTiles: Array.from(gameState.dungeon.visitedTiles)
          } : undefined
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(oldSaveData))

      const metadata = await service.getSlotMetadata(1)

      // Should return null for old schema (metadata doesn't run migrations)
      expect(metadata).toBeNull()
    })

    it('should throw SaveVersionError for future schema versions', async () => {
      // Create a save with future schema version (v99)
      const gameState = GameInitializationService.createNewGame()
      const futureSaveData = {
        version: '1.0.0',
        schemaVersion: 99,
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries())
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(futureSaveData))

      // Should throw SaveVersionError (cannot downgrade from future version)
      await expect(service.loadGame(1)).rejects.toThrow(SaveVersionError)
      await expect(service.loadGame(1)).rejects.toThrow('cannot downgrade')
    })
  })

  describe('encountersEnabled default behavior', () => {
    it('should always load with encountersEnabled=true even if save has it disabled', async () => {
      // Create a game state with encounters disabled
      const gameState = GameInitializationService.createNewGame()
      gameState.settings.encountersEnabled = false

      // Save it
      await service.saveGame(gameState, 1)

      // Load it back
      const loaded = await service.loadGame(1)

      // Should be forced to true
      expect(loaded?.settings.encountersEnabled).toBe(true)
    })

    it('should default to true for saves missing the encountersEnabled setting', async () => {
      // Create a save without the encountersEnabled setting (simulating old save format)
      const gameState = GameInitializationService.createNewGame()
      const saveData = {
        version: '1.0.0',
        schemaVersion: 2,
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries()),
          dungeon: gameState.dungeon ? {
            ...gameState.dungeon,
            visitedTiles: Array.from(gameState.dungeon.visitedTiles),
            unlockedDoors: Array.from(gameState.dungeon.unlockedDoors || []),
            openDoors: Array.from(gameState.dungeon.openDoors || [])
          } : undefined,
          settings: {
            difficulty: 'NORMAL',
            soundEnabled: true,
            musicEnabled: true
            // Missing encountersEnabled
          }
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(saveData))

      // Load it
      const loaded = await service.loadGame(1)

      // Should default to true
      expect(loaded?.settings.encountersEnabled).toBe(true)
    })
  })

  describe('exportGameState', () => {
    it('returns valid JSON string of current state', () => {
      const gameState = GameInitializationService.createNewGame()

      const json = service.exportGameState(gameState)

      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('includes roster, party, currentScene, settings', () => {
      const gameState = GameInitializationService.createNewGame()

      const json = service.exportGameState(gameState)
      const parsed = JSON.parse(json)

      expect(parsed.state.roster).toBeDefined()
      expect(parsed.state.party).toBeDefined()
      expect(parsed.state.currentScene).toBeDefined()
      expect(parsed.state.settings).toBeDefined()
    })

    it('includes version and schemaVersion', () => {
      const gameState = GameInitializationService.createNewGame()

      const json = service.exportGameState(gameState)
      const parsed = JSON.parse(json)

      expect(parsed.version).toBe('1.0.0')
      expect(parsed.schemaVersion).toBe(2)
    })

    it('serializes Maps as arrays', () => {
      const gameState = GameInitializationService.createNewGame()

      const json = service.exportGameState(gameState)
      const parsed = JSON.parse(json)

      // Roster Map should be serialized as array
      expect(Array.isArray(parsed.state.roster)).toBe(true)
    })
  })

  describe('importGameState', () => {
    it('returns success and state for valid JSON', () => {
      const gameState = GameInitializationService.createNewGame()
      const json = service.exportGameState(gameState)

      const result = service.importGameState(json)

      expect(result.success).toBe(true)
      expect(result.state).toBeDefined()
    })

    it('returns error for invalid JSON syntax', () => {
      const result = service.importGameState('not valid json {')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid JSON')
    })

    it('returns error for missing state field', () => {
      const json = JSON.stringify({ version: '1.0.0' })

      const result = service.importGameState(json)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required field')
    })

    it('returns error for missing roster', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        schemaVersion: 2,
        state: { party: { members: [] }, currentScene: 'CASTLE_MENU' }
      })

      const result = service.importGameState(json)

      expect(result.success).toBe(false)
      expect(result.error).toContain('roster')
    })

    it('returns error for missing party', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        schemaVersion: 2,
        state: { roster: [], currentScene: 'CASTLE_MENU' }
      })

      const result = service.importGameState(json)

      expect(result.success).toBe(false)
      expect(result.error).toContain('party')
    })

    it('returns error for missing currentScene', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        schemaVersion: 2,
        state: { roster: [], party: { members: [] } }
      })

      const result = service.importGameState(json)

      expect(result.success).toBe(false)
      expect(result.error).toContain('currentScene')
    })

    it('returns error for incompatible schema version', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        schemaVersion: 99,
        state: { roster: [], party: { members: [] }, currentScene: 'CASTLE_MENU' }
      })

      const result = service.importGameState(json)

      expect(result.success).toBe(false)
      expect(result.error).toContain('schema version')
    })

    it('deserializes Maps and Sets correctly', () => {
      const gameState = GameInitializationService.createNewGame()
      const json = service.exportGameState(gameState)

      const result = service.importGameState(json)

      expect(result.success).toBe(true)
      expect(result.state?.roster).toBeInstanceOf(Map)
    })

    it('round-trips a game state correctly', () => {
      const gameState = GameInitializationService.createNewGame()
      const json = service.exportGameState(gameState)

      const result = service.importGameState(json)

      expect(result.success).toBe(true)
      expect(result.state).toEqual(gameState)
    })
  })

  describe('combat state serialization', () => {
    it('should serialize and deserialize combat state Maps correctly', async () => {
      const gameState = GameInitializationService.createNewGame()

      // Create a mock combat state with populated Maps
      const combatState = {
        monsterGroups: [],
        commandQueue: [],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map<string, Set<string>>([
          ['monster-1', new Set(['ASLEEP', 'POISONED'])],
          ['char-1', new Set(['SILENCED'])]
        ]),
        acModifiers: new Map<string, number>([
          ['monster-1', -2],
          ['char-1', 3]
        ]),
        statusDurations: new Map<string, Map<string, number>>([
          ['monster-1', new Map([['ASLEEP', 3], ['POISONED', -1]])],
          ['char-1', new Map([['SILENCED', 2]])]
        ]),
        monstersDemoralized: false,
        surpriseState: 'party' as const
      }

      const stateWithCombat = {
        ...gameState,
        combat: combatState
      }

      // Save and load
      await service.saveGame(stateWithCombat, 1)
      const loaded = await service.loadGame(1)

      // Verify combat state Maps are properly reconstructed
      expect(loaded?.combat).toBeDefined()
      expect(loaded?.combat?.statusDurations).toBeInstanceOf(Map)
      expect(loaded?.combat?.statusEffects).toBeInstanceOf(Map)
      expect(loaded?.combat?.acModifiers).toBeInstanceOf(Map)

      // Verify nested Map values
      expect(loaded?.combat?.statusDurations.get('monster-1')).toBeInstanceOf(Map)
      expect(loaded?.combat?.statusDurations.get('monster-1')?.get('ASLEEP')).toBe(3)
      expect(loaded?.combat?.statusDurations.get('monster-1')?.get('POISONED')).toBe(-1)
      expect(loaded?.combat?.statusDurations.get('char-1')?.get('SILENCED')).toBe(2)

      // Verify Set values
      expect(loaded?.combat?.statusEffects.get('monster-1')).toBeInstanceOf(Set)
      expect(loaded?.combat?.statusEffects.get('monster-1')?.has('ASLEEP')).toBe(true)
      expect(loaded?.combat?.statusEffects.get('monster-1')?.has('POISONED')).toBe(true)
      expect(loaded?.combat?.statusEffects.get('char-1')?.has('SILENCED')).toBe(true)

      // Verify acModifiers
      expect(loaded?.combat?.acModifiers.get('monster-1')).toBe(-2)
      expect(loaded?.combat?.acModifiers.get('char-1')).toBe(3)
    })

    it('should handle undefined combat state', async () => {
      const gameState = GameInitializationService.createNewGame()
      // Ensure no combat state
      const stateWithoutCombat = { ...gameState, combat: undefined }

      await service.saveGame(stateWithoutCombat, 1)
      const loaded = await service.loadGame(1)

      expect(loaded?.combat).toBeUndefined()
    })

    it('should handle empty combat Maps', async () => {
      const gameState = GameInitializationService.createNewGame()

      const combatState = {
        monsterGroups: [],
        commandQueue: [],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map<string, Set<string>>(),
        acModifiers: new Map<string, number>(),
        statusDurations: new Map<string, Map<string, number>>(),
        monstersDemoralized: false,
        surpriseState: 'none' as const
      }

      const stateWithCombat = {
        ...gameState,
        combat: combatState
      }

      await service.saveGame(stateWithCombat, 1)
      const loaded = await service.loadGame(1)

      expect(loaded?.combat?.statusDurations).toBeInstanceOf(Map)
      expect(loaded?.combat?.statusDurations.size).toBe(0)
      expect(loaded?.combat?.statusEffects).toBeInstanceOf(Map)
      expect(loaded?.combat?.statusEffects.size).toBe(0)
      expect(loaded?.combat?.acModifiers).toBeInstanceOf(Map)
      expect(loaded?.combat?.acModifiers.size).toBe(0)
    })

    it('should handle old format combat state (plain objects instead of arrays)', async () => {
      // This tests backward compatibility with saves created before the Map serialization fix
      // Old saves had Maps serialized as plain objects {} instead of arrays
      const gameState = GameInitializationService.createNewGame()
      const saveData = {
        version: '1.0.0',
        schemaVersion: 2,
        timestamp: Date.now(),
        state: {
          ...gameState,
          roster: Array.from(gameState.roster.entries()),
          dungeon: gameState.dungeon ? {
            ...gameState.dungeon,
            visitedTiles: Array.from(gameState.dungeon.visitedTiles),
            unlockedDoors: Array.from(gameState.dungeon.unlockedDoors || []),
            openDoors: Array.from(gameState.dungeon.openDoors || [])
          } : undefined,
          // Old format: Maps became plain objects when JSON.stringify was called
          combat: {
            monsterGroups: [],
            commandQueue: [],
            roundNumber: 1,
            combatLog: [],
            canFlee: true,
            dungeonLevel: 1,
            statusEffects: {},      // Plain object, not array
            acModifiers: {},        // Plain object, not array
            statusDurations: {},    // Plain object, not array
            monstersDemoralized: false,
            surpriseState: 'none'
          }
        }
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(saveData))

      // Should NOT throw - should handle gracefully
      const loaded = await service.loadGame(1)

      // Should have loaded successfully with empty Maps
      expect(loaded).not.toBeNull()
      expect(loaded?.combat?.statusDurations).toBeInstanceOf(Map)
      expect(loaded?.combat?.statusEffects).toBeInstanceOf(Map)
      expect(loaded?.combat?.acModifiers).toBeInstanceOf(Map)
    })
  })

  describe('storage availability and quota handling', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should throw StorageUnavailableError when localStorage is not available', async () => {
      const gameState = GameInitializationService.createNewGame()

      // Mock localStorage to simulate unavailable storage (fails on test key)
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage unavailable')
      })

      await expect(service.saveGame(gameState, 1)).rejects.toThrow(StorageUnavailableError)
    })

    it('should throw StorageQuotaError when quota is exceeded', async () => {
      const gameState = GameInitializationService.createNewGame()

      // Mock localStorage.setItem to throw QuotaExceededError only on actual save
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string) => {
        // Allow the storage test key but fail on actual save
        if (key === '__storage_test__') {
          return
        }
        const error = new DOMException('Quota exceeded', 'QuotaExceededError')
        throw error
      })

      // Mock getItem to return 'test' for storage check (setItem mock doesn't store)
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
        if (key === '__storage_test__') {
          return 'test'
        }
        return null
      })

      await expect(service.saveGame(gameState, 1)).rejects.toThrow(StorageQuotaError)
    })

    it('should check storage availability before saving', async () => {
      const gameState = GameInitializationService.createNewGame()

      // Save should work when storage is available (no mocks)
      await expect(service.saveGame(gameState, 1)).resolves.not.toThrow()
    })
  })

  describe('checksum verification', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should include checksum when saving', async () => {
      const gameState = GameInitializationService.createNewGame()

      await service.saveGame(gameState, 1)

      const saved = localStorage.getItem('wizardry_save_1')
      const saveData = JSON.parse(saved!)

      // Should have checksum field
      expect(saveData.checksum).toBeDefined()
      expect(typeof saveData.checksum).toBe('string')
      expect(saveData.checksum.length).toBeGreaterThan(0)
    })

    it('should load successfully when checksum matches', async () => {
      const gameState = GameInitializationService.createNewGame()

      // Save game (includes checksum)
      await service.saveGame(gameState, 1)

      // Load should succeed
      const loaded = await service.loadGame(1)
      expect(loaded).not.toBeNull()
    })

    it('should load successfully when checksum is missing (old saves)', async () => {
      const gameState = GameInitializationService.createNewGame()

      // Manually create save without checksum (simulating old save)
      const oldSaveData = {
        version: '1.0.0',
        schemaVersion: 2,
        timestamp: Date.now(),
        state: service.exportGameState(gameState) ? JSON.parse(service.exportGameState(gameState)).state : {}
      }
      localStorage.setItem('wizardry_save_1', JSON.stringify(oldSaveData))

      // Load should succeed even without checksum (backward compatible)
      const loaded = await service.loadGame(1)
      expect(loaded).not.toBeNull()
    })

    it('should throw SaveCorruptionError when checksum does not match', async () => {
      const gameState = GameInitializationService.createNewGame()

      // Save game (includes checksum)
      await service.saveGame(gameState, 1)

      // Corrupt the saved data by modifying the state
      const saved = localStorage.getItem('wizardry_save_1')
      const saveData = JSON.parse(saved!)
      saveData.state.party.gold = 999999 // Modify data after checksum was computed
      localStorage.setItem('wizardry_save_1', JSON.stringify(saveData))

      // Load should fail with SaveCorruptionError
      const { SaveCorruptionError } = await import('../save/SaveErrors')
      await expect(service.loadGame(1)).rejects.toThrow(SaveCorruptionError)
      await expect(service.loadGame(1)).rejects.toThrow('checksum')
    })
  })
})
