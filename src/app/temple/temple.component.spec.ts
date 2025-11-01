import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TempleComponent } from './temple.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { CharacterStatus } from '../../types/CharacterStatus';
import { ServiceType } from '../../types/ServiceType';
import { Race } from '../../types/Race';
import { Alignment } from '../../types/Alignment';

describe('TempleComponent', () => {
  let component: TempleComponent;
  let fixture: ComponentFixture<TempleComponent>;
  let gameState: GameStateService;
  let router: Router;

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
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

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

  describe('character filtering', () => {
    it('displays only afflicted characters', () => {
      const okChar: Character = {
        ...mockCharacter,
        id: 'char-2',
        status: CharacterStatus.OK
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster)
          .set('char-1', mockCharacter)
          .set('char-2', okChar),
        party: {
          ...state.party,
          members: ['char-1', 'char-2']
        }
      }));

      component.handleMenuSelect('healing');
      fixture.detectChanges();

      const afflicted = component.afflictedCharacters();
      expect(afflicted.length).toBe(1);
      expect(afflicted[0].id).toBe('char-1');
    });

    it('filters characters by service type', () => {
      const deadChar: Character = {
        ...mockCharacter,
        id: 'char-2',
        status: CharacterStatus.DEAD
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster)
          .set('char-1', mockCharacter) // POISONED
          .set('char-2', deadChar), // DEAD
        party: {
          ...state.party,
          members: ['char-1', 'char-2']
        }
      }));

      // Select healing services - should see POISONED character
      component.handleMenuSelect('healing');
      const filtered = component.getFilteredCharacters(ServiceType.CURE_POISON);
      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe(CharacterStatus.POISONED);
    });
  });

  describe('service execution', () => {
    it('deducts tithe from party gold', () => {
      const initialGold = gameState.party().gold || 0;

      component.executeService('char-1', ServiceType.CURE_POISON);

      const finalGold = gameState.party().gold || 0;
      const expectedCost = 50; // 10 × level 5

      expect(finalGold).toBe(initialGold - expectedCost);
    });

    it('cures poison when service succeeds', () => {
      component.executeService('char-1', ServiceType.CURE_POISON);

      const char = gameState.state().roster.get('char-1')!;
      expect(char.status).toBe(CharacterStatus.OK);
    });

    it('shows success message after successful service', () => {
      component.executeService('char-1', ServiceType.CURE_POISON);

      expect(component.successMessage()).toBeTruthy();
      expect(component.successMessage()).toContain('cured');
    });

    it('deducts gold even on failure', () => {
      // Mock resurrection failure
      jest.spyOn(Math, 'random').mockReturnValue(0.99); // Force failure

      const deadChar: Character = {
        ...mockCharacter,
        status: CharacterStatus.DEAD
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', deadChar),
        party: {
          ...state.party,
          gold: 5000
        }
      }));

      const initialGold = gameState.party().gold || 0;

      component.executeService('char-1', ServiceType.RESURRECT);

      const finalGold = gameState.party().gold || 0;
      const expectedCost = 1250; // 250 × level 5

      expect(finalGold).toBe(initialGold - expectedCost);
    });

    it('shows error when party cannot afford service', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 10 // Not enough for cure poison (50 gold)
        }
      }));

      component.executeService('char-1', ServiceType.CURE_POISON);

      expect(component.errorMessage()).toBeTruthy();
      expect(component.errorMessage()).toContain('afford');
    });
  });

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
