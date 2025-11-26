import { Component, computed, effect, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '@services/GameStateService';
import { RaceService } from '@services/RaceService';
import { ClassService } from '@services/ClassService';
import { CharacterService } from '@services/CharacterService';
import { CharacterCreationService, RolledStats, BaseStats } from '@services/CharacterCreationService';
import { SpellLearningService } from '@services/SpellLearningService';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { Race, parseRace } from '@types/Race';
import { CharacterClass, parseClass } from '@types/CharacterClass';
import { Alignment } from '@types/Alignment';
import { MenuItem } from '@shared/components/menu/menu.component';

enum CreationStep {
  SELECT_RACE = 'SELECT_RACE',
  SELECT_ALIGNMENT = 'SELECT_ALIGNMENT',
  ROLL_ALLOCATE_CLASS = 'ROLL_ALLOCATE_CLASS',
  NAME_CHARACTER = 'NAME_CHARACTER'
}

interface FinalStats {
  strength: number;
  intelligence: number;
  piety: number;
  vitality: number;
  agility: number;
  luck: number;
  bonusPoints: number;
}

@Component({
  selector: 'app-character-creation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SceneTitleComponent,
    SceneFooterComponent
  ],
  templateUrl: './character-creation.component.html',
  styleUrl: './character-creation.component.scss'
})
export class CharacterCreationComponent implements OnInit {
  private readonly ROLL_ANIMATION_DURATION_MS = 0;

  // Form state signals
  readonly selectedRace = signal<Race | null>(null);
  readonly selectedAlignment = signal<Alignment | null>(null);
  readonly rolledStats = signal<RolledStats | null>(null);
  readonly selectedClass = signal<CharacterClass | null>(null);

  // UI state signals
  readonly isRolling = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isLocked = signal<boolean>(false);

  // Wizard state machine
  currentStep = signal<CreationStep>(CreationStep.SELECT_RACE);

  // Step metadata
  stepTitle = computed(() => {
    switch(this.currentStep()) {
      case CreationStep.SELECT_RACE: return 'Choose Your Race';
      case CreationStep.SELECT_ALIGNMENT: return 'Choose Your Alignment';
      case CreationStep.ROLL_ALLOCATE_CLASS: return 'Roll & Allocate';
      case CreationStep.NAME_CHARACTER: return 'Name Your Character';
    }
  });

  stepNumber = computed(() => {
    const steps = [
      CreationStep.SELECT_RACE,
      CreationStep.SELECT_ALIGNMENT,
      CreationStep.ROLL_ALLOCATE_CLASS,
      CreationStep.NAME_CHARACTER
    ];
    return steps.indexOf(this.currentStep()) + 1;
  });

  // Expose Alignment enum to template
  readonly Alignment = Alignment;

  // Expose CreationStep enum to template
  readonly CreationStep = CreationStep;

  readonly races = [
    { id: 'HUMAN' as Race, name: 'Human', shortcut: '1' },
    { id: 'ELF' as Race, name: 'Elf', shortcut: '2' },
    { id: 'DWARF' as Race, name: 'Dwarf', shortcut: '3' },
    { id: 'GNOME' as Race, name: 'Gnome', shortcut: '4' },
    { id: 'HOBBIT' as Race, name: 'Hobbit', shortcut: '5' }
  ];

  readonly allClasses = [
    { id: 'FIGHTER' as CharacterClass, name: 'Fighter', shortcut: 'F' },
    { id: 'MAGE' as CharacterClass, name: 'Mage', shortcut: 'M' },
    { id: 'PRIEST' as CharacterClass, name: 'Priest', shortcut: 'P' },
    { id: 'THIEF' as CharacterClass, name: 'Thief', shortcut: 'T' },
    { id: 'BISHOP' as CharacterClass, name: 'Bishop', shortcut: 'B' },
    { id: 'SAMURAI' as CharacterClass, name: 'Samurai', shortcut: 'A' },
    { id: 'LORD' as CharacterClass, name: 'Lord', shortcut: 'L' },
    { id: 'NINJA' as CharacterClass, name: 'Ninja', shortcut: 'J' }
  ];

