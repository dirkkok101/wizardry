import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { partyInMazeGuard } from '../party-in-maze.guard';
import { GameStateService } from '@services/GameStateService';
import { SaveService } from '@services/SaveService';
import { DungeonState } from '@models/Dungeon';

describe('partyInMazeGuard', () => {
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GameStateService,
        SaveService,
        {
          provide: Router,
          useValue: { navigate: jest.fn() }
        }
      ]
    });

    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);
  });

  it('allows access when dungeon state exists (party properly entered maze)', () => {
    // Set up dungeon state - party has properly entered the maze
    const dungeonState: DungeonState = {
      currentLevel: 1,
      position: { x: 0, y: 0, facing: 'NORTH' },
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
    };

    gameState.updateState(state => ({
      ...state,
      dungeon: dungeonState
    }));

    const result = TestBed.runInInjectionContext(() => partyInMazeGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to castle-menu when dungeon state is undefined (direct URL access)', () => {
    // No dungeon state - player is trying to access /maze directly via URL
    gameState.updateState(state => ({
      ...state,
      dungeon: undefined
    }));

    const result = TestBed.runInInjectionContext(() => partyInMazeGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
  });

  it('redirects to castle-menu when party is in town (attempting URL exploit)', () => {
    // Explicitly ensure no dungeon state - simulating URL exploit attempt
    gameState.updateState(state => {
      const { dungeon, ...rest } = state;
      return rest as typeof state;
    });

    const result = TestBed.runInInjectionContext(() => partyInMazeGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
  });
});
