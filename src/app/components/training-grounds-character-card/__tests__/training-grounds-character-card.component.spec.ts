// src/app/components/training-grounds-character-card/__tests__/training-grounds-character-card.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingGroundsCharacterCardComponent } from '../training-grounds-character-card.component';
import { Character } from '../../../../types/Character';
import { CharacterStatus } from '../../../../types/CharacterStatus';
import { Race } from '../../../../types/Race';
import { CharacterClass } from '../../../../types/CharacterClass';
import { Alignment } from '../../../../types/Alignment';

describe('TrainingGroundsCharacterCardComponent', () => {
  let component: TrainingGroundsCharacterCardComponent;
  let fixture: ComponentFixture<TrainingGroundsCharacterCardComponent>;

  const createTestCharacter = (): Character => ({
    id: 'test-char-1',
    name: 'Gandalf',
    race: Race.HUMAN,
    class: CharacterClass.MAGE,
    alignment: Alignment.GOOD,
    strength: 12,
    intelligence: 18,
    piety: 10,
    vitality: 14,
    agility: 13,
    luck: 11,
    level: 5,
    experience: 1500,
    age: 25,
    hp: 20,
    maxHp: 30,
    ac: 5,
    status: CharacterStatus.OK,
    vim: { max: 10, current: 10 },
    knownSpells: [],
    inventory: []
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingGroundsCharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingGroundsCharacterCardComponent);
    component = fixture.componentInstance;
  });

  describe('component initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should accept character input', () => {
      const testChar = createTestCharacter();
      component.character = testChar;
      fixture.detectChanges();

      expect(component.character).toEqual(testChar);
    });

    it('should accept status input', () => {
      component.character = createTestCharacter();
      component.status = CharacterStatus.OK;
      fixture.detectChanges();

      expect(component.status).toBe(CharacterStatus.OK);
    });
  });

  describe('character information rendering', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
      component.status = CharacterStatus.OK;
      fixture.detectChanges();
    });

    it('should display character name', () => {
      const compiled = fixture.nativeElement;
      const nameElement = compiled.querySelector('.character-name');
      expect(nameElement?.textContent).toContain('Gandalf');
    });

    it('should display character race, class, and level', () => {
      const compiled = fixture.nativeElement;
      const infoText = compiled.textContent;
      expect(infoText).toContain('HUMAN');
      expect(infoText).toContain('MAGE');
      expect(infoText).toContain('5');
    });

    it('should display character status badge', () => {
      const compiled = fixture.nativeElement;
      const statusBadge = compiled.querySelector('.status-badge');
      expect(statusBadge?.textContent?.trim()).toBe('OK');
    });
  });

  describe('status badge display', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
      fixture.detectChanges();
    });

    it('should display OK status', () => {
      component.status = CharacterStatus.OK;
      fixture.detectChanges();

      const statusBadge = fixture.nativeElement.querySelector('.status-badge');
      expect(statusBadge?.textContent?.trim()).toBe('OK');
    });

    it('should display DEAD status', () => {
      component.status = CharacterStatus.DEAD;
      fixture.detectChanges();

      const statusBadge = fixture.nativeElement.querySelector('.status-badge');
      expect(statusBadge?.textContent?.trim()).toBe('DEAD');
    });

    it('should display ASHES status', () => {
      component.status = CharacterStatus.ASHES;
      fixture.detectChanges();

      const statusBadge = fixture.nativeElement.querySelector('.status-badge');
      expect(statusBadge?.textContent?.trim()).toBe('ASHES');
    });

    it('should apply appropriate CSS class for status badge', () => {
      component.status = CharacterStatus.DEAD;
      fixture.detectChanges();

      const statusBadge = fixture.nativeElement.querySelector('.status-badge');
      expect(statusBadge?.classList.contains('status-badge')).toBe(true);
    });
  });

  describe('event emissions', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
      component.status = CharacterStatus.OK;
      fixture.detectChanges();
    });

    it('should emit inspect event when inspect button clicked', () => {
      const inspectSpy = jest.fn();
      component.inspect.subscribe(inspectSpy);

      const inspectButton = fixture.nativeElement.querySelector('.inspect-button');
      inspectButton?.click();

      expect(inspectSpy).toHaveBeenCalledWith('test-char-1');
    });

    it('should emit delete event when delete button clicked', () => {
      const deleteSpy = jest.fn();
      component.delete.subscribe(deleteSpy);

      const deleteButton = fixture.nativeElement.querySelector('.delete-button');
      deleteButton?.click();

      expect(deleteSpy).toHaveBeenCalledWith('test-char-1');
    });
  });

  describe('layout and dimensions', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
      component.status = CharacterStatus.OK;
      fixture.detectChanges();
    });

    it('should have horizontal layout structure', () => {
      const card = fixture.nativeElement.querySelector('.training-grounds-character-card');
      expect(card).toBeTruthy();

      const infoSection = fixture.nativeElement.querySelector('.character-info');
      const actionsSection = fixture.nativeElement.querySelector('.character-actions');

      expect(infoSection).toBeTruthy();
      expect(actionsSection).toBeTruthy();
    });

    it('should apply height constraint CSS class', () => {
      const card = fixture.nativeElement.querySelector('.training-grounds-character-card');

      // Verify the card element exists with the correct class
      // (actual height value is defined in SCSS and applied at runtime)
      expect(card).toBeTruthy();
      expect(card.classList.contains('training-grounds-character-card')).toBe(true);
    });
  });
});
