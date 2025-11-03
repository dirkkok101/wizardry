import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCardActionsComponent, ActionType } from '../character-card-actions.component';

describe('CharacterCardActionsComponent', () => {
  let component: CharacterCardActionsComponent;
  let fixture: ComponentFixture<CharacterCardActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardActionsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardActionsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders buttons for specified actions', () => {
    component.actions = ['inspect', 'add'];
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent.trim()).toBe('Inspect');
    expect(buttons[1].textContent.trim()).toBe('Add');
  });

  it('emits inspect event when inspect button clicked', () => {
    component.actions = ['inspect'];
    fixture.detectChanges();

    const emitSpy = jest.spyOn(component.inspectClick, 'emit');
    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('disables button when action is in disabledActions', () => {
    component.actions = ['moveUp', 'moveDown'];
    component.disabledActions = ['moveUp'];
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);
  });

  it('renders all action types correctly', () => {
    component.actions = ['inspect', 'add', 'remove', 'moveUp', 'moveDown'];
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(5);
    expect(buttons[0].textContent.trim()).toBe('Inspect');
    expect(buttons[1].textContent.trim()).toBe('Add');
    expect(buttons[2].textContent.trim()).toBe('Remove');
    expect(buttons[3].textContent.trim()).toBe('↑');
    expect(buttons[4].textContent.trim()).toBe('↓');
  });
});
