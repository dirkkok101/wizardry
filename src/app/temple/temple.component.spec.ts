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

  describe('footerMenuItems', () => {
    it('has 5 menu items with correct shortcuts', () => {
      fixture.detectChanges();
      const items = component.footerMenuItems();

      expect(items.length).toBe(5);
      expect(items[0]).toEqual({ id: 'cure-poison', label: 'Cure Poison', shortcut: 'P', enabled: expect.any(Boolean) });
      expect(items[1]).toEqual({ id: 'cure-paralysis', label: 'Cure Paralysis', shortcut: 'A', enabled: expect.any(Boolean) });
      expect(items[2]).toEqual({ id: 'resurrect', label: 'Resurrect', shortcut: 'R', enabled: expect.any(Boolean) });
      expect(items[3]).toEqual({ id: 'restore', label: 'Restore', shortcut: 'S', enabled: expect.any(Boolean) });
      expect(items[4]).toEqual({ id: 'return', label: 'Return to Castle (ESC)', shortcut: 'ESC', enabled: true });
    });

    it('enables Cure Poison when character is POISONED', () => {
      fixture.detectChanges();
      const items = component.footerMenuItems();
      const curePoison = items.find(i => i.id === 'cure-poison');
      expect(curePoison?.enabled).toBe(true);
    });

    it('disables Cure Poison when no character is POISONED', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          status: CharacterStatus.DEAD
        })
      }));
      fixture.detectChanges();

      const items = component.footerMenuItems();
      const curePoison = items.find(i => i.id === 'cure-poison');
      expect(curePoison?.enabled).toBe(false);
    });
  });

  describe('confirmation dialog', () => {
    it('shows confirmation when service selected', () => {
      expect(component.showConfirmation()).toBe(false);

      component.handleFooterAction('cure-poison');

      expect(component.showConfirmation()).toBe(true);
      expect(component.confirmationMessage()).toContain('Gandalf');
      expect(component.confirmationMessage()).toContain('poison');
    });

    it('hides confirmation when cancelled', () => {
      component.handleFooterAction('cure-poison');
      expect(component.showConfirmation()).toBe(true);

      component.cancelService();

      expect(component.showConfirmation()).toBe(false);
    });
  });

  describe('confirmService', () => {
    it('executes Cure Poison service and updates state', () => {
      component.handleFooterAction('cure-poison');
      const initialStatus = gameState.state().roster.get('char-1')?.status;
      expect(initialStatus).toBe(CharacterStatus.POISONED);

      component.confirmService();

      const updatedStatus = gameState.state().roster.get('char-1')?.status;
      expect(updatedStatus).toBe(CharacterStatus.OK);
      expect(component.showConfirmation()).toBe(false);
    });

    it('deducts gold from party', () => {
      const initialGold = gameState.state().party.gold;
      component.handleFooterAction('cure-poison');

      component.confirmService();

      const finalGold = gameState.state().party.gold;
      expect(finalGold).toBeLessThan(initialGold);
    });

    it('shows error when insufficient gold', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, gold: 0 }
      }));

      component.handleFooterAction('cure-poison');
      component.confirmService();

      expect(component.errorMessage()).toContain('Cannot afford');
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

    it('renders character cards for afflicted characters', () => {
      fixture.detectChanges();
      const cards = fixture.nativeElement.querySelectorAll('app-character-card');
      expect(cards.length).toBe(1); // One POISONED character
    });
  });
});
