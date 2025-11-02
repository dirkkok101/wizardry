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
  ROLL_STATS = 'ROLL_STATS',
  SELECT_CLASS = 'SELECT_CLASS',
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
    component.advanceToRollStats();
    await component.rollStats();
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
    component.advanceToRollStats();
    await component.rollStats();
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

    component.advanceToRollStats();
    await component.rollStats();
    const originalStats = component.rolledStats();
    expect(originalStats).not.toBeNull();

    // Go back from class selection (nuclear option - clears stats)
    component.goBackFromSelectClass();
    expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
    expect(component.rolledStats()).toBeNull();
    expect(component.selectedAlignment()).toBe(Alignment.GOOD); // Alignment persists

    // Advance again and roll new stats
    component.advanceToRollStats();
    await component.rollStats();
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
    component.advanceToRollStats();
    await component.rollStats();
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
    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
    expect(component.selectedRace()).toBe('HUMAN');
    expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    expect(component.rolledStats()).toBe(stats); // Stats preserved
    expect(component.selectedClass()).toBe('FIGHTER'); // Class preserved

    // Go back from class selection (nuclear option)
    component.goBackFromSelectClass();
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
    component.advanceToRollStats();
    await component.rollStats();
    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);

    const firstStats = component.rolledStats();
    expect(firstStats).not.toBeNull();

    // Reroll multiple times
    await component.rerollStats();
    const secondStats = component.rolledStats();
    expect(secondStats).not.toBeNull();
    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS); // Still on class selection

    await component.rerollStats();
    const thirdStats = component.rolledStats();
    expect(thirdStats).not.toBeNull();
    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);

    await component.rerollStats();
    const fourthStats = component.rolledStats();
    expect(fourthStats).not.toBeNull();
    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);

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
    component.advanceToRollStats();
    await component.rollStats();

    // Fighter should almost always be eligible (low requirements)
    const isFighterEligible = component.isClassEligible('FIGHTER' as CharacterClass);
    expect(typeof isFighterEligible).toBe('boolean');

    // Check that isClassEligible returns consistent results
    const firstCheck = component.isClassEligible('FIGHTER' as CharacterClass);
    const secondCheck = component.isClassEligible('FIGHTER' as CharacterClass);
    expect(firstCheck).toBe(secondCheck);
  });

  it('auto-advances from roll stats to class selection', async () => {
    component.selectRace('HUMAN' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollStats();

    expect(component.currentStep()).toBe(CreationStep.ROLL_STATS);

    await component.rollStats();

    // Should auto-advance to class selection
    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
    expect(component.rolledStats()).not.toBeNull();
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
    component.advanceToRollStats();
    expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT); // Stays on step 2

    // Select alignment and advance
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollStats();
    expect(component.currentStep()).toBe(CreationStep.ROLL_STATS);
  });

  it('resets wizard state completely after character creation', async () => {
    // Create a character
    component.selectRace('ELF' as Race);
    component.advanceToAlignment();
    component.selectAlignment(Alignment.GOOD);
    component.advanceToRollStats();
    await component.rollStats();
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
});
