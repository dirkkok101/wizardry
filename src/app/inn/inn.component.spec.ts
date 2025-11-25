import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnComponent } from './inn.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneNavigationService } from '../../services/SceneNavigationService';
import { MessageService } from '../../services/MessageService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { CharacterStatus } from '../../types/CharacterStatus';
import { RoomType } from '../../services/InnService';
import { createTestCharacter } from '../../test-helpers/test-factories';

describe('InnComponent', () => {
  let component: InnComponent;
  let fixture: ComponentFixture<InnComponent>;
  let gameState: GameStateService;
  let navigationService: SceneNavigationService;
  let messageService: MessageService;

  const createCharacterInParty = (overrides: Partial<Character> = {}): Character => {
    return createTestCharacter({
      id: 'char-1',
      name: 'Gandalf',
      class: CharacterClass.MAGE,
      level: 5,
      hp: 15,
      maxHp: 25,
      status: CharacterStatus.OK,
      experience: 10000,
      ...overrides
    });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InnComponent]
    });

    fixture = TestBed.createComponent(InnComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    navigationService = TestBed.inject(SceneNavigationService);
    messageService = TestBed.inject(MessageService);

    jest.spyOn(navigationService, 'returnToCastle').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));

    // Setup party with character and party gold
    const mockCharacter = createCharacterInParty();
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter),
      party: {
        ...state.party,
        members: ['char-1'],
        gold: 100
      }
    }));
  });

  describe('initialization', () => {
    it('updates scene to INN on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.INN);
    });

    it('displays inn title via SceneTitleComponent', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const sceneTitle = compiled.querySelector('app-scene-title');
      expect(sceneTitle).toBeTruthy();
    });

    it('shows party character grid', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const characterGrid = compiled.querySelector('app-party-character-grid');
      expect(characterGrid).toBeTruthy();
    });

    it('has footer menu with return option', () => {
      fixture.detectChanges();
      expect(component.footerMenuItems().length).toBeGreaterThan(0);
      expect(component.footerMenuItems().some(item => item.id === 'return')).toBe(true);
    });
  });

  describe('navigation', () => {
    it('returns to castle when footer return action is selected', () => {
      component.handleFooterAction('return');
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('returns to castle on ESC key when not in dialogs', () => {
      // Ensure no dialogs are open
      component.showRoomSelection.set(false);
      component.showConfirmation.set(false);
      component.levelUpData.set(null);

      component.handleEscape();
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('navigates to character inspection on inspect action', () => {
      component.handleCharacterAction({
        actionType: 'inspect',
        characterId: 'char-1'
      });
      expect(navigationService.inspectCharacter).toHaveBeenCalledWith('char-1', 'inn');
    });
  });

  describe('character selection', () => {
    it('selects character and shows room selection when rest action clicked', () => {
      component.handleCharacterAction({
        actionType: 'rest',
        characterId: 'char-1'
      });

      expect(component.selectedCharacterId()).toBe('char-1');
      expect(component.showRoomSelection()).toBe(true);
    });

    it('shows error for dead characters', () => {
      const deadChar = createCharacterInParty({
        id: 'dead-char',
        status: CharacterStatus.DEAD
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('dead-char', deadChar)
      }));

      component.selectCharacterToRest('dead-char');

      expect(messageService.isError()).toBe(true);
      expect(component.showRoomSelection()).toBe(false);
    });

    it('closes room selection and resets state on cancel', () => {
      component.selectedCharacterId.set('char-1');
      component.showRoomSelection.set(true);

      component.cancelRoomSelection();

      expect(component.selectedCharacterId()).toBeNull();
      expect(component.showRoomSelection()).toBe(false);
    });
  });

  describe('room selection', () => {
    beforeEach(() => {
      component.selectCharacterToRest('char-1');
    });

    it('has all 5 room types in menu plus back option', () => {
      expect(component.roomMenuItems.length).toBe(6);
      expect(component.roomMenuItems.map(m => m.id)).toContain(RoomType.STABLES);
      expect(component.roomMenuItems.map(m => m.id)).toContain(RoomType.BARRACKS);
      expect(component.roomMenuItems.map(m => m.id)).toContain(RoomType.DOUBLE);
      expect(component.roomMenuItems.map(m => m.id)).toContain(RoomType.PRIVATE);
      expect(component.roomMenuItems.map(m => m.id)).toContain(RoomType.ROYAL_SUITE);
      expect(component.roomMenuItems.map(m => m.id)).toContain('back');
    });

    it('shows confirmation dialog when room is selected', () => {
      component.handleRoomSelect(RoomType.BARRACKS);

      expect(component.showConfirmation()).toBe(true);
      expect(component.pendingRoomType()).toBe(RoomType.BARRACKS);
      expect(component.confirmationMessage()).toContain('barracks');
    });

    it('cancels room selection on back', () => {
      component.handleRoomSelect('back');

      expect(component.showRoomSelection()).toBe(false);
      expect(component.selectedCharacterId()).toBeNull();
    });

    it('shows error when cannot afford room', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, gold: 5 }
      }));

      component.handleRoomSelect(RoomType.ROYAL_SUITE);

      expect(messageService.isError()).toBe(true);
      expect(component.showConfirmation()).toBe(false);
    });
  });

  describe('rest mechanics', () => {
    beforeEach(() => {
      const char = createCharacterInParty({ hp: 10, maxHp: 20 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 100 }
      }));
      component.selectCharacterToRest('char-1');
    });

    it('heals character when rest is confirmed', () => {
      component.handleRoomSelect(RoomType.BARRACKS);
      component.confirmRest();

      const state = gameState.state();
      const updatedChar = state.roster.get('char-1')!;
      expect(updatedChar.hp).toBe(11); // 10 + 1 (barracks heal rate)
    });

    it('deducts gold from party when resting', () => {
      const initialGold = gameState.party().gold || 0;

      component.handleRoomSelect(RoomType.BARRACKS);
      component.confirmRest();

      const finalGold = gameState.party().gold || 0;
      expect(finalGold).toBe(initialGold - 10); // barracks costs 10
    });

    it('stables are free', () => {
      const initialGold = gameState.party().gold || 0;

      component.handleRoomSelect(RoomType.STABLES);
      component.confirmRest();

      const finalGold = gameState.party().gold || 0;
      expect(finalGold).toBe(initialGold); // stables are free
    });

    it('shows success message after resting', () => {
      component.handleRoomSelect(RoomType.BARRACKS);
      component.confirmRest();

      expect(messageService.hasMessage()).toBe(true);
      expect(messageService.isSuccess()).toBe(true);
    });

    it('cancels confirmation without performing rest', () => {
      component.handleRoomSelect(RoomType.BARRACKS);
      const initialGold = gameState.party().gold || 0;

      component.cancelConfirmation();

      expect(component.showConfirmation()).toBe(false);
      expect(gameState.party().gold).toBe(initialGold);
    });
  });

  describe('level up', () => {
    it('triggers level up when fully healed and has sufficient XP', () => {
      const char = createCharacterInParty({
        hp: 19,
        maxHp: 20,
        level: 1,
        experience: 3000, // Enough XP for level 2
        class: CharacterClass.FIGHTER
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 100 }
      }));

      component.selectCharacterToRest('char-1');
      component.handleRoomSelect(RoomType.BARRACKS);
      component.confirmRest();

      expect(component.levelUpData()).not.toBeNull();
      expect(component.levelUpData()!.newLevel).toBe(2);
    });

    it('displays level up data correctly', () => {
      const char = createCharacterInParty({
        hp: 19,
        maxHp: 20,
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 100 }
      }));

      component.selectCharacterToRest('char-1');
      component.handleRoomSelect(RoomType.BARRACKS);
      component.confirmRest();

      expect(component.levelUpData()?.newLevel).toBe(2);
      expect(component.levelUpData()?.hpIncrease).toBeGreaterThan(0);
    });

    it('dismisses level up display', () => {
      component.levelUpData.set({
        newLevel: 2,
        hpIncrease: 5,
        statIncreases: {},
        newSpells: []
      });
      component.selectedCharacterId.set('char-1');

      component.dismissLevelUp();

      expect(component.levelUpData()).toBeNull();
      expect(component.selectedCharacterId()).toBeNull();
      expect(messageService.isSuccess()).toBe(true);
    });

    it('updates character level in game state', () => {
      const char = createCharacterInParty({
        hp: 19,
        maxHp: 20,
        level: 1,
        experience: 3000,
        class: CharacterClass.FIGHTER
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 100 }
      }));

      component.selectCharacterToRest('char-1');
      component.handleRoomSelect(RoomType.BARRACKS);
      component.confirmRest();

      const state = gameState.state();
      const updatedChar = state.roster.get('char-1')!;
      expect(updatedChar.level).toBe(2);
    });
  });

  describe('keyboard handling', () => {
    it('dismisses level up display on ESC', () => {
      component.levelUpData.set({
        newLevel: 2,
        hpIncrease: 5,
        statIncreases: {},
        newSpells: []
      });

      component.handleEscape();

      expect(component.levelUpData()).toBeNull();
    });

    it('dismisses level up display on Enter', () => {
      component.levelUpData.set({
        newLevel: 2,
        hpIncrease: 5,
        statIncreases: {},
        newSpells: []
      });

      component.handleEnter();

      expect(component.levelUpData()).toBeNull();
    });

    it('does nothing on Enter when no level up display', () => {
      component.levelUpData.set(null);
      component.showRoomSelection.set(true);

      component.handleEnter();

      // Room selection should still be open
      expect(component.showRoomSelection()).toBe(true);
    });

    it('cancels confirmation on ESC', () => {
      component.showConfirmation.set(true);

      component.handleEscape();

      expect(component.showConfirmation()).toBe(false);
    });

    it('cancels room selection on ESC', () => {
      component.showRoomSelection.set(true);
      component.selectedCharacterId.set('char-1');

      component.handleEscape();

      expect(component.showRoomSelection()).toBe(false);
      expect(component.selectedCharacterId()).toBeNull();
    });

    it('returns to castle on ESC when no dialogs open', () => {
      component.showRoomSelection.set(false);
      component.showConfirmation.set(false);
      component.levelUpData.set(null);

      component.handleEscape();

      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });
  });

  describe('empty party state', () => {
    it('shows empty state when no party members', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: [] }
      }));
      fixture.detectChanges();

      expect(component.partyCharacters().length).toBe(0);
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });
  });

  describe('computed signals', () => {
    it('partyCharacters returns current party members', () => {
      expect(component.partyCharacters().length).toBe(1);
      expect(component.partyCharacters()[0].id).toBe('char-1');
    });

    it('partyGold returns current party gold', () => {
      expect(component.partyGold()).toBe(100);
    });

    it('selectedCharacter returns character when selected', () => {
      component.selectedCharacterId.set('char-1');
      expect(component.selectedCharacter()?.id).toBe('char-1');
    });

    it('selectedCharacter returns null when no selection', () => {
      component.selectedCharacterId.set(null);
      expect(component.selectedCharacter()).toBeNull();
    });

    it('restableCharacters excludes dead characters', () => {
      const deadChar = createCharacterInParty({
        id: 'dead-char',
        status: CharacterStatus.DEAD
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('dead-char', deadChar),
        party: { ...state.party, members: ['char-1', 'dead-char'] }
      }));

      expect(component.restableCharacters().length).toBe(1);
      expect(component.restableCharacters()[0].id).toBe('char-1');
    });
  });
});
