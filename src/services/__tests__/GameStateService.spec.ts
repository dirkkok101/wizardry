import { TestBed } from '@angular/core/testing';
import { GameStateService } from '../GameStateService';
import { SaveService } from '../SaveService';
import { SceneType } from '../../types/SceneType';

/**
 * Wait for a condition to become true with polling
 * More reliable than arbitrary setTimeout delays
 */
async function waitFor(condition: () => boolean, timeout = 1000, interval = 10): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`waitFor timeout after ${timeout}ms`);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

describe('GameStateService', () => {
  let service: GameStateService;
  let saveService: SaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameStateService, SaveService]
    });
    service = TestBed.inject(GameStateService);
    saveService = TestBed.inject(SaveService);
  });

  describe('initialization', () => {
    it('starts with initial game state', () => {
      const state = service.state();
      expect(state.currentScene).toBe(SceneType.TITLE_SCREEN);
      expect(state.party).toBeDefined();
      expect(state.party.members).toEqual([]);
    });
  });

  describe('updateState', () => {
    it('updates state immutably', () => {
      const initialState = service.state();

      service.updateState(state => ({
        ...state,
        currentScene: SceneType.CASTLE_MENU
      }));

      const newState = service.state();
      expect(newState.currentScene).toBe(SceneType.CASTLE_MENU);
      expect(newState).not.toBe(initialState); // Different object
    });

    it('preserves other properties when updating', () => {
      service.updateState(state => ({
        ...state,
        currentScene: SceneType.CASTLE_MENU
      }));

      const state = service.state();
      expect(state.roster).toBeDefined();
      expect(state.currentScene).toBe(SceneType.CASTLE_MENU);
    });
  });

  describe('computed signals', () => {
    it('currentScene computed signal works', () => {
      service.updateState(state => ({
        ...state,
        currentScene: SceneType.CASTLE_MENU
      }));

      expect(service.currentScene()).toBe(SceneType.CASTLE_MENU);
    });

    it('isInMaze computed signal detects maze scenes', () => {
      // Not in maze initially
      expect(service.isInMaze()).toBe(false);

      // In maze
      service.updateState(state => ({
        ...state,
        currentScene: SceneType.MAZE
      }));
      expect(service.isInMaze()).toBe(true);

      // In combat
      service.updateState(state => ({
        ...state,
        currentScene: SceneType.COMBAT
      }));
      expect(service.isInMaze()).toBe(true);
    });
  });

  describe('resetState', () => {
    it('resets to initial state', () => {
      service.updateState(state => ({
        ...state,
        currentScene: SceneType.MAZE
      }));

      service.resetState();

      const state = service.state();
      expect(state.currentScene).toBe(SceneType.TITLE_SCREEN);
    });
  });

  describe('auto-load on initialization', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('auto-loads from slot 1 if save exists on service creation', async () => {
      // Setup: Create a saved game in slot 1
      const savedState = {
        ...service.state(),
        currentScene: SceneType.CASTLE_MENU,
        party: {
          ...service.state().party,
          members: ['auto-loaded-character'],
          gold: 5000
        }
      };
      await saveService.saveGame(savedState, 1);

      // Destroy and recreate service to trigger initialization
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [GameStateService, SaveService]
      });
      const newService = TestBed.inject(GameStateService);

      // Wait for async initialization - poll until state is loaded
      await waitFor(() => newService.state().party.members.includes('auto-loaded-character'));

      // Verify state was auto-loaded
      expect(newService.state().party.members).toContain('auto-loaded-character');
      expect(newService.state().party.gold).toBe(5000);
    });

    it('starts with new game if no save exists', async () => {
      // Clear any previous saves
      localStorage.clear();

      // Recreate service after clearing localStorage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [GameStateService, SaveService]
      });
      const freshService = TestBed.inject(GameStateService);

      // Wait for queueMicrotask and any async initialization to complete
      await waitFor(() => true, 100);

      // Verify starts with fresh state when no save
      expect(freshService.state().party.members).toEqual([]);
      expect(freshService.currentScene()).toBe(SceneType.TITLE_SCREEN);
    });
  });

  describe('character persistence across reload', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('persists created character after service reload', async () => {
      // Create a character in the roster
      const testCharacterId = 'test-character-123';
      service.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(testCharacterId, {
          id: testCharacterId,
          name: 'Test Hero',
          race: 'HUMAN' as any,
          class: 'FIGHTER' as any,
          alignment: 'GOOD' as any,
          age: 18,
          level: 1,
          experience: 0,
          maxHp: 10,
          hp: 10,
          vim: 5,
          strength: 15,
          intelligence: 10,
          piety: 10,
          vitality: 14,
          agility: 12,
          luck: 8,
          armorClass: 10,
          spellPoints: new Map(),
          knownSpells: new Set(),
          equipment: {
            weapon: null,
            armor: null,
            shield: null,
            helmet: null,
            gauntlet: null,
            accessory: null
          },
          inventory: [],
          status: 'OK' as any,
          gold: 100
        })
      }));

      // Wait for auto-save to complete (500ms debounce + margin)
      await new Promise(resolve => setTimeout(resolve, 600));

      // Simulate page reload by recreating service
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [GameStateService, SaveService]
      });
      const reloadedService = TestBed.inject(GameStateService);

      // Wait for auto-load to complete
      await waitFor(() => reloadedService.state().roster.has(testCharacterId));

      // Verify character persisted
      const loadedCharacter = reloadedService.state().roster.get(testCharacterId);
      expect(loadedCharacter).toBeDefined();
      expect(loadedCharacter?.name).toBe('Test Hero');
      expect(loadedCharacter?.gold).toBe(100);
    });
  });

  describe('loadGame (integration)', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('loads saved game state', async () => {
      // Setup: Create and save a custom state
      service.updateState(state => ({
        ...state,
        currentScene: SceneType.CASTLE_MENU,
        party: {
          ...state.party,
          members: ['character-1', 'character-2'],
          light: true
        }
      }));

      // Manually save the current state
      await saveService.saveGame(service.state());

      // Reset to initial state
      service.resetState();
      expect(service.currentScene()).toBe(SceneType.TITLE_SCREEN);

      // Load saved state
      await service.loadGame();

      // Verify loaded state
      const loadedState = service.state();
      expect(loadedState.currentScene).toBe(SceneType.CASTLE_MENU);
      expect(loadedState.party.members).toEqual(['character-1', 'character-2']);
      expect(loadedState.party.light).toBe(true);
    });

    it('handles loading when no save exists', async () => {
      const initialState = service.state();

      // Try to load non-existent save
      await service.loadGame();

      // State should remain unchanged
      expect(service.state()).toBe(initialState);
    });
  });
});
