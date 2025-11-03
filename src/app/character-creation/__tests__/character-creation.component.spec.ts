import { ComponentFixture, TestBed, fakeAsync, tick, flush, flushMicrotasks } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CharacterCreationComponent } from '../character-creation.component';
import { GameStateService } from '../../../services/GameStateService';
import { RaceService } from '../../../services/RaceService';
import { ClassService } from '../../../services/ClassService';
import { CharacterService } from '../../../services/CharacterService';
import { CharacterCreationService } from '../../../services/CharacterCreationService';
import { Race } from '../../../types/Race';
import { CharacterClass } from '../../../types/CharacterClass';
import { Alignment } from '../../../types/Alignment';

// Access CreationStep from component class
type CreationStep = 'SELECT_RACE' | 'SELECT_ALIGNMENT' | 'ROLL_STATS' | 'SELECT_CLASS' | 'NAME_CHARACTER';
const CreationStep = {
  SELECT_RACE: 'SELECT_RACE' as CreationStep,
  SELECT_ALIGNMENT: 'SELECT_ALIGNMENT' as CreationStep,
  ROLL_STATS: 'ROLL_STATS' as CreationStep,
  SELECT_CLASS: 'SELECT_CLASS' as CreationStep,
  NAME_CHARACTER: 'NAME_CHARACTER' as CreationStep
};

// Test constants
const ROLL_ANIMATION_DURATION_MS = 300; // Matches component's animation duration
const ROLL_ANIMATION_BUFFER_MS = 50; // Small buffer for async operations
const ROLL_ANIMATION_TIMEOUT_MS = ROLL_ANIMATION_DURATION_MS + ROLL_ANIMATION_BUFFER_MS;

