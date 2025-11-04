import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CastleMenuCharacterCardComponent } from '../castle-menu-character-card.component';
import { createTestCharacter } from '../../../../test-helpers/test-factories';

describe('CastleMenuCharacterCardComponent', () => {
  let component: CastleMenuCharacterCardComponent;
  let fixture: ComponentFixture<CastleMenuCharacterCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CastleMenuCharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CastleMenuCharacterCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Character Information Rendering', () => {
    it('should display character name', () => {
      const character = createTestCharacter({ name: 'Gandalf' });
      component.character = character;
      fixture.detectChanges();

      const nameElement = fixture.nativeElement.querySelector('.character-name');
      expect(nameElement?.textContent).toBe('Gandalf');
    });

    it('should display race, class, and level', () => {
      const character = createTestCharacter({
        race: 'ELF',
        class: 'MAGE',
        level: 5
      });
      component.character = character;
      fixture.detectChanges();

      const detailsElement = fixture.nativeElement.querySelector('.character-details');
      expect(detailsElement?.textContent).toContain('ELF');
      expect(detailsElement?.textContent).toContain('MAGE');
      expect(detailsElement?.textContent).toContain('5');
    });

    it('should display HP as current/max', () => {
      const character = createTestCharacter({ hp: 25, maxHp: 40 });
      component.character = character;
      fixture.detectChanges();

      const hpElement = fixture.nativeElement.querySelector('.character-hp');
      expect(hpElement?.textContent).toBe('HP: 25/40');
    });

    it('should display status badge', () => {
      const character = createTestCharacter({ status: 'OK' });
      component.character = character;
      fixture.detectChanges();

      const statusElement = fixture.nativeElement.querySelector('.status-badge');
      expect(statusElement?.textContent).toBe('OK');
    });
  });

  describe('Status Badge Styling', () => {
    it('should apply ok-status class when status is OK', () => {
      const character = createTestCharacter({ status: 'OK' });
      component.character = character;
      fixture.detectChanges();

      const statusElement = fixture.nativeElement.querySelector('.status-badge');
      expect(statusElement?.classList.contains('ok-status')).toBe(true);
    });

    it('should apply dead-status class when status is DEAD', () => {
      const character = createTestCharacter({ status: 'DEAD' });
      component.character = character;
      fixture.detectChanges();

      const statusElement = fixture.nativeElement.querySelector('.status-badge');
      expect(statusElement?.classList.contains('dead-status')).toBe(true);
    });

    it('should apply ashes-status class when status is ASHES', () => {
      const character = createTestCharacter({ status: 'ASHES' });
      component.character = character;
      fixture.detectChanges();

      const statusElement = fixture.nativeElement.querySelector('.status-badge');
      expect(statusElement?.classList.contains('ashes-status')).toBe(true);
    });
  });
});
