import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TavernComponent } from './tavern.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { Alignment } from '../../types/Alignment';
import { CharacterStatus } from '../../types/CharacterStatus';
import { createTestCharacter } from '../../test-helpers/test-factories';

describe('TavernComponent', () => {
  let component: TavernComponent;
  let fixture: ComponentFixture<TavernComponent>;
  let gameState: GameStateService;
  let router: Router;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    class: CharacterClass.MAGE,
    level: 5,
    hp: 20,
    maxHp: 25,
    status: 'OK',
    gold: 100
  } as Character;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TavernComponent]
    });

    fixture = TestBed.createComponent(TavernComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Add mock character to roster
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter)
    }));
  });

  describe('initialization', () => {
    it('updates scene to TAVERN on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.TAVERN);
    });

    it('displays tavern title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('TAVERN');
    });

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(4);
      expect(component.menuItems[0].id).toBe('add-character');
      expect(component.menuItems[1].id).toBe('remove-character');
      expect(component.menuItems[2].id).toBe('divvy-gold');
      expect(component.menuItems[3].id).toBe('castle');
    });
  });

  describe('party management', () => {
    it('displays current party members', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1']
        }
      }));

      fixture.detectChanges();
      expect(component.currentParty().members.length).toBe(1);
    });

    it('shows add character view when selected', () => {
      component.handleMenuSelect('add-character');
      fixture.detectChanges();

      expect(component.currentView()).toBe('add');
    });

    it('shows remove character view when selected', () => {
      component.handleMenuSelect('remove-character');
      fixture.detectChanges();

      expect(component.currentView()).toBe('remove');
    });
  });

  describe('adding characters', () => {
    beforeEach(() => {
      component.currentView.set('add');
      fixture.detectChanges();
    });

    it('adds character to party when selected', () => {
      component.handleAddCharacter('char-1');

      const party = gameState.party();
      expect(party.members).toContain('char-1');
    });

    it('shows error when party is full (6 members)', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']
        }
      }));

      component.handleAddCharacter('char-1');

      expect(component.errorMessage()).toBeTruthy();
      expect(component.errorMessage()).toContain('full');
    });

    it('filters out characters already in party', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1']
        }
      }));

      fixture.detectChanges();

      const availableChars = component.availableCharacters();
      expect(availableChars.some(c => c.id === 'char-1')).toBe(false);
    });
  });

  describe('handleAddCharacter', () => {
    it('adds character to empty party', () => {
      const character = createTestCharacter({
        id: 'char-1',
        alignment: Alignment.GOOD,
        status: CharacterStatus.OK
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]])
      }));

      component.handleAddCharacter(character.id);

      const party = gameState.party();
      expect(party.members).toContain(character.id);
      expect(party.members.length).toBe(1);
    });

    it('shows error when adding to full party', () => {
      const characters = Array.from({ length: 6 }, (_, i) =>
        createTestCharacter({ id: `char-${i}`, alignment: Alignment.NEUTRAL })
      );
      const newChar = createTestCharacter({ id: 'char-7', alignment: Alignment.NEUTRAL });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([
          ...characters.map(c => [c.id, c] as const),
          [newChar.id, newChar]
        ]),
        party: {
          ...state.party,
          members: characters.map(c => c.id)
        }
      }));

      component.handleAddCharacter(newChar.id);

      expect(component.errorMessage()).toBe('Party is full (maximum 6 members)');
      const party = gameState.party();
      expect(party.members.length).toBe(6);
    });

    it('shows error when adding Evil character to Good party', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      });
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[goodChar.id, goodChar], [evilChar.id, evilChar]]),
        party: {
          ...state.party,
          members: [goodChar.id]
        }
      }));

      component.handleAddCharacter(evilChar.id);

      expect(component.errorMessage()).toBe('Good and Evil cannot party together');
      const party = gameState.party();
      expect(party.members).not.toContain(evilChar.id);
    });

    it('shows error when adding DEAD character', () => {
      const deadChar = createTestCharacter({
        id: 'dead-1',
        status: CharacterStatus.DEAD
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[deadChar.id, deadChar]])
      }));

      component.handleAddCharacter(deadChar.id);

      expect(component.errorMessage()).toContain('not available');
      const party = gameState.party();
      expect(party.members).not.toContain(deadChar.id);
    });

    it('returns to main view after successful add', () => {
      const character = createTestCharacter({
        id: 'char-1',
        status: CharacterStatus.OK
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]])
      }));
      component.currentView.set('add');

      component.handleAddCharacter(character.id);

      expect(component.currentView()).toBe('main');
    });
  });

  describe('removing characters', () => {
    beforeEach(() => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1']
        }
      }));
      component.currentView.set('remove');
      fixture.detectChanges();
    });

    it('removes character from party when selected', () => {
      component.handleRemoveCharacter('char-1');

      const party = gameState.party();
      expect(party.members).not.toContain('char-1');
    });

    it('returns to main view after removal', () => {
      component.handleRemoveCharacter('char-1');
      expect(component.currentView()).toBe('main');
    });
  });

  describe('handleDivvyGold', () => {
    it('distributes gold equally to all party members', () => {
      const char1 = createTestCharacter({ id: 'char-1', gold: 10 });
      const char2 = createTestCharacter({ id: 'char-2', gold: 20 });
      const char3 = createTestCharacter({ id: 'char-3', gold: 5 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2],
          [char3.id, char3]
        ]),
        party: {
          ...state.party,
          members: [char1.id, char2.id, char3.id],
          gold: 99
        }
      }));

      component.handleDivvyGold();

      const updatedState = gameState.state();
      expect(updatedState.party.gold).toBe(0);
      expect(updatedState.roster.get('char-1')!.gold).toBe(43); // 10 + 33
      expect(updatedState.roster.get('char-2')!.gold).toBe(53); // 20 + 33
      expect(updatedState.roster.get('char-3')!.gold).toBe(38); // 5 + 33
    });

    it('shows success message after divvy', () => {
      const char1 = createTestCharacter({ id: 'char-1', gold: 0 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char1.id, char1]]),
        party: {
          ...state.party,
          members: [char1.id],
          gold: 50
        }
      }));

      component.handleDivvyGold();

      expect(component.successMessage()).toBe('Gold distributed: 50 gold per member');
      expect(component.errorMessage()).toBeNull();
    });

    it('shows error when party has no gold', () => {
      const char1 = createTestCharacter({ id: 'char-1' });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[char1.id, char1]]),
        party: {
          ...state.party,
          members: [char1.id],
          gold: 0
        }
      }));

      component.handleDivvyGold();

      expect(component.errorMessage()).toBe('No gold to distribute');
      expect(component.successMessage()).toBeNull();
    });

    it('shows error when party is empty', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: [],
          gold: 100
        }
      }));

      component.handleDivvyGold();

      expect(component.errorMessage()).toBe('No party members to distribute gold to');
    });
  });

  describe('handleInspectCharacter', () => {
    it('navigates to character inspection for valid party member', () => {
      const character = createTestCharacter({ id: 'char-1' });
      gameState.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]]),
        party: {
          ...state.party,
          members: [character.id]
        }
      }));
      const navigateSpy = jest.spyOn(router, 'navigate');

      component.handleInspectCharacter(character.id);

      expect(navigateSpy).toHaveBeenCalledWith(['/character-inspection'], {
        queryParams: { characterId: character.id, returnTo: 'tavern' }
      });
    });

    it('shows error when character not in party', () => {
      component.handleInspectCharacter('non-existent-id');

      expect(component.errorMessage()).toBe('Character not found in party');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('shows error when party is empty', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: []
        }
      }));

      component.handleInspectCharacter('char-1');

      expect(component.errorMessage()).toBe('Character not found in party');
    });
  });

  describe('navigation', () => {
    it('returns to castle menu when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
