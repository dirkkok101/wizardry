import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingGroundsComponent } from '../training-grounds.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { createTestCharacter, createEmptyParty } from '@testing/test-factories';
import { SceneType } from '@types/SceneType';
import { CharacterStatus } from '@types/CharacterStatus';

describe('TrainingGroundsComponent', () => {
  let component: TrainingGroundsComponent;
  let fixture: ComponentFixture<TrainingGroundsComponent>;
  let navigationService: SceneNavigationService;
  let gameStateService: GameStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingGroundsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingGroundsComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
    navigationService = TestBed.inject(SceneNavigationService);

    jest.spyOn(navigationService, 'returnToCastle').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'createCharacter').mockImplementation(() => Promise.resolve(true));
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

      expect(navigationService.inspectCharacter).toHaveBeenCalledWith('char-123', 'training-grounds');
    });
  });

  describe('handleCreateCharacter', () => {
    it('navigates to character-creation', () => {
      component.handleCreateCharacter();

      expect(navigationService.createCharacter).toHaveBeenCalled();
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

  describe('handleFooterAction', () => {
    it('calls handleCreateCharacter when create action selected', () => {
      const spy = jest.spyOn(component, 'handleCreateCharacter');

      component.handleFooterAction('create');

      expect(spy).toHaveBeenCalled();
    });

    it('navigates to castle when return action selected', () => {
      component.handleFooterAction('return');

      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });
  });

  describe('handleEscape', () => {
    it('navigates to castle-menu when ESC key pressed', () => {
      component.handleEscape();

      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('does not navigate when confirmation dialog is open', () => {
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

      // Open confirmation dialog
      component.handleDeleteCharacter('char-1');
      (navigationService.returnToCastle as jest.Mock).mockClear();

      // Try to escape
      component.handleEscape();

      // Should NOT navigate when dialog is open
      expect(navigationService.returnToCastle).not.toHaveBeenCalled();
    });
  });

  describe('keyboard navigation with modal dialog (integration)', () => {
    it('does not trigger menu navigation when Enter pressed with confirmation dialog open', () => {
      // Setup: Create a character
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
      fixture.detectChanges();

      // Open confirmation dialog
      component.handleDeleteCharacter('char-1');
      fixture.detectChanges();

      // Spy on navigation (menu would normally trigger this)
      (navigationService.returnToCastle as jest.Mock).mockClear();
      const handleFooterActionSpy = jest.spyOn(component, 'handleFooterAction');

      // Simulate Enter key press while dialog is visible
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(enterEvent);
      fixture.detectChanges();

      // Verify: Menu navigation should NOT have been triggered
      expect(handleFooterActionSpy).not.toHaveBeenCalled();
      expect(navigationService.returnToCastle).not.toHaveBeenCalled();

      // Verify: Dialog should still be open (confirmDelete wasn't called by menu)
      expect(component.showDeleteConfirmation()).toBe(true);
    });

    it('does trigger menu navigation when Enter pressed without dialog open', () => {
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
      fixture.detectChanges();

      // Verify dialog is NOT open
      expect(component.showDeleteConfirmation()).toBe(false);

      // NOTE: This test verifies that menu navigation works normally when no dialog is present.
      // The actual menu navigation is handled by SceneFooterComponent which uses MenuComponent.
      // We're just verifying the dialog isn't blocking legitimate navigation.

      // The handleFooterAction method would be called by the menu when Enter is pressed
      component.handleFooterAction('create');

      expect(navigationService.createCharacter).toHaveBeenCalled();
    });
  });
});
