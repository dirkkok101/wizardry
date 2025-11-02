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
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { Race, parseRace } from '../../types/Race';
import { CharacterClass, parseClass } from '../../types/CharacterClass';
import { Alignment } from '../../types/Alignment';
import { MenuItem } from '../../components/menu/menu.component';

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
    ConfirmationDialogComponent
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
  readonly characterName = signal<string>('');

  // UI state signals
  readonly isRolling = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly showCancelConfirmation = signal<boolean>(false);

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

  readonly canSave = computed(() => {
    return this.selectedRace() !== null &&
           this.selectedAlignment() !== null &&
           this.selectedClass() !== null &&
           this.characterName().trim().length > 0;
  });

  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'save', label: 'SAVE CHARACTER', shortcut: 'S', enabled: this.canSave() },
    { id: 'cancel', label: 'CANCEL', shortcut: 'ESC', enabled: true },
    { id: 'back', label: 'BACK TO TRAINING GROUNDS', shortcut: 'B', enabled: true }
  ]);

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
    this.selectedRace.set(race);
    // Reset downstream selections
    this.rolledStats.set(null);
    this.selectedClass.set(null);
  }

  // Alignment selection
  selectAlignment(alignment: Alignment) {
    this.selectedAlignment.set(alignment);
    // Reset downstream selections
    this.rolledStats.set(null);
    this.selectedClass.set(null);
  }

  // Roll stats (NEW FORMULA)
  rollStats() {
    this.isRolling.set(true);

    // Simulate dice rolling animation
    setTimeout(() => {
      const rolled = CharacterCreationService.rollStats();
      this.rolledStats.set(rolled);
      this.selectedClass.set(null); // Reset class when rerolling
      this.isRolling.set(false);
    }, 300);
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

  // Save character
  saveCharacter() {
    if (!this.canSave()) return;

    const stats = this.finalStats()!;
    const character = CharacterService.createCharacterFromStats({
      name: this.characterName().trim(),
      password: '', // Password field removed per plan, but required by interface
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

    // Show success and reset
    this.successMessage.set(`${character.name} created successfully!`);
    setTimeout(() => {
      this.resetForm();
      this.successMessage.set(null);
    }, 2000);
  }

  // Reset form
  resetForm() {
    this.selectedRace.set(null);
    this.selectedAlignment.set(null);
    this.rolledStats.set(null);
    this.selectedClass.set(null);
    this.characterName.set('');
    this.errorMessage.set(null);
    this.showCancelConfirmation.set(false);
  }

  // Cancel with confirmation
  confirmCancel() {
    // Only confirm if form has data
    const hasData = this.selectedRace() || this.selectedAlignment() ||
                    this.rolledStats() || this.characterName();

    if (hasData) {
      this.showCancelConfirmation.set(true);
    } else {
      this.resetForm();
    }
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
      'BISHOP': 'I',
      'SAMURAI': 'S',
      'LORD': 'L',
      'NINJA': 'N'
    };
    return shortcuts[classId] || '?';
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    // Priority 1: Save character (S) - takes precedence when form is complete
    if (key === 's' && this.canSave()) {
      event.preventDefault();
      this.saveCharacter();
      return;
    }

    // Priority 2: Cancel (Escape)
    if (key === 'escape') {
      event.preventDefault();
      this.confirmCancel();
      return;
    }

    // Priority 3: Race selection (1-5)
    if (key >= '1' && key <= '5') {
      const races = this.allRaces();
      const index = parseInt(key) - 1;
      if (index < races.length) {
        event.preventDefault();
        const raceId = this.parseRaceId(races[index].id);
        if (raceId) this.selectRace(raceId);
      }
      return;
    }

    // Priority 4: Roll stats (R)
    if (key === 'r' && this.selectedAlignment()) {
      event.preventDefault();
      this.rollStats();
      return;
    }

    // Priority 5: Alignment selection (G, N, E)
    // Only active after race selected AND before rolling stats (prevents conflict with class keys)
    if (this.selectedRace() && !this.rolledStats()) {
      switch(key) {
        case 'g':
          event.preventDefault();
          this.selectAlignment(Alignment.GOOD);
          return;
        case 'n':
          event.preventDefault();
          this.selectAlignment(Alignment.NEUTRAL);
          return;
        case 'e':
          event.preventDefault();
          this.selectAlignment(Alignment.EVIL);
          return;
      }
    }

    // Priority 6: Class selection (F, M, P, T, I, S, L, N)
    // Only active when stats rolled (so alignment keys won't conflict) AND form not complete (so Save key takes precedence)
    if (this.rolledStats() && !this.canSave()) {
      const classMap: { [key: string]: CharacterClass } = {
        'f': CharacterClass.FIGHTER,
        'm': CharacterClass.MAGE,
        'p': CharacterClass.PRIEST,
        't': CharacterClass.THIEF,
        'i': CharacterClass.BISHOP,
        's': CharacterClass.SAMURAI,
        'l': CharacterClass.LORD,
        'n': CharacterClass.NINJA
      };

      const charClass = classMap[key];
      if (charClass && this.isClassEligible(charClass)) {
        event.preventDefault();
        this.selectClass(charClass);
        return;
      }
    }

    // Priority 7: Back to training grounds (B)
    if (key === 'b') {
      event.preventDefault();
      this.navigateToTrainingGrounds();
      return;
    }
  }

  // Footer menu handler
  handleFooterAction(itemId: string) {
    switch(itemId) {
      case 'save':
        this.saveCharacter();
        break;
      case 'cancel':
        this.confirmCancel();
        break;
      case 'back':
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
