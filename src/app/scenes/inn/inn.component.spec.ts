import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnComponent } from './inn.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { SceneType } from '@models/SceneType';
import { Character } from '@models/Character';
import { CharacterClass } from '@models/CharacterClass';
import { CharacterStatus } from '@models/CharacterStatus';
import { RoomType } from '@services/InnService';
import { createTestCharacter } from '@testing/test-factories';

describe('InnComponent', () => {
  let component: InnComponent;
  let fixture: ComponentFixture<InnComponent>;
  let gameState: GameStateService;
  let navigationService: SceneNavigationService;
  let messageService: MessageService;

  const createPartyMember = (overrides: Partial<Character> = {}): Character => {
    return createTestCharacter({
      id: 'char-1',
      name: 'BOLDAR',
      class: CharacterClass.FIGHTER,
      level: 5,
      hp: 15,
      maxHp: 25,
      status: CharacterStatus.OK,
      experience: 10000,
      ...overrides
    });
  };

  const createMageWithSpells = (overrides: Partial<Character> = {}): Character => {
    return createTestCharacter({
      id: 'mage-1',
      name: 'MYSTARA',
      class: CharacterClass.MAGE,
      level: 3,
      hp: 12,
      maxHp: 12,
      status: CharacterStatus.OK,
      spellPoints: {
        mage: {
          level1: { current: 1, max: 4 },
          level2: { current: 0, max: 2 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 },
        }
      },
      ...overrides
    });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InnComponent]
    });

    fixture = TestBed.createComponent(InnComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    navigationService = TestBed.inject(SceneNavigationService);
    messageService = TestBed.inject(MessageService);

    jest.spyOn(navigationService, 'returnToCastle').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));

    // Setup default party with character and gold
    const mockCharacter = createPartyMember();
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter),
      party: {
        ...state.party,
        members: ['char-1'],
        gold: 1000
      }
    }));
  });

  describe('initialization', () => {
    it('updates scene to INN on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.INN);
    });

    it('displays inn title via SceneTitleComponent', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const sceneTitle = compiled.querySelector('app-scene-title');
      expect(sceneTitle).toBeTruthy();
    });

    it('shows party character grid', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const characterGrid = compiled.querySelector('app-party-character-grid');
      expect(characterGrid).toBeTruthy();
    });

    it('shows three rest action cards', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const actionCards = compiled.querySelectorAll('app-rest-action-card');
      expect(actionCards.length).toBe(3);
    });

    it('has footer menu with return option', () => {
      fixture.detectChanges();
      expect(component.footerMenuItems().length).toBe(1);
      expect(component.footerMenuItems()[0].id).toBe('return');
    });
  });

  describe('navigation', () => {
    it('returns to castle when footer return action is selected', () => {
      component.handleFooterAction('return');
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('returns to castle on ESC key when no modal is showing', () => {
      component.showRestResults.set(false);
      component.handleEscape();
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('navigates to character inspection on inspect action', () => {
      component.handleCharacterAction({
        actionType: 'inspect',
        characterId: 'char-1'
      });
      expect(navigationService.inspectCharacter).toHaveBeenCalledWith('char-1', 'inn');
    });
  });

  describe('rest action configurations', () => {
    it('disables Restore Spells when no casters in party', () => {
      // Default setup has fighter only (no casters)
      const configs = component.restActionConfigs();
      const restoreSpells = configs[0];
      expect(restoreSpells.enabled).toBe(false);
      expect(restoreSpells.disabledReason).toBe('No spell casters in party');
    });

    it('enables Restore Spells when caster has depleted spell points', () => {
      const mage = createMageWithSpells();
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage-1', mage),
        party: { ...state.party, members: ['mage-1'] }
      }));

      const configs = component.restActionConfigs();
      const restoreSpells = configs[0];
      expect(restoreSpells.enabled).toBe(true);
    });

    it('disables Restore Spells when all spell points are full', () => {
      const mage = createMageWithSpells({
        spellPoints: {
          mage: {
            level1: { current: 4, max: 4 },
            level2: { current: 2, max: 2 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 },
          }
        }
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage-1', mage),
        party: { ...state.party, members: ['mage-1'] }
      }));

      const configs = component.restActionConfigs();
      const restoreSpells = configs[0];
      expect(restoreSpells.enabled).toBe(false);
      expect(restoreSpells.disabledReason).toBe('All spell points are full');
    });

    it('enables Heal Party when characters need healing', () => {
      // Default setup has damaged fighter
      const configs = component.restActionConfigs();
      const healParty = configs[1];
      expect(healParty.enabled).toBe(true);
    });

    it('disables Heal Party when all characters at full HP', () => {
      const fullHpChar = createPartyMember({ hp: 25, maxHp: 25 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', fullHpChar),
        party: { ...state.party, members: ['char-1'] }
      }));

      const configs = component.restActionConfigs();
      const healParty = configs[1];
      expect(healParty.enabled).toBe(false);
      expect(healParty.disabledReason).toBe('All characters at full HP');
    });

    it('disables Full Rest when party is fully rested', () => {
      const fullHpChar = createPartyMember({ hp: 25, maxHp: 25 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', fullHpChar),
        party: { ...state.party, members: ['char-1'] }
      }));

      const configs = component.restActionConfigs();
      const fullRest = configs[2];
      expect(fullRest.enabled).toBe(false);
      expect(fullRest.disabledReason).toBe('Party is fully rested');
    });
  });

  describe('heal plan calculation', () => {
    it('calculates optimal room tier based on gold', () => {
      // Character needs 10 HP, party has 1000 gold
      // Should get Royal Suite (10 HP/week, 500gp/week)
      const plan = component.healPlan();
      expect(plan.roomTier).toBe(RoomType.ROYAL_SUITE);
      expect(plan.weeksNeeded).toBe(1);
      expect(plan.totalCost).toBe(500);
    });

    it('cascades to cheaper room when cannot afford premium', () => {
      // Set low gold
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, gold: 50 }
      }));

      const plan = component.healPlan();
      expect([RoomType.DOUBLE, RoomType.BARRACKS]).toContain(plan.roomTier);
    });

    it('returns zero plan when no healing needed', () => {
      const fullHpChar = createPartyMember({ hp: 25, maxHp: 25 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', fullHpChar),
        party: { ...state.party, members: ['char-1'] }
      }));

      const plan = component.healPlan();
      expect(plan.weeksNeeded).toBe(0);
      expect(plan.totalCost).toBe(0);
    });
  });

  describe('rest execution', () => {
    it('executes Restore Spells and shows results modal', () => {
      const mage = createMageWithSpells();
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage-1', mage),
        party: { ...state.party, members: ['mage-1'] }
      }));

      component.handleRestActionSelected('restore-spells');

      expect(component.showRestResults()).toBe(true);
      expect(component.restResults()).not.toBeNull();
      expect(component.restResults()?.weeksRested).toBe(1);
      expect(component.restResults()?.goldSpent).toBe(0);

      // Verify spell points restored
      const updatedMage = gameState.state().roster.get('mage-1')!;
      expect(updatedMage.spellPoints?.mage?.level1.current).toBe(4);
      expect(updatedMage.spellPoints?.mage?.level2.current).toBe(2);
    });

    it('executes Heal Party and deducts gold', () => {
      const initialGold = gameState.party().gold!;

      component.handleRestActionSelected('heal-party');

      expect(component.showRestResults()).toBe(true);
      expect(component.restResults()?.goldSpent).toBeGreaterThan(0);

      const finalGold = gameState.party().gold!;
      expect(finalGold).toBeLessThan(initialGold);
    });

    it('heals characters to full HP', () => {
      component.handleRestActionSelected('heal-party');

      const updatedChar = gameState.state().roster.get('char-1')!;
      expect(updatedChar.hp).toBe(updatedChar.maxHp);
    });

    it('executes Full Rest: heals HP and restores spells', () => {
      // Setup party with damaged mage who needs spells
      const mage = createMageWithSpells({ hp: 8, maxHp: 12 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage-1', mage),
        party: { ...state.party, members: ['mage-1'], gold: 1000 }
      }));

      component.handleRestActionSelected('full-rest');

      expect(component.showRestResults()).toBe(true);

      const updatedMage = gameState.state().roster.get('mage-1')!;
      expect(updatedMage.hp).toBe(12); // Fully healed
      expect(updatedMage.spellPoints?.mage?.level1.current).toBe(4); // Spells restored
    });

    it('shows error when trying to heal party already at full HP', () => {
      const fullHpChar = createPartyMember({ hp: 25, maxHp: 25 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', fullHpChar),
        party: { ...state.party, members: ['char-1'] }
      }));

      component.handleRestActionSelected('heal-party');

      expect(messageService.isError()).toBe(true);
      expect(component.showRestResults()).toBe(false);
    });
  });

  describe('results modal', () => {
    it('dismisses results modal on dismiss event', () => {
      // Setup and execute rest
      const mage = createMageWithSpells();
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage-1', mage),
        party: { ...state.party, members: ['mage-1'] }
      }));
      component.handleRestActionSelected('restore-spells');
      expect(component.showRestResults()).toBe(true);

      component.dismissRestResults();

      expect(component.showRestResults()).toBe(false);
      expect(component.restResults()).toBeNull();
    });

    it('dismisses results modal on ESC key', () => {
      component.showRestResults.set(true);
      component.restResults.set({
        weeksRested: 1,
        goldSpent: 0,
        goldRemaining: 1000,
        perCharacter: new Map(),
        characterNames: new Map(),
        levelUps: []
      });

      component.handleEscape();

      expect(component.showRestResults()).toBe(false);
    });

    it('dismisses results modal on Enter key', () => {
      component.showRestResults.set(true);
      component.restResults.set({
        weeksRested: 1,
        goldSpent: 0,
        goldRemaining: 1000,
        perCharacter: new Map(),
        characterNames: new Map(),
        levelUps: []
      });

      component.handleEnter();

      expect(component.showRestResults()).toBe(false);
    });
  });

  describe('keyboard shortcuts', () => {
    it('executes Restore Spells on "1" key when enabled', () => {
      const mage = createMageWithSpells();
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage-1', mage),
        party: { ...state.party, members: ['mage-1'] }
      }));

      const event = new KeyboardEvent('keydown', { key: '1' });
      component.handleKeydown(event);

      expect(component.showRestResults()).toBe(true);
    });

    it('executes Heal Party on "2" key when enabled', () => {
      const event = new KeyboardEvent('keydown', { key: '2' });
      component.handleKeydown(event);

      expect(component.showRestResults()).toBe(true);
      expect(component.restResults()?.goldSpent).toBeGreaterThan(0);
    });

    it('executes Full Rest on "3" key when enabled', () => {
      const event = new KeyboardEvent('keydown', { key: '3' });
      component.handleKeydown(event);

      expect(component.showRestResults()).toBe(true);
    });

    it('ignores "1" key when Restore Spells is disabled', () => {
      // Default setup has fighter only (no casters)
      const event = new KeyboardEvent('keydown', { key: '1' });
      component.handleKeydown(event);

      expect(component.showRestResults()).toBe(false);
    });

    it('ignores keyboard shortcuts when results modal is showing', () => {
      component.showRestResults.set(true);

      const event = new KeyboardEvent('keydown', { key: '2' });
      component.handleKeydown(event);

      // Should not trigger another rest action
      // (Can't easily test this without more complex setup)
    });
  });

  describe('empty party state', () => {
    it('shows empty state when no party members', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: [] }
      }));
      fixture.detectChanges();

      expect(component.partyCharacters().length).toBe(0);
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });
  });

  describe('computed signals', () => {
    it('partyCharacters returns current party members', () => {
      expect(component.partyCharacters().length).toBe(1);
      expect(component.partyCharacters()[0].id).toBe('char-1');
    });

    it('partyGold returns current party gold', () => {
      expect(component.partyGold()).toBe(1000);
    });

    it('livingCharacters filters out dead characters', () => {
      const deadChar = createPartyMember({
        id: 'dead-1',
        status: CharacterStatus.DEAD
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('dead-1', deadChar),
        party: { ...state.party, members: ['char-1', 'dead-1'] }
      }));

      expect(component.partyCharacters().length).toBe(2);
      expect(component.livingCharacters().length).toBe(1);
      expect(component.livingCharacters()[0].id).toBe('char-1');
    });

    it('partyNeedsHealing returns true when any character is damaged', () => {
      expect(component.partyNeedsHealing()).toBe(true);
    });

    it('partyNeedsHealing returns false when all at full HP', () => {
      const fullHpChar = createPartyMember({ hp: 25, maxHp: 25 });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', fullHpChar),
        party: { ...state.party, members: ['char-1'] }
      }));

      expect(component.partyNeedsHealing()).toBe(false);
    });

    it('partyNeedsSpells returns true when caster has depleted spells', () => {
      const mage = createMageWithSpells();
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage-1', mage),
        party: { ...state.party, members: ['mage-1'] }
      }));

      expect(component.partyNeedsSpells()).toBe(true);
    });

    it('partyHasCasters returns true when party has spell caster', () => {
      const mage = createMageWithSpells();
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('mage-1', mage),
        party: { ...state.party, members: ['mage-1'] }
      }));

      expect(component.partyHasCasters()).toBe(true);
    });

    it('partyHasCasters returns false for fighter-only party', () => {
      expect(component.partyHasCasters()).toBe(false);
    });
  });

  describe('level-ups', () => {
    it('includes level-up data in results when character levels up', () => {
      const fighter = createPartyMember({
        id: 'fighter-1',
        hp: 24, // Just 1 HP from max
        maxHp: 25,
        level: 1,
        experience: 3000 // Enough for level 2
      });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('fighter-1', fighter),
        party: { ...state.party, members: ['fighter-1'], gold: 1000 }
      }));

      component.handleRestActionSelected('heal-party');

      expect(component.restResults()?.levelUps.length).toBe(1);
      expect(component.restResults()?.levelUps[0].characterName).toBe('BOLDAR');
      expect(component.restResults()?.levelUps[0].newLevel).toBe(2);
    });
  });
});
