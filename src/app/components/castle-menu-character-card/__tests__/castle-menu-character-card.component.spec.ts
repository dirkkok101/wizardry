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

      const statElements = fixture.nativeElement.querySelectorAll('.character-stat');
      const allText = Array.from(statElements).map((el: any) => el.textContent).join(' ');
      expect(allText).toContain('ELF');
      expect(allText).toContain('MAGE');
      expect(allText).toContain('5');
    });

    it('should display HP as current/max', () => {
      const character = createTestCharacter({ hp: 25, maxHp: 40 });
      component.character = character;
      fixture.detectChanges();

      const statElements = fixture.nativeElement.querySelectorAll('.character-stat');
      const hpElement = Array.from(statElements).find((el: any) => el.textContent.includes('HP:'));
      expect(hpElement?.textContent).toBe('HP: 25/40');
    });

    it('should display AC (Armor Class)', () => {
      const character = createTestCharacter({ ac: 5 });
      component.character = character;
      fixture.detectChanges();

      const statElements = fixture.nativeElement.querySelectorAll('.character-stat');
      const acElement = Array.from(statElements).find((el: any) => el.textContent.includes('AC:'));
      expect(acElement?.textContent).toBe('AC: 5');
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

  describe('Inspect Event', () => {
    it('should emit inspect event with character ID when inspect button clicked', () => {
      const character = createTestCharacter({ id: 'char-123' });
      component.character = character;
      fixture.detectChanges();

      let emittedId: string | undefined;
      component.inspect.subscribe((id: string) => {
        emittedId = id;
      });

      const inspectButton = fixture.nativeElement.querySelector('.inspect-button');
      inspectButton?.click();

      expect(emittedId).toBe('char-123');
    });

    it('should have Inspect button label', () => {
      const character = createTestCharacter();
      component.character = character;
      fixture.detectChanges();

      const inspectButton = fixture.nativeElement.querySelector('.inspect-button');
      expect(inspectButton?.textContent?.trim()).toBe('Inspect');
    });
  });
});
