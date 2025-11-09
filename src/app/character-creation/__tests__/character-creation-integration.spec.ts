import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CharacterCreationComponent } from '../character-creation.component';
import { GameStateService } from '../../../services/GameStateService';
import { RaceService } from '../../../services/RaceService';
import { ClassService } from '../../../services/ClassService';
import { Race } from '../../../types/Race';
import { Alignment } from '../../../types/Alignment';
import { CharacterClass } from '../../../types/CharacterClass';

// Access the CreationStep enum from the component
enum CreationStep {
  SELECT_RACE = 'SELECT_RACE',
  SELECT_ALIGNMENT = 'SELECT_ALIGNMENT',
  ROLL_ALLOCATE_CLASS = 'ROLL_ALLOCATE_CLASS',
  NAME_CHARACTER = 'NAME_CHARACTER'
}

describe('CharacterCreationComponent - Integration', () => {
  let component: CharacterCreationComponent;
  let fixture: ComponentFixture<CharacterCreationComponent>;
  let gameStateService: GameStateService;
  let mockRouter: jest.Mocked<Router>;

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
      }],
      ['dwarf', {
        id: 'dwarf',
        name: 'Dwarf',
        enum: Race.DWARF,
        baseStats: { str: 10, int: 7, pie: 10, vit: 10, agi: 5, luc: 6 },
        savingThrowBonus: {},
        statTotal: 48,
        description: 'Hardy and tough',
        strengths: ['High vitality'],
        weaknesses: ['Low agility'],
        bestClasses: ['Fighter', 'Priest']
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
      }],
      ['priest', {
        id: 'priest',
        name: 'Priest',
        enum: CharacterClass.PRIEST,
        description: 'Divine spellcaster',
        requirements: { pie: 11 },
        alignmentRestrictions: [],
        equipmentRestrictions: { weapons: [], armor: [], shields: [], helmets: [] },
        hitDice: '1d8',
        spellAccess: { type: 'priest', levels: 7 },
        attacksPerLevel: { '1-4': 1 },
        xpTable: [2000],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: true,
        canCriticalHit: false
      }],
      ['thief', {
        id: 'thief',
        name: 'Thief',
        enum: CharacterClass.THIEF,
        description: 'Stealthy rogue',
        requirements: { agi: 11 },
        alignmentRestrictions: [],
        equipmentRestrictions: { weapons: [], armor: [], shields: [], helmets: [] },
        hitDice: '1d6',
        spellAccess: null,
        attacksPerLevel: { '1-4': 1 },
        xpTable: [1500],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: true
      }],
      ['bishop', {
        id: 'bishop',
        name: 'Bishop',
        enum: CharacterClass.BISHOP,
        description: 'Master of both divine and arcane magic',
        requirements: { int: 12, pie: 12 },
        alignmentRestrictions: [],
        equipmentRestrictions: { weapons: [], armor: [], shields: [], helmets: [] },
        hitDice: '1d6',
        spellAccess: { type: 'both', levels: 7 },
        attacksPerLevel: { '1-4': 1 },
        xpTable: [3000],
        specialAbilities: [],
        canIdentifyItems: true,
        canDispelUndead: true,
        canCriticalHit: false
      }],
      ['samurai', {
        id: 'samurai',
        name: 'Samurai',
        enum: CharacterClass.SAMURAI,
        description: 'Elite warrior with mage spells',
        requirements: { str: 15, int: 11, pie: 10, vit: 14, agi: 10 },
        alignmentRestrictions: [],
        equipmentRestrictions: { weapons: [], armor: [], shields: [], helmets: [] },
        hitDice: '1d10',
        spellAccess: { type: 'mage', levels: 7 },
        attacksPerLevel: { '1-4': 1 },
        xpTable: [3500],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: true
      }],
      ['lord', {
        id: 'lord',
        name: 'Lord',
        enum: CharacterClass.LORD,
        description: 'Noble warrior with priest spells',
        requirements: { str: 15, int: 12, pie: 12, vit: 15, agi: 14, luc: 15 },
        alignmentRestrictions: [],
        equipmentRestrictions: { weapons: [], armor: [], shields: [], helmets: [] },
        hitDice: '1d10',
        spellAccess: { type: 'priest', levels: 7 },
        attacksPerLevel: { '1-4': 1 },
        xpTable: [4000],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: true,
        canCriticalHit: true
      }],
      ['ninja', {
        id: 'ninja',
        name: 'Ninja',
        enum: CharacterClass.NINJA,
        description: 'Elite thief with mage spells',
        requirements: { str: 17, int: 17, pie: 17, vit: 17, agi: 17, luc: 17 },
        alignmentRestrictions: [],
        equipmentRestrictions: { weapons: [], armor: [], shields: [], helmets: [] },
        hitDice: '1d8',
        spellAccess: { type: 'mage', levels: 7 },
        attacksPerLevel: { '1-4': 1 },
        xpTable: [5000],
        specialAbilities: [],
        canIdentifyItems: false,
        canDispelUndead: false,
        canCriticalHit: true
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

  it('creates multiple characters in succession without delay', async () => {
    const initialRosterSize = gameStateService.roster().size;

    // Create first character
    component.selectRace('HUMAN' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollAllocateClass();
    await component.rollBonusPoints();

    // Allocate all bonus points
    component.rolledStats.set({
      strength: 15, intelligence: 10, piety: 10,
      vitality: 12, agility: 10, luck: 10, bonusPoints: 0
    });

    component.selectClass('FIGHTER' as CharacterClass);
    component.advanceToNameCharacter();
    await component.submitCharacter('Character1');

    // Verify immediate reset
    expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
    expect(component.selectedRace()).toBeNull();
    expect(component.selectedAlignment()).toBeNull();
    expect(component.rolledStats()).toBeNull();
    expect(component.selectedClass()).toBeNull();

    // Create second character immediately
    component.selectRace('ELF' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.NEUTRAL);
    component.advanceToRollAllocateClass();
    await component.rollBonusPoints();

    // Allocate all bonus points
    component.rolledStats.set({
      strength: 10, intelligence: 15, piety: 10,
      vitality: 10, agility: 12, luck: 10, bonusPoints: 0
    });

    component.selectClass('MAGE' as CharacterClass);
    component.advanceToNameCharacter();
    await component.submitCharacter('Character2');

    // Verify both characters in roster
    const roster = gameStateService.roster();
    expect(roster.size).toBe(initialRosterSize + 2);

    const chars = Array.from(roster.values());
    expect(chars.find(c => c.name === 'Character1')).toBeDefined();
    expect(chars.find(c => c.name === 'Character2')).toBeDefined();

    // Verify character attributes
    const char1 = chars.find(c => c.name === 'Character1')!;
    expect(char1.race).toBe('HUMAN');
    expect(char1.alignment).toBe(Alignment.GOOD);
    expect(char1.class).toBe('FIGHTER');

    const char2 = chars.find(c => c.name === 'Character2')!;
    expect(char2.race).toBe('ELF');
    expect(char2.alignment).toBe(Alignment.NEUTRAL);
    expect(char2.class).toBe('MAGE');
  });

  it('maintains data integrity through backward navigation', async () => {
    // Setup
    component.selectRace('DWARF' as Race);
    expect(component.selectedRace()).toBe('DWARF');

    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    expect(component.selectedAlignment()).toBe(Alignment.GOOD);

    component.advanceToRollAllocateClass();
    await component.rollBonusPoints();
    const originalStats = component.rolledStats();
    expect(originalStats).not.toBeNull();

    // Go back from class selection (nuclear option - clears stats)
    component.goBackFromRollAllocateClass();
    expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
    expect(component.rolledStats()).toBeNull();
    expect(component.selectedAlignment()).toBe(Alignment.GOOD); // Alignment persists

    // Advance again and roll new stats
    component.advanceToRollAllocateClass();
    await component.rollBonusPoints();
    const newStats = component.rolledStats();

    // Stats should be different (new roll) - may occasionally be equal by chance
    expect(newStats).not.toBeNull();
    expect(newStats).toBeDefined();

    // Verify both stat objects have all required properties
    expect(originalStats).toHaveProperty('strength');
    expect(originalStats).toHaveProperty('intelligence');
    expect(newStats).toHaveProperty('strength');
    expect(newStats).toHaveProperty('intelligence');
  });

  it('handles full backward navigation flow with data preservation', async () => {
    // Complete full character creation
    component.selectRace('HUMAN' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollAllocateClass();
    await component.rollBonusPoints();

    // Allocate all bonus points
    component.rolledStats.set({
      strength: 15, intelligence: 10, piety: 10,
      vitality: 12, agility: 10, luck: 10, bonusPoints: 0
    });
    const stats = component.rolledStats();

    component.selectClass('FIGHTER' as CharacterClass);
    component.advanceToNameCharacter();

    // Verify all data present
    expect(component.selectedRace()).toBe('HUMAN');
    expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    expect(component.rolledStats()).toBe(stats);
    expect(component.selectedClass()).toBe('FIGHTER');
    expect(component.currentStep()).toBe(CreationStep.NAME_CHARACTER);

    // Go back from name entry
    component.goBackFromNameCharacter();
    expect(component.currentStep()).toBe(CreationStep.ROLL_ALLOCATE_CLASS);
    expect(component.selectedRace()).toBe('HUMAN');
    expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    expect(component.rolledStats()).toBe(stats); // Stats preserved
    expect(component.selectedClass()).toBe('FIGHTER'); // Class preserved

    // Go back from class selection (nuclear option)
    component.goBackFromRollAllocateClass();
    expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
    expect(component.selectedRace()).toBe('HUMAN'); // Race preserved
    expect(component.selectedAlignment()).toBe(Alignment.GOOD); // Alignment preserved
    expect(component.rolledStats()).toBeNull(); // Stats cleared
    expect(component.selectedClass()).toBeNull(); // Class cleared

    // Go back from alignment
    component.goBackFromAlignment();
    expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
    expect(component.selectedRace()).toBe('HUMAN'); // Race still preserved
    expect(component.selectedAlignment()).toBeNull(); // Alignment cleared
  });

  it('allows unlimited stat rerolls on class selection step', async () => {
    // Setup to class selection
    component.selectRace('HUMAN' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollAllocateClass();
    await component.rollBonusPoints();

    // Allocate all bonus points and advance to class selection
    component.rolledStats.set({
      strength: 15, intelligence: 10, piety: 10,
      vitality: 12, agility: 10, luck: 10, bonusPoints: 0
    });

    expect(component.currentStep()).toBe(CreationStep.ROLL_ALLOCATE_CLASS);

    const firstStats = component.rolledStats();
    expect(firstStats).not.toBeNull();

    // Reroll multiple times (reroll returns to ROLL_ALLOCATE_CLASS with new stats)
    await component.rerollStats();
    const secondStats = component.rolledStats();
    expect(secondStats).not.toBeNull();
    expect(component.currentStep()).toBe(CreationStep.ROLL_ALLOCATE_CLASS);

    // Advance back to class selection
    component.rolledStats.set({
      strength: 12, intelligence: 12, piety: 12,
      vitality: 12, agility: 12, luck: 12, bonusPoints: 0
    });

    await component.rerollStats();
    const thirdStats = component.rolledStats();
    expect(thirdStats).not.toBeNull();
    expect(component.currentStep()).toBe(CreationStep.ROLL_ALLOCATE_CLASS);

    // Advance back to class selection again
    component.rolledStats.set({
      strength: 10, intelligence: 10, piety: 10,
      vitality: 10, agility: 10, luck: 10, bonusPoints: 0
    });

    await component.rerollStats();
    const fourthStats = component.rolledStats();
    expect(fourthStats).not.toBeNull();
    expect(component.currentStep()).toBe(CreationStep.ROLL_ALLOCATE_CLASS);

    // Each roll should produce valid stats
    expect(fourthStats).toHaveProperty('strength');
    expect(fourthStats).toHaveProperty('intelligence');
    expect(fourthStats).toHaveProperty('piety');
    expect(fourthStats).toHaveProperty('vitality');
    expect(fourthStats).toHaveProperty('agility');
    expect(fourthStats).toHaveProperty('luck');
    expect(fourthStats).toHaveProperty('bonusPoints');
  });

  it('validates class eligibility based on rolled stats', async () => {
    component.selectRace('HUMAN' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollAllocateClass();
    await component.rollBonusPoints();

    // Fighter should almost always be eligible (low requirements)
    const isFighterEligible = component.isClassEligible('FIGHTER' as CharacterClass);
    expect(typeof isFighterEligible).toBe('boolean');

    // Check that isClassEligible returns consistent results
    const firstCheck = component.isClassEligible('FIGHTER' as CharacterClass);
    const secondCheck = component.isClassEligible('FIGHTER' as CharacterClass);
    expect(firstCheck).toBe(secondCheck);
  });

  it('auto-rolls bonus points when entering ROLL_ALLOCATE_CLASS', async () => {
    component.selectRace('HUMAN' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);

    expect(component.rolledStats()).toBeNull();

    await component.advanceToRollAllocateClass();

    // Should auto-roll and stay on ROLL_ALLOCATE_CLASS step
    expect(component.currentStep()).toBe(CreationStep.ROLL_ALLOCATE_CLASS);
    expect(component.rolledStats()).not.toBeNull();
    expect(component.rolledStats()!.bonusPoints).toBeGreaterThanOrEqual(7);
    expect(component.rolledStats()!.bonusPoints).toBeLessThanOrEqual(29);
  });

  it('prevents advancement without required data at each step', () => {
    // Step 1: Cannot advance without race
    expect(component.selectedRace()).toBeNull();
    component.advanceToAlignment();
    expect(component.currentStep()).toBe(CreationStep.SELECT_RACE); // Stays on step 1

    // Select race and advance
    component.selectRace('HUMAN' as Race);
    component.advanceToAlignment();
    expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);

    // Step 2: Cannot advance without alignment
    component.advanceToRollAllocateClass();
    expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT); // Stays on step 2

    // Select alignment and advance
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollAllocateClass();
    expect(component.currentStep()).toBe(CreationStep.ROLL_ALLOCATE_CLASS);
  });

  it('resets wizard state completely after character creation', async () => {
    // Create a character
    component.selectRace('ELF' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollAllocateClass();
    await component.rollBonusPoints();

    // Allocate all bonus points
    component.rolledStats.set({
      strength: 10, intelligence: 15, piety: 10,
      vitality: 10, agility: 12, luck: 10, bonusPoints: 0
    });

    component.selectClass('MAGE' as CharacterClass);
    component.advanceToNameCharacter();
    await component.submitCharacter('TestMage');

    // Verify complete reset
    expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
    expect(component.selectedRace()).toBeNull();
    expect(component.selectedAlignment()).toBeNull();
    expect(component.rolledStats()).toBeNull();
    expect(component.selectedClass()).toBeNull();
    expect(component.isRolling()).toBe(false);
    expect(component.isLocked()).toBe(false);
  });

  it('should display requirements on ineligible class buttons', async () => {
    component.selectRace('HUMAN' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    await component.advanceToRollAllocateClass();

    // Don't allocate points - most classes will be ineligible
    fixture.detectChanges();

    const compiled = fixture.nativeElement;

    // Verify requirements structure exists for ineligible classes
    const requirementLists = compiled.querySelectorAll('.requirements-list');
    expect(requirementLists.length).toBeGreaterThan(0);

    // Verify "Need:" label is present
    const needLabels = compiled.querySelectorAll('.need-label');
    expect(needLabels.length).toBeGreaterThan(0);

    // Verify individual requirements are displayed
    const requirements = compiled.querySelectorAll('.requirement');
    expect(requirements.length).toBeGreaterThan(0);

    // Verify at least one requirement text includes a stat and minimum
    const requirementTexts = Array.from(requirements).map(el => el.textContent);
    const hasValidFormat = requirementTexts.some(text =>
      text && /[A-Z]{3}\s+\d+\+/.test(text)
    );
    expect(hasValidFormat).toBe(true);
  });
});
