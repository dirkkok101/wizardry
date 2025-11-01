import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TavernComponent } from './tavern.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';

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
      expect(component.menuItems.length).toBe(3);
      expect(component.menuItems[0].id).toBe('add-character');
      expect(component.menuItems[1].id).toBe('remove-character');
      expect(component.menuItems[2].id).toBe('castle');
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

  describe('navigation', () => {
    it('returns to castle menu when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
