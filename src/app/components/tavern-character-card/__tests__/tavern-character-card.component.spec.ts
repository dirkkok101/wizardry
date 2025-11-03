// src/app/components/tavern-character-card/__tests__/tavern-character-card.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TavernCharacterCardComponent } from '../tavern-character-card.component';
import { Character } from '../../../../types/Character';
import { Race } from '../../../../types/Race';
import { CharacterClass } from '../../../../types/CharacterClass';
import { Alignment } from '../../../../types/Alignment';
import { CharacterStatus } from '../../../../types/CharacterStatus';

describe('TavernCharacterCardComponent', () => {
  let component: TavernCharacterCardComponent;
  let fixture: ComponentFixture<TavernCharacterCardComponent>;

  const createTestCharacter = (): Character => ({
    id: 'test-char-1',
    name: 'Gandalf',
    race: Race.HUMAN,
    class: CharacterClass.MAGE,
    alignment: Alignment.GOOD,
    strength: 10,
    intelligence: 18,
    piety: 12,
    vitality: 14,
    agility: 10,
    luck: 8,
    level: 5,
    experience: 1000,
    age: 25,
    hp: 20,
    maxHp: 25,
    ac: 5,
    status: CharacterStatus.OK,
    vim: { current: 10, max: 10 },
    knownSpells: [],
    inventory: []
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TavernCharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TavernCharacterCardComponent);
    component = fixture.componentInstance;
    component.character = createTestCharacter();
    fixture.detectChanges();
  });

  describe('rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should display character name', () => {
      const compiled = fixture.nativeElement;
      const nameElement = compiled.querySelector('.character-name');
      expect(nameElement?.textContent).toContain('Gandalf');
    });

    it('should display character level and class', () => {
      const compiled = fixture.nativeElement;
      const classElement = compiled.querySelector('.character-class');
      expect(classElement?.textContent).toContain('Level 5');
      expect(classElement?.textContent).toContain('MAGE');
    });

    it('should display character race and alignment', () => {
      const compiled = fixture.nativeElement;
      const raceElement = compiled.querySelector('.character-race');
      expect(raceElement?.textContent).toContain('HUMAN');
      expect(raceElement?.textContent).toContain('GOOD');
    });

    it('should display character status', () => {
      const compiled = fixture.nativeElement;
      const statusElement = compiled.querySelector('.character-status');
      expect(statusElement?.textContent).toContain('OK');
    });
  });

  describe('button visibility based on isInParty', () => {
    it('should show Add button when character is not in party', () => {
      component.isInParty = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const addButton = compiled.querySelector('[data-action="add"]');
      const removeButton = compiled.querySelector('[data-action="remove"]');

      expect(addButton).toBeTruthy();
      expect(removeButton).toBeNull();
    });

    it('should show Remove button when character is in party', () => {
      component.isInParty = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const addButton = compiled.querySelector('[data-action="add"]');
      const removeButton = compiled.querySelector('[data-action="remove"]');

      expect(addButton).toBeNull();
      expect(removeButton).toBeTruthy();
    });

    it('should show Move Up/Down buttons only when character is in party', () => {
      component.isInParty = false;
      fixture.detectChanges();

      let compiled = fixture.nativeElement;
      expect(compiled.querySelector('[data-action="move-up"]')).toBeNull();
      expect(compiled.querySelector('[data-action="move-down"]')).toBeNull();

      component.isInParty = true;
      fixture.detectChanges();

      compiled = fixture.nativeElement;
      expect(compiled.querySelector('[data-action="move-up"]')).toBeTruthy();
      expect(compiled.querySelector('[data-action="move-down"]')).toBeTruthy();
    });

    it('should always show Inspect button regardless of party status', () => {
      component.isInParty = false;
      fixture.detectChanges();

      let compiled = fixture.nativeElement;
      expect(compiled.querySelector('[data-action="inspect"]')).toBeTruthy();

      component.isInParty = true;
      fixture.detectChanges();

      compiled = fixture.nativeElement;
      expect(compiled.querySelector('[data-action="inspect"]')).toBeTruthy();
    });
  });

  describe('event emissions', () => {
    it('should emit add event when Add button clicked', () => {
      component.isInParty = false;
      fixture.detectChanges();

      const addSpy = jest.fn();
      component.add.subscribe(addSpy);

      const addButton = fixture.nativeElement.querySelector('[data-action="add"]');
      addButton.click();

      expect(addSpy).toHaveBeenCalledWith('test-char-1');
    });

    it('should emit remove event when Remove button clicked', () => {
      component.isInParty = true;
      fixture.detectChanges();

      const removeSpy = jest.fn();
      component.remove.subscribe(removeSpy);

      const removeButton = fixture.nativeElement.querySelector('[data-action="remove"]');
      removeButton.click();

      expect(removeSpy).toHaveBeenCalledWith('test-char-1');
    });

    it('should emit moveUp event when Move Up button clicked', () => {
      component.isInParty = true;
      fixture.detectChanges();

      const moveUpSpy = jest.fn();
      component.moveUp.subscribe(moveUpSpy);

      const moveUpButton = fixture.nativeElement.querySelector('[data-action="move-up"]');
      moveUpButton.click();

      expect(moveUpSpy).toHaveBeenCalledWith('test-char-1');
    });

    it('should emit moveDown event when Move Down button clicked', () => {
      component.isInParty = true;
      fixture.detectChanges();

      const moveDownSpy = jest.fn();
      component.moveDown.subscribe(moveDownSpy);

      const moveDownButton = fixture.nativeElement.querySelector('[data-action="move-down"]');
      moveDownButton.click();

      expect(moveDownSpy).toHaveBeenCalledWith('test-char-1');
    });

    it('should emit inspect event when Inspect button clicked', () => {
      const inspectSpy = jest.fn();
      component.inspect.subscribe(inspectSpy);

      const inspectButton = fixture.nativeElement.querySelector('[data-action="inspect"]');
      inspectButton.click();

      expect(inspectSpy).toHaveBeenCalledWith('test-char-1');
    });
  });

  describe('disabled state handling', () => {
    beforeEach(() => {
      component.isInParty = true;
      fixture.detectChanges();
    });

    it('should disable Move Up button when canMoveUp is false', () => {
      component.canMoveUp = false;
      fixture.detectChanges();

      const moveUpButton = fixture.nativeElement.querySelector('[data-action="move-up"]');
      expect(moveUpButton.disabled).toBe(true);
    });

    it('should enable Move Up button when canMoveUp is true', () => {
      component.canMoveUp = true;
      fixture.detectChanges();

      const moveUpButton = fixture.nativeElement.querySelector('[data-action="move-up"]');
      expect(moveUpButton.disabled).toBe(false);
    });

    it('should disable Move Down button when canMoveDown is false', () => {
      component.canMoveDown = false;
      fixture.detectChanges();

      const moveDownButton = fixture.nativeElement.querySelector('[data-action="move-down"]');
      expect(moveDownButton.disabled).toBe(true);
    });

    it('should enable Move Down button when canMoveDown is true', () => {
      component.canMoveDown = true;
      fixture.detectChanges();

      const moveDownButton = fixture.nativeElement.querySelector('[data-action="move-down"]');
      expect(moveDownButton.disabled).toBe(false);
    });

    it('should not emit moveUp when button is disabled', () => {
      component.canMoveUp = false;
      fixture.detectChanges();

      const moveUpSpy = jest.fn();
      component.moveUp.subscribe(moveUpSpy);

      const moveUpButton = fixture.nativeElement.querySelector('[data-action="move-up"]');
      moveUpButton.click();

      // Disabled buttons don't fire click events in the DOM
      expect(moveUpButton.disabled).toBe(true);
    });

    it('should not emit moveDown when button is disabled', () => {
      component.canMoveDown = false;
      fixture.detectChanges();

      const moveDownSpy = jest.fn();
      component.moveDown.subscribe(moveDownSpy);

      const moveDownButton = fixture.nativeElement.querySelector('[data-action="move-down"]');
      moveDownButton.click();

      // Disabled buttons don't fire click events in the DOM
      expect(moveDownButton.disabled).toBe(true);
    });
  });
});
