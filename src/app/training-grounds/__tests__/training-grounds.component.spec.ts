import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TrainingGroundsComponent } from '../training-grounds.component';
import { GameStateService } from '../../../services/GameStateService';
import { CharacterService } from '../../../services/CharacterService';
import { createTestCharacter, createEmptyParty } from '../../../test-helpers/test-factories';
import { SceneType } from '../../../types/SceneType';
import { CharacterStatus } from '../../../types/CharacterStatus';

describe('TrainingGroundsComponent', () => {
  let component: TrainingGroundsComponent;
  let fixture: ComponentFixture<TrainingGroundsComponent>;
  let mockRouter: jest.Mocked<Router>;
  let gameStateService: GameStateService;

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [TrainingGroundsComponent],
      providers: [
        GameStateService,
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingGroundsComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('availableCharacters', () => {
    it('shows characters not in party', () => {
      const char1 = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const char2 = createTestCharacter({ id: 'char-2', name: 'Frodo' });
      const char3 = createTestCharacter({ id: 'char-3', name: 'Sam' });

      const state = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2],
          [char3.id, char3]
        ]),
        party: {
          members: [char2.id], // Frodo is in party
          formation: { frontRow: [char2.id], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' as const },
          light: false,
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };

      gameStateService.updateState(() => state);
      fixture.detectChanges();

      const available = component.availableCharacters();

      expect(available.length).toBe(2);
      expect(available.find(c => c.character.id === 'char-1')).toBeTruthy();
      expect(available.find(c => c.character.id === 'char-3')).toBeTruthy();
      expect(available.find(c => c.character.id === 'char-2')).toBeFalsy();
    });

    it('shows empty when all characters in party', () => {
      const char = createTestCharacter({ id: 'char-1' });
      const state = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: {
          members: [char.id],
          formation: { frontRow: [char.id], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' as const },
          light: false,
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };

      gameStateService.updateState(() => state);
      fixture.detectChanges();

      expect(component.availableCharacters().length).toBe(0);
    });

    it('computes status correctly', () => {
      const char = createTestCharacter({
        id: 'char-1',
        status: CharacterStatus.OK
      });
      const state = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };

      gameStateService.updateState(() => state);
      fixture.detectChanges();

      const available = component.availableCharacters();
      expect(available[0].status).toBe(CharacterStatus.OK);
    });
  });

  describe('handleInspectCharacter', () => {
    it('navigates to character-inspection with correct params', () => {
      component.handleInspectCharacter('char-123');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/character-inspection'],
        {
          queryParams: {
            characterId: 'char-123',
            returnTo: 'training-grounds'
          }
        }
      );
    });
  });

  describe('handleCreateCharacter', () => {
    it('navigates to character-creation', () => {
      component.handleCreateCharacter();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/character-creation']);
    });
  });

  describe('handleDeleteCharacter', () => {
    it('shows confirmation dialog', () => {
      const char = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const state = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };
      gameStateService.updateState(() => state);

      component.handleDeleteCharacter('char-1');

      expect(component.showDeleteConfirmation()).toBe(true);
      expect(component.deleteConfirmationMessage()).toContain('Gandalf');
    });

    it('deletes character on confirmation', () => {
      const char = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const state = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };
      gameStateService.updateState(() => state);

      component.handleDeleteCharacter('char-1');
      component.confirmDelete();

      const newState = gameStateService.state();
      expect(newState.roster.has('char-1')).toBe(false);
    });

    it('does not delete character on cancel', () => {
      const char = createTestCharacter({ id: 'char-1' });
      const state = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };
      gameStateService.updateState(() => state);

      component.handleDeleteCharacter('char-1');
      component.cancelDelete();

      const newState = gameStateService.state();
      expect(newState.roster.has('char-1')).toBe(true);
      expect(component.showDeleteConfirmation()).toBe(false);
    });
  });

  describe('returnToCastle', () => {
    it('navigates to castle-menu', () => {
      component.returnToCastle();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });

  describe('handleFooterAction', () => {
    it('calls handleCreateCharacter when create action selected', () => {
      const spy = jest.spyOn(component, 'handleCreateCharacter');

      component.handleFooterAction('create');

      expect(spy).toHaveBeenCalled();
    });

    it('calls returnToCastle when return action selected', () => {
      const spy = jest.spyOn(component, 'returnToCastle');

      component.handleFooterAction('return');

      expect(spy).toHaveBeenCalled();
    });
  });
});
