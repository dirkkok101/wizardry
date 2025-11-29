import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestResultsModalComponent, RestResultsData } from '../rest-results-modal.component';

describe('RestResultsModalComponent', () => {
  let component: RestResultsModalComponent;
  let fixture: ComponentFixture<RestResultsModalComponent>;

  const mockResults: RestResultsData = {
    weeksRested: 2,
    goldSpent: 1000,
    goldRemaining: 500,
    perCharacter: new Map([
      ['char1', { hpBefore: 10, hpAfter: 30, hpGained: 20, spellsRestored: false }],
      ['char2', { hpBefore: 20, hpAfter: 20, hpGained: 0, spellsRestored: true }]
    ]),
    characterNames: new Map([
      ['char1', 'BOLDAR'],
      ['char2', 'MYSTARA']
    ]),
    levelUps: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestResultsModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RestResultsModalComponent);
    component = fixture.componentInstance;
    component.visible = true;
    component.results = mockResults;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays weeks rested', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2 week(s)');
  });

  it('displays gold spent', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('1000 GP');
  });

  it('displays character HP gains', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('BOLDAR');
    expect(compiled.textContent).toContain('+20 HP');
  });

  it('displays spells restored indicator', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('MYSTARA');
    expect(compiled.textContent).toContain('Spells Restored');
  });

  it('emits dismissed when button clicked', () => {
    const spy = jest.spyOn(component.dismissed, 'emit');
    const button = fixture.nativeElement.querySelector('.primary-button');
    button.click();
    expect(spy).toHaveBeenCalled();
  });

  it('emits dismissed on Enter key', () => {
    const spy = jest.spyOn(component.dismissed, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.handleKeyPress(event);
    expect(spy).toHaveBeenCalled();
  });

  it('emits dismissed on Escape key', () => {
    const spy = jest.spyOn(component.dismissed, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    component.handleKeyPress(event);
    expect(spy).toHaveBeenCalled();
  });

  it('displays level-ups when present', () => {
    component.results = {
      ...mockResults,
      levelUps: [{
        characterId: 'char1',
        characterName: 'BOLDAR',
        newLevel: 2,
        hpIncrease: 8,
        statChanges: { STR: 1 },
        newSpells: []
      }]
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Level Up!');
    expect(compiled.textContent).toContain('Level 2');
    // Stat items show inline format: "+8 HP"
    const statItems = compiled.querySelectorAll('.stat-item');
    expect(statItems.length).toBeGreaterThanOrEqual(2); // HP + STR
    expect(compiled.textContent).toContain('+8 HP');
    expect(compiled.textContent).toContain('+1 STR');
  });

  it('hides modal when not visible', () => {
    component.visible = false;
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    expect(overlay).toBeNull();
  });
});
