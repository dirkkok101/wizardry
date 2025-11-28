import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { CharacterInspectionComponent } from '../character-inspection.component';
import { GameStateService } from '@services/GameStateService';
import { ItemDataLoader } from '@services/ItemDataLoader';
import { Character } from '@models/Character';
import { CharacterClass } from '@models/CharacterClass';
import { Alignment } from '@models/Alignment';
import { CharacterStatus } from '@models/CharacterStatus';
import { Race } from '@models/Race';
import { createTestCharacter } from '@testing/test-factories';

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
    // Mock ItemDataLoader.getItem to return null
    jest.spyOn(ItemDataLoader, 'getItem').mockReturnValue(null);

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

  it('does not show success message on successful equip (self-evident action)', () => {
    const mockItem = {
      id: 'test-sword',
      name: 'Test Sword',
      type: 'WEAPON' as any,
      slot: 'WEAPON' as any,
      price: 100,
      cursed: false,
      identified: true,
      equipped: false
    };

    jest.spyOn(ItemDataLoader, 'getItem').mockReturnValue(mockItem as any);

    gameState.updateState(state => {
      const char = state.roster.get('char-123')!;
      return {
        ...state,
        roster: new Map(state.roster).set('char-123', {
          ...char,
          inventory: [mockItem as any]
        })
      };
    });

    fixture.detectChanges();

    component.handleItemAction({ type: 'equip', item: mockItem as any });

    // Equip/unequip are self-evident actions - no success message shown
    expect(component.messages.hasMessage()).toBe(false);
  });

  it('displays error message on failed equip', () => {
    const mockItem = {
      id: 'test-sword',
      name: 'Test Sword',
      type: 'WEAPON' as any,
      slot: 'WEAPON' as any,
      price: 100,
      cursed: false,
      identified: true,
      equipped: false,
      classRestrictions: ['NINJA'] as any[]
    };

    jest.spyOn(ItemDataLoader, 'getItem').mockReturnValue(mockItem as any);

    fixture.detectChanges();

    component.handleItemAction({ type: 'equip', item: mockItem as any });

    // Now using MessageService instead of message signal
    expect(component.messages.hasMessage()).toBe(true);
    expect(component.messages.isError()).toBe(true);
  });

  it('clears message after 3 seconds', (done) => {
    jest.useFakeTimers();

    const mockItem = {
      id: 'test-potion',
      name: 'Test Potion',
      type: 'ITEM' as any,
      slot: 'NONE' as any,
      price: 100,
      cursed: false,
      identified: true,
      equipped: false
    };

    jest.spyOn(ItemDataLoader, 'getItem').mockReturnValue(mockItem as any);

    gameState.updateState(state => {
      const char = state.roster.get('char-123')!;
      return {
        ...state,
        roster: new Map(state.roster).set('char-123', {
          ...char,
          inventory: [mockItem as any]
        })
      };
    });

    fixture.detectChanges();

    // Use 'use' action which still shows success message
    component.handleItemAction({ type: 'use', item: mockItem as any });

    // Now using MessageService instead of message signal
    expect(component.messages.hasMessage()).toBe(true);

    jest.advanceTimersByTime(3000);

    expect(component.messages.hasMessage()).toBe(false);

    jest.useRealTimers();
    done();
  });
});

