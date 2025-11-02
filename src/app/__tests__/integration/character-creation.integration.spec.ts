import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CharacterCreationComponent } from '../../character-creation/character-creation.component';
import { GameStateService } from '../../../services/GameStateService';
import { RaceService } from '../../../services/RaceService';
import { ClassService } from '../../../services/ClassService';
import { Race } from '../../../types/Race';
import { CharacterClass } from '../../../types/CharacterClass';
import { Alignment } from '../../../types/Alignment';
import { Router } from '@angular/router';

/**
 * Character Creation Integration Tests (Legacy - Needs Update for Wizard Redesign)
 *
 * TODO: These tests need updating for the two-column wizard redesign.
 * See new tests in: src/app/character-creation/__tests__/character-creation-integration.spec.ts
 *
 * These are E2E integration tests that verify the complete character creation workflow
 * using real components and services (no mocks). Tests verify:
 * - Complete happy path from race selection to saving
 * - Form reset after save allowing multiple character creation
 * - Real service integration (RaceService, ClassService, CharacterService)
 * - UI interactions (buttons, inputs, disabled states)
 * - Progressive enabling logic
 * - Success message display and timeout
 * - Character added to GameState roster
 */
describe.skip('Character Creation Integration Tests (Legacy)', () => {
  let fixture: ComponentFixture<CharacterCreationComponent>;
  let component: CharacterCreationComponent;
  let gameStateService: GameStateService;
  let mockRouter: { navigate: jest.Mock };

  beforeEach(async () => {
    // Mock Router for navigation
    mockRouter = { navigate: jest.fn() };

    // Mock fetch for RaceService and ClassService data loading
    global.fetch = jest.fn((url: string) => {
      const path = url.toString();

      // Mock race data
      if (path.includes('/assets/races/human.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'human',
            name: 'Human',
            baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
            savingThrowBonus: { death: -1 },
            statTotal: 46,
            description: 'Humans are the most versatile race',
            strengths: ['Balanced stats'],
            weaknesses: ['No special bonuses'],
            bestClasses: ['Any']
          })
        } as Response);
      }
      if (path.includes('/assets/races/elf.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'elf',
            name: 'Elf',
            baseStats: { str: 7, int: 10, pie: 10, vit: 6, agi: 9, luc: 6 },
            savingThrowBonus: { wand: -2 },
            statTotal: 48,
            description: 'Elves are magical and agile',
            strengths: ['High INT, PIE'],
            weaknesses: ['Low VIT'],
            bestClasses: ['Mage', 'Priest']
          })
        } as Response);
      }
      if (path.includes('/assets/races/dwarf.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'dwarf',
            name: 'Dwarf',
            baseStats: { str: 10, int: 7, pie: 10, vit: 10, agi: 5, luc: 6 },
            savingThrowBonus: { breath: -4 },
            statTotal: 48,
            description: 'Dwarves are tough',
            strengths: ['High VIT'],
            weaknesses: ['Low AGI'],
            bestClasses: ['Fighter', 'Priest']
          })
        } as Response);
      }
      if (path.includes('/assets/races/gnome.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'gnome',
            name: 'Gnome',
            baseStats: { str: 7, int: 7, pie: 10, vit: 8, agi: 10, luc: 7 },
            savingThrowBonus: { petrify: -2 },
            statTotal: 49,
            description: 'Gnomes are clever',
            strengths: ['Balanced'],
            weaknesses: ['Low STR'],
            bestClasses: ['Thief', 'Mage']
          })
        } as Response);
      }
      if (path.includes('/assets/races/hobbit.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'hobbit',
            name: 'Hobbit',
            baseStats: { str: 5, int: 7, pie: 14, vit: 6, agi: 10, luc: 15 },
            savingThrowBonus: { spell: -2 },
            statTotal: 57,
            description: 'Hobbits are lucky',
            strengths: ['High LUC, PIE'],
            weaknesses: ['Low STR'],
            bestClasses: ['Thief', 'Priest']
          })
        } as Response);
      }

      // Mock class data
      if (path.includes('/assets/classes/fighter.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'fighter',
            name: 'Fighter',
            description: 'Master of combat',
            requirements: { str: 11 },
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d10',
            spellAccess: null,
            attacksPerLevel: { '1-4': 1, '5-9': 2, '10+': 3 },
            xpTable: [2000, 4000, 8000, 16000, 32000],
            specialAbilities: [],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response);
      }
      if (path.includes('/assets/classes/mage.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'mage',
            name: 'Mage',
            description: 'Master of arcane magic',
            requirements: { int: 11 },
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['dagger', 'staff'],
              armor: ['robes'],
              shields: [],
              helmets: []
            },
            hitDice: '1d4',
            spellAccess: {
              mage: { minLevel: 1, maxLevel: 7 }
            },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2400, 4800, 9600, 19200, 38400],
            specialAbilities: [],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: false
          })
        } as Response);
      }
      if (path.includes('/assets/classes/priest.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'priest',
            name: 'Priest',
            description: 'Divine spellcaster',
            requirements: { pie: 11 },
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['mace', 'staff'],
              armor: ['chain', 'plate'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d8',
            spellAccess: {
              priest: { minLevel: 1, maxLevel: 7 }
            },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2200, 4400, 8800, 17600, 35200],
            specialAbilities: [],
            canIdentifyItems: false,
            canDispelUndead: true,
            canCriticalHit: false
          })
        } as Response);
      }
      if (path.includes('/assets/classes/thief.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'thief',
            name: 'Thief',
            description: 'Skilled in stealth and traps',
            requirements: { agi: 11 },
            alignmentRestrictions: ['neutral', 'evil'],
            equipmentRestrictions: {
              weapons: ['dagger', 'short-sword'],
              armor: ['leather', 'chain'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: null,
            attacksPerLevel: { '1+': 1 },
            xpTable: [2000, 4000, 8000, 16000, 32000],
            specialAbilities: ['Disarm traps', 'Pick locks'],
            canIdentifyItems: true,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response);
      }
      if (path.includes('/assets/classes/bishop.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'bishop',
            name: 'Bishop',
            description: 'Dual spellcaster',
            requirements: { int: 12, pie: 12 },
            alignmentRestrictions: ['good', 'evil'],
            equipmentRestrictions: {
              weapons: ['mace', 'staff'],
              armor: ['robes'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: {
              mage: { minLevel: 1, maxLevel: 7 },
              priest: { minLevel: 1, maxLevel: 7 }
            },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2600, 5200, 10400, 20800, 41600],
            specialAbilities: [],
            canIdentifyItems: true,
            canDispelUndead: true,
            canCriticalHit: false
          })
        } as Response);
      }
      if (path.includes('/assets/classes/samurai.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'samurai',
            name: 'Samurai',
            description: 'Warrior mage',
            requirements: { str: 15, int: 11, pie: 10, vit: 14, agi: 10 },
            alignmentRestrictions: ['good', 'neutral'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d8',
            spellAccess: {
              mage: { minLevel: 4, maxLevel: 7 }
            },
            attacksPerLevel: { '1-4': 1, '5+': 2 },
            xpTable: [2800, 5600, 11200, 22400, 44800],
            specialAbilities: [],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response);
      }
      if (path.includes('/assets/classes/lord.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'lord',
            name: 'Lord',
            description: 'Holy warrior',
            requirements: { str: 15, int: 12, pie: 12, vit: 15, agi: 14, luc: 15 },
            alignmentRestrictions: ['good'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d10',
            spellAccess: {
              priest: { minLevel: 4, maxLevel: 7 }
            },
            attacksPerLevel: { '1-4': 1, '5+': 2 },
            xpTable: [3000, 6000, 12000, 24000, 48000],
            specialAbilities: [],
            canIdentifyItems: false,
            canDispelUndead: true,
            canCriticalHit: true
          })
        } as Response);
      }
      if (path.includes('/assets/classes/ninja.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'ninja',
            name: 'Ninja',
            description: 'Elite assassin',
            requirements: { str: 17, int: 17, pie: 17, vit: 17, agi: 17 },
            alignmentRestrictions: ['evil'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['leather', 'chain'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: null,
            attacksPerLevel: { '1-4': 2, '5+': 3 },
            xpTable: [3200, 6400, 12800, 25600, 51200],
            specialAbilities: [],
            canIdentifyItems: true,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response);
      }

      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;

    // Initialize RaceService and ClassService with mocked data
    await RaceService.initialize();
    await ClassService.initialize();

    await TestBed.configureTestingModule({
      imports: [CharacterCreationComponent],
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    gameStateService = TestBed.inject(GameStateService);
    fixture = TestBed.createComponent(CharacterCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Complete Character Creation Flow', () => {
    it('should create a complete character from start to finish', fakeAsync(() => {
      // Step 1: Select race (Human)
      component.selectRace(Race.HUMAN);
      fixture.detectChanges();

      expect(component.selectedRace()).toBe(Race.HUMAN);
      expect(component.raceData()).toBeDefined();
      expect(component.raceData()!.name).toBe('Human');

      // Step 2: Select alignment (Good)
      component.selectAlignment(Alignment.GOOD);
      fixture.detectChanges();

      expect(component.selectedAlignment()).toBe(Alignment.GOOD);

      // Step 3: Roll stats
      component.rollStats();
      tick(300); // Wait for roll animation
      fixture.detectChanges();

      expect(component.rolledStats()).toBeDefined();
      expect(component.finalStats()).toBeDefined();

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

      // Step 4: Select class (Fighter - should always be eligible for Human)
      const eligibleClasses = component.eligibleClasses();
      expect(eligibleClasses.length).toBeGreaterThan(0);

      // Select Fighter if eligible
      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        fixture.detectChanges();

        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

        // Step 5: Accept character (will show modal in real usage)
        expect(component.canAccept()).toBe(true);

        // Step 6: Simulate modal save flow
        const initialRosterSize = gameStateService.state().roster.size;
        component.handleNameSave('IntegrationTest');
        fixture.detectChanges();

        // Step 7: Verify character in roster
        const newRosterSize = gameStateService.state().roster.size;
        expect(newRosterSize).toBe(initialRosterSize + 1);

        // Find the created character in roster
        const createdChar = Array.from(gameStateService.state().roster.values())
          .find(c => c.name === 'IntegrationTest');

        expect(createdChar).toBeDefined();
        expect(createdChar!.race).toBe(Race.HUMAN);
        expect(createdChar!.class).toBe(CharacterClass.FIGHTER);
        expect(createdChar!.alignment).toBe(Alignment.GOOD);
        expect(createdChar!.strength).toBe(finalStats.strength);
        expect(createdChar!.intelligence).toBe(finalStats.intelligence);
        expect(createdChar!.piety).toBe(finalStats.piety);
        expect(createdChar!.vitality).toBe(finalStats.vitality);
        expect(createdChar!.agility).toBe(finalStats.agility);
        expect(createdChar!.luck).toBe(finalStats.luck);

        // Step 8: Verify success message
        expect(component.successMessage()).toBe('IntegrationTest created successfully!');

        // Step 9: Verify form reset after timeout
        tick(2000); // Wait for success message timeout
        fixture.detectChanges();

        expect(component.selectedRace()).toBeNull();
        expect(component.selectedAlignment()).toBeNull();
        expect(component.rolledStats()).toBeNull();
        expect(component.selectedClass()).toBeNull();
        expect(component.successMessage()).toBeNull();
      } else {
        // If Fighter not eligible (unlikely), just verify we can check eligibility
        expect(component.isClassEligible(CharacterClass.FIGHTER)).toBe(false);
      }
    }));

    it('should allow creating multiple characters in one session', fakeAsync(() => {
      // Create first character
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);
      fixture.detectChanges();

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        const initialSize = gameStateService.state().roster.size;
        component.handleNameSave('FirstHero');
        fixture.detectChanges();

        expect(gameStateService.state().roster.size).toBe(initialSize + 1);
        expect(component.successMessage()).toBe('FirstHero created successfully!');

        // Wait for form reset
        tick(2000);
        fixture.detectChanges();

        expect(component.selectedRace()).toBeNull();

        // Create second character
        component.selectRace(Race.ELF);
        component.selectAlignment(Alignment.NEUTRAL);
        component.rollStats();
        tick(300);
        fixture.detectChanges();

        // Find an eligible class for Elf
        const eligibleClasses = component.eligibleClasses();
        if (eligibleClasses.length > 0) {
          component.selectClass(eligibleClasses[0]);

          component.handleNameSave('SecondHero');
          fixture.detectChanges();

          expect(gameStateService.state().roster.size).toBe(initialSize + 2);
          expect(component.successMessage()).toBe('SecondHero created successfully!');

          // Verify both characters in roster
          const roster = gameStateService.state().roster;
          const firstChar = Array.from(roster.values()).find(c => c.name === 'FirstHero');
          const secondChar = Array.from(roster.values()).find(c => c.name === 'SecondHero');

          expect(firstChar).toBeDefined();
          expect(secondChar).toBeDefined();
          expect(firstChar!.race).toBe(Race.HUMAN);
          expect(secondChar!.race).toBe(Race.ELF);
        }
      }
    }));
  });

  describe('Progressive Enabling Logic', () => {
    it('should enforce progressive enabling through the workflow', fakeAsync(() => {
      // Initially, can't accept
      expect(component.canAccept()).toBe(false);

      // Select race - still can't accept
      component.selectRace(Race.HUMAN);
      fixture.detectChanges();
      expect(component.canAccept()).toBe(false);

      // Select alignment - still can't accept
      component.selectAlignment(Alignment.GOOD);
      fixture.detectChanges();
      expect(component.canAccept()).toBe(false);

      // Roll stats - still can't accept
      component.rollStats();
      tick(300);
      fixture.detectChanges();
      expect(component.canAccept()).toBe(false);

      // Select class - now can accept (will show name modal)
      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        fixture.detectChanges();
        expect(component.canAccept()).toBe(true);
      }
    }));

    it('should reset downstream selections when race changes (before locking)', fakeAsync(() => {
      // Setup partial form (before stats rolled = before locked)
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      fixture.detectChanges();

      // Change race before rolling stats - should reset alignment
      component.selectRace(Race.ELF);
      fixture.detectChanges();

      expect(component.selectedRace()).toBe(Race.ELF);
      // Stats not yet rolled, so nothing to reset
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
    }));

    it('should reset downstream selections when alignment changes (before locking)', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      fixture.detectChanges();

      // Change alignment before rolling stats - allowed
      component.selectAlignment(Alignment.NEUTRAL);
      fixture.detectChanges();

      expect(component.selectedAlignment()).toBe(Alignment.NEUTRAL);
      // Stats not yet rolled, so nothing to reset
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
    }));

    it('should reset class when rerolling stats', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);
      fixture.detectChanges();

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        fixture.detectChanges();

        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

        // Reroll stats - should reset class after animation
        component.rollStats();
        tick(300); // Wait for animation to complete
        fixture.detectChanges();

        expect(component.rolledStats()).toBeDefined();
        expect(component.selectedClass()).toBeNull();
      }
    }));
  });

  describe('UI Interactions', () => {
    it('should update UI when clicking race buttons', () => {
      const raceButton = fixture.nativeElement.querySelector('button.race-button');
      expect(raceButton).toBeTruthy();

      // Initially no race selected
      expect(component.selectedRace()).toBeNull();

      // Select race through component
      component.selectRace(Race.HUMAN);
      fixture.detectChanges();

      // Verify race details display
      expect(component.raceData()).toBeDefined();
      expect(fixture.nativeElement.querySelector('.race-details')).toBeTruthy();
    });

    it('should disable alignment buttons until race selected', () => {
      // Verify disabled state in computed menu items or component logic
      expect(component.selectedRace()).toBeNull();

      // Select race to enable alignment
      component.selectRace(Race.HUMAN);
      fixture.detectChanges();

      // Now alignment should be selectable
      component.selectAlignment(Alignment.GOOD);
      expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    });

    it('should disable class buttons until stats rolled', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      fixture.detectChanges();

      // Before rolling, eligible classes should be empty
      expect(component.eligibleClasses()).toEqual([]);

      // Roll stats
      component.rollStats();
      tick(300);
      fixture.detectChanges();

      // Now eligible classes should be computed
      expect(component.eligibleClasses().length).toBeGreaterThan(0);
    }));

    it('should disable accept button until all fields complete', fakeAsync(() => {
      expect(component.canAccept()).toBe(false);

      component.selectRace(Race.HUMAN);
      expect(component.canAccept()).toBe(false);

      component.selectAlignment(Alignment.GOOD);
      expect(component.canAccept()).toBe(false);

      component.rollStats();
      tick(300);
      expect(component.canAccept()).toBe(false);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        expect(component.canAccept()).toBe(true);
      }
    }));
  });

  describe('Data Formula Verification', () => {
    it('should use NEW FORMULA (raceBase + rolled) for all stats', fakeAsync(() => {
      component.selectRace(Race.DWARF);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);
      fixture.detectChanges();

      const raceData = RaceService.getRaceData(Race.DWARF);
      const rolled = component.rolledStats()!;
      const finalStats = component.finalStats()!;

      // Verify formula for all stats
      expect(finalStats.strength).toBe(raceData.baseStats.str + rolled.strength);
      expect(finalStats.intelligence).toBe(raceData.baseStats.int + rolled.intelligence);
      expect(finalStats.piety).toBe(raceData.baseStats.pie + rolled.piety);
      expect(finalStats.vitality).toBe(raceData.baseStats.vit + rolled.vitality);
      expect(finalStats.agility).toBe(raceData.baseStats.agi + rolled.agility);
      expect(finalStats.luck).toBe(raceData.baseStats.luc + rolled.luck);
      expect(finalStats.bonusPoints).toBe(rolled.bonusPoints);
    }));

    it('should recalculate final stats when rerolling', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);
      fixture.detectChanges();

      const firstFinalStats = component.finalStats()!;
      const firstStrength = firstFinalStats.strength;

      // Reroll
      component.rollStats();
      tick(300);
      fixture.detectChanges();

      const secondFinalStats = component.finalStats()!;
      const secondStrength = secondFinalStats.strength;

      // Stats should be different (extremely unlikely to be same)
      // But we can verify formula is still correct
      const raceData = RaceService.getRaceData(Race.HUMAN);
      const rolled = component.rolledStats()!;
      expect(secondFinalStats.strength).toBe(raceData.baseStats.str + rolled.strength);
    }));
  });

  describe('Class Eligibility', () => {
    it('should calculate eligible classes based on final stats and alignment', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);
      fixture.detectChanges();

      const eligibleClasses = component.eligibleClasses();
      expect(Array.isArray(eligibleClasses)).toBe(true);
      expect(eligibleClasses.length).toBeGreaterThan(0);

      // Verify we can check specific class eligibility
      const isFighterEligible = component.isClassEligible(CharacterClass.FIGHTER);
      expect(typeof isFighterEligible).toBe('boolean');

      if (isFighterEligible) {
        expect(eligibleClasses).toContain(CharacterClass.FIGHTER);
      }
    }));

    it('should prevent selecting ineligible classes', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);
      fixture.detectChanges();

      // Find an ineligible class
      const allClasses = [
        CharacterClass.FIGHTER,
        CharacterClass.MAGE,
        CharacterClass.PRIEST,
        CharacterClass.THIEF,
        CharacterClass.BISHOP,
        CharacterClass.SAMURAI,
        CharacterClass.LORD,
        CharacterClass.NINJA
      ];

      const ineligibleClass = allClasses.find(c => !component.isClassEligible(c));

      if (ineligibleClass) {
        // Try to select ineligible class
        component.selectClass(ineligibleClass);
        fixture.detectChanges();

        // Should not be selected
        expect(component.selectedClass()).not.toBe(ineligibleClass);
      }
    }));
  });

  describe('Success Message and Form Reset', () => {
    it('should display success message after save', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        component.handleNameSave('SuccessTest');
        fixture.detectChanges();

        expect(component.successMessage()).toBe('SuccessTest created successfully!');
      }
    }));

    it('should clear success message after 2 seconds', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        component.handleNameSave('TimeoutTest');
        fixture.detectChanges();

        expect(component.successMessage()).toBeTruthy();

        // Wait for timeout
        tick(2000);
        fixture.detectChanges();

        expect(component.successMessage()).toBeNull();
      }
    }));

    it('should reset form after success timeout', fakeAsync(() => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();
      tick(300);

      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);

        component.handleNameSave('ResetTest');
        fixture.detectChanges();

        // Wait for timeout
        tick(2000);
        fixture.detectChanges();

        // All form fields should be reset
        expect(component.selectedRace()).toBeNull();
        expect(component.selectedAlignment()).toBeNull();
        expect(component.rolledStats()).toBeNull();
        expect(component.selectedClass()).toBeNull();
      }
    }));
  });

  describe('Navigation', () => {
    it('should navigate back to training grounds', () => {
      component.navigateToTrainingGrounds();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });

    it('should handle footer action for quit button', () => {
      component.handleFooterAction('quit');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });
  });
});
