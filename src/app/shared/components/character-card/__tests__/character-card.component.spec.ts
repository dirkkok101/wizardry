import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCardComponent } from '../character-card.component';
import { createTestCharacter } from '@testing/test-factories';
import { CharacterStatus } from '@models/CharacterStatus';

describe('CharacterCardComponent', () => {
  let component: CharacterCardComponent;
  let fixture: ComponentFixture<CharacterCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('header rendering', () => {
    beforeEach(() => {
      component.character = createTestCharacter({ name: 'Gandalf' });
    });

    it('displays character name prominently', () => {
      fixture.detectChanges();

      const name = fixture.nativeElement.querySelector('.character-name');
      expect(name.textContent.trim()).toBe('Gandalf');
    });

    it('displays status badge in header', () => {
      component.character = createTestCharacter({ status: CharacterStatus.OK });
      fixture.detectChanges();

      const statusBadge = fixture.nativeElement.querySelector('app-status-badge');
      expect(statusBadge).toBeTruthy();
    });
  });

  describe('field visibility', () => {
    beforeEach(() => {
      component.character = createTestCharacter({
        race: 'HUMAN',
        class: 'FIGHTER',
        level: 5,
        hp: 30,
        maxHp: 40,
        ac: 3,
        alignment: 'GOOD'
      });
    });

    it('displays only specified visible fields', () => {
      component.visibleFields = ['race', 'class'];
      fixture.detectChanges();

      const statsComponent = fixture.nativeElement.querySelector('app-character-stats');
      expect(statsComponent).toBeTruthy();
    });

    it('displays default fields when visibleFields is undefined', () => {
      component.visibleFields = undefined;
      fixture.detectChanges();

      // Should show default fields: class, level, hp
      const statsComponent = fixture.nativeElement.querySelector('app-character-stats');
      expect(statsComponent).toBeTruthy();
    });

    it('hides stats section when visibleFields is empty array', () => {
      component.visibleFields = [];
      fixture.detectChanges();

      const statsComponent = fixture.nativeElement.querySelector('app-character-stats');
      expect(statsComponent).toBeFalsy();
    });
  });

  describe('actions rendering', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
    });

    it('displays action buttons when provided', () => {
      component.actions = [
        { type: 'inspect' },
        { type: 'delete', variant: 'danger' }
      ];
      fixture.detectChanges();

      const actionsComponent = fixture.nativeElement.querySelector('app-character-actions');
      expect(actionsComponent).toBeTruthy();
    });

    it('hides actions section when no actions provided', () => {
      component.actions = [];
      fixture.detectChanges();

      const actionsComponent = fixture.nativeElement.querySelector('app-character-actions');
      expect(actionsComponent).toBeFalsy();
    });

    it('hides actions section when actions is undefined', () => {
      component.actions = undefined;
      fixture.detectChanges();

      const actionsComponent = fixture.nativeElement.querySelector('app-character-actions');
      expect(actionsComponent).toBeFalsy();
    });
  });

  describe('variant styling', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
    });

    it('applies default variant by default', () => {
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.character-card');
      expect(card.classList.contains('default')).toBe(true);
    });

    it('applies compact variant when specified', () => {
      component.variant = 'compact';
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.character-card');
      expect(card.classList.contains('compact')).toBe(true);
    });
  });

  describe('event forwarding', () => {
    beforeEach(() => {
      component.character = createTestCharacter({ id: 'test-123' });
      component.actions = [{ type: 'inspect' }];
    });

    it('forwards actionClick events from CharacterActionsComponent', (done) => {
      fixture.detectChanges();

      component.actionClick.subscribe(event => {
        expect(event.characterId).toBe('test-123');
        expect(event.actionType).toBe('inspect');
        done();
      });

      // Trigger button click
      const button = fixture.nativeElement.querySelector('button');
      button.click();
    });
  });

  describe('layout structure', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
      component.visibleFields = ['class', 'level'];
      component.actions = [{ type: 'inspect' }];
    });

    it('renders header, stats, and actions sections', () => {
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.card-header');
      const stats = fixture.nativeElement.querySelector('.card-stats');
      const actions = fixture.nativeElement.querySelector('.card-actions');

      expect(header).toBeTruthy();
      expect(stats).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('includes dividers between sections', () => {
      fixture.detectChanges();

      const dividers = fixture.nativeElement.querySelectorAll('.card-divider');
      expect(dividers.length).toBeGreaterThan(0);
    });
  });
});