describe('CharacterInspectionComponent mode detection', () => {
  let gameState: GameStateService;
  let router: Router;

  const testCharacter: Character = createTestCharacter({
    id: 'char-123',
    name: 'Gandalf',
    class: CharacterClass.MAGE
  });

  const createComponentWithParams = (params: Record<string, string>) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CharacterInspectionComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of(params) }
        }
      ]
    });

    const fixture = TestBed.createComponent(CharacterInspectionComponent);
    const component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
    jest.spyOn(ItemDataLoader, 'getItem').mockReturnValue(null);

    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-123', testCharacter)
    }));

    return { fixture, component };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('explicit mode parameter', () => {
    it('uses TRAINING_GROUNDS mode from query param', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'TRAINING_GROUNDS'
      });
      fixture.detectChanges();

      expect(component.mode()).toBe('TRAINING_GROUNDS');
    });

    it('uses TAVERN mode from query param', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'TAVERN'
      });
      fixture.detectChanges();

      expect(component.mode()).toBe('TAVERN');
    });

    it('uses CAMP mode from query param', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'CAMP'
      });
      fixture.detectChanges();

      expect(component.mode()).toBe('CAMP');
    });
  });

  describe('mode fallback from returnTo', () => {
    it('infers TRAINING_GROUNDS from returnTo=training-grounds', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        returnTo: 'training-grounds'
      });
      fixture.detectChanges();

      expect(component.mode()).toBe('TRAINING_GROUNDS');
    });

    it('infers TAVERN from returnTo=tavern', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        returnTo: 'tavern'
      });
      fixture.detectChanges();

      expect(component.mode()).toBe('TAVERN');
    });

    it('infers CAMP from returnTo=maze', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        returnTo: 'maze'
      });
      fixture.detectChanges();

      expect(component.mode()).toBe('CAMP');
    });

    it('defaults to TAVERN when returnTo is unknown', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        returnTo: 'castle-menu'
      });
      fixture.detectChanges();

      expect(component.mode()).toBe('TAVERN');
    });
  });

  describe('mode-based behavior', () => {
    it('shows Use button only in CAMP mode', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'CAMP'
      });
      fixture.detectChanges();

      expect(component.showUseButton()).toBe(true);
    });

    it('hides Use button in TAVERN mode', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'TAVERN'
      });
      fixture.detectChanges();

      expect(component.showUseButton()).toBe(false);
    });

    it('hides item actions in TRAINING_GROUNDS mode', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'TRAINING_GROUNDS'
      });
      fixture.detectChanges();

      expect(component.showItemActions()).toBe(false);
    });

    it('shows item actions in TAVERN mode', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'TAVERN'
      });
      fixture.detectChanges();

      expect(component.showItemActions()).toBe(true);
    });

    it('shows item actions in CAMP mode', () => {
      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'CAMP'
      });
      fixture.detectChanges();

      expect(component.showItemActions()).toBe(true);
    });
  });

  describe('character actions by mode', () => {
    it('includes Spell Book in footer menu for caster with spells', () => {
      const casterWithSpells = createTestCharacter({
        id: 'char-123',
        class: CharacterClass.MAGE,
        knownSpells: ['halito']
      });

      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'TAVERN'
      });

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-123', casterWithSpells)
      }));

      fixture.detectChanges();

      const footerItems = component.footerMenuItems();
      expect(footerItems.some(item => item.id === 'spells')).toBe(true);
    });

    it('excludes Spell Book from footer menu for non-caster', () => {
      const fighter = createTestCharacter({
        id: 'char-123',
        class: CharacterClass.FIGHTER,
        knownSpells: []
      });

      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'TAVERN'
      });

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-123', fighter)
      }));

      fixture.detectChanges();

      const footerItems = component.footerMenuItems();
      expect(footerItems.some(item => item.id === 'spells')).toBe(false);
    });

    it('includes cast-spell action in CAMP mode for caster with spell points', () => {
      const casterWithPoints = createTestCharacter({
        id: 'char-123',
        class: CharacterClass.MAGE,
        knownSpells: ['halito'],
        spellPoints: {
          mage: {
            level1: { current: 3, max: 5 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      });

      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'CAMP'
      });

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-123', casterWithPoints)
      }));

      fixture.detectChanges();

      const actions = component.characterActions();
      expect(actions.some(a => a.type === 'cast-spell')).toBe(true);
    });

    it('excludes cast-spell action in TAVERN mode', () => {
      const casterWithPoints = createTestCharacter({
        id: 'char-123',
        class: CharacterClass.MAGE,
        knownSpells: ['halito'],
        spellPoints: {
          mage: {
            level1: { current: 3, max: 5 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      });

      const { fixture, component } = createComponentWithParams({
        characterId: 'char-123',
        mode: 'TAVERN'
      });

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-123', casterWithPoints)
      }));

      fixture.detectChanges();

      const actions = component.characterActions();
      expect(actions.some(a => a.type === 'cast-spell')).toBe(false);
    });
  });
});
