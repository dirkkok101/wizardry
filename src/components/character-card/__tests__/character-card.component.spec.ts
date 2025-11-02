import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCardComponent } from '../character-card.component';
import { Character } from '../../../types/Character';
import { CharacterStatus } from '../../../types/CharacterStatus';
import { Race } from '../../../types/Race';
import { CharacterClass } from '../../../types/CharacterClass';
import { Alignment } from '../../../types/Alignment';

describe('CharacterCardComponent', () => {
  let component: CharacterCardComponent;
  let fixture: ComponentFixture<CharacterCardComponent>;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    race: Race.ELF,
    class: CharacterClass.MAGE,
    level: 5,
    alignment: Alignment.GOOD,
    status: CharacterStatus.OK,
    strength: 10,
    intelligence: 18,
    piety: 15,
    vitality: 12,
    agility: 14,
    luck: 13,
    hp: 25,
    maxHp: 25,
    ac: 10,
    experience: 5000,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardComponent);
    component = fixture.componentInstance;
    component.character = mockCharacter;
    component.status = CharacterStatus.OK;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display character name', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Gandalf');
  });

  it('should display race and class', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('ELF');
    expect(compiled.textContent).toContain('MAGE');
  });

  it('should display level', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Level 5');
  });

  it('should display status badge', () => {
    const compiled = fixture.nativeElement;
    const statusBadge = compiled.querySelector('.status-badge');
    expect(statusBadge).toBeTruthy();
    expect(statusBadge.textContent).toContain('OK');
  });

  it('should emit inspect event when inspect button clicked', () => {
    jest.spyOn(component.inspect, 'emit');
    const inspectBtn = fixture.nativeElement.querySelector('.inspect-btn');
    inspectBtn.click();
    expect(component.inspect.emit).toHaveBeenCalledWith('char-1');
  });

  it('should emit delete event when delete button clicked', () => {
    jest.spyOn(component.delete, 'emit');
    const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
    deleteBtn.click();
    expect(component.delete.emit).toHaveBeenCalledWith('char-1');
  });
});
