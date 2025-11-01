import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterListComponent } from './character-list.component';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';

describe('CharacterListComponent', () => {
  let component: CharacterListComponent;
  let fixture: ComponentFixture<CharacterListComponent>;

  const testCharacters: Character[] = [
    {
      id: 'char-1',
      name: 'Gandalf',
      class: CharacterClass.MAGE,
      level: 5,
      hp: 20,
      maxHp: 25,
      status: 'OK',
      gold: 100
    } as Character,
    {
      id: 'char-2',
      name: 'Aragorn',
      class: CharacterClass.FIGHTER,
      level: 6,
      hp: 45,
      maxHp: 50,
      status: 'OK',
      gold: 250
    } as Character
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterListComponent);
    component = fixture.componentInstance;
  });

  describe('display mode', () => {
    it('displays all characters in list', () => {
      component.characters = testCharacters;
      component.selectable = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const items = compiled.querySelectorAll('.character-item');

      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('Gandalf');
      expect(items[1].textContent).toContain('Aragorn');
    });

    it('displays character stats (class, level, HP)', () => {
      component.characters = [testCharacters[0]];
      component.selectable = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const item = compiled.querySelector('.character-item');

      expect(item.textContent).toContain('MAGE');
      expect(item.textContent).toContain('Lv5');
      expect(item.textContent).toContain('20/25');
    });

    it('shows empty state when no characters', () => {
      component.characters = [];
      component.selectable = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.empty-state')).toBeTruthy();
      expect(compiled.querySelector('.empty-state').textContent).toContain('No characters');
    });
  });

  describe('selection mode', () => {
    it('allows character selection when selectable=true', () => {
      component.characters = testCharacters;
      component.selectable = true;
      fixture.detectChanges();

      jest.spyOn(component.characterSelected, 'emit');

      const compiled = fixture.nativeElement;
      const firstItem = compiled.querySelector('.character-item');
      firstItem.click();

      expect(component.characterSelected.emit).toHaveBeenCalledWith('char-1');
    });

    it('highlights selected character', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedId = 'char-1';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const items = compiled.querySelectorAll('.character-item');

      expect(items[0].classList.contains('selected')).toBe(true);
      expect(items[1].classList.contains('selected')).toBe(false);
    });

    it('filters characters by custom filter function', () => {
      component.characters = testCharacters;
      component.filterFn = (char: Character) => char.class === CharacterClass.MAGE;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const items = compiled.querySelectorAll('.character-item');

      expect(items.length).toBe(1);
      expect(items[0].textContent).toContain('Gandalf');
    });
  });

  describe('keyboard navigation', () => {
    it('moves selection down on ArrowDown', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedIndex = 0;

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      component.handleKeyPress(event);

      expect(component.selectedIndex).toBe(1);
    });

    it('moves selection up on ArrowUp', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedIndex = 1;

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      component.handleKeyPress(event);

      expect(component.selectedIndex).toBe(0);
    });

    it('wraps selection at boundaries', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedIndex = 1;

      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      component.handleKeyPress(downEvent);

      expect(component.selectedIndex).toBe(0); // Wraps to top
    });

    it('emits selection on Enter key', () => {
      component.characters = testCharacters;
      component.selectable = true;
      component.selectedIndex = 0;

      jest.spyOn(component.characterSelected, 'emit');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.characterSelected.emit).toHaveBeenCalledWith('char-1');
    });
  });
});