  characterName = signal<string>('');

  // Computed signals (derived state)
  readonly raceData = computed(() => {
    const race = this.selectedRace();
    return race ? RaceService.getRaceData(race) : null;
  });

  readonly finalStats = computed((): FinalStats | null => {
    const rolled = this.rolledStats();
    const raceData = this.raceData();
    if (!rolled || !raceData) return null;

    // NEW FORMULA: raceBase + rolled
    return {
      strength: raceData.baseStats.str + rolled.strength,
      intelligence: raceData.baseStats.int + rolled.intelligence,
      piety: raceData.baseStats.pie + rolled.piety,
      vitality: raceData.baseStats.vit + rolled.vitality,
      agility: raceData.baseStats.agi + rolled.agility,
      luck: raceData.baseStats.luc + rolled.luck,
      bonusPoints: rolled.bonusPoints
    };
  });

  readonly allocatedPoints = computed(() => {
    const rolled = this.rolledStats();
    if (!rolled) {
      return {
        strength: 0,
        intelligence: 0,
        piety: 0,
        vitality: 0,
        agility: 0,
        luck: 0
      };
    }
    return {
      strength: rolled.strength,
      intelligence: rolled.intelligence,
      piety: rolled.piety,
      vitality: rolled.vitality,
      agility: rolled.agility,
      luck: rolled.luck
    };
  });

  /**
   * Check if all bonus points have been allocated.
   * Required to advance from ALLOCATE_POINTS step.
   */
  readonly allPointsAllocated = computed(() => {
    const stats = this.rolledStats();
    return stats ? stats.bonusPoints === 0 : false;
  });

  readonly eligibleClasses = computed(() => {
    const stats = this.finalStats();
    const alignment = this.selectedAlignment();
    if (!stats || !alignment) return [];

    return CharacterService.getEligibleClasses(stats, alignment);
  });

  /**
   * Check if can proceed from ROLL_ALLOCATE_CLASS step.
   * Requires both: all points allocated AND class selected.
   */
  readonly canProceedFromRollAllocate = computed(() => {
    const stats = this.rolledStats();
    const selectedClass = this.selectedClass();
    return stats?.bonusPoints === 0 && selectedClass !== null;
  });

  /**
   * Compute unmet requirements for each class based on current stats.
   * Returns a map of class ID to array of unmet requirement strings.
   * Only includes requirements that are NOT met (for display on ineligible buttons).
   * Format: ['STR 11+', 'INT 12+']
   */
  readonly unmetRequirements = computed(() => {
    const finalStats = this.finalStats();
    if (!finalStats) return new Map<CharacterClass, string[]>();

    const result = new Map<CharacterClass, string[]>();

    for (const classOption of this.allClasses) {
      const classData = ClassService.getClassData(classOption.id);
      const requirements = classData?.requirements || {};
      const unmet: string[] = [];

      // Check each requirement
      for (const [stat, minimum] of Object.entries(requirements)) {
        const statKey = this.mapStatToFinalStats(stat); // 'str' -> 'strength'
        const currentValue = finalStats[statKey];

        if (currentValue < minimum) {
          unmet.push(`${stat.toUpperCase()} ${minimum}+`);
        }
      }

      result.set(classOption.id, unmet);
    }

    return result;
  });

