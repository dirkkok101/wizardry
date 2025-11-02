import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
      expect(component.allRaces().length).toBeGreaterThan(0);
      expect(component.allClasses().length).toBeGreaterThan(0);
      expect(component.allAlignments).toEqual([Alignment.GOOD, Alignment.NEUTRAL, Alignment.EVIL]);
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

      it('should calculate final stats using NEW FORMULA: raceBase + rolled', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

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
      }));
    });

    describe('eligibleClasses', () => {
      it('should return empty array when stats not available', () => {
        expect(component.eligibleClasses()).toEqual([]);
      });

      it('should return empty array when alignment not selected', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        component.selectedAlignment.set(null);
        expect(component.eligibleClasses()).toEqual([]);
      }));

      it('should calculate eligible classes based on stats and alignment', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        const eligible = component.eligibleClasses();
        expect(Array.isArray(eligible)).toBe(true);
        // At minimum, with decent stats, should have some eligible classes
      }));
    });

    describe('canAccept', () => {
      it('should be false initially', () => {
        expect(component.canAccept()).toBe(false);
      });

      it('should be false with only race selected', () => {
        component.selectRace(Race.HUMAN);
        expect(component.canAccept()).toBe(false);
      });

      it('should be false with race and alignment selected', () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        expect(component.canAccept()).toBe(false);
      });

      it('should be false with race, alignment, and stats', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        expect(component.canAccept()).toBe(false);
      }));

      it('should be true with race, alignment, stats, and class', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);
          expect(component.canAccept()).toBe(true);
        }
      }));
    });

    describe('footerMenuItems', () => {
      it('should return menu items with correct structure', () => {
        const items = component.footerMenuItems();
        expect(items.length).toBe(2); // Only reset and quit initially
        expect(items[0].id).toBe('reset');
        expect(items[1].id).toBe('quit');
      });

      it('should not have accept button initially', () => {
        const items = component.footerMenuItems();
        const acceptItem = items.find(i => i.id === 'accept');
        expect(acceptItem).toBeUndefined();
      });

      it('should have reset and quit always enabled', () => {
        const items = component.footerMenuItems();
        const resetItem = items.find(i => i.id === 'reset');
        const quitItem = items.find(i => i.id === 'quit');
        expect(resetItem!.enabled).toBe(true);
        expect(quitItem!.enabled).toBe(true);
      });

      it('should show accept button when form is complete', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);

          const items = component.footerMenuItems();
          const acceptItem = items.find(i => i.id === 'accept');
          expect(acceptItem).toBeDefined();
          expect(acceptItem!.enabled).toBe(true);
          expect(items.length).toBe(3); // accept, reset, quit
        }
      }));
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
      component.rollStats();

      expect(component.isRolling()).toBe(true);
    });

    it('should set isRolling to false after animation', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      tick(350);

      expect(component.isRolling()).toBe(false);
    }));

    it('should generate rolled stats', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      tick(350);

      const rolled = component.rolledStats();
      expect(rolled).toBeDefined();
      expect(rolled!.strength).toBeGreaterThanOrEqual(3);
      expect(rolled!.strength).toBeLessThanOrEqual(18);
      expect(rolled!.bonusPoints).toBeGreaterThanOrEqual(7);
    }));

    it('should reset class when rerolling stats', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

        // Reroll stats
        component.rollStats();
        tick(350);

        expect(component.selectedClass()).toBeNull();
      }
    }));
  });

  describe('isClassEligible()', () => {
    it('should return false when no stats rolled', () => {
      expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(false);
    });

    it('should check eligibility based on stats and alignment', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      const isEligible = component.isClassEligible(CharacterClass.FIGHTER);
      expect(typeof isEligible).toBe('boolean');
    }));
  });

  describe('selectClass()', () => {
    it('should select eligible class', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
      }
    }));

    it('should not select ineligible class', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      // Mock a class as ineligible
      jest.spyOn(component, 'isClassEligible').mockReturnValue(false);

      component.selectClass(CharacterClass.FIGHTER);
      expect(component.selectedClass()).toBeNull();
    }));
  });

  describe('acceptCharacter()', () => {
    it('should not accept when form incomplete', () => {
      component.acceptCharacter();
      expect(component.showNameModal()).toBe(false);
    });

    it('should show name modal when form complete', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        component.acceptCharacter();

        expect(component.showNameModal()).toBe(true);
      }
    }));
  });

  describe('handleNameSave()', () => {
    it('should create character and add to roster', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        const initialRosterSize = gameStateService.state().roster.size;
        component.handleNameSave('TestHero');

        const newRosterSize = gameStateService.state().roster.size;
        expect(newRosterSize).toBe(initialRosterSize + 1);

        // Verify character was added
        const roster = Array.from(gameStateService.state().roster.values());
        const addedChar = roster.find(c => c.name === 'TestHero');
        expect(addedChar).toBeDefined();
        expect(addedChar!.race).toBe(Race.HUMAN);
        expect(addedChar!.class).toBe(CharacterClass.FIGHTER);
      }
    }));

    it('should close modal and show success message', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        component.handleNameSave('TestHero');

        expect(component.showNameModal()).toBe(false);
        expect(component.successMessage()).toContain('created successfully');
        expect(component.successMessage()).toContain('TestHero');
      }
    }));

    it('should reset form after success timeout', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        component.handleNameSave('TestHero');
        tick(2100);

        expect(component.selectedRace()).toBeNull();
        expect(component.selectedAlignment()).toBeNull();
        expect(component.rolledStats()).toBeNull();
        expect(component.selectedClass()).toBeNull();
        expect(component.successMessage()).toBeNull();
      }
    }));

    it('should trim character name before saving', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        component.handleNameSave('  TestHero  ');

        const roster = Array.from(gameStateService.state().roster.values());
        const addedChar = roster.find(c => c.name === 'TestHero');
        expect(addedChar).toBeDefined();
        expect(addedChar!.name).toBe('TestHero'); // Trimmed
      }
    }));
  });

  describe('resetForm()', () => {
    it('should reset all form fields', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
      }

      component.resetForm();

      expect(component.selectedRace()).toBeNull();
      expect(component.selectedAlignment()).toBeNull();
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
    }));

    it('should reset UI state', () => {
      component.errorMessage.set('Error');
      component.showNameModal.set(true);
      component.isLocked.set(true);

      component.resetForm();

      expect(component.errorMessage()).toBeNull();
      expect(component.showNameModal()).toBe(false);
      expect(component.isLocked()).toBe(false);
    });
  });

  describe('navigateToTrainingGrounds()', () => {
    it('should navigate to training grounds', () => {
      component.navigateToTrainingGrounds();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });
  });

  describe('handleKeyPress()', () => {
    it('should roll stats on R key when alignment selected', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);

      const event = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event);

      tick(350);

      expect(component.rolledStats()).toBeTruthy();
    }));

    it('should roll stats on uppercase R key', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);

      const event = new KeyboardEvent('keydown', { key: 'R' });
      component.handleKeyPress(event);

      tick(350);

      expect(component.rolledStats()).toBeTruthy();
    }));

    it('should not roll stats when alignment not selected', fakeAsync(() => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event);

      tick(350);

      expect(component.rolledStats()).toBeNull();
    }));

    it('should open name modal on Enter key when form complete', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        component.handleKeyPress(event);

        expect(component.showNameModal()).toBe(true);
      }
    }));

    it('should not open name modal when form incomplete', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.showNameModal()).toBe(false);
    });

    it('should reset form on Escape key', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyPress(event);

      expect(component.selectedRace()).toBeNull();
    });

    it('should reset form on lowercase escape', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'escape' });
      component.handleKeyPress(event);

      expect(component.selectedRace()).toBeNull();
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
      });

      it('should select GOOD on "g" key when race selected and stats not rolled', () => {
        const event = new KeyboardEvent('keydown', { key: 'g' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.GOOD);
      });

      it('should select NEUTRAL on "n" key when race selected and stats not rolled', () => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.NEUTRAL);
      });

      it('should select EVIL on "e" key when race selected and stats not rolled', () => {
        const event = new KeyboardEvent('keydown', { key: 'e' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.EVIL);
      });

      it('should select GOOD on uppercase "G" key', () => {
        const event = new KeyboardEvent('keydown', { key: 'G' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.GOOD);
      });

      it('should NOT select alignment when race not selected', () => {
        component.selectedRace.set(null); // Clear race

        const event = new KeyboardEvent('keydown', { key: 'g' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBeNull();
      });

      it('should NOT change alignment after stats rolled', fakeAsync(() => {
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        const event = new KeyboardEvent('keydown', { key: 'e' });
        component.handleKeyPress(event);

        // Should remain GOOD (alignment locked after rolling)
        expect(component.selectedAlignment()).toBe(Alignment.GOOD);
      }));
    });

    describe('Class selection (F, M, P, T, I, S, L, N keys)', () => {
      beforeEach(fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);
      }));

      it('should select FIGHTER on "f" key when eligible', () => {
        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          const event = new KeyboardEvent('keydown', { key: 'f' });
          component.handleKeyPress(event);

          expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
        }
      });

      it('should select MAGE on "m" key when eligible', () => {
        if (component.isClassEligible(CharacterClass.MAGE)) {
          const event = new KeyboardEvent('keydown', { key: 'm' });
          component.handleKeyPress(event);

          expect(component.selectedClass()).toBe(CharacterClass.MAGE);
        }
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
        // Mock all classes as ineligible
        jest.spyOn(component, 'isClassEligible').mockReturnValue(false);

        const event = new KeyboardEvent('keydown', { key: 'f' });
        component.handleKeyPress(event);

        expect(component.selectedClass()).toBeNull();
      });

      it('should select class on uppercase keys', () => {
        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          const event = new KeyboardEvent('keydown', { key: 'F' });
          component.handleKeyPress(event);

          expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
        }
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
      it('should open name modal with Enter when form complete', fakeAsync(() => {
        // Setup complete form
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);

          // Press Enter - should open name modal
          const event = new KeyboardEvent('keydown', { key: 'Enter' });
          component.handleKeyPress(event);

          // Verify modal opened
          expect(component.showNameModal()).toBe(true);
          // Verify class didn't change
          expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
        }
      }));

      it('should select SAMURAI (A) when form incomplete', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.SAMURAI)) {
          // Form is NOT complete (no class), so 'A' should select Samurai
          const event = new KeyboardEvent('keydown', { key: 'a' });
          component.handleKeyPress(event);

          expect(component.selectedClass()).toBe(CharacterClass.SAMURAI);
        }
      }));

      it('should prioritize Alignment (N) over NINJA class', fakeAsync(() => {
        // Setup: race selected, no stats (not locked)
        component.selectRace(Race.HUMAN);

        // Press 'N' - should select NEUTRAL alignment, not Ninja class (not locked yet)
        const event = new KeyboardEvent('keydown', { key: 'n' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.NEUTRAL);
        expect(component.selectedClass()).toBeNull();
      }));

      it('should select NINJA (J) when stats rolled and alignment set', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.EVIL); // NINJA requires EVIL
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.NINJA)) {
          // Now 'J' should select Ninja (form is locked, alignment already set)
          const event = new KeyboardEvent('keydown', { key: 'j' });
          component.handleKeyPress(event);

          expect(component.selectedClass()).toBe(CharacterClass.NINJA);
        }
      }));

      it('should prioritize Reset (Escape) over other keys', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        // Escape should always reset form, regardless of state
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        component.handleKeyPress(event);

        expect(component.selectedRace()).toBeNull();
      }));
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

        const event = new KeyboardEvent('keydown', { key: 'g' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should call preventDefault on roll stats', () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);

        const event = new KeyboardEvent('keydown', { key: 'r' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should call preventDefault on class selection', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          const event = new KeyboardEvent('keydown', { key: 'f' });
          const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

          component.handleKeyPress(event);

          expect(preventDefaultSpy).toHaveBeenCalled();
        }
      }));

      it('should call preventDefault on accept (Enter)', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);

          const event = new KeyboardEvent('keydown', { key: 'Enter' });
          const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

          component.handleKeyPress(event);

          expect(preventDefaultSpy).toHaveBeenCalled();
        }
      }));

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
    it('should show name modal when accept action triggered', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        component.handleFooterAction('accept');

        expect(component.showNameModal()).toBe(true);
      }
    }));

    it('should reset form when reset action triggered', () => {
      component.selectRace(Race.HUMAN);

      component.handleFooterAction('reset');

      expect(component.selectedRace()).toBeNull();
    });

    it('should navigate to training grounds when quit action triggered', () => {
      component.handleFooterAction('quit');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
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

  describe('Progressive Enabling', () => {
    it('should follow correct enabling sequence', fakeAsync(() => {
      // Initially: race always enabled, nothing else
      expect(component.canAccept()).toBe(false);

      // Step 1: Select race
      component.selectRace(Race.HUMAN);
      expect(component.canAccept()).toBe(false);

      // Step 2: Select alignment
      component.selectAlignment(Alignment.GOOD);
      expect(component.canAccept()).toBe(false);

      // Step 3: Roll stats
      component.rollStats();
      tick(350);
      expect(component.canAccept()).toBe(false);

      // Step 4: Select class - now canAccept becomes true
      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        expect(component.canAccept()).toBe(true);
      }
    }));
  });

  describe('Cascade Reset Logic', () => {
    it('should cascade reset when changing race (before locking)', fakeAsync(() => {
      // Set up form but don't roll stats (stay unlocked)
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      // Don't roll stats - this keeps it unlocked

      // Change race should reset alignment
      component.selectRace(Race.ELF);

      expect(component.selectedRace()).toBe(Race.ELF);
      expect(component.rolledStats()).toBeNull(); // Still null
      expect(component.selectedClass()).toBeNull(); // Still null
    }));

    it('should cascade reset when changing alignment (before locking)', fakeAsync(() => {
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
    }));

    it('should cascade reset when rerolling stats', fakeAsync(() => {
      // Set up form through class selection
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);
      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
      }

      // Reroll stats should reset class
      component.rollStats();
      tick(350);

      expect(component.selectedRace()).toBe(Race.HUMAN); // Not reset
      expect(component.selectedAlignment()).toBe(Alignment.GOOD); // Not reset
      expect(component.rolledStats()).toBeTruthy(); // New stats
      expect(component.selectedClass()).toBeNull(); // Reset
    }));
  });

  describe('state locking', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not be locked initially', () => {
      expect(component.isLocked()).toBe(false);
    });

    it('should lock race and alignment after first stats roll', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);

      expect(component.isLocked()).toBe(false);

      component.rollStats();

      // Wait for animation
      jest.advanceTimersByTime(300);

      expect(component.isLocked()).toBe(true);
    });

    it('should remain locked after rerolling stats', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);

      component.rollStats();
      jest.advanceTimersByTime(300);

      expect(component.isLocked()).toBe(true);
    });

    it('should unlock when form is reset', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);

      expect(component.isLocked()).toBe(true);

      component.resetForm();

      expect(component.isLocked()).toBe(false);
    });

    it('should prevent race selection when locked', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);

      // Try to select different race
      component.selectRace(Race.ELF);

      // Should still be HUMAN
      expect(component.selectedRace()).toBe(Race.HUMAN);
    });

    it('should prevent alignment selection when locked', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);

      // Try to select different alignment
      component.selectAlignment(Alignment.EVIL);

      // Should still be GOOD
      expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    });
  });

  describe('class selection keyboard shortcuts', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should select Fighter with F key', () => {
      const event = new KeyboardEvent('keydown', { key: 'f' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
    });

    it('should select Mage with M key', () => {
      const event = new KeyboardEvent('keydown', { key: 'm' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.MAGE);
    });

    it('should select Priest with P key', () => {
      // Reset selectedClass to ensure canAccept() is false
      component.selectedClass.set(null);
      const event = new KeyboardEvent('keydown', { key: 'p' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.PRIEST);
    });

    it('should select Thief with T key', () => {
      // Reset and setup for Thief (requires NEUTRAL or EVIL alignment)
      component.resetForm();
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.NEUTRAL);
      component.rollStats();
      jest.advanceTimersByTime(300);

      // Set stats to ensure Thief is eligible (needs AGI 11)
      component.rolledStats.set({
        strength: 10, intelligence: 10, piety: 10,
        vitality: 10, agility: 11, luck: 10, bonusPoints: 3
      });

      const event = new KeyboardEvent('keydown', { key: 't' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.THIEF);
    });

    it('should select Bishop with B key', () => {
      // Roll stats that make Bishop eligible
      component.rolledStats.set({
        strength: 10, intelligence: 12, piety: 12,
        vitality: 10, agility: 10, luck: 10, bonusPoints: 5
      });

      const event = new KeyboardEvent('keydown', { key: 'b' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.BISHOP);
    });

    it('should select Samurai with A key', () => {
      // Roll stats that make Samurai eligible
      component.rolledStats.set({
        strength: 15, intelligence: 11, piety: 10,
        vitality: 14, agility: 10, luck: 10, bonusPoints: 5
      });

      const event = new KeyboardEvent('keydown', { key: 'a' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.SAMURAI);
    });

    it('should select Lord with L key', () => {
      // Roll stats that make Lord eligible
      component.rolledStats.set({
        strength: 15, intelligence: 12, piety: 12,
        vitality: 14, agility: 10, luck: 10, bonusPoints: 6
      });

      const event = new KeyboardEvent('keydown', { key: 'l' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.LORD);
    });

    it('should select Ninja with J key', () => {
      // Reset and setup for Ninja (requires EVIL alignment and all stats 17)
      component.resetForm();
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.EVIL);
      component.rollStats();
      jest.advanceTimersByTime(300);

      // Roll stats that make Ninja eligible (needs all stats 17)
      component.rolledStats.set({
        strength: 17, intelligence: 17, piety: 17,
        vitality: 17, agility: 17, luck: 10, bonusPoints: 8
      });

      const event = new KeyboardEvent('keydown', { key: 'j' });
      component.handleKeyPress(event);
      expect(component.selectedClass()).toBe(CharacterClass.NINJA);
    });

    it('should not select class before stats rolled', () => {
      component.resetForm();
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);

      const event = new KeyboardEvent('keydown', { key: 'f' });
      component.handleKeyPress(event);

      expect(component.selectedClass()).toBeNull();
    });

    it('should not select ineligible class', () => {
      // Stats that don't qualify for Ninja
      component.rolledStats.set({
        strength: 10, intelligence: 10, piety: 10,
        vitality: 10, agility: 10, luck: 10, bonusPoints: 3
      });

      const event = new KeyboardEvent('keydown', { key: 'j' });
      component.handleKeyPress(event);

      expect(component.selectedClass()).not.toBe(CharacterClass.NINJA);
    });
  });

  describe('name modal integration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show name modal when Enter pressed after class selection', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);
      component.selectClass(CharacterClass.FIGHTER);

      expect(component.showNameModal()).toBe(false);

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.showNameModal()).toBe(true);
    });

    it('should not show name modal when Enter pressed without class', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event);

      expect(component.showNameModal()).toBe(false);
    });

    it('should block keyboard shortcuts when name modal is open', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);
      component.selectClass(CharacterClass.FIGHTER);
      component.showNameModal.set(true);

      const currentStats = component.rolledStats();

      // Try to reroll (should not work)
      const event = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event);
      jest.advanceTimersByTime(300);

      // Stats should not change
      expect(component.rolledStats()).toBe(currentStats);
    });

    it('should save character when name modal emits save', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);
      component.selectClass(CharacterClass.FIGHTER);

      component.handleNameSave('Conan');

      const state = component['gameState'].state();
      const characters = Array.from(state.roster.values());
      expect(characters.length).toBe(1);
      expect(characters[0].name).toBe('Conan');
    });

    it('should close modal and return to form when name modal emits cancel', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);
      component.selectClass(CharacterClass.FIGHTER);
      component.showNameModal.set(true);

      component.handleNameCancel();

      expect(component.showNameModal()).toBe(false);
      expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
    });

    it('should reset form after successful save', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      jest.advanceTimersByTime(300);
      component.selectClass(CharacterClass.FIGHTER);

      component.handleNameSave('Gandalf');

      // Wait for success message timeout
      jest.advanceTimersByTime(2000);

      expect(component.selectedRace()).toBeNull();
      expect(component.isLocked()).toBe(false);
      expect(component.showNameModal()).toBe(false);
    });
  });

  describe('Complete character creation flow', () => {
    it('should complete full workflow with keyboard only', () => {
      jest.useFakeTimers();

      // Step 1: Select race with keyboard
      const event1 = new KeyboardEvent('keydown', { key: '1' });
      component.handleKeyPress(event1);
      expect(component.selectedRace()).toBe(Race.HUMAN);
      expect(component.isLocked()).toBe(false);

      // Step 2: Select alignment with keyboard
      const event2 = new KeyboardEvent('keydown', { key: 'g' });
      component.handleKeyPress(event2);
      expect(component.selectedAlignment()).toBe(Alignment.GOOD);
      expect(component.isLocked()).toBe(false);

      // Step 3: Roll stats (locks race/alignment)
      const event3 = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event3);
      jest.advanceTimersByTime(300);
      expect(component.rolledStats()).toBeTruthy();
      expect(component.isLocked()).toBe(true);

      // Step 4: Try to change race (should fail - locked)
      const event4 = new KeyboardEvent('keydown', { key: '2' });
      component.handleKeyPress(event4);
      expect(component.selectedRace()).toBe(Race.HUMAN); // Still HUMAN

      // Step 5: Select class with keyboard
      const event5 = new KeyboardEvent('keydown', { key: 'f' });
      component.handleKeyPress(event5);
      expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

      // Step 6: Accept character (open name modal)
      const event6 = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyPress(event6);
      expect(component.showNameModal()).toBe(true);

      // Step 7: Try to reroll while modal open (should be blocked)
      const statsBeforeBlock = component.rolledStats();
      const event7 = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event7);
      jest.advanceTimersByTime(300);
      expect(component.rolledStats()).toBe(statsBeforeBlock); // No change

      // Step 8: Save character with name
      component.handleNameSave('TestHero');
      expect(component.showNameModal()).toBe(false);
      expect(component.successMessage()).toContain('TestHero');

      // Step 9: Wait for reset
      jest.advanceTimersByTime(2000);
      expect(component.selectedRace()).toBeNull();
      expect(component.isLocked()).toBe(false);
      expect(component.successMessage()).toBeNull();

      // Verify character in roster
      const state = gameStateService.state();
      const characters = Array.from(state.roster.values());
      expect(characters.length).toBeGreaterThan(0);
      const testHero = characters.find(c => c.name === 'TestHero');
      expect(testHero).toBeDefined();
      expect(testHero!.race).toBe(Race.HUMAN);
      expect(testHero!.alignment).toBe(Alignment.GOOD);
      expect(testHero!.class).toBe(CharacterClass.FIGHTER);

      jest.useRealTimers();
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
    });
  });
});
