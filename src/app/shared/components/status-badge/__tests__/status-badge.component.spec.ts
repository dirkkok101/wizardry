import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from '../status-badge.component';
import { CharacterStatus } from '../../../../../types/CharacterStatus';

describe('StatusBadgeComponent', () => {
  let component: StatusBadgeComponent;
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('badge variant', () => {
    beforeEach(() => {
      component.variant = 'badge';
    });

    it('displays OK status with green styling', () => {
      component.status = CharacterStatus.OK;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.textContent.trim()).toBe('OK');
      expect(badge.classList.contains('status-ok')).toBe(true);
      expect(badge.classList.contains('badge')).toBe(true);
    });

    it('displays DEAD status with red styling', () => {
      component.status = CharacterStatus.DEAD;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.textContent.trim()).toBe('DEAD');
      expect(badge.classList.contains('status-dead')).toBe(true);
    });

    it('displays ASHES status with gray styling', () => {
      component.status = CharacterStatus.ASHES;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.textContent.trim()).toBe('ASHES');
      expect(badge.classList.contains('status-ashes')).toBe(true);
    });

    it('displays LOST status with dim styling', () => {
      component.status = CharacterStatus.LOST;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.textContent.trim()).toBe('LOST');
      expect(badge.classList.contains('status-lost')).toBe(true);
    });
  });

  describe('inline variant', () => {
    beforeEach(() => {
      component.variant = 'inline';
    });

    it('renders without badge background', () => {
      component.status = CharacterStatus.OK;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.classList.contains('inline')).toBe(true);
      expect(badge.classList.contains('badge')).toBe(false);
    });

    it('still applies status color class', () => {
      component.status = CharacterStatus.DEAD;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.classList.contains('status-dead')).toBe(true);
    });
  });

  describe('default props', () => {
    it('defaults to badge variant', () => {
      component.status = CharacterStatus.OK;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.classList.contains('badge')).toBe(true);
    });
  });
});
