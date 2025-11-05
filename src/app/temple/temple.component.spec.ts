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

  describe('integration: full service flow', () => {
    it('completes Cure Poison flow from menu to state update', () => {
      fixture.detectChanges();

      // Verify character is poisoned
      expect(gameState.state().roster.get('char-1')?.status).toBe(CharacterStatus.POISONED);

      // Verify menu has Cure Poison enabled
      const items = component.footerMenuItems();
      const curePoison = items.find(i => i.id === 'cure-poison');
      expect(curePoison?.enabled).toBe(true);

      // Select Cure Poison
      component.handleFooterAction('cure-poison');
      expect(component.showConfirmation()).toBe(true);

      // Confirm service
      component.confirmService();

      // Verify character is cured
      expect(gameState.state().roster.get('char-1')?.status).toBe(CharacterStatus.OK);
      expect(component.showConfirmation()).toBe(false);

      // Verify menu now has Cure Poison disabled
      fixture.detectChanges();
      const updatedItems = component.footerMenuItems();
      const updatedCurePoison = updatedItems.find(i => i.id === 'cure-poison');
      expect(updatedCurePoison?.enabled).toBe(false);
    });
  });

  describe('handleEscape', () => {
    it('navigates to castle menu when no confirmation dialog is open', () => {
      expect(component.showConfirmation()).toBe(false);

      component.handleEscape();

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('does not navigate when confirmation dialog is open', () => {
      component.handleFooterAction('cure-poison');
      expect(component.showConfirmation()).toBe(true);

      component.handleEscape();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
