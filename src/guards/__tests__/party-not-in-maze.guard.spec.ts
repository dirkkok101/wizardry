import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { partyNotInMazeGuard } from '../party-not-in-maze.guard';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';

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

  it('allows access when not in maze', () => {
    gameState.updateState(state => ({
      ...state,
      currentScene: 'CASTLE_MENU'
    }));

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to camp when in maze', () => {
    gameState.updateState(state => ({
      ...state,
      currentScene: 'MAZE'
    }));

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/camp']);
  });

  it('redirects to camp when in combat', () => {
    gameState.updateState(state => ({
      ...state,
      currentScene: 'COMBAT'
    }));

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/camp']);
  });
});
