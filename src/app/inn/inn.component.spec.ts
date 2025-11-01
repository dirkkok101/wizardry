import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { InnComponent } from './inn.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';

describe('InnComponent', () => {
  let component: InnComponent;
  let fixture: ComponentFixture<InnComponent>;
  let gameState: GameStateService;
  let router: Router;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    class: CharacterClass.MAGE,
    level: 5,
    hp: 15,
    maxHp: 25,
    status: 'OK',
    gold: 100,
    experience: 10000
  } as Character;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InnComponent]
    });

    fixture = TestBed.createComponent(InnComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Setup party with character
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter),
      party: {
        ...state.party,
        members: ['char-1']
      }
    }));
  });

  describe('initialization', () => {
    it('updates scene to INN on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.INN);
    });

    it('displays inn title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('INN');
    });

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(3);
      expect(component.menuItems[0].id).toBe('rest');
      expect(component.menuItems[1].id).toBe('stables');
      expect(component.menuItems[2].id).toBe('castle');
    });
  });

  describe('rest functionality', () => {
    it('restores all party HP to maximum', () => {
      component.handleMenuSelect('rest');

      const state = gameState.state();
      const character = state.roster.get('char-1')!;
      expect(character.hp).toBe(character.maxHp);
    });

    it('shows success message after resting', () => {
      component.handleMenuSelect('rest');
      expect(component.successMessage()).toBeTruthy();
      expect(component.successMessage()).toContain('rested');
    });

    it('costs 10 gold per party member', () => {
      const initialGold = gameState.party().gold || 0;
      component.handleMenuSelect('rest');

      const finalGold = gameState.party().gold || 0;
      expect(finalGold).toBe(initialGold - 10);
    });

    it('shows error when party cannot afford rest', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 5
        }
      }));

      component.handleMenuSelect('rest');
      expect(component.errorMessage()).toBeTruthy();
      expect(component.errorMessage()).toContain('afford');
    });

    it('shows error when no party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: []
        }
      }));

      component.handleMenuSelect('rest');
      expect(component.errorMessage()).toBeTruthy();
    });
  });

  describe('stables functionality', () => {
    it('shows stables view when selected', () => {
      component.handleMenuSelect('stables');
      expect(component.currentView()).toBe('stables');
    });

    it('displays party characters for stable boarding', () => {
      component.currentView.set('stables');
      fixture.detectChanges();

      expect(component.partyCharacters().length).toBe(1);
    });
  });

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
