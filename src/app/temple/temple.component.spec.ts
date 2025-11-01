import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TempleComponent } from './temple.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('TempleComponent', () => {
  let component: TempleComponent;
  let fixture: ComponentFixture<TempleComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TempleComponent]
    });

    fixture = TestBed.createComponent(TempleComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
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

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(2);
      expect(component.menuItems[0].id).toBe('healing');
      expect(component.menuItems[1].id).toBe('castle');
    });
  });

  describe('placeholder services', () => {
    it('shows healing placeholder when selected', () => {
      component.handleMenuSelect('healing');
      expect(component.currentView()).toBe('healing');
    });

    it('displays placeholder message for healing services', () => {
      component.currentView.set('healing');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Healing services will be implemented in Phase 5');
    });
  });

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
