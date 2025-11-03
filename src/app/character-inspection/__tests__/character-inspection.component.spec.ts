import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { CharacterInspectionComponent } from '../character-inspection.component';
import { GameStateService } from '../../../services/GameStateService';
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
  let activatedRoute: ActivatedRoute;

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
    gold: 150,
    ac: 8,
    equippedWeapon: 'Long Sword',
    equippedArmor: 'Leather Armor',
    inventory: ['Potion', 'Scroll', 'Dagger']
  });

  const mockActivatedRoute = {
    queryParams: of({
      characterId: 'char-123',
      returnTo: 'tavern'
    })
  };

  beforeEach(() => {
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
    activatedRoute = TestBed.inject(ActivatedRoute);

    jest.spyOn(router, 'navigate');

    // Add test character to roster
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-123', testCharacter)
    }));
  });

  describe('initialization', () => {
    it('loads character by ID from query params', () => {
      fixture.detectChanges();

      expect(component.characterId()).toBe('char-123');
      expect(component.character()).toBeTruthy();
      expect(component.character()?.name).toBe('Gandalf');
    });

    it('sets return navigation from query params', () => {
      fixture.detectChanges();

      expect(component.returnTo()).toBe('tavern');
    });

    it('defaults returnTo to castle-menu when not provided', () => {
      // Reset and reconfigure TestBed with different query params
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({
                characterId: 'char-123'
              })
            }
          }
        ]
      });

      const newFixture = TestBed.createComponent(CharacterInspectionComponent);
      const newComponent = newFixture.componentInstance;
      const newGameState = TestBed.inject(GameStateService);

      // Add test character to roster
      newGameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-123', testCharacter)
      }));

      newFixture.detectChanges();

      expect(newComponent.returnTo()).toBe('castle-menu');
    });
  });

  describe('character display', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('displays character name, class, level', () => {
      const compiled = fixture.nativeElement;

      expect(compiled.textContent).toContain('Gandalf');
      expect(compiled.textContent).toContain('MAGE');
      expect(compiled.textContent).toContain('Level 5');
    });

    it('displays character alignment', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('GOOD');
    });

    it('shows stats (STR, INT, PIE, VIT, AGI, LUK)', () => {
      const compiled = fixture.nativeElement;

      expect(compiled.textContent).toContain('STR');
      expect(compiled.textContent).toContain('12');
      expect(compiled.textContent).toContain('INT');
      expect(compiled.textContent).toContain('18');
      expect(compiled.textContent).toContain('PIE');
      expect(compiled.textContent).toContain('10');
      expect(compiled.textContent).toContain('VIT');
      expect(compiled.textContent).toContain('14');
      expect(compiled.textContent).toContain('AGI');
      expect(compiled.textContent).toContain('11');
      expect(compiled.textContent).toContain('LUK');
      expect(compiled.textContent).toContain('15');
    });

    it('displays HP and experience', () => {
      const compiled = fixture.nativeElement;

      expect(compiled.textContent).toContain('20 / 25'); // HP
      expect(compiled.textContent).toContain('5000'); // XP
    });

    it('shows character status', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('OK');
    });

    it('shows armor class', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('AC');
      expect(compiled.textContent).toContain('8');
    });
  });

  describe('equipment display', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('shows equipped weapon and armor', () => {
      const compiled = fixture.nativeElement;

      expect(compiled.textContent).toContain('Weapon');
      expect(compiled.textContent).toContain('Long Sword');
      expect(compiled.textContent).toContain('Armor');
      expect(compiled.textContent).toContain('Leather Armor');
    });

    it('shows "None" when no weapon equipped', () => {
      const charWithoutWeapon = createTestCharacter({
        id: 'char-456',
        equippedWeapon: undefined
      });

      // Reset and reconfigure TestBed
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({
                characterId: 'char-456',
                returnTo: 'tavern'
              })
            }
          }
        ]
      });

      const newFixture = TestBed.createComponent(CharacterInspectionComponent);
      const newGameState = TestBed.inject(GameStateService);

      newGameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-456', charWithoutWeapon)
      }));

      newFixture.detectChanges();

      const compiled = newFixture.nativeElement;
      expect(compiled.textContent).toContain('None');
    });
  });

  describe('inventory display', () => {
    it('shows inventory items (8 slots max)', () => {
      fixture.detectChanges();
      const slots = component.inventorySlots();
      expect(slots.length).toBe(8);
    });

    it('displays items in inventory', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      expect(compiled.textContent).toContain('Potion');
      expect(compiled.textContent).toContain('Scroll');
      expect(compiled.textContent).toContain('Dagger');
    });

    it('shows "Empty" for empty slots', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Empty');
    });

    it('shows all 8 inventory slots', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const slotNumbers = ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.'];

      slotNumbers.forEach(num => {
        expect(compiled.textContent).toContain(num);
      });
    });
  });

  describe('spell display', () => {
    it('shows spells section for Mage', () => {
      fixture.detectChanges();

      expect(component.isSpellcaster()).toBe(true);
      expect(component.hasMageSpells()).toBe(true);
      expect(component.hasPriestSpells()).toBe(false);

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Spells');
      expect(compiled.textContent).toContain('Mage Spells');
    });

    it('shows spells section for Priest', () => {
      const priest = createTestCharacter({
        id: 'priest-1',
        class: CharacterClass.PRIEST
      });

      // Reset and reconfigure TestBed
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({
                characterId: 'priest-1',
                returnTo: 'tavern'
              })
            }
          }
        ]
      });

      const newFixture = TestBed.createComponent(CharacterInspectionComponent);
      const newComponent = newFixture.componentInstance;
      const newGameState = TestBed.inject(GameStateService);

      newGameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('priest-1', priest)
      }));

      newFixture.detectChanges();

      expect(newComponent.hasPriestSpells()).toBe(true);
      expect(newComponent.hasMageSpells()).toBe(false);

      const compiled = newFixture.nativeElement;
      expect(compiled.textContent).toContain('Priest Spells');
    });

    it('shows both spell types for Bishop', () => {
      const bishop = createTestCharacter({
        id: 'bishop-1',
        class: CharacterClass.BISHOP
      });

      // Reset and reconfigure TestBed
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({
                characterId: 'bishop-1',
                returnTo: 'tavern'
              })
            }
          }
        ]
      });

      const newFixture = TestBed.createComponent(CharacterInspectionComponent);
      const newComponent = newFixture.componentInstance;
      const newGameState = TestBed.inject(GameStateService);

      newGameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('bishop-1', bishop)
      }));

      newFixture.detectChanges();

      expect(newComponent.hasMageSpells()).toBe(true);
      expect(newComponent.hasPriestSpells()).toBe(true);

      const compiled = newFixture.nativeElement;
      expect(compiled.textContent).toContain('Mage Spells');
      expect(compiled.textContent).toContain('Priest Spells');
    });

    it('does not show spells section for Fighter', () => {
      const fighter = createTestCharacter({
        id: 'fighter-1',
        class: CharacterClass.FIGHTER
      });

      // Reset and reconfigure TestBed
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({
                characterId: 'fighter-1',
                returnTo: 'tavern'
              })
            }
          }
        ]
      });

      const newFixture = TestBed.createComponent(CharacterInspectionComponent);
      const newComponent = newFixture.componentInstance;
      const newGameState = TestBed.inject(GameStateService);

      newGameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('fighter-1', fighter)
      }));

      newFixture.detectChanges();

      expect(newComponent.isSpellcaster()).toBe(false);

      const compiled = newFixture.nativeElement;
      expect(compiled.querySelector('.spells')).toBeFalsy();
    });
  });

  describe('error handling', () => {
    it('handles missing character ID', () => {
      // Reset and reconfigure TestBed
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({
                returnTo: 'tavern'
              })
            }
          }
        ]
      });

      const newFixture = TestBed.createComponent(CharacterInspectionComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.characterId()).toBeNull();
      expect(newComponent.character()).toBeNull();

      const compiled = newFixture.nativeElement;
      expect(compiled.textContent).toContain('Character not found');
    });

    it('displays error when character does not exist', () => {
      // Reset and reconfigure TestBed
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({
                characterId: 'invalid-id',
                returnTo: 'tavern'
              })
            }
          }
        ]
      });

      const newFixture = TestBed.createComponent(CharacterInspectionComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.character()).toBeNull();

      const compiled = newFixture.nativeElement;
      expect(compiled.textContent).toContain('Character not found');
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('navigates back to correct scene when back button clicked', () => {
      component.returnToPrevious();

      expect(router.navigate).toHaveBeenCalledWith(['/tavern']);
    });

    it('navigates to castle-menu by default', () => {
      // Reset and reconfigure TestBed
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({
                characterId: 'char-123'
              })
            }
          }
        ]
      });

      const newFixture = TestBed.createComponent(CharacterInspectionComponent);
      const newComponent = newFixture.componentInstance;
      const newRouter = TestBed.inject(Router);
      const newGameState = TestBed.inject(GameStateService);
      jest.spyOn(newRouter, 'navigate');

      // Add test character to roster
      newGameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-123', testCharacter)
      }));

      newFixture.detectChanges();

      newComponent.returnToPrevious();

      expect(newRouter.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('shows back button', () => {
      const compiled = fixture.nativeElement;
      const backButton = compiled.querySelector('.btn-back');

      expect(backButton).toBeTruthy();
      expect(backButton.textContent).toContain('BACK');
    });
  });

  describe('status colors', () => {
    it('applies OK status color class', () => {
      const colorClass = component.getStatusColor('OK');
      expect(colorClass).toBe('status-ok');
    });

    it('applies DEAD status color class', () => {
      const colorClass = component.getStatusColor('DEAD');
      expect(colorClass).toBe('status-dead');
    });

    it('applies afflicted status color class', () => {
      const colorClass = component.getStatusColor('PARALYZED');
      expect(colorClass).toBe('status-afflicted');
    });
  });

  describe('item formatting', () => {
    it('formats string item IDs', () => {
      const formatted = component.formatItem('Long Sword');
      expect(formatted).toBe('Long Sword');
    });

    it('formats Item objects', () => {
      const item = { id: 'item-1', name: 'Magic Wand' };
      const formatted = component.formatItem(item);
      expect(formatted).toBe('Magic Wand');
    });

    it('shows "Empty" for null items', () => {
      const formatted = component.formatItem(null);
      expect(formatted).toBe('Empty');
    });
  });
});
