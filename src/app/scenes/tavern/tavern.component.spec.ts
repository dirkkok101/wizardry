import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TavernComponent } from './tavern.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { CharacterStatus } from '@models/CharacterStatus';
import { Alignment } from '@models/Alignment';
import { createTestCharacter } from '@testing/test-factories';

describe('TavernComponent (redesigned)', () => {
  let component: TavernComponent;
  let fixture: ComponentFixture<TavernComponent>;
  let gameStateService: GameStateService;
  let navigationService: SceneNavigationService;
  let messageService: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TavernComponent]
    });

    fixture = TestBed.createComponent(TavernComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
    navigationService = TestBed.inject(SceneNavigationService);
    messageService = TestBed.inject(MessageService);

    jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'returnToCastle').mockImplementation(() => Promise.resolve(true));

    fixture.detectChanges(); // Trigger ngOnInit
  });

  describe('component creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with no messages', () => {
      expect(messageService.hasMessage()).toBe(false);
    });
  });

  describe('computed: availableCharacters()', () => {
    it('should return only OK characters not in party', () => {
      const okChar = createTestCharacter({ id: 'char-1', name: 'Gandalf', status: CharacterStatus.OK });
      const deadChar = createTestCharacter({ id: 'char-2', name: 'Dead Guy', status: CharacterStatus.DEAD });
      const injuredChar = createTestCharacter({ id: 'char-3', name: 'Injured', status: CharacterStatus.INJURED });
      const partyChar = createTestCharacter({ id: 'char-4', name: 'In Party', status: CharacterStatus.OK });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [okChar.id, okChar],
          [deadChar.id, deadChar],
          [injuredChar.id, injuredChar],
          [partyChar.id, partyChar]
        ]),
        party: {
          ...state.party,
          members: [partyChar.id],
          formation: {
            frontRow: [partyChar.id],
            backRow: []
          }
        }
      }));

      const available = component.availableCharacters();
      expect(available.length).toBe(1);
      expect(available[0].id).toBe('char-1');
      expect(available[0].name).toBe('Gandalf');
    });

    it('should return empty array when all OK characters are in party', () => {
      const char1 = createTestCharacter({ id: 'char-1', status: CharacterStatus.OK });
      const char2 = createTestCharacter({ id: 'char-2', status: CharacterStatus.OK });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: {
          ...state.party,
          members: [char1.id, char2.id],
          formation: {
            frontRow: [char1.id],
            backRow: [char2.id]
          }
        }
      }));

      expect(component.availableCharacters().length).toBe(0);
    });

    it('should exclude INJURED characters', () => {
      const injuredChar = createTestCharacter({ id: 'char-1', status: CharacterStatus.INJURED });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[injuredChar.id, injuredChar]])
      }));

      expect(component.availableCharacters().length).toBe(0);
    });

    it('should exclude PARALYZED characters', () => {
      const paralyzedChar = createTestCharacter({ id: 'char-1', status: CharacterStatus.PARALYZED });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[paralyzedChar.id, paralyzedChar]])
      }));

      expect(component.availableCharacters().length).toBe(0);
    });

    it('should exclude ASLEEP characters', () => {
      const asleepChar = createTestCharacter({ id: 'char-1', status: CharacterStatus.ASLEEP });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[asleepChar.id, asleepChar]])
      }));

      expect(component.availableCharacters().length).toBe(0);
    });
  });

  describe('computed: frontRowCharacters()', () => {
    it('should return characters in front row', () => {
      const char1 = createTestCharacter({ id: 'char-1', name: 'Fighter' });
      const char2 = createTestCharacter({ id: 'char-2', name: 'Mage' });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: {
          ...state.party,
          members: [char1.id, char2.id],
          formation: {
            frontRow: [char1.id],
            backRow: [char2.id]
          }
        }
      }));

      const frontRow = component.frontRowCharacters();
      expect(frontRow.length).toBe(1);
      expect(frontRow[0].id).toBe('char-1');
      expect(frontRow[0].name).toBe('Fighter');
    });

    it('should return empty array when front row is empty', () => {
      expect(component.frontRowCharacters().length).toBe(0);
    });

    it('should filter out undefined characters', () => {
      gameStateService.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          formation: {
            frontRow: ['non-existent-id'],
            backRow: []
          }
        }
      }));

      expect(component.frontRowCharacters().length).toBe(0);
    });
  });

  describe('computed: backRowCharacters()', () => {
    it('should return characters in back row', () => {
      const char1 = createTestCharacter({ id: 'char-1', name: 'Fighter' });
      const char2 = createTestCharacter({ id: 'char-2', name: 'Mage' });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: {
          ...state.party,
          members: [char1.id, char2.id],
          formation: {
            frontRow: [char1.id],
            backRow: [char2.id]
          }
        }
      }));

      const backRow = component.backRowCharacters();
      expect(backRow.length).toBe(1);
      expect(backRow[0].id).toBe('char-2');
      expect(backRow[0].name).toBe('Mage');
    });

    it('should return empty array when back row is empty', () => {
      expect(component.backRowCharacters().length).toBe(0);
    });
  });

  describe('computed: partyGold()', () => {
    it('should return party gold amount', () => {
      gameStateService.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 500
        }
      }));

      expect(component.partyGold()).toBe(500);
    });

    it('should return 0 when party has no gold', () => {
      expect(component.partyGold()).toBe(0);
    });
  });

  describe('canCharacterMoveUp() and canCharacterMoveDown()', () => {
    beforeEach(() => {
      const char1 = createTestCharacter({ id: 'char-1' });
      const char2 = createTestCharacter({ id: 'char-2' });
      const char3 = createTestCharacter({ id: 'char-3' });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2],
          [char3.id, char3]
        ]),
        party: {
          ...state.party,
          members: [char1.id, char2.id, char3.id],
          formation: {
            frontRow: [char1.id, char2.id],
            backRow: [char3.id]
          }
        }
      }));
    });

    it('should not allow first character to move up', () => {
      expect(component.canCharacterMoveUp('char-1')).toBe(false);
      expect(component.canCharacterMoveDown('char-1')).toBe(true);
    });

    it('should not allow last character to move down', () => {
      expect(component.canCharacterMoveUp('char-3')).toBe(true);
      expect(component.canCharacterMoveDown('char-3')).toBe(false);
    });

    it('should allow middle character to move both ways', () => {
      expect(component.canCharacterMoveUp('char-2')).toBe(true);
      expect(component.canCharacterMoveDown('char-2')).toBe(true);
    });

    it('should not allow single character to move either way', () => {
      gameStateService.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1'],
          formation: {
            frontRow: ['char-1'],
            backRow: []
          }
        }
      }));

      expect(component.canCharacterMoveUp('char-1')).toBe(false);
      expect(component.canCharacterMoveDown('char-1')).toBe(false);
    });
  });

  describe('onAddCharacter()', () => {
    it('should add OK character to empty party', () => {
      const character = createTestCharacter({
        id: 'char-1',
        name: 'Gandalf',
        status: CharacterStatus.OK,
        alignment: Alignment.NEUTRAL
      });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]])
      }));

      component.onAddCharacter(character.id);

      const state = gameStateService.state();
      expect(state.party.members).toContain(character.id);
      expect(state.party.formation.frontRow).toContain(character.id);
    });

    it('should add character to front row when front row has space', () => {
      const char1 = createTestCharacter({ id: 'char-1', alignment: Alignment.NEUTRAL });
      const char2 = createTestCharacter({ id: 'char-2', alignment: Alignment.NEUTRAL });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: {
          ...state.party,
          members: [char1.id],
          formation: {
            frontRow: [char1.id],
            backRow: []
          }
        }
      }));

      component.onAddCharacter(char2.id);

      const state = gameStateService.state();
      expect(state.party.formation.frontRow).toContain(char2.id);
      expect(state.party.formation.backRow).not.toContain(char2.id);
    });

    it('should add character to back row when front row is full', () => {
      const chars = Array.from({ length: 4 }, (_, i) =>
        createTestCharacter({ id: `char-${i}`, alignment: Alignment.NEUTRAL })
      );

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(chars.map(c => [c.id, c])),
        party: {
          ...state.party,
          members: [chars[0].id, chars[1].id, chars[2].id],
          formation: {
            frontRow: [chars[0].id, chars[1].id, chars[2].id],
            backRow: []
          }
        }
      }));

      component.onAddCharacter(chars[3].id);

      const state = gameStateService.state();
      expect(state.party.formation.backRow).toContain(chars[3].id);
      expect(state.party.formation.frontRow).not.toContain(chars[3].id);
    });

    it('should show error when adding non-existent character', () => {
      component.onAddCharacter('non-existent-id');
      expect(messageService.messageText()).toBe('Character not found');
    });

    it('should show error when party is full', () => {
      const chars = Array.from({ length: 7 }, (_, i) =>
        createTestCharacter({ id: `char-${i}`, alignment: Alignment.NEUTRAL })
      );

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(chars.map(c => [c.id, c])),
        party: {
          ...state.party,
          members: chars.slice(0, 6).map(c => c.id),
          formation: {
            frontRow: chars.slice(0, 3).map(c => c.id),
            backRow: chars.slice(3, 6).map(c => c.id)
          }
        }
      }));

      component.onAddCharacter(chars[6].id);

      expect(messageService.messageText()).toBe('Party is full (maximum 6 members)');
      expect(gameStateService.state().party.members.length).toBe(6);
    });

    it('should show error when adding DEAD character', () => {
      const deadChar = createTestCharacter({
        id: 'char-1',
        name: 'Dead Guy',
        status: CharacterStatus.DEAD
      });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[deadChar.id, deadChar]])
      }));

      component.onAddCharacter(deadChar.id);

      expect(messageService.messageText()).toContain('not available');
      expect(messageService.messageText()).toContain('DEAD');
      expect(gameStateService.state().party.members).not.toContain(deadChar.id);
    });

    it('should show error when adding Evil character to Good party', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      });
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [goodChar.id, goodChar],
          [evilChar.id, evilChar]
        ]),
        party: {
          ...state.party,
          members: [goodChar.id],
          formation: {
            frontRow: [goodChar.id],
            backRow: []
          }
        }
      }));

      component.onAddCharacter(evilChar.id);

      expect(messageService.messageText()).toBe('Good and Evil cannot party together');
      expect(gameStateService.state().party.members).not.toContain(evilChar.id);
    });

    it('should clear error message after 3 seconds', () => {
      jest.useFakeTimers();

      component.onAddCharacter('non-existent-id');
      expect(messageService.messageText()).toBe('Character not found');

      jest.advanceTimersByTime(3000);
      expect(messageService.hasMessage()).toBe(false);

      jest.useRealTimers();
    });

    it('should pool character gold to party when adding character (authentic Wizardry 1)', () => {
      // Create character with specific gold amount
      const character = createTestCharacter({
        id: 'char-with-gold',
        name: 'Rich Guy',
        status: CharacterStatus.OK,
        alignment: Alignment.NEUTRAL,
        gold: 150  // Character has 150 gold
      });

      // Start with party that has 100 gold
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]]),
        party: {
          ...state.party,
          gold: 100
        }
      }));

      component.onAddCharacter(character.id);

      const state = gameStateService.state();

      // Party gold should now be 100 + 150 = 250
      expect(state.party.gold).toBe(250);

      // Character's gold should now be 0 (pooled to party)
      const updatedChar = state.roster.get(character.id);
      expect(updatedChar?.gold).toBe(0);
    });

    it('should handle characters with no gold gracefully', () => {
      // Create character with no gold (edge case)
      const character = createTestCharacter({
        id: 'char-no-gold',
        name: 'Broke Guy',
        status: CharacterStatus.OK,
        alignment: Alignment.NEUTRAL,
        gold: 0
      });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]]),
        party: {
          ...state.party,
          gold: 500
        }
      }));

      component.onAddCharacter(character.id);

      const state = gameStateService.state();

      // Party gold should remain unchanged
      expect(state.party.gold).toBe(500);
      expect(state.party.members).toContain(character.id);
    });

  });

  describe('onRemoveCharacter()', () => {
    it('should remove character from party', () => {
      const character = createTestCharacter({ id: 'char-1', name: 'Gandalf' });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]]),
        party: {
          ...state.party,
          members: [character.id],
          formation: {
            frontRow: [character.id],
            backRow: []
          }
        }
      }));

      component.onRemoveCharacter(character.id);

      const state = gameStateService.state();
      expect(state.party.members).not.toContain(character.id);
      expect(state.party.formation.frontRow).not.toContain(character.id);
    });

    it('should remove character from back row', () => {
      const char1 = createTestCharacter({ id: 'char-1' });
      const char2 = createTestCharacter({ id: 'char-2' });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: {
          ...state.party,
          members: [char1.id, char2.id],
          formation: {
            frontRow: [char1.id],
            backRow: [char2.id]
          }
        }
      }));

      component.onRemoveCharacter(char2.id);

      const state = gameStateService.state();
      expect(state.party.members).not.toContain(char2.id);
      expect(state.party.formation.backRow).not.toContain(char2.id);
      expect(state.party.formation.frontRow).toContain(char1.id);
    });

    it('should show error when character not found', () => {
      component.onRemoveCharacter('non-existent-id');
      expect(messageService.messageText()).toBe('Character not found');
    });
  });

  describe('onMoveUp()', () => {
    it('should move character up in party order', () => {
      const char1 = createTestCharacter({ id: 'char-1' });
      const char2 = createTestCharacter({ id: 'char-2' });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: {
          ...state.party,
          members: [char1.id, char2.id],
          formation: {
            frontRow: [char1.id, char2.id],
            backRow: []
          }
        }
      }));

      component.onMoveUp(char2.id);

      const state = gameStateService.state();
      expect(state.party.members[0]).toBe(char2.id);
      expect(state.party.members[1]).toBe(char1.id);
    });
  });

  describe('onMoveDown()', () => {
    it('should move character down in party order', () => {
      const char1 = createTestCharacter({ id: 'char-1' });
      const char2 = createTestCharacter({ id: 'char-2' });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: {
          ...state.party,
          members: [char1.id, char2.id],
          formation: {
            frontRow: [char1.id, char2.id],
            backRow: []
          }
        }
      }));

      component.onMoveDown(char1.id);

      const state = gameStateService.state();
      expect(state.party.members[0]).toBe(char2.id);
      expect(state.party.members[1]).toBe(char1.id);
    });
  });

  describe('onInspect()', () => {
    it('should navigate to character inspection with correct params', () => {
      const character = createTestCharacter({ id: 'char-1' });

      component.onInspect(character.id);

      expect(navigationService.inspectCharacter).toHaveBeenCalledWith(character.id, 'tavern');
    });
  });

  describe('handleEscape()', () => {
    it('should navigate to castle menu', () => {
      component.handleEscape();
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('should navigate to castle menu on ESC key press', () => {
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(escapeEvent);
      fixture.detectChanges();

      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });
  });

  describe('error and success message display', () => {
    it('should display error message in template', () => {
      messageService.showError('Test error message');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const errorElement = compiled.querySelector('.message.error');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Test error message');
    });

    it('should display success message in template', () => {
      messageService.showSuccess('Test success message');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const successElement = compiled.querySelector('.message.success');
      expect(successElement).toBeTruthy();
      expect(successElement.textContent).toContain('Test success message');
    });

    it('should not display message when none', () => {
      messageService.clear();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const messageElement = compiled.querySelector('.message');
      expect(messageElement).toBeFalsy();
    });
  });
});
