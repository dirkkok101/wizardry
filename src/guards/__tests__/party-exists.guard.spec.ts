import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { partyExistsGuard } from '../party-exists.guard';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';

describe('partyExistsGuard', () => {
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

  it('allows access when party exists', () => {
    // Create a party with at least one member
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['character-1'],
        formation: { frontRow: ['character-1'], backRow: [] },
        position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
        light: false
      }
    }));

    const result = TestBed.runInInjectionContext(() => partyExistsGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to castle menu when no party exists', () => {
    const result = TestBed.runInInjectionContext(() => partyExistsGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
  });
});
