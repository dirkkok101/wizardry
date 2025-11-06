import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveSpellsComponent } from './active-spells.component';
import { ActiveSpell } from '../../types/active-spell.types';

describe('ActiveSpellsComponent', () => {
  let component: ActiveSpellsComponent;
  let fixture: ComponentFixture<ActiveSpellsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActiveSpellsComponent]
    });

    fixture = TestBed.createComponent(ActiveSpellsComponent);
    component = fixture.componentInstance;
  });

  it('displays spell list with icons', () => {
    const spells: ActiveSpell[] = [
      { name: 'MILWA', icon: '💡', description: 'Light (Radius: 1)' },
      { name: 'DUMAPIC', icon: '🧭', description: 'Coordinates (10, 5)' }
    ];

    fixture.componentRef.setInput('spells', spells);
    fixture.detectChanges();

    const spellElements = fixture.nativeElement.querySelectorAll('.spell');
    expect(spellElements.length).toBe(2);
    expect(spellElements[0].textContent).toContain('💡');
    expect(spellElements[0].textContent).toContain('MILWA');
    expect(spellElements[1].textContent).toContain('🧭');
    expect(spellElements[1].textContent).toContain('DUMAPIC');
  });

  it('shows "No active spells" when empty', () => {
    fixture.componentRef.setInput('spells', []);
    fixture.detectChanges();

    const emptyMessage = fixture.nativeElement.querySelector('.empty');
    expect(emptyMessage).toBeTruthy();
    expect(emptyMessage.textContent).toContain('No active spells');
  });

  it('displays spell descriptions correctly', () => {
    const spells: ActiveSpell[] = [
      { name: 'MILWA', icon: '💡', description: 'Light (Radius: 3)' }
    ];

    fixture.componentRef.setInput('spells', spells);
    fixture.detectChanges();

    const description = fixture.nativeElement.querySelector('.desc');
    expect(description.textContent).toContain('Light (Radius: 3)');
  });
});
