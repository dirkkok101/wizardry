import { Component, computed, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { RaceService } from '../../services/RaceService';
import { ClassService } from '../../services/ClassService';
import { CharacterService } from '../../services/CharacterService';
import { CharacterCreationService, RolledStats } from '../../services/CharacterCreationService';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { NameModalComponent } from '../components/name-modal/name-modal.component';
import { Race, parseRace } from '../../types/Race';
import { CharacterClass, parseClass } from '../../types/CharacterClass';
import { Alignment } from '../../types/Alignment';
import { MenuItem } from '../../components/menu/menu.component';

enum CreationStep {
  SELECT_RACE = 'SELECT_RACE',
  SELECT_ALIGNMENT = 'SELECT_ALIGNMENT',
  ROLL_STATS = 'ROLL_STATS',
  SELECT_CLASS = 'SELECT_CLASS',
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
    SceneFooterComponent,
    NameModalComponent
  ],
  templateUrl: './character-creation.component.html',
  styleUrl: './character-creation.component.scss'
})
export class CharacterCreationComponent implements OnInit {
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
  readonly showNameModal = signal<boolean>(false);

  // Wizard state machine
  currentStep = signal<CreationStep>(CreationStep.SELECT_RACE);

  // Step metadata
  stepTitle = computed(() => {
    switch(this.currentStep()) {
      case CreationStep.SELECT_RACE: return 'Choose Your Race';
      case CreationStep.SELECT_ALIGNMENT: return 'Choose Your Alignment';
      case CreationStep.ROLL_STATS: return 'Roll Your Attributes';
      case CreationStep.SELECT_CLASS: return 'Choose Your Class';
      case CreationStep.NAME_CHARACTER: return 'Name Your Character';
    }
  });

  stepNumber = computed(() => {
    const steps = [
      CreationStep.SELECT_RACE,
      CreationStep.SELECT_ALIGNMENT,
      CreationStep.ROLL_STATS,
      CreationStep.SELECT_CLASS,
      CreationStep.NAME_CHARACTER
    ];
    return steps.indexOf(this.currentStep()) + 1;
  });

  // Data arrays for template
  readonly allRaces = computed(() => RaceService.getAllRaces());
  readonly allClasses = computed(() => ClassService.getAllClasses());
  readonly allAlignments = [Alignment.GOOD, Alignment.NEUTRAL, Alignment.EVIL];

  // Expose Alignment enum to template
  readonly Alignment = Alignment;

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

  readonly eligibleClasses = computed(() => {
    const stats = this.finalStats();
    const alignment = this.selectedAlignment();
    if (!stats || !alignment) return [];

    return CharacterService.getEligibleClasses(stats, alignment);
  });

  readonly canAccept = computed(() => {
    return this.selectedRace() !== null &&
           this.selectedAlignment() !== null &&
           this.selectedClass() !== null;
  });

