import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ShopComponent } from './shop.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('ShopComponent', () => {
  let component: ShopComponent;
  let fixture: ComponentFixture<ShopComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ShopComponent]
    });

    fixture = TestBed.createComponent(ShopComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('updates scene to SHOP on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.SHOP);
    });

    it('displays shop title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('BOLTAC');
    });

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(4);
      expect(component.menuItems[0].id).toBe('buy');
      expect(component.menuItems[1].id).toBe('sell');
      expect(component.menuItems[2].id).toBe('identify');
      expect(component.menuItems[3].id).toBe('castle');
    });
  });

  describe('placeholder services', () => {
    it('shows buy placeholder when selected', () => {
      component.handleMenuSelect('buy');
      expect(component.currentView()).toBe('buy');
    });

    it('shows sell placeholder when selected', () => {
      component.handleMenuSelect('sell');
      expect(component.currentView()).toBe('sell');
    });

    it('shows identify placeholder when selected', () => {
      component.handleMenuSelect('identify');
      expect(component.currentView()).toBe('identify');
    });
  });

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
