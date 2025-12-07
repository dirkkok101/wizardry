import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TitleScreenComponent } from './title-screen.component';
import { SaveService } from '@services/SaveService';
import { LoadingProgressService } from '@services/LoadingProgressService';
import { GameInitializationService } from '@services/GameInitializationService';
import { GameStateService } from '@services/GameStateService';

describe('TitleScreenComponent', () => {
  let component: TitleScreenComponent;
  let fixture: ComponentFixture<TitleScreenComponent>;
  let saveService: SaveService;
  let loadingProgress: LoadingProgressService;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    // Mock GameInitializationService.initializeGame to complete immediately
    jest.spyOn(GameInitializationService, 'initializeGame').mockImplementation(
      async (progress?: LoadingProgressService) => {
        progress?.startLoading();
        progress?.complete();
      }
    );

    TestBed.configureTestingModule({
      imports: [TitleScreenComponent],
      providers: [SaveService, LoadingProgressService, GameStateService]
    });

    fixture = TestBed.createComponent(TitleScreenComponent);
    component = fixture.componentInstance;
    saveService = TestBed.inject(SaveService);
    loadingProgress = TestBed.inject(LoadingProgressService);
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    // Mock save data check
    jest.spyOn(saveService, 'hasSaveData').mockResolvedValue(false);

    // Ensure party is NOT in maze by default (dungeon undefined)
    gameState.updateState(state => ({
      ...state,
      dungeon: undefined
    }));

    jest.spyOn(router, 'navigate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    loadingProgress.reset();
  });

  describe('initialization', () => {
    it('starts game initialization on init', async () => {
      const initSpy = jest.spyOn(GameInitializationService, 'initializeGame');

      await component.ngOnInit();

      expect(initSpy).toHaveBeenCalledWith(loadingProgress);
    });

    it('shows loading state initially', () => {
      // Before ngOnInit, progress service is idle
      expect(component.isComplete()).toBe(false);
    });

    it('shows complete state after initialization', async () => {
      await component.ngOnInit();

      expect(component.isComplete()).toBe(true);
    });

    it('checks for existing save data on load', async () => {
      const hasSaveSpy = jest.spyOn(saveService, 'hasSaveData');

      await component.ngOnInit();

      expect(hasSaveSpy).toHaveBeenCalled();
    });
  });

  describe('key press handling', () => {
    beforeEach(async () => {
      await component.ngOnInit(); // Complete loading
    });

    it('navigates to castle menu on any key press when complete', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.handleKeyPress(event);

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('ignores key presses while loading', async () => {
      // Reset and set loading state
      loadingProgress.reset();
      loadingProgress.startLoading();

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('ignores repeated key presses after navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.handleKeyPress(event);
      component.handleKeyPress(event); // Second press

      expect(router.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('save data detection', () => {
    it('detects when save exists', async () => {
      jest.spyOn(saveService, 'hasSaveData').mockResolvedValue(true);

      await component.ngOnInit();

      expect(component.hasSaveData()).toBe(true);
    });

    it('detects when no save exists', async () => {
      jest.spyOn(saveService, 'hasSaveData').mockResolvedValue(false);

      await component.ngOnInit();

      expect(component.hasSaveData()).toBe(false);
    });
  });

  describe('progress tracking', () => {
    it('exposes percentage from progress service', () => {
      loadingProgress.startLoading();
      loadingProgress.completeStep('classes');
      loadingProgress.completeStep('spells');

      // Percentage should be non-zero after completing some steps
      expect(component.percentage()).toBeGreaterThan(0);
    });

    it('exposes current asset from progress service', () => {
      loadingProgress.startLoading();
      loadingProgress.startStep('monsters');

      expect(component.currentAsset()).toBe('Loading monsters...');
    });

    it('shows error state when loading fails', async () => {
      jest.spyOn(GameInitializationService, 'initializeGame').mockRejectedValue(
        new Error('Test error')
      );

      await component.ngOnInit();

      expect(component.hasError()).toBe(true);
    });
  });

  describe('state-aware navigation', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('ignores key press when party is in maze', () => {
      // Put party in maze
      gameState.updateState(state => ({
        ...state,
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' as const },
          lightActive: false,
          lightRadius: 0,
          inDarknessZone: false,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          lootedTiles: new Set(),
          latumapicActive: false
        }
      }));

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('detects when party is in maze', () => {
      gameState.updateState(state => ({
        ...state,
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' as const },
          lightActive: false,
          lightRadius: 0,
          inDarknessZone: false,
          teleportCount: 0,
          visitedTiles: new Set(),
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          lootedTiles: new Set(),
          latumapicActive: false
        }
      }));

      expect(component.partyInMaze()).toBe(true);
    });

    it('detects when party is not in maze', () => {
      gameState.updateState(state => ({
        ...state,
        dungeon: undefined
      }));

      expect(component.partyInMaze()).toBe(false);
    });

    it('detects when party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char1', 'char2']
        }
      }));

      expect(component.hasParty()).toBe(true);
    });

    it('detects when no party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: []
        }
      }));

      expect(component.hasParty()).toBe(false);
    });

    it('handleResumeAdventure navigates to maze', () => {
      component.handleResumeAdventure();

      expect(router.navigate).toHaveBeenCalledWith(['/maze']);
    });

    it('handleContinue navigates to castle menu', () => {
      component.handleContinue();

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('handleNewGame navigates to castle menu', () => {
      component.handleNewGame();

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });

  describe('abandon party flow', () => {
    beforeEach(async () => {
      await component.ngOnInit();
    });

    it('promptAbandonParty shows confirmation dialog', () => {
      component.promptAbandonParty();

      expect(component.showConfirmation()).toBe(true);
      expect(component.confirmationMessage()).toContain('Abandon your party');
    });

    it('cancelAbandon hides confirmation dialog', () => {
      component.promptAbandonParty();
      component.cancelAbandon();

      expect(component.showConfirmation()).toBe(false);
    });

    it('confirmAbandon navigates to castle menu', () => {
      component.confirmAbandon();

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
