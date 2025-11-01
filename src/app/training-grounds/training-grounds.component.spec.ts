import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TrainingGroundsComponent } from './training-grounds.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('TrainingGroundsComponent', () => {
  let component: TrainingGroundsComponent;
  let fixture: ComponentFixture<TrainingGroundsComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TrainingGroundsComponent]
    });

    fixture = TestBed.createComponent(TrainingGroundsComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('updates scene to TRAINING_GROUNDS on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.TRAINING_GROUNDS);
    });

    it('displays training grounds title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('TRAINING');
    });

    it('shows placeholder message', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Character creation will be implemented in Phase 5');
    });
  });

  describe('navigation', () => {
    it('returns to castle when back button clicked', () => {
      const compiled = fixture.nativeElement;
      fixture.detectChanges();

      const backButton = compiled.querySelector('.back-btn');
      backButton.click();

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
