// src/app/components/name-modal/__tests__/name-modal.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NameModalComponent } from '../name-modal.component';

describe('NameModalComponent', () => {
  let component: NameModalComponent;
  let fixture: ComponentFixture<NameModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NameModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('visibility', () => {
    it('should not be visible by default', () => {
      const compiled = fixture.nativeElement;
      const modal = compiled.querySelector('.name-modal');
      expect(modal).toBeNull();
    });

    it('should be visible when visible input is true', () => {
      component.visible = true;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const modal = compiled.querySelector('.name-modal');
      expect(modal).toBeTruthy();
    });
  });

  describe('keyboard shortcuts', () => {
    beforeEach(() => {
      component.visible = true;
      fixture.detectChanges();
    });

    it('should emit save when Enter pressed with valid name', () => {
      const saveSpy = jest.fn();
      component.save.subscribe(saveSpy);
      component.characterName.set('Gandalf');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);

      expect(saveSpy).toHaveBeenCalledWith('Gandalf');
    });

    it('should not emit save when Enter pressed with empty name', () => {
      const saveSpy = jest.fn();
      component.save.subscribe(saveSpy);
      component.characterName.set('   ');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should emit cancel when Escape pressed', () => {
      const cancelSpy = jest.fn();
      component.cancel.subscribe(cancelSpy);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should not handle keys when not visible', () => {
      component.visible = false;
      const saveSpy = jest.fn();
      component.save.subscribe(saveSpy);
      component.characterName.set('Test');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('user interactions', () => {
    beforeEach(() => {
      component.visible = true;
      fixture.detectChanges();
    });

    it('should emit cancel when backdrop clicked', () => {
      const cancelSpy = jest.fn();
      component.cancel.subscribe(cancelSpy);

      const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
      backdrop.click();

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should emit save when save button clicked with valid name', () => {
      const saveSpy = jest.fn();
      component.save.subscribe(saveSpy);
      component.characterName.set('Merlin');
      fixture.detectChanges();

      const saveButton = fixture.nativeElement.querySelector('.save-button');
      saveButton.click();

      expect(saveSpy).toHaveBeenCalledWith('Merlin');
    });

    it('should emit cancel when cancel button clicked', () => {
      const cancelSpy = jest.fn();
      component.cancel.subscribe(cancelSpy);

      const cancelButton = fixture.nativeElement.querySelector('.cancel-button');
      cancelButton.click();

      expect(cancelSpy).toHaveBeenCalled();
    });
  });
});
