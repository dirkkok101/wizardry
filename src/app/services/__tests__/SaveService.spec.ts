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
})
