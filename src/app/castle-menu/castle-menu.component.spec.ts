import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CastleMenuComponent } from './castle-menu.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('CastleMenuComponent', () => {
  let component: CastleMenuComponent;
  let fixture: ComponentFixture<CastleMenuComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CastleMenuComponent]
    });

    fixture = TestBed.createComponent(CastleMenuComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('displays castle menu title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('CASTLE');
    });

    it('shows all 5 service options', () => {
      fixture.detectChanges();

      expect(component.menuItems.length).toBe(5);
      expect(component.menuItems[0].label).toContain('TAVERN');
      expect(component.menuItems[1].label).toContain('TEMPLE');
      expect(component.menuItems[2].label).toContain('TRADING POST');
      expect(component.menuItems[3].label).toContain('INN');
      expect(component.menuItems[4].label).toContain('EDGE OF TOWN');
    });

    it('updates game state to CASTLE_MENU on init', () => {
      component.ngOnInit();

      expect(gameState.currentScene()).toBe(SceneType.CASTLE_MENU);
    });
  });

  describe('menu navigation', () => {
    it('navigates to tavern when selected', () => {
      component.handleMenuSelect('tavern');

      expect(router.navigate).toHaveBeenCalledWith(['/tavern']);
    });

    it('navigates to temple when selected', () => {
      component.handleMenuSelect('temple');

      expect(router.navigate).toHaveBeenCalledWith(['/temple']);
    });

    it('navigates to shop when selected', () => {
      component.handleMenuSelect('shop');

      expect(router.navigate).toHaveBeenCalledWith(['/shop']);
    });

    it('navigates to inn when selected', () => {
      component.handleMenuSelect('inn');

      expect(router.navigate).toHaveBeenCalledWith(['/inn']);
    });

    it('navigates to edge of town when selected', () => {
      component.handleMenuSelect('edge-of-town');

      expect(router.navigate).toHaveBeenCalledWith(['/edge-of-town']);
    });
  });

  describe('keyboard shortcuts', () => {
    it('supports (G) for tavern', () => {
      expect(component.menuItems[0].shortcut).toBe('G');
    });

    it('supports (T) for temple', () => {
      expect(component.menuItems[1].shortcut).toBe('T');
    });

    it('supports (B) for shop', () => {
      expect(component.menuItems[2].shortcut).toBe('B');
    });

    it('supports (A) for inn', () => {
      expect(component.menuItems[3].shortcut).toBe('A');
    });

    it('supports (E) for edge of town', () => {
      expect(component.menuItems[4].shortcut).toBe('E');
    });
  });
});
