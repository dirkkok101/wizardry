import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EdgeOfTownComponent } from './edge-of-town.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { Race } from '../../types/Race';
import { CharacterClass } from '../../types/CharacterClass';
import { CharacterStatus } from '../../types/CharacterStatus';
import { Alignment } from '../../types/Alignment';

describe('EdgeOfTownComponent', () => {
  let component: EdgeOfTownComponent;
  let fixture: ComponentFixture<EdgeOfTownComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EdgeOfTownComponent]
    });

    fixture = TestBed.createComponent(EdgeOfTownComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('displays scene title component with party gold', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const titleComponent = compiled.querySelector('app-scene-title');

      expect(titleComponent).toBeTruthy();
    });

    it('displays edge of town title via scene title component', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const titleComponent = compiled.querySelector('app-scene-title');
      expect(titleComponent).toBeTruthy();
    });

    it('shows all 5 footer menu options', () => {
      fixture.detectChanges();
      const menuItems = component.footerMenuItems();

      expect(menuItems.length).toBe(5);
      expect(menuItems[0].label).toContain('Training Grounds');
      expect(menuItems[1].label).toContain('Maze');
      expect(menuItems[2].label).toContain('Castle');
      expect(menuItems[3].label).toContain('Utilities');
      expect(menuItems[4].label).toContain('Leave Game');
    });

    it('updates game state to EDGE_OF_TOWN on init', () => {
      component.ngOnInit();

      expect(gameState.currentScene()).toBe(SceneType.EDGE_OF_TOWN);
    });

    it('displays current party members', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1', 'char-2']
        }
      }));

      fixture.detectChanges();

      expect(component.currentParty().members.length).toBe(2);
    });
  });

  describe('footer menu items', () => {
    it('disables maze option when no party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: [] }
      }));

      fixture.detectChanges();
      const menuItems = component.footerMenuItems();
      const mazeItem = menuItems.find(item => item.id === 'maze');

      expect(mazeItem?.enabled).toBe(false);
    });

    it('enables maze option when party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: ['char-1'] }
      }));

      fixture.detectChanges();
      const menuItems = component.footerMenuItems();
      const mazeItem = menuItems.find(item => item.id === 'maze');

      expect(mazeItem?.enabled).toBe(true);
    });
  });

  describe('footer navigation', () => {
    it('navigates to training grounds via footer action', () => {
      component.handleFooterAction('training-grounds');

      expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });

    it('shows leave confirmation dialog via footer action', () => {
      component.handleFooterAction('leave-game');

      expect(component.showLeaveConfirmation()).toBe(true);
    });

    it('clears messages before navigation', () => {
      component.messageText.set('Previous error');
      component.handleFooterAction('castle');

      expect(component.messageText()).toBeNull();
    });
  });

  describe('menu navigation (legacy tests)', () => {
    it('navigates to training grounds when selected', () => {
      component.handleFooterAction('training-grounds');

      expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });

    it('navigates to maze when party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: ['char-1'] }
      }));

      component.handleFooterAction('maze');

      expect(router.navigate).toHaveBeenCalledWith(['/camp']);
    });

    it('shows error message when entering maze without party', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: [] }
      }));

      component.handleFooterAction('maze');

      expect(router.navigate).not.toHaveBeenCalled();
      expect(component.messageText()).toBe('You need a party to enter the maze (visit Tavern)');
      expect(component.messageType()).toBe('error');
    });

    it('navigates to castle when selected', () => {
      component.handleFooterAction('castle');

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('navigates to utilities when selected', () => {
      component.handleFooterAction('utilities');

      expect(router.navigate).toHaveBeenCalledWith(['/utilities']);
    });
  });

  describe('message display', () => {
    it('shows error message when set', () => {
      component.messageText.set('Test error message');
      component.messageType.set('error');
      fixture.detectChanges();

      expect(component.messageText()).toBe('Test error message');
      expect(component.messageType()).toBe('error');
    });

    it('clears message when set to null', () => {
      component.messageText.set('Test message');
      component.messageText.set(null);

      expect(component.messageText()).toBeNull();
    });
  });

  describe('party display', () => {
    it('displays character cards for party members', () => {
      // Create test character
      const testChar: Character = {
        id: 'char-1',
        name: 'Gandalf',
        race: Race.HUMAN,
        class: CharacterClass.MAGE,
        level: 5,
        hp: 20,
        maxHp: 25,
        attributes: { strength: 10, intelligence: 18, piety: 12, vitality: 10, agility: 10, luck: 10 },
        status: CharacterStatus.OK,
        alignment: Alignment.GOOD,
        age: 30,
        gold: 0,
        inventory: [],
        equippedArmor: null,
        equippedWeapon: null,
        equippedShield: null,
        ac: 10,
        experiencePoints: 1000,
        spellsKnown: [],
        spellPointsByLevel: [0,0,0,0,0,0,0]
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map([['char-1', testChar]]),
        party: { ...state.party, members: ['char-1'] }
      }));

      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const characterCards = compiled.querySelectorAll('app-character-card');

      expect(characterCards.length).toBe(1);
    });

    it('shows empty state when no party members', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: [] }
      }));

      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const emptyState = compiled.querySelector('.no-party');

      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No party members');
    });
  });

  describe('character actions', () => {
    it('navigates to character inspection when inspect action clicked', () => {
      component.handleCharacterAction({
        characterId: 'char-1',
        actionType: 'inspect'
      });

      expect(router.navigate).toHaveBeenCalledWith(
        ['/character-inspection'],
        { queryParams: { characterId: 'char-1', returnTo: 'edge-of-town' } }
      );
    });
  });

  describe('message area', () => {
    it('displays error message when type is error', () => {
      component.messageText.set('Test error');
      component.messageType.set('error');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const messageArea = compiled.querySelector('.message-area.error');

      expect(messageArea).toBeTruthy();
      expect(messageArea.textContent).toContain('Test error');
    });

    it('displays info message when type is info', () => {
      component.messageText.set('Test info');
      component.messageType.set('info');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const messageArea = compiled.querySelector('.message-area.info');

      expect(messageArea).toBeTruthy();
    });

    it('hides message area when messageText is null', () => {
      component.messageText.set(null);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const messageArea = compiled.querySelector('.message-area');

      expect(messageArea).toBeFalsy();
    });
  });

  describe('footer component', () => {
    it('displays scene footer with menu items', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const footer = compiled.querySelector('app-scene-footer');

      expect(footer).toBeTruthy();
    });
  });

  describe('leave game confirmation', () => {
    it('shows confirmation dialog via footer action', () => {
      component.handleFooterAction('leave-game');

      expect(component.showLeaveConfirmation()).toBe(true);
    });

    it('hides dialog when user cancels', () => {
      component.showLeaveConfirmation.set(true);
      component.cancelLeaveGame();

      expect(component.showLeaveConfirmation()).toBe(false);
    });

    it('shows success message after save (when window.close fails)', async () => {
      await component.confirmLeaveGame();

      // window.close() will fail in test environment
      expect(component.showLeaveConfirmation()).toBe(false);
      expect(component.messageText()).toBe('Game saved successfully. You can now close this window.');
      expect(component.messageType()).toBe('success');
    });
  });
});
