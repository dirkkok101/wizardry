import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterActionsComponent } from '../character-actions.component';
import { CharacterAction } from '@types/CharacterCardTypes';

describe('CharacterActionsComponent', () => {
  let component: CharacterActionsComponent;
  let fixture: ComponentFixture<CharacterActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterActionsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterActionsComponent);
    component = fixture.componentInstance;
    component.characterId = 'test-char-123';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('button rendering', () => {
    it('renders all provided actions', () => {
      component.actions = [
        { type: 'inspect' },
        { type: 'add' },
        { type: 'delete' }
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBe(3);
      expect(buttons[0].textContent.trim()).toBe('Inspect');
      expect(buttons[1].textContent.trim()).toBe('Add');
      expect(buttons[2].textContent.trim()).toBe('Delete');
    });

    it('uses custom label when provided', () => {
      component.actions = [
        { type: 'inspect', label: 'View Details' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent.trim()).toBe('View Details');
    });

    it('uses default labels when not provided', () => {
      component.actions = [
        { type: 'moveUp' },
        { type: 'moveDown' }
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons[0].textContent.trim()).toBe('↑');
      expect(buttons[1].textContent.trim()).toBe('↓');
    });
  });

  describe('button state', () => {
    it('disables buttons when enabled=false', () => {
      component.actions = [
        { type: 'inspect', enabled: false }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);
    });

    it('enables buttons by default', () => {
      component.actions = [
        { type: 'inspect' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(false);
    });

    it('enables buttons when enabled=true', () => {
      component.actions = [
        { type: 'inspect', enabled: true }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(false);
    });
  });

  describe('button styling', () => {
    it('applies default variant by default', () => {
      component.actions = [
        { type: 'inspect' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('default')).toBe(true);
      expect(button.classList.contains('danger')).toBe(false);
    });

    it('applies danger variant when specified', () => {
      component.actions = [
        { type: 'delete', variant: 'danger' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('danger')).toBe(true);
    });
  });

  describe('event emission', () => {
    it('emits actionClick with characterId and actionType', () => {
      component.actions = [
        { type: 'inspect' }
      ];
      fixture.detectChanges();

      let emittedEvent: any;
      component.actionClick.subscribe(event => {
        emittedEvent = event;
      });

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(emittedEvent).toEqual({
        characterId: 'test-char-123',
        actionType: 'inspect'
      });
    });

    it('emits correct actionType for each button', () => {
      component.actions = [
        { type: 'add' },
        { type: 'remove' }
      ];
      fixture.detectChanges();

      const events: any[] = [];
      component.actionClick.subscribe(event => {
        events.push(event);
      });

      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons[0].click();
      buttons[1].click();

      expect(events[0].actionType).toBe('add');
      expect(events[1].actionType).toBe('remove');
    });

    it('does not emit when button is disabled', () => {
      component.actions = [
        { type: 'inspect', enabled: false }
      ];
      fixture.detectChanges();

      let emitted = false;
      component.actionClick.subscribe(() => {
        emitted = true;
      });

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(emitted).toBe(false);
    });
  });

  describe('empty actions', () => {
    it('renders nothing when actions array is empty', () => {
      component.actions = [];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });
  });
});
