import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EdgeOfTownComponent } from './edge-of-town.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

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
    it('displays edge of town title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('EDGE OF TOWN');
    });

    it('shows all 5 menu options', () => {
      fixture.detectChanges();

      expect(component.menuItems.length).toBe(5);
      expect(component.menuItems[0].label).toContain('TRAINING GROUNDS');
      expect(component.menuItems[1].label).toContain('MAZE');
      expect(component.menuItems[2].label).toContain('CASTLE');
      expect(component.menuItems[3].label).toContain('UTILITIES');
      expect(component.menuItems[4].label).toContain('LEAVE GAME');
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

  describe('menu navigation', () => {
    it('navigates to training grounds when selected', () => {
      component.handleMenuSelect('training-grounds');

      expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });

    it('navigates to maze when party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: ['char-1'] }
      }));

      component.handleMenuSelect('maze');

      expect(router.navigate).toHaveBeenCalledWith(['/camp']);
    });

    it('shows error when entering maze without party', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: [] }
      }));

      component.handleMenuSelect('maze');

      expect(router.navigate).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBeTruthy();
    });

    it('navigates to castle when selected', () => {
      component.handleMenuSelect('castle');

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('navigates to utilities when selected', () => {
      component.handleMenuSelect('utilities');

      expect(router.navigate).toHaveBeenCalledWith(['/utilities']);
    });
  });

  describe('leave game', () => {
    it('shows confirmation dialog', () => {
      component.handleMenuSelect('leave-game');

      expect(component.showExitConfirmation()).toBe(true);
    });

    it('cancels exit when user chooses No', () => {
      component.handleMenuSelect('leave-game');
      component.cancelExit();

      expect(component.showExitConfirmation()).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
