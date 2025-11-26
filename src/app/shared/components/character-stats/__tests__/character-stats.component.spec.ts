import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterStatsComponent } from '../character-stats.component';
import { createTestCharacter } from '@testing/test-factories';
import { Race } from '@models/Race';
import { CharacterClass } from '@models/CharacterClass';
import { Alignment } from '@models/Alignment';

describe('CharacterStatsComponent', () => {
  let component: CharacterStatsComponent;
  let fixture: ComponentFixture<CharacterStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterStatsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterStatsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('field display', () => {
    beforeEach(() => {
      component.character = createTestCharacter({
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER,
        level: 5,
        hp: 30,
        maxHp: 40,
        ac: 3,
        alignment: Alignment.GOOD
      });
    });

    it('displays only specified fields', () => {
      component.fields = ['race', 'class'];
      fixture.detectChanges();

      const stats = fixture.nativeElement.querySelectorAll('.stat-item');
      expect(stats.length).toBe(2);
      expect(stats[0].textContent).toContain('Race');
      expect(stats[0].textContent).toContain('HUMAN');
      expect(stats[1].textContent).toContain('Class');
      expect(stats[1].textContent).toContain('FIGHTER');
    });

    it('formats HP as current/max', () => {
      component.fields = ['hp'];
      fixture.detectChanges();

      const stat = fixture.nativeElement.querySelector('.stat-item');
      expect(stat.textContent).toContain('HP');
      expect(stat.textContent).toContain('30/40');
    });

    it('displays level in amber color', () => {
      component.fields = ['level'];
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.stat-value');
      expect(value.classList.contains('amber')).toBe(true);
    });

    it('displays all field types correctly', () => {
      component.fields = ['race', 'class', 'level', 'hp', 'ac', 'alignment'];
      fixture.detectChanges();

      const stats = fixture.nativeElement.querySelectorAll('.stat-item');
      expect(stats.length).toBe(6);
    });
  });

  describe('layout modes', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
      component.fields = ['race', 'class', 'level'];
    });

    it('applies vertical layout by default', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.character-stats');
      expect(container.classList.contains('vertical')).toBe(true);
    });

    it('applies horizontal layout when specified', () => {
      component.layout = 'horizontal';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.character-stats');
      expect(container.classList.contains('horizontal')).toBe(true);
    });
  });

  describe('field labels', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
    });

    it('displays proper capitalized labels', () => {
      component.fields = ['race', 'class', 'hp', 'ac'];
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('.stat-label');
      expect(labels[0].textContent.trim()).toBe('Race:');
      expect(labels[1].textContent.trim()).toBe('Class:');
      expect(labels[2].textContent.trim()).toBe('HP:');
      expect(labels[3].textContent.trim()).toBe('AC:');
    });
  });
});
