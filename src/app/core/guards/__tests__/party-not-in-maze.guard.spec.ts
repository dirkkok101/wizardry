import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { partyNotInMazeGuard } from '../party-not-in-maze.guard';
import { GameStateService } from '@services/GameStateService';
import { SaveService } from '@services/SaveService';

describe('partyNotInMazeGuard', () => {
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

  it('allows access when dungeon state is undefined (not in maze)', () => {
    // Ensure dungeon is undefined (party in town)
    gameState.updateState(state => ({
      ...state,
      dungeon: undefined
    }));

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to maze when dungeon state exists', () => {
    // Set dungeon state (party has entered maze)
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        currentLevel: 1,
        position: { x: 0, y: 0, facing: 'NORTH' as const },
        lightActive: false,
        lightRadius: 3,
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

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/maze']);
  });

  it('redirects to maze when dungeon exists regardless of scene type', () => {
    // Even if scene is CASTLE_MENU, if dungeon exists, party is "in maze"
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        currentLevel: 2,
        position: { x: 5, y: 5, facing: 'SOUTH' as const },
        lightActive: true,
        lightRadius: 3,
        inDarknessZone: false,
        teleportCount: 0,
        visitedTiles: new Set(['5,5']),
        defeatedEncounters: [],
        unlockedDoors: new Set(),
        openDoors: new Set(),
        lootedTiles: new Set(),
        latumapicActive: false
      }
    }));

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/maze']);
  });
});
