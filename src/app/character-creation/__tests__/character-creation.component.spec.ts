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
      expect(component.characterName()).toBe('');
    });

    it('should initialize UI state signals', () => {
      expect(component.isRolling()).toBe(false);
      expect(component.successMessage()).toBeNull();
      expect(component.errorMessage()).toBeNull();
      expect(component.showCancelConfirmation()).toBe(false);
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

    describe('canSave', () => {
      it('should be false initially', () => {
        expect(component.canSave()).toBe(false);
      });

      it('should be false with only race selected', () => {
        component.selectRace(Race.HUMAN);
        expect(component.canSave()).toBe(false);
      });

      it('should be false with race and alignment selected', () => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        expect(component.canSave()).toBe(false);
      });

      it('should be false with race, alignment, and stats', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        expect(component.canSave()).toBe(false);
      }));

      it('should be false with race, alignment, stats, and class', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);
          expect(component.canSave()).toBe(false);
        }
      }));

      it('should be true when all fields are filled', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);
          component.characterName.set('TestCharacter');
          expect(component.canSave()).toBe(true);
        }
      }));

      it('should be false if name is only whitespace', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);
          component.characterName.set('   ');
          expect(component.canSave()).toBe(false);
        }
      }));
    });

    describe('footerMenuItems', () => {
      it('should return menu items with correct structure', () => {
        const items = component.footerMenuItems();
        expect(items.length).toBe(3);
        expect(items[0].id).toBe('save');
        expect(items[1].id).toBe('cancel');
        expect(items[2].id).toBe('back');
      });

      it('should have save disabled initially', () => {
        const items = component.footerMenuItems();
        const saveItem = items.find(i => i.id === 'save');
        expect(saveItem!.enabled).toBe(false);
      });

      it('should have cancel and back always enabled', () => {
        const items = component.footerMenuItems();
        const cancelItem = items.find(i => i.id === 'cancel');
        const backItem = items.find(i => i.id === 'back');
        expect(cancelItem!.enabled).toBe(true);
        expect(backItem!.enabled).toBe(true);
      });

      it('should enable save when form is complete', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);
          component.characterName.set('Test');

          const items = component.footerMenuItems();
          const saveItem = items.find(i => i.id === 'save');
          expect(saveItem!.enabled).toBe(true);
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

  describe('saveCharacter()', () => {
    it('should not save when form incomplete', () => {
      const updateStateSpy = jest.spyOn(gameStateService, 'updateState');

      component.saveCharacter();

      expect(updateStateSpy).not.toHaveBeenCalled();
    });

    it('should create character and add to roster when complete', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('TestHero');

        const initialRosterSize = gameStateService.state().roster.size;
        component.saveCharacter();

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

    it('should show success message after saving', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('TestHero');

        component.saveCharacter();

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
        component.characterName.set('TestHero');

        component.saveCharacter();
        tick(2100);

        expect(component.selectedRace()).toBeNull();
        expect(component.selectedAlignment()).toBeNull();
        expect(component.rolledStats()).toBeNull();
        expect(component.selectedClass()).toBeNull();
        expect(component.characterName()).toBe('');
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
        component.characterName.set('  TestHero  ');

        component.saveCharacter();

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
      component.characterName.set('Test');

      component.resetForm();

      expect(component.selectedRace()).toBeNull();
      expect(component.selectedAlignment()).toBeNull();
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
      expect(component.characterName()).toBe('');
    }));

    it('should reset UI state', () => {
      component.errorMessage.set('Error');
      component.showCancelConfirmation.set(true);

      component.resetForm();

      expect(component.errorMessage()).toBeNull();
      expect(component.showCancelConfirmation()).toBe(false);
    });
  });

  describe('confirmCancel()', () => {
    it('should show confirmation when form has data', () => {
      component.selectRace(Race.HUMAN);

      component.confirmCancel();

      expect(component.showCancelConfirmation()).toBe(true);
    });

    it('should show confirmation when alignment selected', () => {
      component.selectAlignment(Alignment.GOOD);

      component.confirmCancel();

      expect(component.showCancelConfirmation()).toBe(true);
    });

    it('should show confirmation when stats rolled', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      component.confirmCancel();

      expect(component.showCancelConfirmation()).toBe(true);
    }));

    it('should show confirmation when name entered', () => {
      component.characterName.set('Test');

      component.confirmCancel();

      expect(component.showCancelConfirmation()).toBe(true);
    });

    it('should not show confirmation when form is empty', () => {
      component.confirmCancel();

      expect(component.showCancelConfirmation()).toBe(false);
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

    it('should save character on S key when form complete', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('Test');

        const initialSize = gameStateService.state().roster.size;

        const event = new KeyboardEvent('keydown', { key: 's' });
        component.handleKeyPress(event);

        expect(gameStateService.state().roster.size).toBe(initialSize + 1);
      }
    }));

    it('should save character on uppercase S key', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('Test');

        const initialSize = gameStateService.state().roster.size;

        const event = new KeyboardEvent('keydown', { key: 'S' });
        component.handleKeyPress(event);

        expect(gameStateService.state().roster.size).toBe(initialSize + 1);
      }
    }));

    it('should not save when form incomplete', () => {
      component.selectRace(Race.HUMAN);

      const initialSize = gameStateService.state().roster.size;

      const event = new KeyboardEvent('keydown', { key: 's' });
      component.handleKeyPress(event);

      expect(gameStateService.state().roster.size).toBe(initialSize);
    });

    it('should show cancel confirmation on Escape key', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyPress(event);

      expect(component.showCancelConfirmation()).toBe(true);
    });

    it('should show cancel confirmation on lowercase escape', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'escape' });
      component.handleKeyPress(event);

      expect(component.showCancelConfirmation()).toBe(true);
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

      it('should select BISHOP on "i" key when eligible (not "b")', () => {
        // Verify BISHOP uses 'I' key, not 'B' (which is for Back button)
        const shortcut = component.getClassShortcut('BISHOP');
        expect(shortcut).toBe('I');
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

    describe('Back navigation (B key)', () => {
      it('should navigate to training grounds on "b" key', () => {
        const event = new KeyboardEvent('keydown', { key: 'b' });
        component.handleKeyPress(event);

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
      });

      it('should navigate to training grounds on uppercase "B" key', () => {
        const event = new KeyboardEvent('keydown', { key: 'B' });
        component.handleKeyPress(event);

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
      });
    });

    describe('Priority conflict resolution', () => {
      it('should prioritize Save (S) over SAMURAI when form complete', fakeAsync(() => {
        // Setup complete form
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);
          component.characterName.set('Test');

          const initialSize = gameStateService.state().roster.size;

          // Press 'S' - should SAVE, not select Samurai
          const event = new KeyboardEvent('keydown', { key: 's' });
          component.handleKeyPress(event);

          // Verify saved
          expect(gameStateService.state().roster.size).toBe(initialSize + 1);
          // Verify class didn't change
          expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
        }
      }));

      it('should select SAMURAI (S) when form incomplete', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.SAMURAI)) {
          // Form is NOT complete (no name), so 'S' should select Samurai
          const event = new KeyboardEvent('keydown', { key: 's' });
          component.handleKeyPress(event);

          expect(component.selectedClass()).toBe(CharacterClass.SAMURAI);
        }
      }));

      it('should prioritize Alignment (N) over NINJA class', fakeAsync(() => {
        // Setup: race selected, no stats
        component.selectRace(Race.HUMAN);

        // Press 'N' - should select NEUTRAL alignment, not Ninja class
        const event = new KeyboardEvent('keydown', { key: 'n' });
        component.handleKeyPress(event);

        expect(component.selectedAlignment()).toBe(Alignment.NEUTRAL);
        expect(component.selectedClass()).toBeNull();
      }));

      it('should select NINJA (N) when stats rolled and alignment set', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.EVIL); // NINJA requires EVIL
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.NINJA)) {
          // Now 'N' should select Ninja (alignment already set)
          const event = new KeyboardEvent('keydown', { key: 'n' });
          component.handleKeyPress(event);

          expect(component.selectedClass()).toBe(CharacterClass.NINJA);
        }
      }));

      it('should prioritize Cancel (Escape) over other keys', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        // Escape should always show confirmation, regardless of state
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        component.handleKeyPress(event);

        expect(component.showCancelConfirmation()).toBe(true);
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

      it('should call preventDefault on save', fakeAsync(() => {
        component.selectRace(Race.HUMAN);
        component.selectAlignment(Alignment.GOOD);
        component.rollStats();
        tick(350);

        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);
          component.characterName.set('Test');

          const event = new KeyboardEvent('keydown', { key: 's' });
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

      it('should call preventDefault on back navigation', () => {
        const event = new KeyboardEvent('keydown', { key: 'b' });
        const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

        component.handleKeyPress(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });
    });
  });

  describe('handleFooterAction()', () => {
    it('should save character when save action triggered', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(350);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('Test');

        const initialSize = gameStateService.state().roster.size;

        component.handleFooterAction('save');

        expect(gameStateService.state().roster.size).toBe(initialSize + 1);
      }
    }));

    it('should show cancel confirmation when cancel action triggered', () => {
      component.selectRace(Race.HUMAN);

      component.handleFooterAction('cancel');

      expect(component.showCancelConfirmation()).toBe(true);
    });

    it('should navigate to training grounds when back action triggered', () => {
      component.handleFooterAction('back');

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
      expect(component.canSave()).toBe(false);

      // Step 1: Select race
      component.selectRace(Race.HUMAN);
      expect(component.canSave()).toBe(false);

      // Step 2: Select alignment
      component.selectAlignment(Alignment.GOOD);
      expect(component.canSave()).toBe(false);

      // Step 3: Roll stats
      component.rollStats();
      tick(350);
      expect(component.canSave()).toBe(false);

      // Step 4: Select class
      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        expect(component.canSave()).toBe(false);

        // Step 5: Enter name
        component.characterName.set('Test');
        expect(component.canSave()).toBe(true);
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
});