  readonly footerMenuItems = computed((): MenuItem[] => {
    const items: MenuItem[] = [];

    switch(this.currentStep()) {
      case CreationStep.SELECT_RACE:
        items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER', enabled: this.selectedRace() !== null });
        items.push({ id: 'cancel', label: 'CANCEL', shortcut: 'ESC', enabled: true });
        break;

      case CreationStep.SELECT_ALIGNMENT:
        items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER', enabled: this.selectedAlignment() !== null });
        items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
        break;

      case CreationStep.ROLL_ALLOCATE_CLASS:
        items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
        items.push({ id: 'reroll', label: 'REROLL', shortcut: 'R', enabled: this.rolledStats() !== null });
        items.push({ id: 'continue', label: 'CONTINUE', shortcut: 'ENTER', enabled: this.canProceedFromRollAllocate() });
        break;

      case CreationStep.NAME_CHARACTER:
        items.push({ id: 'create', label: 'CREATE CHARACTER', shortcut: 'ENTER', enabled: this.characterName().trim().length > 0 });
        items.push({ id: 'back', label: 'BACK', shortcut: 'ESC', enabled: true });
        break;
    }

    return items;
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {
    // Auto-deselect class if it becomes ineligible during allocation
    effect(() => {
      const currentClass = this.selectedClass();
      if (currentClass && !this.isClassEligible(currentClass)) {
        this.selectedClass.set(null);
      }
    });
  }

  ngOnInit() {
    // Verify services are initialized
    if (!RaceService.isInitialized() || !ClassService.isInitialized()) {
      this.errorMessage.set('Game data not loaded. Please refresh.');
    }
  }

  // Race selection
  selectRace(race: Race) {
    // Prevent selection if locked
    if (this.isLocked()) return;

    this.selectedRace.set(race);
    // Reset downstream selections
    this.rolledStats.set(null);
    this.selectedClass.set(null);
  }

  // Alignment selection
  selectAlignment(alignment: Alignment) {
    // Prevent selection if locked
    if (this.isLocked()) return;

    this.selectedAlignment.set(alignment);
    // Reset downstream selections
    this.rolledStats.set(null);
    this.selectedClass.set(null);
  }

  // Roll bonus points only (all stats start at 0)
  async rollBonusPoints() {
    this.isRolling.set(true);

    // Simulate dice roll animation
    await new Promise(resolve => setTimeout(resolve, this.ROLL_ANIMATION_DURATION_MS));

    const rolled = CharacterCreationService.rollBonusPointsOnly();
    this.rolledStats.set(rolled);
    this.isRolling.set(false);

    // Lock race and alignment after first roll
    if (!this.isLocked()) {
      this.isLocked.set(true);
    }
  }

  async rerollStats() {
    // Clear allocations (reset to 0)
    this.rolledStats.update(stats => {
      if (!stats) return null;
      return CharacterCreationService.resetAllocations(stats);
    });

    // Clear selected class
    this.selectedClass.set(null);

    // Roll new bonus points
    await this.rollBonusPoints();
  }

  // Class eligibility check
  isClassEligible(charClass: CharacterClass): boolean {
    const eligible = this.eligibleClasses();
    return eligible.includes(charClass);
  }

  // Class selection
  selectClass(charClass: CharacterClass) {
    if (this.isClassEligible(charClass)) {
      this.selectedClass.set(charClass);
    }
  }

  getAlignmentDescription(alignment: Alignment): string {
    const descriptions = {
      GOOD: 'Good characters are selfless and work for the benefit of others.',
      NEUTRAL: 'Neutral characters are balanced and pragmatic.',
      EVIL: 'Evil characters are selfish and pursue their own interests.'
    };
    return descriptions[alignment];
  }

  getClassDescription(classId: CharacterClass): string {
    // Use ClassService to get description
    const classData = ClassService.getClassData(classId);
    return classData.description;
  }

  onNameSubmit(event: Event) {
    event.preventDefault();
    const name = this.characterName().trim();
    if (name) {
      this.submitCharacter(name);
    }
  }

  getRaceName(race: Race): string {
    const names: Record<Race, string> = {
      HUMAN: 'Human',
      ELF: 'Elf',
      DWARF: 'Dwarf',
      GNOME: 'Gnome',
      HOBBIT: 'Hobbit'
    };
    return names[race];
  }

  getAlignmentName(alignment: Alignment): string {
    const names: Record<Alignment, string> = {
      GOOD: 'Good',
      NEUTRAL: 'Neutral',
      EVIL: 'Evil'
    };
    return names[alignment];
  }

  getClassName(classId: CharacterClass): string {
    const classData = ClassService.getClassData(classId);
    return classData.name;
  }

  // Submit character
  async submitCharacter(name: string) {
    try {
      const stats = this.finalStats()!;
      // Create character
      let character = CharacterService.createCharacterFromStats({
        name: name.trim(),
        password: '', // password (deprecated, empty string)
        race: this.selectedRace()!,
        alignment: this.selectedAlignment()!,
        selectedClass: this.selectedClass()!,
        stats: {
          strength: stats.strength,
          intelligence: stats.intelligence,
          piety: stats.piety,
          vitality: stats.vitality,
          agility: stats.agility,
          luck: stats.luck
        }
      });

      // Learn initial spells for spellcasters (Mage, Priest, Bishop, Samurai, Lord)
      const spellResult = SpellLearningService.learnInitialSpells(character);
      character = spellResult.updatedCharacter;

      // Add to roster
      this.gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(character.id, character)
      }));

      // Success feedback
      this.successMessage.set(`${character.name} created successfully!`);

      // Immediate reset (no delay)
      this.resetWizard();

    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to create character');
    }
  }

  // Reset wizard
  resetWizard() {
    this.currentStep.set(CreationStep.SELECT_RACE);
    this.selectedRace.set(null);
    this.selectedAlignment.set(null);
    this.rolledStats.set(null);
    this.selectedClass.set(null);
    this.characterName.set('');
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.isLocked.set(false);
  }

  // Navigation: Advance to next step
  /**
   * Advances wizard from race selection to alignment selection.
   * Guards against advancing without a selected race.
   */
  advanceToAlignment() {
    if (!this.selectedRace()) return;
    this.currentStep.set(CreationStep.SELECT_ALIGNMENT);
  }

  /**
   * Advances wizard from alignment selection to roll/allocate/class step.
   * Guards against advancing without a selected alignment.
   * Auto-rolls bonus points on entry if not already rolled.
   */
  async advanceToRollAllocateClass() {
    if (!this.selectedAlignment()) return;
    this.currentStep.set(CreationStep.ROLL_ALLOCATE_CLASS);

    // Auto-roll on entry if stats not yet rolled
    if (!this.rolledStats()) {
      await this.rollBonusPoints();
    }
  }

  /**
   * Advances wizard from roll/allocate/class to name character.
   * Guards against advancing without completing allocation and class selection.
   */
  advanceToNameCharacter() {
    if (!this.canProceedFromRollAllocate()) return;
    this.currentStep.set(CreationStep.NAME_CHARACTER);
  }

  // Navigation: Go back (with clearing logic)
  /**
   * Goes back from alignment selection to race selection.
   * Clears alignment selection but preserves race.
   */
  goBackFromAlignment() {
    this.selectedAlignment.set(null);
    this.currentStep.set(CreationStep.SELECT_RACE);
  }

  /**
   * Goes back from roll/allocate/class to alignment selection.
   * Clears rolled stats and selected class.
   */
  goBackFromRollAllocateClass() {
    this.rolledStats.set(null);
    this.selectedClass.set(null);
    this.currentStep.set(CreationStep.SELECT_ALIGNMENT);
  }

  /**
   * Goes back from name character to roll/allocate/class step.
   * Preserves all selections including stats and class.
   */
  goBackFromNameCharacter() {
    this.currentStep.set(CreationStep.ROLL_ALLOCATE_CLASS);
  }

  cancelToTrainingGrounds() {
    // Navigate back to training grounds scene
    this.router.navigate(['/training-grounds']);
  }

  // ============================================================================
  // Bonus Point Allocation Methods
  // ============================================================================

  /**
   * Allocate 1 bonus point to specified stat.
   * Validates: sufficient points remaining and 18 cap (race base + allocated).
   */
  allocatePoint(stat: keyof BaseStats): void {
    const current = this.rolledStats();
    if (!current || current.bonusPoints <= 0) return;

    // Check 18 cap: race base + allocated + 1 cannot exceed 18
    const raceBase = this.getRaceBaseStat(stat);
    const currentAllocation = current[stat];
    if (raceBase + currentAllocation + 1 > 18) return;

    try {
      const updated = CharacterCreationService.allocateBonusPoints(current, stat, 1);
      this.rolledStats.set(updated);
    } catch (error) {
      console.error('Allocation failed:', error);
    }
  }

  /**
   * Deallocate 1 bonus point from specified stat.
   * Returns point to bonus pool.
   */
  deallocatePoint(stat: keyof BaseStats): void {
    const current = this.rolledStats();
    if (!current) return;

    const currentAllocation = current[stat];
    if (currentAllocation <= 0) return;

    // Manually reverse allocation (decrease stat, increase pool)
    this.rolledStats.set({
      ...current,
      [stat]: currentAllocation - 1,
      bonusPoints: current.bonusPoints + 1
    });
  }

  /**
   * Get race base stat for specified attribute.
   * Used for 18 cap validation (base + allocated <= 18).
   */
  getRaceBaseStat(stat: keyof BaseStats): number {
    const raceData = this.raceData();
    if (!raceData) return 0;

    const mapping: Record<keyof BaseStats, keyof typeof raceData.baseStats> = {
      strength: 'str',
      intelligence: 'int',
      piety: 'pie',
      vitality: 'vit',
      agility: 'agi',
      luck: 'luc'
    };

    return raceData.baseStats[mapping[stat]];
  }

  /**
   * Map abbreviated stat names (from JSON data) to FinalStats property names.
   * @param abbrev - Abbreviated stat name ('str', 'int', 'pie', 'vit', 'agi', 'luc')
   * @returns Full stat property name for FinalStats type
   */
  private mapStatToFinalStats(abbrev: string): keyof FinalStats {
    const mapping: Record<string, keyof FinalStats> = {
      'str': 'strength',
      'int': 'intelligence',
      'pie': 'piety',
      'vit': 'vitality',
      'agi': 'agility',
      'luc': 'luck'
    };
    return mapping[abbrev];
  }

  // Get keyboard shortcut for class
  getClassShortcut(classId: string): string {
    const shortcuts: { [key: string]: string } = {
      'FIGHTER': 'F',
      'MAGE': 'M',
      'PRIEST': 'P',
      'THIEF': 'T',
      'BISHOP': 'B',    // Changed from 'I'
      'SAMURAI': 'A',   // Changed from 'S'
      'LORD': 'L',
      'NINJA': 'J'      // Changed from 'N'
    };
    return shortcuts[classId] || '?';
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    let handled = false;

    // Route by current step
    switch(this.currentStep()) {
      case CreationStep.SELECT_RACE:
        handled = this.handleRaceStepKeys(key);
        break;

      case CreationStep.SELECT_ALIGNMENT:
        handled = this.handleAlignmentStepKeys(key);
        break;

      case CreationStep.ROLL_ALLOCATE_CLASS:
        handled = this.handleRollAllocateClassStepKeys(key);
        break;

      case CreationStep.NAME_CHARACTER:
        handled = this.handleNameCharacterStepKeys(key);
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  private handleRaceStepKeys(key: string): boolean {
    if (['1','2','3','4','5'].includes(key)) {
      const races: Race[] = [Race.HUMAN, Race.ELF, Race.DWARF, Race.GNOME, Race.HOBBIT];
      const index = parseInt(key) - 1;
      this.selectedRace.set(races[index]);
      return true;
    } else if (key === 'enter' && this.selectedRace()) {
      this.advanceToAlignment();
      return true;
    } else if (key === 'escape') {
      this.cancelToTrainingGrounds();
      return true;
    }
    return false;
  }

  private handleAlignmentStepKeys(key: string): boolean {
    if (key === 'g') {
      this.selectedAlignment.set(Alignment.GOOD);
      return true;
    } else if (key === 'n') {
      this.selectedAlignment.set(Alignment.NEUTRAL);
      return true;
    } else if (key === 'e') {
      this.selectedAlignment.set(Alignment.EVIL);
      return true;
    } else if (key === 'enter' && this.selectedAlignment()) {
      this.advanceToRollAllocateClass();
      return true;
    } else if (key === 'escape') {
      this.goBackFromAlignment();
      return true;
    }
    return false;
  }

  private handleRollAllocateClassStepKeys(key: string): boolean {
    const classMap: Record<string, CharacterClass> = {
      'f': CharacterClass.FIGHTER,
      'm': CharacterClass.MAGE,
      'p': CharacterClass.PRIEST,
      't': CharacterClass.THIEF,
      'b': CharacterClass.BISHOP,
      'a': CharacterClass.SAMURAI,
      'l': CharacterClass.LORD,
      'j': CharacterClass.NINJA
    };

    if (key === 'r') {
      // Reroll stats
      this.rerollStats();
      return true;
    } else if (key in classMap) {
      const selectedClass = classMap[key];
      // Only allow selecting eligible classes
      const eligible = this.eligibleClasses();
      if (eligible.includes(selectedClass)) {
        this.selectedClass.set(selectedClass);
      }
      return true;
    } else if (key === 'enter' && this.canProceedFromRollAllocate()) {
      // Continue to name character if all requirements met
      this.advanceToNameCharacter();
      return true;
    } else if (key === 'escape') {
      // Go back to alignment
      this.goBackFromRollAllocateClass();
      return true;
    }
    return false;
  }

  private handleNameCharacterStepKeys(key: string): boolean {
    // Let the input field handle typing
    if (key === 'escape') {
      this.goBackFromNameCharacter();
      return true;
    } else if (key === 'enter') {
      // Submit character if name is valid
      const name = this.characterName().trim();
      if (name) {
        this.submitCharacter(name);
        return true;
      }
    }
    return false;
  }

  // Footer menu handler
  handleFooterAction(itemId: string) {
    switch(itemId) {
      case 'continue':
        // Context-aware continue based on current step
        if (this.currentStep() === CreationStep.SELECT_RACE) {
          this.advanceToAlignment();
        } else if (this.currentStep() === CreationStep.SELECT_ALIGNMENT) {
          this.advanceToRollAllocateClass();
        } else if (this.currentStep() === CreationStep.ROLL_ALLOCATE_CLASS) {
          this.advanceToNameCharacter();
        }
        break;

      case 'cancel':
        // Step 1 only: cancel to training grounds
        this.cancelToTrainingGrounds();
        break;

      case 'back':
        // Context-aware back based on current step
        if (this.currentStep() === CreationStep.SELECT_ALIGNMENT) {
          this.goBackFromAlignment();
        } else if (this.currentStep() === CreationStep.ROLL_ALLOCATE_CLASS) {
          this.goBackFromRollAllocateClass();
        } else if (this.currentStep() === CreationStep.NAME_CHARACTER) {
          this.goBackFromNameCharacter();
        }
        break;

      case 'reroll':
        // ROLL_ALLOCATE_CLASS step: reroll stats
        this.rerollStats();
        break;

      case 'create':
        // NAME_CHARACTER step: create character
        const name = this.characterName().trim();
        if (name) {
          this.submitCharacter(name);
        }
        break;
    }
  }

  // Template helper methods
  parseRaceId(id: string): Race | null {
    return parseRace(id);
  }

  parseClassId(id: string): CharacterClass | null {
    return parseClass(id);
  }

  getClassData(charClass: CharacterClass) {
    return ClassService.getClassData(charClass);
  }
}
