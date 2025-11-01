import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
    component = fixture.componentInstance;
  });

  describe('visibility', () => {
    it('shows dialog when visible=true', () => {
      component.visible = true;
      component.message = 'Are you sure?';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.dialog-overlay')).toBeTruthy();
      expect(compiled.querySelector('.dialog-message').textContent).toContain('Are you sure?');
    });

    it('hides dialog when visible=false', () => {
      component.visible = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.dialog-overlay')).toBeFalsy();
    });
  });

  describe('user interaction', () => {
    beforeEach(() => {
      component.visible = true;
      component.message = 'Confirm action?';
      fixture.detectChanges();
    });

    it('emits confirmed event when Yes clicked', () => {
      jest.spyOn(component.confirmed, 'emit');

      const compiled = fixture.nativeElement;
      const yesButton = compiled.querySelector('.btn-yes');
      yesButton.click();

      expect(component.confirmed.emit).toHaveBeenCalled();
    });

    it('emits cancelled event when No clicked', () => {
      jest.spyOn(component.cancelled, 'emit');

      const compiled = fixture.nativeElement;
      const noButton = compiled.querySelector('.btn-no');
      noButton.click();

      expect(component.cancelled.emit).toHaveBeenCalled();
    });

    it('confirms on Y key press', () => {
      jest.spyOn(component.confirmed, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'y' });
      component.handleKeyPress(event);

      expect(component.confirmed.emit).toHaveBeenCalled();
    });

    it('cancels on N key press', () => {
      jest.spyOn(component.cancelled, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'n' });
      component.handleKeyPress(event);

      expect(component.cancelled.emit).toHaveBeenCalled();
    });

    it('cancels on Escape key press', () => {
      jest.spyOn(component.cancelled, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyPress(event);

      expect(component.cancelled.emit).toHaveBeenCalled();
    });
  });

  describe('customization', () => {
    it('uses custom button labels', () => {
      component.visible = true;
      component.yesLabel = 'Confirm';
      component.noLabel = 'Cancel';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.btn-yes').textContent).toContain('Confirm');
      expect(compiled.querySelector('.btn-no').textContent).toContain('Cancel');
    });
  });
});
