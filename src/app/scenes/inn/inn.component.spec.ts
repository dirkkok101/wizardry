import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { InnComponent, RoomOption } from './inn.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { SceneType } from '@models/SceneType';
import { Character } from '@models/Character';
import { CharacterClass } from '@models/CharacterClass';
import { CharacterStatus } from '@models/CharacterStatus';
import { RoomType, InnService } from '@services/InnService';
import { createTestCharacter } from '@testing/test-factories';

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

  const createRoomOption = (roomType: RoomType): RoomOption => ({
    id: roomType,
    name: roomType.toLowerCase().replace('_', ' '),
    cost: InnService.getRoomCost(roomType),
    costUnit: 'gp/week',
    benefit: `${InnService.getRoomHealRate(roomType)} HP/week`,
    shortcut: roomType[0],
    description: '',
    roomType: roomType,
    enabled: true
  });

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

    it('has footer menu with return option when not in room selection', () => {
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

  describe('room selection with SelectionListComponent', () => {
    beforeEach(() => {
      component.selectCharacterToRest('char-1');
    });

    it('has all 5 room types in roomOptions', () => {
      expect(component.roomOptions().length).toBe(5);
      expect(component.roomOptions().map(o => o.id)).toContain(RoomType.STABLES);
      expect(component.roomOptions().map(o => o.id)).toContain(RoomType.BARRACKS);
      expect(component.roomOptions().map(o => o.id)).toContain(RoomType.DOUBLE);
      expect(component.roomOptions().map(o => o.id)).toContain(RoomType.PRIVATE);
      expect(component.roomOptions().map(o => o.id)).toContain(RoomType.ROYAL_SUITE);
    });

    it('computes affordability based on party gold', () => {
      // With 100 gold, should afford stables (0), barracks (10), double (50) but not private (200) or royal (500)
      const options = component.roomOptions();
      expect(options.find(o => o.roomType === RoomType.STABLES)?.enabled).toBe(true);
      expect(options.find(o => o.roomType === RoomType.BARRACKS)?.enabled).toBe(true);
      expect(options.find(o => o.roomType === RoomType.DOUBLE)?.enabled).toBe(true);
      expect(options.find(o => o.roomType === RoomType.PRIVATE)?.enabled).toBe(false);
      expect(options.find(o => o.roomType === RoomType.ROYAL_SUITE)?.enabled).toBe(false);
    });

    it('shows confirmation dialog when room is selected', () => {
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);

      expect(component.showConfirmation()).toBe(true);
      expect(component.pendingRoomType()).toBe(RoomType.BARRACKS);
      expect(component.confirmationMessage()).toContain('barracks');
    });

    it('cancels room selection when SelectionList emits cancelled', () => {
      component.handleRoomSelectionCancelled();

      expect(component.showRoomSelection()).toBe(false);
      expect(component.selectedCharacterId()).toBeNull();
    });

    it('shows error when cannot afford room', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, gold: 5 }
      }));

      const option = createRoomOption(RoomType.ROYAL_SUITE);
      component.handleRoomSelected(option);

      expect(messageService.isError()).toBe(true);
      expect(component.showConfirmation()).toBe(false);
    });
  });

  describe('footer menu during room selection', () => {
    it('shows back option in footer when in room selection', () => {
      component.showRoomSelection.set(true);

      const footerItems = component.footerMenuItems();
      expect(footerItems.some(item => item.id === 'back')).toBe(true);
      expect(footerItems.some(item => item.id === 'return')).toBe(false);
    });

    it('cancels room selection via footer back action', () => {
      component.selectedCharacterId.set('char-1');
      component.showRoomSelection.set(true);

      component.handleFooterAction('back');

      expect(component.showRoomSelection()).toBe(false);
      expect(component.selectedCharacterId()).toBeNull();
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
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
      component.confirmRest();

      const state = gameState.state();
      const updatedChar = state.roster.get('char-1')!;
      expect(updatedChar.hp).toBe(11); // 10 + 1 (barracks heal rate)
    });

    it('deducts gold from party when resting', () => {
      const initialGold = gameState.party().gold || 0;

      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
      component.confirmRest();

      const finalGold = gameState.party().gold || 0;
      expect(finalGold).toBe(initialGold - 10); // barracks costs 10
    });

    it('stables are free', () => {
      const initialGold = gameState.party().gold || 0;

      const option = createRoomOption(RoomType.STABLES);
      component.handleRoomSelected(option);
      component.confirmRest();

      const finalGold = gameState.party().gold || 0;
      expect(finalGold).toBe(initialGold); // stables are free
    });

    it('shows success message after resting', () => {
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(messageService.hasMessage()).toBe(true);
      expect(messageService.isSuccess()).toBe(true);
    });

    it('cancels confirmation without performing rest', () => {
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
      const initialGold = gameState.party().gold || 0;

      component.cancelConfirmation();

      expect(component.showConfirmation()).toBe(false);
      expect(gameState.party().gold).toBe(initialGold);
    });

    it('initializes rest progress when confirming rest', () => {
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(component.restProgress()).not.toBeNull();
      expect(component.restProgress()?.weeksRested).toBe(1);
      expect(component.restProgress()?.startingHp).toBe(10);
    });
  });

  describe('auto-rest functionality', () => {
    beforeEach(() => {
      const char = createCharacterInParty({ hp: 17, maxHp: 20 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 1000 }
      }));
      component.selectCharacterToRest('char-1');
    });

    it('fully heals character with auto-rest', fakeAsync(() => {
      const option = createRoomOption(RoomType.DOUBLE); // 3 HP/week
      component.handleRoomSelected(option);
      component.confirmAutoRest();

      // Wait for auto-rest loop to complete (1 week = 100ms delay)
      tick(500);

      const state = gameState.state();
      const updatedChar = state.roster.get('char-1')!;
      expect(updatedChar.hp).toBe(20); // Fully healed
      expect(component.isAutoResting()).toBe(false);
    }));

    it('stops auto-rest when ESC is pressed', fakeAsync(() => {
      const option = createRoomOption(RoomType.BARRACKS); // 1 HP/week, slow healing
      component.handleRoomSelected(option);
      component.confirmAutoRest();

      expect(component.isAutoResting()).toBe(true);

      // Stop auto-rest
      component.handleEscape();

      expect(component.isAutoResting()).toBe(false);
    }));

    it('stops auto-rest when gold runs out', fakeAsync(() => {
      // Set low gold
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, gold: 15 }
      }));

      const option = createRoomOption(RoomType.BARRACKS); // 10 gp/week
      component.handleRoomSelected(option);
      component.confirmAutoRest();

      // Wait for auto-rest loop
      tick(500);

      expect(component.isAutoResting()).toBe(false);
      expect(messageService.isError()).toBe(true);
    }));
  });

  describe('rest progress tracking', () => {
    beforeEach(() => {
      const char = createCharacterInParty({ hp: 5, maxHp: 20 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 500 }
      }));
      component.selectCharacterToRest('char-1');
    });

    it('tracks weeks rested', () => {
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(component.restProgress()?.weeksRested).toBe(1);

      // Rest another week
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(component.restProgress()?.weeksRested).toBe(2);
    });

    it('tracks total gold spent', () => {
      const option = createRoomOption(RoomType.DOUBLE); // 50 gp/week
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(component.restProgress()?.totalGoldSpent).toBe(50);

      // Rest another week
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(component.restProgress()?.totalGoldSpent).toBe(100);
    });

    it('tracks total HP recovered', () => {
      const option = createRoomOption(RoomType.DOUBLE); // 3 HP/week
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(component.restProgress()?.totalHpRecovered).toBe(3);

      // Rest another week
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(component.restProgress()?.totalHpRecovered).toBe(6);
    });

    it('clears rest progress when fully healed', () => {
      // Character needs 15 HP to be full
      const char = createCharacterInParty({ hp: 17, maxHp: 20 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 500 }
      }));
      component.selectCharacterToRest('char-1');

      const option = createRoomOption(RoomType.DOUBLE); // 3 HP/week
      component.handleRoomSelected(option);
      component.confirmRest();

      // Character should be fully healed now (17 + 3 = 20)
      expect(component.restProgress()).toBeNull();
      expect(component.showRoomSelection()).toBe(false);
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
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
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
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
      component.confirmRest();

      expect(component.levelUpData()?.newLevel).toBe(2);
      expect(component.levelUpData()?.hpIncrease).toBeGreaterThan(0);
    });

    it('dismisses level up display', () => {
      component.levelUpData.set({
        newLevel: 2,
        hpIncrease: 5,
        statChanges: {},
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
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);
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
        statChanges: {},
        newSpells: []
      });

      component.handleEscape();

      expect(component.levelUpData()).toBeNull();
    });

    it('dismisses level up display on Enter', () => {
      component.levelUpData.set({
        newLevel: 2,
        hpIncrease: 5,
        statChanges: {},
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

    it('stops auto-rest on ESC', () => {
      component.isAutoResting.set(true);

      component.handleEscape();

      expect(component.isAutoResting()).toBe(false);
    });

    it('confirms rest on "1" key when confirmation dialog is open', () => {
      // Setup character and room selection
      const char = createCharacterInParty({ hp: 10, maxHp: 20 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 100 }
      }));
      component.selectCharacterToRest('char-1');
      const option = createRoomOption(RoomType.BARRACKS);
      component.handleRoomSelected(option);

      // Confirmation should be showing
      expect(component.showConfirmation()).toBe(true);

      // Press "1" key
      const event = new KeyboardEvent('keydown', { key: '1' });
      component.handleKeydown(event);

      // Confirmation should close and rest should be performed
      expect(component.showConfirmation()).toBe(false);
      expect(component.restProgress()).not.toBeNull();
      expect(component.restProgress()?.weeksRested).toBe(1);
    });

    it('triggers auto-rest on "A" key when confirmation dialog is open', () => {
      // Setup character with small HP gap
      const char = createCharacterInParty({ hp: 17, maxHp: 20 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char.id, char]]),
        party: { ...state.party, members: [char.id], gold: 500 }
      }));
      component.selectCharacterToRest('char-1');
      const option = createRoomOption(RoomType.DOUBLE);
      component.handleRoomSelected(option);

      expect(component.showConfirmation()).toBe(true);

      // Press "a" key (lowercase)
      const event = new KeyboardEvent('keydown', { key: 'a' });
      component.handleKeydown(event);

      // Should start auto-resting
      expect(component.showConfirmation()).toBe(false);
      expect(component.isAutoResting()).toBe(true);
    });

    it('ignores "1" and "A" keys when confirmation dialog is not open', () => {
      // Setup character but don't open confirmation
      component.selectCharacterToRest('char-1');
      component.showConfirmation.set(false);

      const initialGold = gameState.party().gold;

      // Press "1" key - should be ignored
      const event1 = new KeyboardEvent('keydown', { key: '1' });
      component.handleKeydown(event1);

      // Press "A" key - should be ignored
      const eventA = new KeyboardEvent('keydown', { key: 'A' });
      component.handleKeydown(eventA);

      // Nothing should change
      expect(gameState.party().gold).toBe(initialGold);
      expect(component.isAutoResting()).toBe(false);
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
  });
});