  readonly footerMenuItems = computed((): MenuItem[] => {
    const items: MenuItem[] = [];

    if (this.canAccept()) {
      items.push({ id: 'accept', label: 'ACCEPT & NAME CHARACTER', shortcut: 'ENTER', enabled: true });
    }

    items.push({ id: 'reset', label: 'RESET', shortcut: 'ESC', enabled: true });
    items.push({ id: 'quit', label: 'QUIT TO TRAINING GROUNDS', shortcut: 'Q', enabled: true });

    return items;
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

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

  // Roll stats (NEW FORMULA)
  async rollStats() {
    this.isRolling.set(true);

    // Simulate dice roll animation (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    const rolled = CharacterCreationService.rollStats();
    this.rolledStats.set(rolled);
    this.isRolling.set(false);

    // Auto-advance to class selection
    this.advanceToSelectClass();
  }

  rerollStats() {
    // Clear class selection
    this.selectedClass.set(null);

    // Roll again (which auto-advances back to SELECT_CLASS)
    this.rollStats();
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

  // Accept character and show name modal
  acceptCharacter() {
    if (!this.canAccept()) return;
    this.showNameModal.set(true);
  }

  // Handle name modal save
  handleNameSave(name: string) {
    try {
      const stats = this.finalStats()!;
      // Create character
      const character = CharacterService.createCharacterFromStats({
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

      // Add to roster
      this.gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(character.id, character)
      }));

      // Close modal
      this.showNameModal.set(false);

      // Success feedback
      this.successMessage.set(`${character.name} created successfully!`);

      // Immediate reset (no delay)
      this.resetWizard();

    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to create character');
    }
  }

  // Handle name modal cancel
  handleNameCancel() {
    this.showNameModal.set(false);
  }

  // Reset wizard
  resetWizard() {
    this.currentStep.set(CreationStep.SELECT_RACE);
    this.selectedRace.set(null);
    this.selectedAlignment.set(null);
    this.rolledStats.set(null);
    this.selectedClass.set(null);
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  // Navigation: Advance to next step
  advanceToAlignment() {
    if (!this.selectedRace()) return;
    this.currentStep.set(CreationStep.SELECT_ALIGNMENT);
  }

  advanceToRollStats() {
    if (!this.selectedAlignment()) return;
    this.currentStep.set(CreationStep.ROLL_STATS);
  }

  advanceToSelectClass() {
    // Auto-advance after rolling (no validation needed)
    this.currentStep.set(CreationStep.SELECT_CLASS);
  }

  advanceToNameCharacter() {
    if (!this.selectedClass()) return;
    this.currentStep.set(CreationStep.NAME_CHARACTER);
  }

  // Navigation: Go back (with clearing logic)
  goBackFromAlignment() {
    this.selectedAlignment.set(null);
    this.currentStep.set(CreationStep.SELECT_RACE);
  }

  goBackFromRollStats() {
    this.rolledStats.set(null);
    this.currentStep.set(CreationStep.SELECT_ALIGNMENT);
  }

  goBackFromSelectClass() {
    // Nuclear option: lose stats AND class
    this.rolledStats.set(null);
    this.selectedClass.set(null);
    this.currentStep.set(CreationStep.SELECT_ALIGNMENT);
  }

  goBackFromNameCharacter() {
    // Just go back, keep stats and class
    this.currentStep.set(CreationStep.SELECT_CLASS);
  }

  cancelToTrainingGrounds() {
    // Navigate back to training grounds scene
    this.router.navigate(['/training-grounds']);
  }

  quitToTrainingGrounds() {
    this.cancelToTrainingGrounds();
  }

  // Navigation
  navigateToTrainingGrounds() {
    this.router.navigate(['/training-grounds']);
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

    // Route by current step
    switch(this.currentStep()) {
      case CreationStep.SELECT_RACE:
        this.handleRaceStepKeys(key);
        break;

      case CreationStep.SELECT_ALIGNMENT:
        this.handleAlignmentStepKeys(key);
        break;

      case CreationStep.ROLL_STATS:
        this.handleRollStatsStepKeys(key);
        break;

      case CreationStep.SELECT_CLASS:
        this.handleSelectClassStepKeys(key);
        break;

      case CreationStep.NAME_CHARACTER:
        this.handleNameCharacterStepKeys(key);
        break;
    }

    // Global shortcuts (work on any step)
    if (key === 'q') {
      this.quitToTrainingGrounds();
      event.preventDefault();
    }
  }

  private handleRaceStepKeys(key: string) {
    if (['1','2','3','4','5'].includes(key)) {
      const races: Race[] = [Race.HUMAN, Race.ELF, Race.DWARF, Race.GNOME, Race.HOBBIT];
      const index = parseInt(key) - 1;
      this.selectedRace.set(races[index]);
    } else if (key === 'enter' && this.selectedRace()) {
      this.advanceToAlignment();
    } else if (key === 'escape') {
      this.cancelToTrainingGrounds();
    }
  }

  private handleAlignmentStepKeys(key: string) {
    if (key === 'g') {
      this.selectedAlignment.set(Alignment.GOOD);
    } else if (key === 'n') {
      this.selectedAlignment.set(Alignment.NEUTRAL);
    } else if (key === 'e') {
      this.selectedAlignment.set(Alignment.EVIL);
    } else if (key === 'enter' && this.selectedAlignment()) {
      this.advanceToRollStats();
    } else if (key === 'escape') {
      this.goBackFromAlignment();
    }
  }

  private handleRollStatsStepKeys(key: string) {
    if (key === 'r' && !this.isRolling()) {
      this.rollStats();
    } else if (key === 'escape') {
      this.goBackFromRollStats();
    }
  }

  private handleSelectClassStepKeys(key: string) {
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
      this.rerollStats();
    } else if (key in classMap) {
      const selectedClass = classMap[key];
      // Only allow selecting eligible classes
      const eligible = this.eligibleClasses();
      if (eligible.includes(selectedClass)) {
        this.selectedClass.set(selectedClass);
      }
    } else if (key === 'enter' && this.selectedClass()) {
      this.advanceToNameCharacter();
    } else if (key === 'escape') {
      this.goBackFromSelectClass();
    }
  }

  private handleNameCharacterStepKeys(key: string) {
    // Let the input field handle typing
    // Only intercept Escape (Enter handled by form submit)
    if (key === 'escape') {
      this.goBackFromNameCharacter();
    }
  }

  // Footer menu handler
  handleFooterAction(itemId: string) {
    switch(itemId) {
      case 'accept':
        this.acceptCharacter();
        break;
      case 'reset':
        this.resetWizard();
        break;
      case 'quit':
        this.navigateToTrainingGrounds();
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
