import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCardWrapperComponent } from '../character-card-wrapper.component';
import { CharacterCardComponent } from '../../character-card/character-card.component';
import { CharacterCardActionsComponent, ActionType } from '../../character-card-actions/character-card-actions.component';
import { createTestCharacter } from '../../../test-helpers/test-factories';

describe('CharacterCardWrapperComponent', () => {
  let component: CharacterCardWrapperComponent;
  let fixture: ComponentFixture<CharacterCardWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CharacterCardWrapperComponent,
        CharacterCardComponent,
        CharacterCardActionsComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardWrapperComponent);
    component = fixture.componentInstance;
    component.character = createTestCharacter({ name: 'Test Hero' });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders CharacterCardComponent with character', () => {
    component.actions = ['inspect'];
    fixture.detectChanges();

    const cardElement = fixture.nativeElement.querySelector('app-character-card');
    expect(cardElement).toBeTruthy();
  });

  it('renders CharacterCardActionsComponent with specified actions', () => {
    component.actions = ['inspect', 'add'];
    fixture.detectChanges();

    const actionsElement = fixture.nativeElement.querySelector('app-character-card-actions');
    expect(actionsElement).toBeTruthy();
  });

  it('emits inspect event when actions component emits inspectClick', () => {
    component.actions = ['inspect'];
    fixture.detectChanges();

    const emitSpy = jest.spyOn(component.inspect, 'emit');
    component.onInspect();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('emits add event when actions component emits addClick', () => {
    component.actions = ['add'];
    fixture.detectChanges();

    const emitSpy = jest.spyOn(component.add, 'emit');
    component.onAdd();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('passes disabledActions to CharacterCardActionsComponent', () => {
    component.actions = ['moveUp', 'moveDown'];
    component.disabledActions = ['moveUp'];
    fixture.detectChanges();

    const actionsComponent = fixture.debugElement.query(
      (el) => el.componentInstance instanceof CharacterCardActionsComponent
    );
    expect(actionsComponent.componentInstance.disabledActions).toEqual(['moveUp']);
  });
});
