import { TestBed } from '@angular/core/testing';
import { GameStateService } from '../GameStateService';
import { SaveService } from '../SaveService';

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
      expect(state.currentScene).toBe('TITLE_SCREEN');
      expect(state.party).toBeDefined();
      expect(state.party.members).toEqual([]);
    });
  });

  describe('updateState', () => {
    it('updates state immutably', () => {
      const initialState = service.state();

      service.updateState(state => ({
        ...state,
        currentScene: 'CASTLE_MENU'
      }));

      const newState = service.state();
      expect(newState.currentScene).toBe('CASTLE_MENU');
      expect(newState).not.toBe(initialState); // Different object
    });

    it('preserves other properties when updating', () => {
      service.updateState(state => ({
        ...state,
        currentScene: 'TAVERN'
      }));

      const state = service.state();
      expect(state.roster).toBeDefined();
      expect(state.currentScene).toBe('TAVERN');
    });
  });

  describe('computed signals', () => {
    it('currentScene computed signal works', () => {
      service.updateState(state => ({
        ...state,
        currentScene: 'EDGE_OF_TOWN'
      }));

      expect(service.currentScene()).toBe('EDGE_OF_TOWN');
    });

    it('isInMaze computed signal detects maze scenes', () => {
      // Not in maze initially
      expect(service.isInMaze()).toBe(false);

      // In maze
      service.updateState(state => ({
        ...state,
        currentScene: 'MAZE'
      }));
      expect(service.isInMaze()).toBe(true);

      // In combat
      service.updateState(state => ({
        ...state,
        currentScene: 'COMBAT'
      }));
      expect(service.isInMaze()).toBe(true);
    });
  });

  describe('resetState', () => {
    it('resets to initial state', () => {
      service.updateState(state => ({
        ...state,
        currentScene: 'MAZE'
      }));

      service.resetState();

      const state = service.state();
      expect(state.currentScene).toBe('TITLE_SCREEN');
    });
  });
});
