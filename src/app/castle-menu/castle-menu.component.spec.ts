import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CastleMenuComponent } from './castle-menu.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { Race } from '../../types/Race';
import { CharacterClass } from '../../types/CharacterClass';
import { Alignment } from '../../types/Alignment';

describe('CastleMenuComponent', () => {
  let component: CastleMenuComponent;
  let fixture: ComponentFixture<CastleMenuComponent>;
  let gameState: GameStateService;
  let router: Router;

  // Helper function to create test characters
  const createTestCharacter = (overrides?: Partial<Character>): Character => {
    const baseChar: Character = {
      id: `char_${Date.now()}_${Math.random()}`,
      name: 'TestChar',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      status: 'OK',
      strength: 14,
      intelligence: 10,
      piety: 10,
      vitality: 12,
      agility: 11,
      luck: 9,
      level: 1,
      experience: 0,
      hp: 15,
      maxHp: 15,
      ac: 10,
      inventory: [],
      password: 'test',
      createdAt: Date.now(),
      lastModified: Date.now()
    };
    return { ...baseChar, ...overrides };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CastleMenuComponent]
    });

    fixture = TestBed.createComponent(CastleMenuComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('displays castle menu title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('CASTLE');
    });

    it('shows all 7 service options', () => {
      fixture.detectChanges();

      expect(component.menuItems().length).toBe(7);
      expect(component.menuItems()[0].label).toContain('TAVERN');
      expect(component.menuItems()[1].label).toContain('TRAINING GROUNDS');
      expect(component.menuItems()[2].label).toContain('INN');
      expect(component.menuItems()[3].label).toContain('SHOP');
      expect(component.menuItems()[4].label).toContain('TEMPLE');
      expect(component.menuItems()[5].label).toContain('UTILITIES');
      expect(component.menuItems()[6].label).toContain('EDGE OF TOWN');
    });

    it('updates game state to CASTLE_MENU on init', () => {
      component.ngOnInit();

      expect(gameState.currentScene()).toBe(SceneType.CASTLE_MENU);
    });
  });

  describe('menu navigation', () => {
    it('navigates to tavern when selected', () => {
      component.handleMenuSelect('tavern');

      expect(router.navigate).toHaveBeenCalledWith(['/tavern']);
    });

    it('navigates to training grounds when selected', () => {
      component.handleMenuSelect('training');

      expect(router.navigate).toHaveBeenCalledWith(['/training']);
    });

    it('navigates to inn when selected', () => {
      component.handleMenuSelect('inn');

      expect(router.navigate).toHaveBeenCalledWith(['/inn']);
    });

    it('navigates to shop when selected', () => {
      component.handleMenuSelect('shop');

      expect(router.navigate).toHaveBeenCalledWith(['/shop']);
    });

    it('navigates to temple when selected', () => {
      component.handleMenuSelect('temple');

      expect(router.navigate).toHaveBeenCalledWith(['/temple']);
    });

    it('navigates to utilities when selected', () => {
      component.handleMenuSelect('utilities');

      expect(router.navigate).toHaveBeenCalledWith(['/utilities']);
    });

    it('navigates to edge of town when selected', () => {
      component.handleMenuSelect('edge-of-town');

      expect(router.navigate).toHaveBeenCalledWith(['/edge-of-town']);
    });
  });

  describe('keyboard shortcuts', () => {
    it('supports (T) for tavern', () => {
      expect(component.menuItems()[0].shortcut).toBe('T');
    });

    it('supports (G) for training grounds', () => {
      expect(component.menuItems()[1].shortcut).toBe('G');
    });

    it('supports (I) for inn', () => {
      expect(component.menuItems()[2].shortcut).toBe('I');
    });

    it('supports (S) for shop', () => {
      expect(component.menuItems()[3].shortcut).toBe('S');
    });

    it('supports (M) for temple', () => {
      expect(component.menuItems()[4].shortcut).toBe('M');
    });

    it('supports (U) for utilities', () => {
      expect(component.menuItems()[5].shortcut).toBe('U');
    });

    it('supports (E) for edge of town', () => {
      expect(component.menuItems()[6].shortcut).toBe('E');
    });
  });

  describe('party display panel', () => {
    it('displays party roster with 0-6 members', () => {
      // Start with empty party
      fixture.detectChanges();
      let compiled = fixture.nativeElement;
      expect(compiled.querySelector('.no-party')).toBeTruthy();

      // Add characters to party
      const char1 = createTestCharacter({ name: 'Fighter1', class: CharacterClass.FIGHTER });
      const char2 = createTestCharacter({ name: 'Mage1', race: Race.ELF, class: CharacterClass.MAGE });

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(char1.id, char1).set(char2.id, char2),
        party: {
          ...state.party,
          members: [char1.id, char2.id]
        }
      }));

      fixture.detectChanges();
      compiled = fixture.nativeElement;

      const partyMembers = compiled.querySelectorAll('.party-member');
      expect(partyMembers.length).toBe(2);
      expect(compiled.querySelector('.no-party')).toBeFalsy();
    });

    it('shows party gold', () => {
      const char = createTestCharacter();
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(char.id, char),
        party: {
          ...state.party,
          members: [char.id],
          gold: 1500
        }
      }));

      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.party-gold')?.textContent).toContain('1500');
    });

    it('shows "No party formed" when empty', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.no-party')?.textContent).toContain('No party formed');
      expect(compiled.querySelector('.hint')?.textContent).toContain('Visit Tavern');
    });

    it('character click navigates to inspection', () => {
      const char = createTestCharacter();

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(char.id, char),
        party: {
          ...state.party,
          members: [char.id]
        }
      }));

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const partyMember = compiled.querySelector('.party-member');
      partyMember?.click();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/character-inspection'],
        { queryParams: { characterId: char.id, returnTo: 'castle-menu' } }
      );
    });

    it('displays character name, class, level, HP', () => {
      const char = createTestCharacter({ name: 'Warrior', race: Race.DWARF });

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(char.id, char),
        party: {
          ...state.party,
          members: [char.id]
        }
      }));

      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const memberElement = compiled.querySelector('.party-member');

      expect(memberElement?.querySelector('.name')?.textContent).toContain('Warrior');
      expect(memberElement?.querySelector('.class')?.textContent).toContain('FIGHTER');
      expect(memberElement?.querySelector('.level')?.textContent).toContain('1');
      expect(memberElement?.querySelector('.hp')?.textContent).toContain('/');
    });

    it('shows status indicators (OK, DEAD, etc.)', () => {
      const charOK = createTestCharacter({ name: 'Alive' });
      const charDead = createTestCharacter({ name: 'Dead', class: CharacterClass.MAGE, status: 'DEAD' });

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(charOK.id, charOK).set(charDead.id, charDead),
        party: {
          ...state.party,
          members: [charOK.id, charDead.id]
        }
      }));

      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const members = compiled.querySelectorAll('.party-member');

      expect(members[0].querySelector('.status')?.textContent).toContain('OK');
      expect(members[1].querySelector('.status')?.textContent).toContain('DEAD');
      expect(members[1].querySelector('.status.dead')).toBeTruthy();
    });

    it('updates reactively when party changes', () => {
      fixture.detectChanges();
      let compiled = fixture.nativeElement;
      expect(compiled.querySelectorAll('.party-member').length).toBe(0);

      // Add a character
      const char = createTestCharacter({ name: 'NewChar' });

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(char.id, char),
        party: {
          ...state.party,
          members: [char.id]
        }
      }));

      fixture.detectChanges();
      compiled = fixture.nativeElement;
      expect(compiled.querySelectorAll('.party-member').length).toBe(1);
    });

    it('returns from inspection to castle menu', () => {
      // This test verifies the returnTo parameter is set correctly
      const char = createTestCharacter();

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(char.id, char),
        party: {
          ...state.party,
          members: [char.id]
        }
      }));

      component.handleInspectCharacter(char.id);

      expect(router.navigate).toHaveBeenCalledWith(
        ['/character-inspection'],
        expect.objectContaining({
          queryParams: expect.objectContaining({
            returnTo: 'castle-menu'
          })
        })
      );
    });
  });

  describe('dynamic menu items', () => {
    it('Edge of Town enabled when party exists', () => {
      const char = createTestCharacter();
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(char.id, char),
        party: {
          ...state.party,
          members: [char.id]
        }
      }));

      fixture.detectChanges();

      const edgeOfTownItem = component.menuItems().find(item => item.id === 'edge-of-town');
      expect(edgeOfTownItem?.enabled).toBe(true);
    });

    it('Edge of Town disabled when no party', () => {
      fixture.detectChanges();

      const edgeOfTownItem = component.menuItems().find(item => item.id === 'edge-of-town');
      expect(edgeOfTownItem?.enabled).toBe(false);
    });

    it('All town services always enabled', () => {
      fixture.detectChanges();

      const tavernItem = component.menuItems().find(item => item.id === 'tavern');
      const trainingItem = component.menuItems().find(item => item.id === 'training-grounds');
      const innItem = component.menuItems().find(item => item.id === 'inn');
      const shopItem = component.menuItems().find(item => item.id === 'shop');
      const templeItem = component.menuItems().find(item => item.id === 'temple');
      const utilitiesItem = component.menuItems().find(item => item.id === 'utilities');

      expect(tavernItem?.enabled).toBe(true);
      expect(trainingItem?.enabled).toBe(true);
      expect(innItem?.enabled).toBe(true);
      expect(shopItem?.enabled).toBe(true);
      expect(templeItem?.enabled).toBe(true);
      expect(utilitiesItem?.enabled).toBe(true);
    });

    it('Menu item shortcut keys work', () => {
      fixture.detectChanges();

      const tavernItem = component.menuItems().find(item => item.id === 'tavern');
      const edgeItem = component.menuItems().find(item => item.id === 'edge-of-town');

      expect(tavernItem?.shortcut).toBe('T');
      expect(edgeItem?.shortcut).toBe('E');
    });

    it('Navigation to selected service', () => {
      fixture.detectChanges();

      component.handleMenuSelect('tavern');
      expect(router.navigate).toHaveBeenCalledWith(['/tavern']);

      component.handleMenuSelect('temple');
      expect(router.navigate).toHaveBeenCalledWith(['/temple']);
    });
  });
});
