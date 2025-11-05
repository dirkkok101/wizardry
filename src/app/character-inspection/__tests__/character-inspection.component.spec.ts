import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { CharacterInspectionComponent } from '../character-inspection.component';
import { GameStateService } from '../../../services/GameStateService';
import { ItemDataService } from '../../../services/ItemDataService';
import { Character } from '../../../types/Character';
import { CharacterClass } from '../../../types/CharacterClass';
import { Alignment } from '../../../types/Alignment';
import { CharacterStatus } from '../../../types/CharacterStatus';
import { Race } from '../../../types/Race';
import { createTestCharacter } from '../../../test-helpers/test-factories';

describe('CharacterInspectionComponent', () => {
  let component: CharacterInspectionComponent;
  let fixture: ComponentFixture<CharacterInspectionComponent>;
  let gameState: GameStateService;
  let router: Router;

  const testCharacter: Character = createTestCharacter({
    id: 'char-123',
    name: 'Gandalf',
    race: Race.HUMAN,
    class: CharacterClass.MAGE,
    alignment: Alignment.GOOD,
    status: CharacterStatus.OK,
    strength: 12,
    intelligence: 18,
    piety: 10,
    vitality: 14,
    agility: 11,
    luck: 15,
    level: 5,
    hp: 20,
    maxHp: 25,
    experience: 5000,
    ac: 8,
    inventory: []
  });

  const mockActivatedRoute = {
    queryParams: of({
      characterId: 'char-123',
      returnTo: 'tavern'
    })
  };

  beforeEach(() => {
    // Mock ItemDataService.getItem to return null
    jest.spyOn(ItemDataService, 'getItem').mockReturnValue(null);

    TestBed.configureTestingModule({
      imports: [CharacterInspectionComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: mockActivatedRoute
        }
      ]
    });

    fixture = TestBed.createComponent(CharacterInspectionComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Add test character to roster
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-123', testCharacter)
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('loads character by ID from query params', () => {
    fixture.detectChanges();

    expect(component.characterId()).toBe('char-123');
    expect(component.character()).toBeTruthy();
    expect(component.character()?.name).toBe('Gandalf');
  });

  it('renders character name and class', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;

    expect(compiled.textContent).toContain('Gandalf');
    expect(compiled.textContent).toContain('MAGE');
  });

  it('displays character stats', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;

    expect(compiled.textContent).toContain('12'); // STR
    expect(compiled.textContent).toContain('18'); // INT
  });

  it('navigates back on returnToPrevious', () => {
    component.returnToPrevious();

    expect(router.navigate).toHaveBeenCalledWith(['/tavern']);
  });

  it('filters party members for trading', () => {
    const otherChar = createTestCharacter({ id: 'char-456', name: 'Conan' });
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-456', otherChar),
      party: {
        ...state.party,
        members: ['char-123', 'char-456']
      }
    }));

    fixture.detectChanges();

    const members = component.partyMembers();
    expect(members.length).toBe(1);
    expect(members[0].id).toBe('char-456');
  });
});
