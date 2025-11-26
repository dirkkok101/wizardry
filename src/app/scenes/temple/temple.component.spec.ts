import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TempleComponent } from './temple.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { SceneType } from '@models/SceneType';
import { Character } from '@models/Character';
import { CharacterClass } from '@models/CharacterClass';
import { CharacterStatus } from '@models/CharacterStatus';
import { Race } from '@models/Race';
import { Alignment } from '@models/Alignment';

describe('TempleComponent', () => {
  let component: TempleComponent;
  let fixture: ComponentFixture<TempleComponent>;
  let gameState: GameStateService;
  let navigationService: SceneNavigationService;
  let messageService: MessageService;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    race: Race.HUMAN,
    class: CharacterClass.MAGE,
    alignment: Alignment.GOOD,
    level: 5,
    hp: 15,
    maxHp: 25,
    status: CharacterStatus.POISONED,
    strength: 10,
    intelligence: 15,
    piety: 12,
    vitality: 15,
    agility: 10,
    luck: 10,
    experience: 10000,
    ac: 5,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TempleComponent]
    });

    fixture = TestBed.createComponent(TempleComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    navigationService = TestBed.inject(SceneNavigationService);
    messageService = TestBed.inject(MessageService);

    jest.spyOn(navigationService, 'returnToCastle').mockImplementation(() => Promise.resolve(true));

    // Setup party with afflicted character
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter),
      party: {
        ...state.party,
        members: ['char-1'],
        gold: 500
      }
    }));

    // Initialize component to set scene type
    component.ngOnInit();
  });

  describe('initialization', () => {
    it('updates scene to TEMPLE on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.TEMPLE);
    });

    it('displays temple title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('TEMPLE');
    });
  });

  describe('footerMenuItems', () => {
    it('has only Return to Castle menu item (party-level action)', () => {
      fixture.detectChanges();
      const items = component.footerMenuItems();

      // Footer only contains party-level actions, not character-specific services
      expect(items.length).toBe(1);
      expect(items[0]).toEqual({ id: 'return', label: 'Return to Castle', shortcut: 'ESC', enabled: true });
    });
  });

  describe('getCharacterActions', () => {
    it('returns Inspect and Cure Poison for POISONED character', () => {
      const actions = component.getCharacterActions(mockCharacter);

      expect(actions.length).toBe(2);
      expect(actions[0].type).toBe('inspect');
      expect(actions[1].type).toBe('cure-poison');
      expect(actions[1].label).toContain('Cure Poison');
      expect(actions[1].label).toContain('g)'); // Contains gold cost
    });

    it('returns Inspect and Resurrect for DEAD character', () => {
      const deadChar = { ...mockCharacter, status: CharacterStatus.DEAD };
      const actions = component.getCharacterActions(deadChar);

      expect(actions.length).toBe(2);
      expect(actions[0].type).toBe('inspect');
      expect(actions[1].type).toBe('resurrect');
      expect(actions[1].label).toContain('Resurrect');
    });

    it('returns Inspect and Restore for ASHES character', () => {
      const ashesChar = { ...mockCharacter, status: CharacterStatus.ASHES };
      const actions = component.getCharacterActions(ashesChar);

      expect(actions.length).toBe(2);
      expect(actions[0].type).toBe('inspect');
      expect(actions[1].type).toBe('restore');
      expect(actions[1].label).toContain('Restore');
    });

    it('disables service action when party cannot afford it', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, gold: 0 }
      }));

      const actions = component.getCharacterActions(mockCharacter);
      const serviceAction = actions.find(a => a.type === 'cure-poison');

      expect(serviceAction?.enabled).toBe(false);
    });

    it('enables service action when party can afford it', () => {
      const actions = component.getCharacterActions(mockCharacter);
      const serviceAction = actions.find(a => a.type === 'cure-poison');

      expect(serviceAction?.enabled).toBe(true);
    });

    describe('resurrection affordability', () => {
      const deadCharacter: Character = {
        ...mockCharacter,
        id: 'dead-char',
        name: 'DeadHero',
        status: CharacterStatus.DEAD,
        level: 1 // Cost: 250 × 1 = 250 gold
      };

      beforeEach(() => {
        // Add dead character to roster and party
        gameState.updateState(state => ({
          ...state,
          roster: new Map(state.roster).set('dead-char', deadCharacter),
          party: {
            ...state.party,
            members: ['dead-char']
          }
        }));
      });

      it('enables resurrect button when gold equals cost exactly (250g for level 1)', () => {
        gameState.updateState(state => ({
          ...state,
          party: { ...state.party, gold: 250 }
        }));

        const actions = component.getCharacterActions(deadCharacter);
        const resurrectAction = actions.find(a => a.type === 'resurrect');

        expect(resurrectAction?.enabled).toBe(true);
        expect(resurrectAction?.label).toBe('Resurrect (250g)');
      });

      it('enables resurrect button when gold exceeds cost (251g)', () => {
        gameState.updateState(state => ({
          ...state,
          party: { ...state.party, gold: 251 }
        }));

        const actions = component.getCharacterActions(deadCharacter);
        const resurrectAction = actions.find(a => a.type === 'resurrect');

        expect(resurrectAction?.enabled).toBe(true);
      });

      it('disables resurrect button when gold is 1 below cost (249g)', () => {
        gameState.updateState(state => ({
          ...state,
          party: { ...state.party, gold: 249 }
        }));

        const actions = component.getCharacterActions(deadCharacter);
        const resurrectAction = actions.find(a => a.type === 'resurrect');

        expect(resurrectAction?.enabled).toBe(false);
      });

      it('scales resurrection cost with character level (level 5 = 1250g)', () => {
        const level5DeadChar = { ...deadCharacter, level: 5 };
        gameState.updateState(state => ({
          ...state,
          roster: new Map(state.roster).set('dead-char', level5DeadChar),
          party: { ...state.party, gold: 1250 }
        }));

        const actions = component.getCharacterActions(level5DeadChar);
        const resurrectAction = actions.find(a => a.type === 'resurrect');

        expect(resurrectAction?.enabled).toBe(true);
        expect(resurrectAction?.label).toBe('Resurrect (1250g)');
      });

      it('disables resurrect for level 5 character when gold is 1249', () => {
        const level5DeadChar = { ...deadCharacter, level: 5 };
        gameState.updateState(state => ({
          ...state,
          roster: new Map(state.roster).set('dead-char', level5DeadChar),
          party: { ...state.party, gold: 1249 }
        }));

        const actions = component.getCharacterActions(level5DeadChar);
        const resurrectAction = actions.find(a => a.type === 'resurrect');

        expect(resurrectAction?.enabled).toBe(false);
      });

      it('always enables inspect button for dead characters regardless of gold', () => {
        // Scenario: level 1 dead character, 1070g party gold (user's exact scenario)
        gameState.updateState(state => ({
          ...state,
          party: { ...state.party, gold: 1070 }
        }));

        const actions = component.getCharacterActions(deadCharacter);
        const inspectAction = actions.find(a => a.type === 'inspect');
        const resurrectAction = actions.find(a => a.type === 'resurrect');

        // Inspect should always be enabled (no enabled property = defaults to true)
        expect(inspectAction).toBeDefined();
        expect(inspectAction?.enabled).toBeUndefined(); // No enabled property

        // Resurrect should be enabled (1070 >= 250)
        expect(resurrectAction?.enabled).toBe(true);
      });

      it('returns both inspect and resurrect actions for dead character', () => {
        gameState.updateState(state => ({
          ...state,
          party: { ...state.party, gold: 1070 }
        }));

        const actions = component.getCharacterActions(deadCharacter);

        expect(actions.length).toBe(2);
        expect(actions[0].type).toBe('inspect');
        expect(actions[1].type).toBe('resurrect');
      });
    });
  });

  describe('handleCharacterAction', () => {
    it('shows confirmation when service action clicked', () => {
      expect(component.showConfirmation()).toBe(false);

      component.handleCharacterAction({ characterId: 'char-1', actionType: 'cure-poison' });

      expect(component.showConfirmation()).toBe(true);
      expect(component.confirmationMessage()).toContain('Gandalf');
      expect(component.confirmationMessage()).toContain('poison');
    });

    it('shows service cost in confirmation message', () => {
      component.handleCharacterAction({ characterId: 'char-1', actionType: 'cure-poison' });

      // Character is level 5, cure poison base cost is 10
      // Expected cost: 10 * 5 = 50 gold
      expect(component.confirmationMessage()).toContain('50 gold');
    });

    it('navigates to character inspection for inspect action', () => {
      jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));

      component.handleCharacterAction({ characterId: 'char-1', actionType: 'inspect' });

      expect(navigationService.inspectCharacter).toHaveBeenCalledWith('char-1', 'temple');
      expect(component.showConfirmation()).toBe(false);
    });
  });

  describe('confirmation dialog', () => {
    it('hides confirmation when cancelled', () => {
      component.handleCharacterAction({ characterId: 'char-1', actionType: 'cure-poison' });
      expect(component.showConfirmation()).toBe(true);

      component.cancelService();

      expect(component.showConfirmation()).toBe(false);
    });
  });

  describe('confirmService', () => {
    it('executes Cure Poison service and updates state', () => {
      component.handleCharacterAction({ characterId: 'char-1', actionType: 'cure-poison' });
      const initialStatus = gameState.state().roster.get('char-1')?.status;
      expect(initialStatus).toBe(CharacterStatus.POISONED);

      component.confirmService();

      const updatedStatus = gameState.state().roster.get('char-1')?.status;
      expect(updatedStatus).toBe(CharacterStatus.OK);
      expect(component.showConfirmation()).toBe(false);
    });

    it('deducts gold from party', () => {
      const initialGold = gameState.state().party.gold;
      component.handleCharacterAction({ characterId: 'char-1', actionType: 'cure-poison' });

      component.confirmService();

      const finalGold = gameState.state().party.gold;
      expect(finalGold).toBeLessThan(initialGold);
    });

    it('shows error when insufficient gold', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, gold: 0 }
      }));

      component.handleCharacterAction({ characterId: 'char-1', actionType: 'cure-poison' });
      component.confirmService();

      expect(messageService.messageText()).toContain('Cannot afford');
    });
  });

  describe('template structure', () => {
    it('renders SceneTitleComponent', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('app-scene-title');
      expect(title).toBeTruthy();
    });

    it('renders SceneFooterComponent with menu items', () => {
      fixture.detectChanges();
      const footer = fixture.nativeElement.querySelector('app-scene-footer');
      expect(footer).toBeTruthy();
    });

    it('renders character grid for afflicted characters', () => {
      fixture.detectChanges();
      const grid = fixture.nativeElement.querySelector('app-party-character-grid');
      expect(grid).toBeTruthy();
    });
  });

  describe('integration: full service flow', () => {
    it('completes Cure Poison flow from character action to state update', () => {
      fixture.detectChanges();

      // Verify character is poisoned
      expect(gameState.state().roster.get('char-1')?.status).toBe(CharacterStatus.POISONED);

      // Verify character actions include cure-poison
      const actions = component.getCharacterActions(mockCharacter);
      const curePoisonAction = actions.find(a => a.type === 'cure-poison');
      expect(curePoisonAction?.enabled).toBe(true);

      // Click cure poison action on character card
      component.handleCharacterAction({ characterId: 'char-1', actionType: 'cure-poison' });
      expect(component.showConfirmation()).toBe(true);

      // Confirm service
      component.confirmService();

      // Verify character is cured
      expect(gameState.state().roster.get('char-1')?.status).toBe(CharacterStatus.OK);
      expect(component.showConfirmation()).toBe(false);
    });
  });

  describe('handleFooterAction', () => {
    it('navigates to castle menu when return selected', () => {
      component.handleFooterAction('return');

      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });
  });

  describe('handleEscape', () => {
    it('navigates to castle menu when no confirmation dialog is open', () => {
      expect(component.showConfirmation()).toBe(false);

      component.handleEscape();

      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('does not navigate when confirmation dialog is open', () => {
      component.handleCharacterAction({ characterId: 'char-1', actionType: 'cure-poison' });
      expect(component.showConfirmation()).toBe(true);

      component.handleEscape();

      expect(navigationService.returnToCastle).not.toHaveBeenCalled();
    });
  });
});