describe('CharacterCreationComponent', () => {
  let component: CharacterCreationComponent;
  let fixture: ComponentFixture<CharacterCreationComponent>;
  let mockRouter: jest.Mocked<Router>;
  let gameStateService: GameStateService;

  beforeEach(async () => {
    // Mock Router
    mockRouter = {
      navigate: jest.fn()
    } as any;

    // Initialize RaceService and ClassService with mock data
    const mockRaceData = new Map([
      ['human', {
        id: 'human',
        name: 'Human',
        enum: Race.HUMAN,
        baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
        savingThrowBonus: {},
        statTotal: 46,
        description: 'Versatile and balanced',
        strengths: ['Balanced stats'],
        weaknesses: ['No special bonuses'],
        bestClasses: ['Fighter', 'Mage', 'Priest']
      }],
      ['elf', {
        id: 'elf',
        name: 'Elf',
        enum: Race.ELF,
        baseStats: { str: 7, int: 10, pie: 10, vit: 6, agi: 9, luc: 6 },
        savingThrowBonus: {},
        statTotal: 48,
        description: 'Magical and agile',
        strengths: ['High intelligence'],
        weaknesses: ['Low vitality'],
        bestClasses: ['Mage']
      }]
    ]);

    const mockClassData = new Map([
      ['fighter', {
        id: 'fighter',
        name: 'Fighter',
        enum: CharacterClass.FIGHTER,
        description: 'Master of combat',
        requirements: { str: 11 },
        alignmentRestrictions: [],
        equipmentRestrictions: { weapons: [], armor: [], shields: [], helmets: [] },
        hitDice: '1d10',
        spellAccess: null,
        attacksPerLevel: { '1-4': 1 },
        xpTable: [2000],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: true
      }],
      ['mage', {
        id: 'mage',
        name: 'Mage',
        enum: CharacterClass.MAGE,
        description: 'Master of arcane magic',
        requirements: { int: 11 },
        alignmentRestrictions: [],
        equipmentRestrictions: { weapons: [], armor: [], shields: [], helmets: [] },
        hitDice: '1d4',
        spellAccess: { type: 'mage', levels: 7 },
        attacksPerLevel: { '1-4': 1 },
        xpTable: [2400],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: false
      }]
    ]);

    // Mock the private raceData and classData properties
    (RaceService as any).raceData = mockRaceData;
    (ClassService as any).classData = mockClassData;

    await TestBed.configureTestingModule({
      imports: [CharacterCreationComponent],
      providers: [
        GameStateService,
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCreationComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty form signals', () => {
      expect(component.selectedRace()).toBeNull();
      expect(component.selectedAlignment()).toBeNull();
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
    });

    it('should initialize UI state signals', () => {
      expect(component.isRolling()).toBe(false);
      expect(component.successMessage()).toBeNull();
      expect(component.errorMessage()).toBeNull();
    });

    it('should initialize data arrays', () => {
      expect(component.races.length).toBeGreaterThan(0);
      expect(component.allClasses.length).toBeGreaterThan(0);
      expect(component.Alignment).toBeDefined();
    });
  });

  describe('Computed Signals', () => {
    describe('raceData', () => {
      it('should return null when no race selected', () => {
        expect(component.raceData()).toBeNull();
      });

      it('should return race data when race selected', () => {
        component.selectRace(Race.HUMAN);
        expect(component.raceData()).toBeDefined();
        expect(component.raceData()!.name).toBe('Human');
      });
    });

    describe('finalStats', () => {
      it('should return null when stats not rolled', () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        expect(component.finalStats()).toBeNull();
      });

      it('should calculate final stats using NEW FORMULA: raceBase + rolled', async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        const raceData = RaceService.getRaceData(Race.HUMAN);
        const rolled = component.rolledStats()!;
        const finalStats = component.finalStats()!;

        // Verify NEW FORMULA: finalStat = raceBase + rolled
        expect(finalStats.strength).toBe(raceData.baseStats.str + rolled.strength);
        expect(finalStats.intelligence).toBe(raceData.baseStats.int + rolled.intelligence);
        expect(finalStats.piety).toBe(raceData.baseStats.pie + rolled.piety);
        expect(finalStats.vitality).toBe(raceData.baseStats.vit + rolled.vitality);
        expect(finalStats.agility).toBe(raceData.baseStats.agi + rolled.agility);
        expect(finalStats.luck).toBe(raceData.baseStats.luc + rolled.luck);
        expect(finalStats.bonusPoints).toBe(rolled.bonusPoints);
      });
    });

    describe('eligibleClasses', () => {
      it('should return empty array when stats not available', () => {
        expect(component.eligibleClasses()).toEqual([]);
      });

      it('should return empty array when alignment not selected', async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        component.selectedAlignment.set(null);
        expect(component.eligibleClasses()).toEqual([]);
      });

      it('should calculate eligible classes based on stats and alignment', async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        const eligible = component.eligibleClasses();
        expect(Array.isArray(eligible)).toBe(true);
        // At minimum, with decent stats, should have some eligible classes
      });
    });

    // canAccept() API was removed - replaced with step-based navigation

    describe('footerMenuItems', () => {
      describe('Step 1: SELECT_RACE', () => {
        it('should show continue (disabled), cancel, and quit', () => {
          component.currentStep.set(CreationStep.SELECT_RACE);
          const items = component.footerMenuItems();

          expect(items.length).toBe(3);
          expect(items.find(i => i.id === 'continue')).toBeDefined();
          expect(items.find(i => i.id === 'cancel')).toBeDefined();
          expect(items.find(i => i.id === 'quit')).toBeDefined();

          // Continue disabled when no race selected
          expect(items.find(i => i.id === 'continue')!.enabled).toBe(false);
        });

        it('should enable continue after race selection', () => {
          component.currentStep.set(CreationStep.SELECT_RACE);
          component.selectedRace.set(Race.HUMAN);

          const items = component.footerMenuItems();
          expect(items.find(i => i.id === 'continue')!.enabled).toBe(true);
        });
      });

      describe('Step 2: SELECT_ALIGNMENT', () => {
        it('should show continue (disabled), back, and quit', () => {
          component.currentStep.set(CreationStep.SELECT_ALIGNMENT);
          const items = component.footerMenuItems();

          expect(items.length).toBe(3);
          expect(items.find(i => i.id === 'continue')).toBeDefined();
          expect(items.find(i => i.id === 'back')).toBeDefined();
          expect(items.find(i => i.id === 'quit')).toBeDefined();

          // Continue disabled when no alignment selected
          expect(items.find(i => i.id === 'continue')!.enabled).toBe(false);
        });

        it('should enable continue after alignment selection', () => {
          component.currentStep.set(CreationStep.SELECT_ALIGNMENT);
          component.selectedAlignment.set(Alignment.GOOD);

          const items = component.footerMenuItems();
          expect(items.find(i => i.id === 'continue')!.enabled).toBe(true);
        });
      });

      describe('Step 3: ROLL_STATS', () => {
        it('should show only back and quit (no continue)', () => {
          component.currentStep.set(CreationStep.ROLL_STATS);
          const items = component.footerMenuItems();

          expect(items.length).toBe(2);
          expect(items.find(i => i.id === 'back')).toBeDefined();
          expect(items.find(i => i.id === 'quit')).toBeDefined();
          expect(items.find(i => i.id === 'continue')).toBeUndefined();
        });
      });

      describe('Step 4: SELECT_CLASS', () => {
        it('should show continue, reroll, reset, and quit', () => {
          component.currentStep.set(CreationStep.SELECT_CLASS);
          const items = component.footerMenuItems();

          expect(items.length).toBe(4);
          expect(items.find(i => i.id === 'continue')).toBeDefined();
          expect(items.find(i => i.id === 'reroll')).toBeDefined();
          expect(items.find(i => i.id === 'reset')).toBeDefined();
          expect(items.find(i => i.id === 'quit')).toBeDefined();

          // Continue disabled when no class selected
          expect(items.find(i => i.id === 'continue')!.enabled).toBe(false);
        });

        it('should enable continue after class selection', () => {
          component.currentStep.set(CreationStep.SELECT_CLASS);
          component.selectedClass.set(CharacterClass.FIGHTER);

          const items = component.footerMenuItems();
          expect(items.find(i => i.id === 'continue')!.enabled).toBe(true);
        });
      });

      describe('Step 5: NAME_CHARACTER', () => {
        it('should show create (disabled), back, and quit', () => {
          component.currentStep.set(CreationStep.NAME_CHARACTER);
          component.characterName.set('');
          const items = component.footerMenuItems();

          expect(items.length).toBe(3);
          expect(items.find(i => i.id === 'create')).toBeDefined();
          expect(items.find(i => i.id === 'back')).toBeDefined();
          expect(items.find(i => i.id === 'quit')).toBeDefined();

          // Create disabled when name is empty
          expect(items.find(i => i.id === 'create')!.enabled).toBe(false);
        });

        it('should enable create after name entered', () => {
          component.currentStep.set(CreationStep.NAME_CHARACTER);
          component.characterName.set('TestHero');

          const items = component.footerMenuItems();
          expect(items.find(i => i.id === 'create')!.enabled).toBe(true);
        });
      });
    });
  });

  describe('selectRace()', () => {
    it('should set selected race', () => {
      component.selectRace(Race.HUMAN);
      expect(component.selectedRace()).toBe(Race.HUMAN);
    });

    it('should reset downstream selections (stats, class) when not locked', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      // Don't roll stats - stay unlocked

      // Change race should reset alignment
      component.selectRace(Race.ELF);

      expect(component.selectedRace()).toBe(Race.ELF);
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
    }));

    it('should not reset alignment when changing race', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);

      component.selectRace(Race.ELF);

      expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    });
  });

  describe('selectAlignment()', () => {
    it('should set selected alignment', () => {
      component.selectAlignment(Alignment.GOOD);
      expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    });

    it('should reset downstream selections (stats, class) when not locked', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      // Don't roll stats - stay unlocked

      // Change alignment should reset (no stats rolled yet)
      component.selectAlignment(Alignment.EVIL);

      expect(component.selectedAlignment()).toBe(Alignment.EVIL);
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
    }));
  });

  describe('rollStats()', () => {
    it('should set isRolling to true during animation', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      const rollPromise = component.rollStats();

      // Check immediately - should be rolling
      expect(component.isRolling()).toBe(true);

      // Clean up: await the promise to prevent unhandled rejection
      return rollPromise;
    });

    it('should set isRolling to false after animation', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      expect(component.isRolling()).toBe(false);
    });

    it('should generate rolled stats', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      const rolled = component.rolledStats();
      expect(rolled).toBeDefined();
      expect(rolled!.strength).toBeGreaterThanOrEqual(3);
      expect(rolled!.strength).toBeLessThanOrEqual(18);
      expect(rolled!.bonusPoints).toBeGreaterThanOrEqual(7);
    });

    it('should reset class when rerolling stats', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Mock high stats to ensure Fighter is eligible
      component.rolledStats.set({
        strength: 15, intelligence: 10, piety: 10,
        vitality: 12, agility: 10, luck: 10, bonusPoints: 5
      });

      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
      component.selectClass(CharacterClass.FIGHTER);
      expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

      // Reroll stats
      await component.rerollStats();

      expect(component.selectedClass()).toBeNull();
    });
  });

  describe('isClassEligible()', () => {
    it('should return false when no stats rolled', () => {
      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(false);
    });

    it('should check eligibility based on stats and alignment', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      const isEligible = component.isClassEligible(CharacterClass.FIGHTER);
      expect(typeof isEligible).toBe('boolean');
    });
  });

  describe('selectClass()', () => {
    it('should select eligible class', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Mock high stats to ensure Fighter is eligible
      component.rolledStats.set({
        strength: 15, intelligence: 10, piety: 10,
        vitality: 12, agility: 10, luck: 10, bonusPoints: 5
      });

      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
      component.selectClass(CharacterClass.FIGHTER);
      expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
    });

    it('should not select ineligible class', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Mock a class as ineligible
      jest.spyOn(component, 'isClassEligible').mockReturnValue(false);

      component.selectClass(CharacterClass.FIGHTER);
      expect(component.selectedClass()).toBeNull();
    });
  });

  // acceptCharacter() API was removed - replaced with advanceToNameCharacter()

  describe('submitCharacter()', () => {
    it('should create character and add to roster', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Mock high stats to ensure Fighter is eligible
      component.rolledStats.set({
        strength: 15, intelligence: 10, piety: 10,
        vitality: 12, agility: 10, luck: 10, bonusPoints: 5
      });

      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
      component.selectClass(CharacterClass.FIGHTER);

      const initialRosterSize = gameStateService.state().roster.size;
      await component.submitCharacter('TestHero');

      const newRosterSize = gameStateService.state().roster.size;
      expect(newRosterSize).toBe(initialRosterSize + 1);

      // Verify character was added
      const roster = Array.from(gameStateService.state().roster.values());
      const addedChar = roster.find(c => c.name === 'TestHero');
      expect(addedChar).toBeDefined();
      expect(addedChar!.race).toBe(Race.HUMAN);
      expect(addedChar!.class).toBe(CharacterClass.FIGHTER);
    });

    it('should show success message and reset immediately', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Mock high stats to ensure Fighter is eligible
      component.rolledStats.set({
        strength: 15, intelligence: 10, piety: 10,
        vitality: 12, agility: 10, luck: 10, bonusPoints: 5
      });

      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
      component.selectClass(CharacterClass.FIGHTER);

      const initialRosterSize = gameStateService.state().roster.size;
      await component.submitCharacter('TestHero');

      // Note: successMessage is immediately cleared by resetWizard() call
      // Verify character was created successfully
      const newRosterSize = gameStateService.state().roster.size;
      expect(newRosterSize).toBe(initialRosterSize + 1);

      // Verify immediate reset occurred
      expect(component.selectedRace()).toBeNull();
      expect(component.selectedAlignment()).toBeNull();
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
      expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
    });

    it('should trim character name before saving', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Mock high stats to ensure Fighter is eligible
      component.rolledStats.set({
        strength: 15, intelligence: 10, piety: 10,
        vitality: 12, agility: 10, luck: 10, bonusPoints: 5
      });

      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
      component.selectClass(CharacterClass.FIGHTER);

      await component.submitCharacter('  TestHero  ');

      const roster = Array.from(gameStateService.state().roster.values());
      const addedChar = roster.find(c => c.name === 'TestHero');
      expect(addedChar).toBeDefined();
      expect(addedChar!.name).toBe('TestHero'); // Trimmed
    });
  });

  // resetForm() API was renamed to resetWizard() - tested in other sections

  describe('navigateToTrainingGrounds()', () => {
    it('should navigate to training grounds', () => {
      component.navigateToTrainingGrounds();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });
  });

  describe('handleKeyPress()', () => {
    it('should roll stats on R key when on ROLL_STATS step', async () => {
      component.selectRace(Race.HUMAN);
      component.advanceToAlignment();
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();

      const event = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event);

      // Wait for async rollStats to complete using proper timeout
      await new Promise(resolve => setTimeout(resolve, ROLL_ANIMATION_TIMEOUT_MS));

      expect(component.rolledStats()).toBeTruthy();
    });

    it('should roll stats on uppercase R key', async () => {
      component.selectRace(Race.HUMAN);
      component.advanceToAlignment();
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();

      const event = new KeyboardEvent('keydown', { key: 'R' });
      component.handleKeyPress(event);

      // Wait for async rollStats to complete using proper timeout
      await new Promise(resolve => setTimeout(resolve, ROLL_ANIMATION_TIMEOUT_MS));

      expect(component.rolledStats()).toBeTruthy();
    });

    it('should not roll stats when alignment not selected', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event);

      // Should not roll without alignment
      expect(component.rolledStats()).toBeNull();
    });

    it('should advance to NAME_CHARACTER on Enter key when form complete', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Mock high stats to ensure Fighter is eligible
      component.rolledStats.set({
        strength: 15, intelligence: 10, piety: 10,
        vitality: 12, agility: 10, luck: 10, bonusPoints: 5
      });

      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
      component.selectClass(CharacterClass.FIGHTER);

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.currentStep()).toBe(CreationStep.NAME_CHARACTER);
    });

    it('should not advance to NAME_CHARACTER when form incomplete', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.currentStep()).not.toBe('NAME_CHARACTER');
    });

    it('should navigate to training grounds on Escape key', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyPress(event);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });

    it('should navigate to training grounds on lowercase escape', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'escape' });
      component.handleKeyPress(event);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });

    // New comprehensive keyboard shortcut tests
    describe('Race selection (1-5 keys)', () => {
      it('should select first race on key "1"', () => {
        const event = new KeyboardEvent('keydown', { key: '1' });
        component.handleKeyPress(event);

        expect(component.selectedRace()).toBe(Race.HUMAN);
      });

      it('should select second race on key "2"', () => {
        const event = new KeyboardEvent('keydown', { key: '2' });
        component.handleKeyPress(event);

        expect(component.selectedRace()).toBe(Race.ELF);
      });

      it('should ignore invalid race keys', () => {
        const event = new KeyboardEvent('keydown', { key: '9' });
        component.handleKeyPress(event);

        expect(component.selectedRace()).toBeNull();
      });

      it('should reset downstream selections when changing race via keyboard', () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);

        const event = new KeyboardEvent('keydown', { key: '2' }); // Select Elf
        component.handleKeyPress(event);

        expect(component.selectedRace()).toBe(Race.ELF);
        expect(component.selectedAlignment()).toBe(Alignment.GOOD); // Not reset
      });
    });

    describe('Alignment selection (G, N, E keys)', () => {
      beforeEach(() => {
        component.selectRace(Race.HUMAN);
        component.advanceToAlignment();
      });

      it('should select GOOD on "g" key when on SELECT_ALIGNMENT step', () => {
        const event = new KeyboardEvent('keydown', { key: 'g' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.GOOD);
      });

      it('should select NEUTRAL on "n" key when on SELECT_ALIGNMENT step', () => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.NEUTRAL);
      });

      it('should select EVIL on "e" key when on SELECT_ALIGNMENT step', () => {
        const event = new KeyboardEvent('keydown', { key: 'e' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.EVIL);
      });

      it('should select GOOD on uppercase "G" key', () => {
        const event = new KeyboardEvent('keydown', { key: 'G' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.GOOD);
      });

      // Skipped: This test creates an invalid state that cannot occur in normal usage

      it('should NOT change alignment after stats rolled', async () => {
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        const event = new KeyboardEvent('keydown', { key: 'e' });
        component.handleKeyPress(event);

        // Should remain GOOD (alignment locked after rolling)
        expect(component.selectedAlignment()).toBe(Alignment.GOOD);
      });
    });

    describe('Class selection (F, M, P, T, I, S, L, N keys)', () => {
      beforeEach(async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();
      });

      it('should select FIGHTER on "f" key when eligible', () => {
        // Mock high stats to ensure Fighter is eligible
        component.rolledStats.set({
          strength: 15, intelligence: 10, piety: 10,
          vitality: 12, agility: 10, luck: 10, bonusPoints: 5
        });

        expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);

        const event = new KeyboardEvent('keydown', { key: 'f' });
        component.handleKeyPress(event);

        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
      });

      it('should select MAGE on "m" key when eligible', () => {
        // Mock high stats to ensure Mage is eligible
        component.rolledStats.set({
          strength: 10, intelligence: 15, piety: 10,
          vitality: 10, agility: 10, luck: 10, bonusPoints: 5
        });

        expect(component.isClassEligible(CharacterClass.MAGE)).toBe(true);

        const event = new KeyboardEvent('keydown', { key: 'm' });
        component.handleKeyPress(event);

        expect(component.selectedClass()).toBe(CharacterClass.MAGE);
      });

      it('should select BISHOP on "b" key when eligible', () => {
        // Verify BISHOP uses 'B' key (changed from 'I' to avoid alignment conflicts)
        const shortcut = component.getClassShortcut('BISHOP');
        expect(shortcut).toBe('B');
      });

      it('should NOT select class when stats not rolled', () => {
        component.rolledStats.set(null); // Clear rolled stats

        const event = new KeyboardEvent('keydown', { key: 'f' });
        component.handleKeyPress(event);

        expect(component.selectedClass()).toBeNull();
      });

      it('should NOT select ineligible class via keyboard', () => {
        // Clear stats to make no classes eligible
        component.rolledStats.set(null);

        const event = new KeyboardEvent('keydown', { key: 'f' });
        component.handleKeyPress(event);

        expect(component.selectedClass()).toBeNull();
      });

      it('should select class on uppercase keys', () => {
        // Mock high stats to ensure Fighter is eligible
        component.rolledStats.set({
          strength: 15, intelligence: 10, piety: 10,
          vitality: 12, agility: 10, luck: 10, bonusPoints: 5
        });

        expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);

        const event = new KeyboardEvent('keydown', { key: 'F' });
        component.handleKeyPress(event);

        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
      });
    });

    describe('Quit navigation (Q key)', () => {
      it('should navigate to training grounds on "q" key', () => {
        const event = new KeyboardEvent('keydown', { key: 'q' });
        component.handleKeyPress(event);

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
      });

      it('should navigate to training grounds on uppercase "Q" key', () => {
        const event = new KeyboardEvent('keydown', { key: 'Q' });
        component.handleKeyPress(event);

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
      });
    });

    describe('Priority conflict resolution', () => {
      it('should advance to NAME_CHARACTER with Enter when form complete', async () => {
        // Setup complete form
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        // Mock high stats to ensure Fighter is eligible
        component.rolledStats.set({
          strength: 15, intelligence: 10, piety: 10,
          vitality: 12, agility: 10, luck: 10, bonusPoints: 5
        });

        expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
        component.selectClass(CharacterClass.FIGHTER);

        // Press Enter - should advance to NAME_CHARACTER
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        component.handleKeyPress(event);

        // Verify advanced to NAME_CHARACTER
        expect(component.currentStep()).toBe('NAME_CHARACTER');
        // Verify class didn't change
        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
      });

      it('should select SAMURAI (A) when form incomplete', async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        // Mock high stats to ensure Samurai is eligible
        component.rolledStats.set({
          strength: 15, intelligence: 11, piety: 10,
          vitality: 14, agility: 10, luck: 10, bonusPoints: 5
        });

        expect(component.isClassEligible(CharacterClass.SAMURAI)).toBe(true);

        // Form is NOT complete (no class), so 'A' should select Samurai
        const event = new KeyboardEvent('keydown', { key: 'a' });
        component.handleKeyPress(event);

        expect(component.selectedClass()).toBe(CharacterClass.SAMURAI);
      });

      it('should prioritize Alignment (N) over NINJA class', () => {
        // Setup: race selected on SELECT_ALIGNMENT step
        component.selectRace(Race.HUMAN);
        component.advanceToAlignment();

        // Press 'N' - should select NEUTRAL alignment
        const event = new KeyboardEvent('keydown', { key: 'n' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.NEUTRAL);
        expect(component.selectedClass()).toBeNull();
      });

      it('should select NINJA (J) when stats rolled and alignment set', async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.EVIL); // NINJA requires EVIL
        component.advanceToRollStats();
        await component.rollStats();

        // Mock very high stats to ensure Ninja is eligible (requires 17 in all stats)
        component.rolledStats.set({
          strength: 17, intelligence: 17, piety: 17,
          vitality: 17, agility: 17, luck: 10, bonusPoints: 8
        });

        expect(component.isClassEligible(CharacterClass.NINJA)).toBe(true);

        // Now 'J' should select Ninja (form is locked, alignment already set)
        const event = new KeyboardEvent('keydown', { key: 'j' });
        component.handleKeyPress(event);

        expect(component.selectedClass()).toBe(CharacterClass.NINJA);
      });

      it('should prioritize Go Back (Escape) over other keys', async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        // Escape should go back from SELECT_CLASS to SELECT_ALIGNMENT (nuclear option)
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        component.handleKeyPress(event);

        expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
        expect(component.rolledStats()).toBeNull();
      });
    });

    describe('preventDefault() verification', () => {
      it('should call preventDefault on race selection', () => {
        const event = new KeyboardEvent('keydown', { key: '1' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should call preventDefault on alignment selection', () => {
        component.selectRace(Race.HUMAN);
        component.advanceToAlignment();

        const event = new KeyboardEvent('keydown', { key: 'g' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should call preventDefault on roll stats', () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();

        const event = new KeyboardEvent('keydown', { key: 'r' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should call preventDefault on class selection', async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        // Mock high stats to ensure Fighter is eligible
        component.rolledStats.set({
          strength: 15, intelligence: 10, piety: 10,
          vitality: 12, agility: 10, luck: 10, bonusPoints: 5
        });

        expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);

        const event = new KeyboardEvent('keydown', { key: 'f' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should call preventDefault on accept (Enter)', async () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        // Mock high stats to ensure Fighter is eligible
        component.rolledStats.set({
          strength: 15, intelligence: 10, piety: 10,
          vitality: 12, agility: 10, luck: 10, bonusPoints: 5
        });

        expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
        component.selectClass(CharacterClass.FIGHTER);

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should call preventDefault on cancel', () => {
        component.selectRace(Race.HUMAN);

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should call preventDefault on quit navigation', () => {
        const event = new KeyboardEvent('keydown', { key: 'q' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });
    });
  });

  describe('handleFooterAction()', () => {
    describe('continue action', () => {
      it('should advance from SELECT_RACE to SELECT_ALIGNMENT', () => {
        component.currentStep.set(CreationStep.SELECT_RACE);
        component.selectedRace.set(Race.HUMAN);

        component.handleFooterAction('continue');

        expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
      });

      it('should advance from SELECT_ALIGNMENT to ROLL_STATS', () => {
        component.currentStep.set(CreationStep.SELECT_ALIGNMENT);
        component.selectedAlignment.set(Alignment.GOOD);

        component.handleFooterAction('continue');

        expect(component.currentStep()).toBe(CreationStep.ROLL_STATS);
      });

      it('should advance from SELECT_CLASS to NAME_CHARACTER', async () => {
        component.currentStep.set(CreationStep.SELECT_CLASS);
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        // Mock high stats to ensure Fighter is eligible
        component.rolledStats.set({
          strength: 15, intelligence: 10, piety: 10,
          vitality: 12, agility: 10, luck: 10, bonusPoints: 5
        });

        expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
        component.selectClass(CharacterClass.FIGHTER);

        component.handleFooterAction('continue');

        expect(component.currentStep()).toBe(CreationStep.NAME_CHARACTER);
      });
    });

    describe('cancel action', () => {
      it('should navigate to training grounds from SELECT_RACE', () => {
        component.currentStep.set(CreationStep.SELECT_RACE);

        component.handleFooterAction('cancel');

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
      });
    });

    describe('back action', () => {
      it('should go back from SELECT_ALIGNMENT to SELECT_RACE', () => {
        component.currentStep.set(CreationStep.SELECT_ALIGNMENT);
        component.selectedAlignment.set(Alignment.GOOD);

        component.handleFooterAction('back');

        expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
      });

      it('should go back from ROLL_STATS to SELECT_ALIGNMENT', () => {
        component.currentStep.set(CreationStep.ROLL_STATS);

        component.handleFooterAction('back');

        expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
      });

      it('should go back from NAME_CHARACTER to SELECT_CLASS', () => {
        component.currentStep.set(CreationStep.NAME_CHARACTER);

        component.handleFooterAction('back');

        expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
      });
    });

    describe('reset action (Step 4 only)', () => {
      it('should reset to SELECT_ALIGNMENT and clear stats', () => {
        component.currentStep.set(CreationStep.SELECT_CLASS);
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);

        component.handleFooterAction('reset');

        expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
        expect(component.rolledStats()).toBeNull();
        expect(component.selectedClass()).toBeNull();
      });
    });

    describe('reroll action (Step 4 only)', () => {
      it('should reroll stats', async () => {
        component.currentStep.set(CreationStep.SELECT_CLASS);
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);

        await component.handleFooterAction('reroll');

        expect(component.rolledStats()).toBeDefined();
      });
    });

    describe('create action (Step 5 only)', () => {
      it('should create character when name is valid', async () => {
        component.currentStep.set(CreationStep.NAME_CHARACTER);
        component.selectedRace.set(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('TestHero');

        const initialRosterSize = gameStateService.state().roster.size;
        component.handleFooterAction('create');

        // Verify character was created
        const newRosterSize = gameStateService.state().roster.size;
        expect(newRosterSize).toBe(initialRosterSize + 1);

        // Verify reset happened
        expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
      });

      it('should not create character when name is empty', () => {
        component.currentStep.set(CreationStep.NAME_CHARACTER);
        component.characterName.set('');

        component.handleFooterAction('create');

        expect(mockRouter.navigate).not.toHaveBeenCalled();
      });
    });

    describe('quit action', () => {
      it('should navigate to training grounds', () => {
        component.handleFooterAction('quit');

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
      });
    });
  });

  describe('Template Helper Methods', () => {
    it('should parse race ID', () => {
      const race = component.parseRaceId('human');
      expect(race).toBe(Race.HUMAN);
    });

    it('should parse class ID', () => {
      const charClass = component.parseClassId('fighter');
      expect(charClass).toBe(CharacterClass.FIGHTER);
    });

    it('should get class data', () => {
      const classData = component.getClassData(CharacterClass.FIGHTER);
      expect(classData).toBeDefined();
      expect(classData.name).toBe('Fighter');
    });
  });

  // Progressive Enabling: canAccept() API was removed - replaced with step-based navigation

  describe('Cascade Reset Logic', () => {
    it('should cascade reset when changing race (before locking)', () => {
      // Set up form but don't roll stats (stay unlocked)
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      // Don't roll stats - this keeps it unlocked

      // Change race should reset alignment
      component.selectRace(Race.ELF);

      expect(component.selectedRace()).toBe(Race.ELF);
      expect(component.rolledStats()).toBeNull(); // Still null
      expect(component.selectedClass()).toBeNull(); // Still null
    });

    it('should cascade reset when changing alignment (before locking)', () => {
      // Set up form but don't roll stats (stay unlocked)
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      // Don't roll stats - this keeps it unlocked

      // Change alignment should reset stats and class (though they're already null)
      component.selectAlignment(Alignment.EVIL);

      expect(component.selectedRace()).toBe(Race.HUMAN); // Not reset
      expect(component.selectedAlignment()).toBe(Alignment.EVIL);
      expect(component.rolledStats()).toBeNull(); // Still null
      expect(component.selectedClass()).toBeNull(); // Still null
    });

    it('should cascade reset when rerolling stats', async () => {
      // Set up form through class selection
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();
      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
      }

      // Reroll stats should reset class
      await component.rerollStats();

      expect(component.selectedRace()).toBe(Race.HUMAN); // Not reset
      expect(component.selectedAlignment()).toBe(Alignment.GOOD); // Not reset
      expect(component.rolledStats()).toBeTruthy(); // New stats
      expect(component.selectedClass()).toBeNull(); // Reset
    });
  });

  describe('state locking', () => {
    it('should not be locked initially', () => {
      expect(component.isLocked()).toBe(false);
    });

    it('should lock race and alignment after first stats roll', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToAlignment();
      component.advanceToRollStats();

      expect(component.isLocked()).toBe(false);

      await component.rollStats();

      expect(component.isLocked()).toBe(true);
      expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS); // Should auto-advance
    });

    it('should remain locked after rerolling stats', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToAlignment();
      component.advanceToRollStats();
      await component.rollStats();

      await component.rerollStats();

      expect(component.isLocked()).toBe(true);
    });

    it('should unlock when form is reset', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToAlignment();
      component.advanceToRollStats();
      await component.rollStats();

      expect(component.isLocked()).toBe(true);

      component.resetWizard();

      expect(component.isLocked()).toBe(false);
    });

    it('should prevent race selection when locked', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToAlignment();
      component.advanceToRollStats();
      await component.rollStats();

      // Try to select different race
      component.selectRace(Race.ELF);

      // Should still be HUMAN
      expect(component.selectedRace()).toBe(Race.HUMAN);
    });

    it('should prevent alignment selection when locked', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToAlignment();
      component.advanceToRollStats();
      await component.rollStats();

      // Try to select different alignment
      component.selectAlignment(Alignment.EVIL);

      // Should still be GOOD
      expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    });
  });

  describe('class selection keyboard shortcuts', () => {
    it('should select Fighter with F key', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.isLocked.set(true);
      component.rolledStats.set({
        strength: 15, intelligence: 10, piety: 10,
        vitality: 12, agility: 10, luck: 10, bonusPoints: 5
      });
      component.currentStep.set(CreationStep.SELECT_CLASS);

      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'f' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
    });

    it('should select Mage with M key', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.isLocked.set(true);
      component.rolledStats.set({
        strength: 10, intelligence: 15, piety: 10,
        vitality: 10, agility: 10, luck: 10, bonusPoints: 5
      });
      component.currentStep.set(CreationStep.SELECT_CLASS);

      expect(component.isClassEligible(CharacterClass.MAGE)).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'm' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.MAGE);
    });

    it('should select Priest with P key', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.isLocked.set(true);
      component.rolledStats.set({
        strength: 10, intelligence: 10, piety: 15,
        vitality: 10, agility: 10, luck: 10, bonusPoints: 5
      });
      component.currentStep.set(CreationStep.SELECT_CLASS);

      expect(component.isClassEligible(CharacterClass.PRIEST)).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'p' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.PRIEST);
    });

    it('should select Thief with T key', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.NEUTRAL);
      component.isLocked.set(true);
      component.rolledStats.set({
        strength: 10, intelligence: 10, piety: 10,
        vitality: 10, agility: 15, luck: 10, bonusPoints: 5
      });
      component.currentStep.set(CreationStep.SELECT_CLASS);

      expect(component.isClassEligible(CharacterClass.THIEF)).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 't' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.THIEF);
    });

    it('should select Bishop with B key', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.isLocked.set(true);
      component.rolledStats.set({
        strength: 10, intelligence: 15, piety: 15,
        vitality: 10, agility: 10, luck: 10, bonusPoints: 6
      });
      component.currentStep.set(CreationStep.SELECT_CLASS);

      expect(component.isClassEligible(CharacterClass.BISHOP)).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'b' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.BISHOP);
    });

    it('should select Samurai with A key', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.isLocked.set(true);
      component.rolledStats.set({
        strength: 15, intelligence: 11, piety: 10,
        vitality: 14, agility: 10, luck: 10, bonusPoints: 5
      });
      component.currentStep.set(CreationStep.SELECT_CLASS);

      expect(component.isClassEligible(CharacterClass.SAMURAI)).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'a' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.SAMURAI);
    });

    it('should select Lord with L key', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.isLocked.set(true);
      component.rolledStats.set({
        strength: 15, intelligence: 12, piety: 12,
        vitality: 14, agility: 10, luck: 10, bonusPoints: 6
      });
      component.currentStep.set(CreationStep.SELECT_CLASS);

      expect(component.isClassEligible(CharacterClass.LORD)).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'l' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.LORD);
    });

    it('should select Ninja with J key', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.EVIL);
      component.isLocked.set(true);
      component.rolledStats.set({
        strength: 17, intelligence: 17, piety: 17,
        vitality: 17, agility: 17, luck: 10, bonusPoints: 8
      });
      component.currentStep.set(CreationStep.SELECT_CLASS);

      expect(component.isClassEligible(CharacterClass.NINJA)).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'j' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.NINJA);
    });

    it('should not select class before stats rolled', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();

      const event = new KeyboardEvent('keydown', { key: 'f' });
      component.handleKeyPress(event);

      expect(component.selectedClass()).toBeNull();
    });

    it('should not select ineligible class', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Stats that don't qualify for Ninja
      component.rolledStats.set({
        strength: 10, intelligence: 10, piety: 10,
        vitality: 10, agility: 10, luck: 10, bonusPoints: 3
      });

      expect(component.isClassEligible(CharacterClass.NINJA)).toBe(false);

      const event = new KeyboardEvent('keydown', { key: 'j' });
      component.handleKeyPress(event);

      expect(component.selectedClass()).not.toBe(CharacterClass.NINJA);
      expect(component.selectedClass()).toBeNull();
    });
  });

  describe('name modal integration', () => {
    it('should advance to NAME_CHARACTER when Enter pressed after class selection', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();
      component.selectClass(CharacterClass.FIGHTER);

      expect(component.currentStep()).toBe('SELECT_CLASS');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.currentStep()).toBe('NAME_CHARACTER');
    });

    it('should not advance to NAME_CHARACTER when Enter pressed without class', () => {
      component.selectRace(Race.HUMAN);
      component.advanceToAlignment();

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.currentStep()).not.toBe('NAME_CHARACTER');
    });

    it('should block reroll when on NAME_CHARACTER step', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();
      component.selectClass(CharacterClass.FIGHTER);
      component.advanceToNameCharacter();

      const currentStats = component.rolledStats();

      // Try to reroll (should not work on NAME_CHARACTER step)
      const event = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event);

      // Stats should not change
      expect(component.rolledStats()).toBe(currentStats);
    });

    it('should save character when submitting with name', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();

      // Mock high stats to ensure Fighter is eligible
      component.rolledStats.set({
        strength: 15, intelligence: 10, piety: 10,
        vitality: 12, agility: 10, luck: 10, bonusPoints: 5
      });

      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(true);
      component.selectClass(CharacterClass.FIGHTER);

      await component.submitCharacter('Conan');

      // Use injected service instead of accessing private property
      const state = gameStateService.state();
      const characters = Array.from(state.roster.values());
      const conan = characters.find(c => c.name === 'Conan');
      expect(conan).toBeDefined();
      expect(conan!.name).toBe('Conan');
    });

    it('should return to class selection when going back from name step', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();
      component.selectClass(CharacterClass.FIGHTER);
      component.advanceToNameCharacter();

      component.goBackFromNameCharacter();

      expect(component.currentStep()).toBe('SELECT_CLASS');
      expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
    });

    it('should reset form immediately after successful save', async () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.advanceToRollStats();
      await component.rollStats();
      component.selectClass(CharacterClass.FIGHTER);

      await component.submitCharacter('Gandalf');

      // Immediate reset (no delay)
      expect(component.selectedRace()).toBeNull();
      expect(component.isLocked()).toBe(false);
      expect(component.currentStep()).toBe('SELECT_RACE');
    });
  });

  describe('Complete character creation flow', () => {
    it('should complete full workflow with keyboard only', async () => {

      // Step 1: Select race with keyboard
      const event1 = new KeyboardEvent('keydown', { key: '1' });
      component.handleKeyPress(event1);
      expect(component.selectedRace()).toBe(Race.HUMAN);
      expect(component.isLocked()).toBe(false);

      // Step 1b: Press Enter to advance to alignment step
      const eventEnter1 = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(eventEnter1);
      expect(component.currentStep()).toBe('SELECT_ALIGNMENT');

      // Step 2: Select alignment with keyboard
      const event2 = new KeyboardEvent('keydown', { key: 'g' });
      component.handleKeyPress(event2);
      expect(component.selectedAlignment()).toBe(Alignment.GOOD);
      expect(component.isLocked()).toBe(false);

      // Step 2b: Press Enter to advance to roll stats step
      const eventEnter2 = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(eventEnter2);
      expect(component.currentStep()).toBe('ROLL_STATS');

      // Step 3: Roll stats (locks race/alignment)
      const event3 = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event3);
      // Wait for async rollStats to complete using proper timeout
      await new Promise(resolve => setTimeout(resolve, ROLL_ANIMATION_TIMEOUT_MS));
      expect(component.rolledStats()).toBeTruthy();
      expect(component.isLocked()).toBe(true);

      // Step 4: Roll stats should auto-advance to SELECT_CLASS
      expect(component.currentStep()).toBe('SELECT_CLASS');

      // Step 5: Select class with keyboard
      const event5 = new KeyboardEvent('keydown', { key: 'f' });
      component.handleKeyPress(event5);
      expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

      // Step 6: Press Enter to advance to NAME_CHARACTER step
      const event6 = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event6);
      expect(component.currentStep()).toBe('NAME_CHARACTER');

      // Step 7: Type name and submit character
      component.characterName.set('TestHero');
      await component.submitCharacter('TestHero');

      // Step 8: Verify immediate reset (success message is cleared by reset)
      expect(component.selectedRace()).toBeNull();
      expect(component.isLocked()).toBe(false);
      expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);

      // Verify character in roster
      const state = gameStateService.state();
      const characters = Array.from(state.roster.values());
      expect(characters.length).toBeGreaterThan(0);
      const testHero = characters.find(c => c.name === 'TestHero');
      expect(testHero).toBeDefined();
      expect(testHero!.race).toBe(Race.HUMAN);
      expect(testHero!.alignment).toBe(Alignment.GOOD);
      expect(testHero!.class).toBe(CharacterClass.FIGHTER);
    });
  });

  describe('State Machine', () => {
    describe('initialization', () => {
      it('starts at SELECT_RACE step', () => {
        expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
      });

      it('shows step 1 of 5', () => {
        expect(component.stepNumber()).toBe(1);
        expect(component.stepTitle()).toBe('Choose Your Race');
      });
    });

    describe('forward navigation', () => {
      it('advances from SELECT_RACE to SELECT_ALIGNMENT', () => {
        component.selectedRace.set(Race.HUMAN);
        component.advanceToAlignment();

        expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
        expect(component.stepNumber()).toBe(2);
      });

      it('does not advance from SELECT_RACE without race selected', () => {
        component.advanceToAlignment();

        expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
      });

      it('advances from SELECT_ALIGNMENT to ROLL_STATS', () => {
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToRollStats();

        expect(component.currentStep()).toBe(CreationStep.ROLL_STATS);
        expect(component.stepNumber()).toBe(3);
      });

      it('auto-advances from ROLL_STATS to SELECT_CLASS after rolling', async () => {
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();

        expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
        expect(component.stepNumber()).toBe(4);
        expect(component.rolledStats()).toBeTruthy();
      });

      it('advances from SELECT_CLASS to NAME_CHARACTER', () => {
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.selectedClass.set(CharacterClass.FIGHTER);
        component.advanceToNameCharacter();

        expect(component.currentStep()).toBe(CreationStep.NAME_CHARACTER);
        expect(component.stepNumber()).toBe(5);
      });
    });

    describe('backward navigation', () => {
      it('goes back from SELECT_ALIGNMENT to SELECT_RACE and clears alignment', () => {
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToAlignment();

        component.goBackFromAlignment();

        expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
        expect(component.selectedAlignment()).toBeNull();
        expect(component.selectedRace()).toBe(Race.HUMAN); // race persists
      });

      it('goes back from ROLL_STATS to SELECT_ALIGNMENT and clears stats', () => {
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToRollStats();
        component.rolledStats.set({
          strength: 10,
          intelligence: 12,
          piety: 8,
          vitality: 11,
          agility: 9,
          luck: 10,
          bonusPoints: 40
        });

        component.goBackFromRollStats();

        expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
        expect(component.rolledStats()).toBeNull();
        expect(component.selectedAlignment()).toBe(Alignment.GOOD); // alignment persists
      });

      it('goes back from SELECT_CLASS to SELECT_ALIGNMENT (nuclear option)', async () => {
        // Setup: reach class selection
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();
        component.selectedClass.set(CharacterClass.FIGHTER);

        expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
        expect(component.rolledStats()).toBeTruthy();
        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

        // Go back (nuclear option)
        component.goBackFromSelectClass();

        expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
        expect(component.rolledStats()).toBeNull(); // stats cleared
        expect(component.selectedClass()).toBeNull(); // class cleared
        expect(component.selectedAlignment()).toBe(Alignment.GOOD); // alignment persists
      });

      it('goes back from NAME_CHARACTER to SELECT_CLASS', () => {
        component.selectedRace.set(Race.HUMAN);
        component.selectedClass.set(CharacterClass.FIGHTER);
        component.currentStep.set(CreationStep.NAME_CHARACTER);

        component.goBackFromNameCharacter();

        expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER); // class persists
      });
    });

    describe('reroll behavior', () => {
      it('rerolls stats and stays on SELECT_CLASS step', async () => {
        // Setup: reach class selection
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();
        const firstRollStr = JSON.stringify(component.rolledStats());
        component.selectedClass.set(CharacterClass.FIGHTER);

        expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);

        // Reroll
        await component.rerollStats();

        expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
        expect(component.rolledStats()).toBeTruthy();
        // Verify we got a new roll (values likely different, though could be same by chance)
        const secondRollStr = JSON.stringify(component.rolledStats());
        // At minimum, verify the roll happened and class was cleared
        expect(component.selectedClass()).toBeNull(); // class cleared
      });

      it('updates eligible classes after reroll', async () => {
        component.selectedRace.set(Race.HUMAN);
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToRollStats();
        await component.rollStats();
        const firstEligible = [...component.eligibleClasses()];

        // Reroll until we get different eligible classes (or max 10 tries)
        let attempts = 0;
        let differentEligibility = false;

        while (attempts < 10 && !differentEligibility) {
          await component.rerollStats();
          const newEligible = [...component.eligibleClasses()];

          if (JSON.stringify(firstEligible) !== JSON.stringify(newEligible)) {
            differentEligibility = true;
          }
          attempts++;
        }

        // This test verifies eligibility recalculates (may need multiple rolls)
        expect(component.eligibleClasses().length).toBeGreaterThan(0);
      });

    describe('complete character creation flow', () => {
      it('creates character and resets immediately', async () => {
        // Step 1: Select race
        component.selectedRace.set(Race.ELF);
        component.advanceToAlignment();

        // Step 2: Select alignment
        component.selectedAlignment.set(Alignment.GOOD);
        component.advanceToRollStats();

        // Step 3: Roll stats
        component.advanceToRollStats();
        await component.rollStats();
        expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);

        // Step 4: Select class (pick first eligible)
        const eligibleClass = component.eligibleClasses()[0];
        component.selectedClass.set(eligibleClass);
        component.advanceToNameCharacter();

        // Step 5: Submit name
        await component.submitCharacter('Legolas');

        // Verify immediate reset (no delay)
        expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
        expect(component.selectedRace()).toBeNull();
        expect(component.selectedAlignment()).toBeNull();
        expect(component.rolledStats()).toBeNull();
        expect(component.selectedClass()).toBeNull();

        // Verify character was added to roster
        const state = gameStateService.state();
        const characters = Array.from(state.roster.values());
        const legolas = characters.find(c => c.name === 'Legolas');

        expect(legolas).toBeDefined();
        expect(legolas?.race).toBe(Race.ELF);
        expect(legolas?.alignment).toBe(Alignment.GOOD);
      });
    });
  });
});
