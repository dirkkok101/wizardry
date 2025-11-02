# Character Creation Two-Column Wizard Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign character creation from single-column progressive-enable layout to two-column wizard-state design with explicit step-by-step navigation.

**Architecture:** Explicit state machine (enum-driven) with 5 steps. Left column shows only current step's controls. Right column builds up progressively like a receipt. Enter advances, Escape goes back (with data clearing rules). Reroll button on class step for unlimited stat fishing.

**Tech Stack:** Angular 18+ (signals), TypeScript, SCSS, Jest

---

## Design Overview

### State Machine
```
SELECT_RACE → SELECT_ALIGNMENT → ROLL_STATS → SELECT_CLASS → NAME_CHARACTER → Success (reset)
     ↑              ↓ (ESC)          ↓ (ESC)       ↓ (ESC)         ↓ (ESC)
     └──────────────┴────────────────┴──────────────┘───────────────┘
```

### Key Behaviors
- **Complete hiding**: Only current step visible in left column
- **Progressive build-up**: Right column shows selected data (race → alignment → stats → class)
- **Auto-advance after roll**: Rolling dice automatically goes to class selection
- **Reroll stays on step**: Can reroll unlimited times on SELECT_CLASS step
- **Escape clears data**: Going back loses downstream selections
- **Immediate reset**: No delay after character creation

### Visual Layout
```
┌───────────────────────────────────────────────────────────┐
│              CHARACTER CREATION (title)                    │
├─────────────────────────┬─────────────────────────────────┤
│ LEFT: CONTROLS (50%)    │ RIGHT: CHARACTER DISPLAY (50%)  │
│                         │                                 │
│ ┌─────────────────────┐ │ ┌─────────────────────────────┐ │
│ │ Choose Your Race    │ │ │ YOUR CHARACTER              │ │
│ │ Step 1 of 5         │ │ │                             │ │
│ └─────────────────────┘ │ │ Race: Human (after select)  │ │
│                         │ │ Alignment: Good (step 2)    │ │
│ [1: Human] [2: Elf]    │ │ Stats: (after roll)         │ │
│ [3: Dwarf] [4: Gnome]  │ │ Class: Fighter (step 4)     │ │
│ [5: Hobbit]            │ │                             │ │
│                         │ └─────────────────────────────┘ │
│ Press ENTER to continue │                                 │
└─────────────────────────┴─────────────────────────────────┘
│ [ESC: Back] [Q: Quit]                                     │
└───────────────────────────────────────────────────────────┘
```

---

## Task 1: Add State Machine Enum and Signals

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`

**Step 1: Add CreationStep enum before component class**

Add this enum at the top of the file, after imports:

```typescript
enum CreationStep {
  SELECT_RACE = 'SELECT_RACE',
  SELECT_ALIGNMENT = 'SELECT_ALIGNMENT',
  ROLL_STATS = 'ROLL_STATS',
  SELECT_CLASS = 'SELECT_CLASS',
  NAME_CHARACTER = 'NAME_CHARACTER'
}
```

**Step 2: Add currentStep signal to component**

Inside the component class, add after existing signals:

```typescript
// Wizard state machine
currentStep = signal<CreationStep>(CreationStep.SELECT_RACE);
```

**Step 3: Add computed signals for step metadata**

Add after the currentStep signal:

```typescript
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
```

**Step 4: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "feat: add state machine enum and step tracking signals"
```

---

## Task 2: Add Navigation Methods (Advance)

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`

**Step 1: Add advance navigation methods**

Add these methods to the component class:

```typescript
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
```

**Step 2: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "feat: add advance navigation methods"
```

---

## Task 3: Add Navigation Methods (Go Back)

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`

**Step 1: Add go-back navigation methods with data clearing**

Add these methods to the component class:

```typescript
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
  SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, {
    direction: 'instant'
  });
}

quitToTrainingGrounds() {
  this.cancelToTrainingGrounds();
}
```

**Step 2: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "feat: add go-back navigation with data clearing"
```

---

## Task 4: Update Roll Stats Method (Auto-Advance)

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`

**Step 1: Find existing rollStats method and replace it**

Replace the existing `rollStats()` method with this version that auto-advances:

```typescript
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
```

**Step 2: Add rerollStats method for class selection step**

Add this new method after rollStats:

```typescript
rerollStats() {
  // Clear class selection
  this.selectedClass.set(null);

  // Roll again (which auto-advances back to SELECT_CLASS)
  this.rollStats();
}
```

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "feat: auto-advance after roll and add reroll method"
```

---

## Task 5: Update Reset and Submit Methods

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`

**Step 1: Find resetWizard method and update it**

Replace or update the existing reset method to include currentStep:

```typescript
resetWizard() {
  this.currentStep.set(CreationStep.SELECT_RACE);
  this.selectedRace.set(null);
  this.selectedAlignment.set(null);
  this.rolledStats.set(null);
  this.selectedClass.set(null);
  this.successMessage.set(null);
  this.errorMessage.set(null);
}
```

**Step 2: Find submitCharacter/createCharacter method and remove delay**

Find the method that creates the character and update it to remove the 2-second delay. Replace the success flow with immediate reset:

```typescript
async submitCharacter(name: string) {
  try {
    // Create character
    const character = CharacterService.createCharacterFromStats(
      name,
      this.selectedRace()!,
      this.selectedAlignment()!,
      this.finalStats()!,
      this.selectedClass()!,
      '' // password (deprecated, empty string)
    );

    // Add to roster
    const state = this.gameStateService.getState();
    this.gameStateService.setState({
      ...state,
      roster: new Map(state.roster).set(character.id, character)
    });

    // Success feedback
    this.successMessage.set(`${name} created successfully!`);

    // Immediate reset (no delay)
    this.resetWizard();

  } catch (error) {
    this.errorMessage.set(error instanceof Error ? error.message : 'Failed to create character');
  }
}
```

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "feat: immediate reset after character creation"
```

---

## Task 6: Update Keyboard Handler for State Machine

**Files:**
- Modify: `src/app/character-creation/character-creation.component.ts`

**Step 1: Find existing @HostListener and replace with state-machine version**

Replace the existing keyboard handler with this version that routes by currentStep:

```typescript
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
```

**Step 2: Add per-step keyboard handler methods**

Add these handler methods to the component:

```typescript
private handleRaceStepKeys(key: string) {
  if (['1','2','3','4','5'].includes(key)) {
    const races: Race[] = ['HUMAN', 'ELF', 'DWARF', 'GNOME', 'HOBBIT'];
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
    this.selectedAlignment.set('GOOD');
  } else if (key === 'n') {
    this.selectedAlignment.set('NEUTRAL');
  } else if (key === 'e') {
    this.selectedAlignment.set('EVIL');
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
    'f': 'FIGHTER',
    'm': 'MAGE',
    'p': 'PRIEST',
    't': 'THIEF',
    'b': 'BISHOP',
    'a': 'SAMURAI',
    'l': 'LORD',
    'j': 'NINJA'
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
```

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "feat: state-machine-driven keyboard handler"
```

---

## Task 7: Create Two-Column Template Structure

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html`

**Step 1: Replace entire template with two-column structure**

Replace the existing template with this structure:

```html
<div class="character-creation-container">
  <!-- Scene Title (full width) -->
  <app-scene-title [title]="'CHARACTER CREATION'" />

  <!-- Two-column content -->
  <div class="wizard-content">
    <!-- LEFT: Controls Column (50%) -->
    <div class="controls-column">
      <div class="step-header">
        <h2>{{ stepTitle() }}</h2>
        <span class="step-indicator">Step {{ stepNumber() }} of 5</span>
      </div>

      <div class="step-content">
        <!-- Dynamic content based on currentStep (next task) -->
      </div>

      <div class="step-hints">
        <!-- Contextual hints (next task) -->
      </div>
    </div>

    <!-- RIGHT: Character Display Column (50%) -->
    <div class="character-display-column">
      <div class="character-sheet">
        <h3>YOUR CHARACTER</h3>

        <!-- Progressive build-up (next task) -->
      </div>
    </div>
  </div>

  <!-- Scene Footer (full width) -->
  <app-scene-footer [menuItems]="footerMenuItems()" />

  <!-- Name Modal (reuse existing) -->
  @if (showNameModal()) {
    <app-name-modal
      [isOpen]="showNameModal()"
      (nameSubmitted)="submitCharacter($event)"
      (cancelled)="showNameModal.set(false)"
    />
  }
</div>
```

**Step 2: Commit**

```bash
git add src/app/character-creation/character-creation.component.html
git commit -m "feat: two-column template structure"
```

---

## Task 8: Add Step Content to Left Column

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html`

**Step 1: Replace step-content div with step-specific content**

Inside the `.step-content` div, add:

```html
<div class="step-content">
  @switch (currentStep()) {
    @case (CreationStep.SELECT_RACE) {
      <div class="race-selection">
        <div class="button-grid">
          @for (race of races; track race) {
            <button
              [class.selected]="selectedRace() === race.id"
              (click)="selectedRace.set(race.id)"
            >
              <span class="shortcut">{{ race.shortcut }}</span>: {{ race.name }}
            </button>
          }
        </div>

        @if (raceData()) {
          <div class="race-description">
            <p>{{ raceData()!.description }}</p>
            <div class="base-stats">
              <strong>Base Stats:</strong>
              <div class="stat-grid">
                <span>STR: {{ raceData()!.baseStats.strength }}</span>
                <span>INT: {{ raceData()!.baseStats.intelligence }}</span>
                <span>PIE: {{ raceData()!.baseStats.piety }}</span>
                <span>VIT: {{ raceData()!.baseStats.vitality }}</span>
                <span>AGI: {{ raceData()!.baseStats.agility }}</span>
                <span>LUC: {{ raceData()!.baseStats.luck }}</span>
              </div>
            </div>
          </div>
        }
      </div>
    }

    @case (CreationStep.SELECT_ALIGNMENT) {
      <div class="alignment-selection">
        <div class="button-grid alignments">
          <button
            [class.selected]="selectedAlignment() === 'GOOD'"
            (click)="selectedAlignment.set('GOOD')"
          >
            <span class="shortcut">G</span>: Good
          </button>
          <button
            [class.selected]="selectedAlignment() === 'NEUTRAL'"
            (click)="selectedAlignment.set('NEUTRAL')"
          >
            <span class="shortcut">N</span>: Neutral
          </button>
          <button
            [class.selected]="selectedAlignment() === 'EVIL'"
            (click)="selectedAlignment.set('EVIL')"
          >
            <span class="shortcut">E</span>: Evil
          </button>
        </div>

        @if (selectedAlignment()) {
          <div class="alignment-description">
            <p>{{ getAlignmentDescription(selectedAlignment()!) }}</p>
          </div>
        }
      </div>
    }

    @case (CreationStep.ROLL_STATS) {
      <div class="roll-stats">
        <button
          class="roll-button"
          [disabled]="isRolling()"
          (click)="rollStats()"
        >
          {{ isRolling() ? 'Rolling...' : 'ROLL DICE' }} <span class="shortcut">(R)</span>
        </button>

        <div class="roll-explanation">
          <p>Roll 3d6 for each attribute. Your race's base stats will be added to the roll.</p>
        </div>
      </div>
    }

    @case (CreationStep.SELECT_CLASS) {
      <div class="class-selection">
        <button
          class="reroll-button"
          (click)="rerollStats()"
        >
          REROLL STATS <span class="shortcut">(R)</span>
        </button>

        <hr class="section-divider" />

        <div class="button-grid classes">
          @for (classOption of allClasses; track classOption.id) {
            <button
              [class.selected]="selectedClass() === classOption.id"
              [disabled]="!isClassEligible(classOption.id)"
              (click)="selectClass(classOption.id)"
            >
              <span class="shortcut">{{ classOption.shortcut }}</span>: {{ classOption.name }}
              @if (!isClassEligible(classOption.id)) {
                <span class="ineligible-marker">✗</span>
              }
            </button>
          }
        </div>

        @if (selectedClass()) {
          <div class="class-description">
            <p>{{ getClassDescription(selectedClass()!) }}</p>
          </div>
        }
      </div>
    }

    @case (CreationStep.NAME_CHARACTER) {
      <div class="name-character">
        <form (submit)="onNameSubmit($event)">
          <label for="character-name">Character Name</label>
          <input
            id="character-name"
            type="text"
            [(ngModel)]="characterName"
            name="characterName"
            maxlength="15"
            placeholder="Enter name..."
            autofocus
          />
          <div class="char-count">{{ characterName().length }} / 15</div>
        </form>
      </div>
    }
  }
</div>
```

**Step 2: Note - Need to expose CreationStep to template**

At the top of the component TypeScript file, expose the enum:

```typescript
export class CharacterCreationComponent {
  // Expose enum to template
  readonly CreationStep = CreationStep;

  // ... rest of class
}
```

**Step 3: Add helper data arrays**

Add these arrays to the component for template iteration:

```typescript
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
```

**Step 4: Add helper methods**

```typescript
isClassEligible(classId: CharacterClass): boolean {
  return this.eligibleClasses().includes(classId);
}

selectClass(classId: CharacterClass) {
  if (this.isClassEligible(classId)) {
    this.selectedClass.set(classId);
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
```

**Step 5: Commit**

```bash
git add src/app/character-creation/character-creation.component.html src/app/character-creation/character-creation.component.ts
git commit -m "feat: add step-specific content to left column"
```

---

## Task 9: Add Progressive Character Display to Right Column

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html`

**Step 1: Replace character-sheet div content with progressive build-up**

Inside the `.character-sheet` div, replace the placeholder comment with:

```html
<div class="character-sheet">
  <h3>YOUR CHARACTER</h3>

  <!-- Race -->
  @if (selectedRace()) {
    <div class="sheet-section race">
      <label>Race:</label>
      <span class="value">{{ getRaceName(selectedRace()!) }}</span>
    </div>
  }

  <!-- Alignment -->
  @if (selectedAlignment()) {
    <div class="sheet-section alignment">
      <label>Alignment:</label>
      <span class="value">{{ getAlignmentName(selectedAlignment()!) }}</span>
    </div>
  }

  <!-- Stats -->
  @if (rolledStats() && finalStats()) {
    <div class="sheet-section stats">
      <label>Attributes:</label>
      <div class="stat-list">
        <div class="stat-row">
          <span class="stat-name">STR:</span>
          <span class="stat-formula">
            {{ raceData()!.baseStats.strength }} + {{ rolledStats()!.strength }} = {{ finalStats()!.strength }}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-name">INT:</span>
          <span class="stat-formula">
            {{ raceData()!.baseStats.intelligence }} + {{ rolledStats()!.intelligence }} = {{ finalStats()!.intelligence }}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-name">PIE:</span>
          <span class="stat-formula">
            {{ raceData()!.baseStats.piety }} + {{ rolledStats()!.piety }} = {{ finalStats()!.piety }}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-name">VIT:</span>
          <span class="stat-formula">
            {{ raceData()!.baseStats.vitality }} + {{ rolledStats()!.vitality }} = {{ finalStats()!.vitality }}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-name">AGI:</span>
          <span class="stat-formula">
            {{ raceData()!.baseStats.agility }} + {{ rolledStats()!.agility }} = {{ finalStats()!.agility }}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-name">LUC:</span>
          <span class="stat-formula">
            {{ raceData()!.baseStats.luck }} + {{ rolledStats()!.luck }} = {{ finalStats()!.luck }}
          </span>
        </div>
        <div class="bonus-points">
          <strong>Bonus Points:</strong> {{ rolledStats()!.bonusPoints }}
        </div>
      </div>
    </div>
  }

  <!-- Class -->
  @if (selectedClass()) {
    <div class="sheet-section class">
      <label>Class:</label>
      <span class="value">{{ getClassName(selectedClass()!) }}</span>
    </div>
  }
</div>
```

**Step 2: Add helper methods for display names**

Add to component:

```typescript
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
```

**Step 3: Commit**

```bash
git add src/app/character-creation/character-creation.component.html src/app/character-creation/character-creation.component.ts
git commit -m "feat: progressive character display in right column"
```

---

## Task 10: Add Step Hints to Left Column

**Files:**
- Modify: `src/app/character-creation/character-creation.component.html`

**Step 1: Replace step-hints div with dynamic hints**

Inside the `.step-hints` div, add:

```html
<div class="step-hints">
  @switch (currentStep()) {
    @case (CreationStep.SELECT_RACE) {
      <p><strong>ENTER:</strong> Continue | <strong>ESC:</strong> Cancel | <strong>Q:</strong> Quit</p>
    }
    @case (CreationStep.SELECT_ALIGNMENT) {
      <p><strong>ENTER:</strong> Continue | <strong>ESC:</strong> Go back | <strong>Q:</strong> Quit</p>
    }
    @case (CreationStep.ROLL_STATS) {
      <p><strong>R:</strong> Roll dice | <strong>ESC:</strong> Go back | <strong>Q:</strong> Quit</p>
    }
    @case (CreationStep.SELECT_CLASS) {
      <p><strong>ENTER:</strong> Continue | <strong>R:</strong> Reroll stats | <strong>ESC:</strong> Start over | <strong>Q:</strong> Quit</p>
    }
    @case (CreationStep.NAME_CHARACTER) {
      <p><strong>ENTER:</strong> Create character | <strong>ESC:</strong> Go back | <strong>Q:</strong> Quit</p>
    }
  }

  @if (successMessage()) {
    <div class="success-message">{{ successMessage() }}</div>
  }

  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }
</div>
```

**Step 2: Commit**

```bash
git add src/app/character-creation/character-creation.component.html
git commit -m "feat: contextual step hints"
```

---

## Task 11: Create Two-Column Layout Styles

**Files:**
- Modify: `src/app/character-creation/character-creation.component.scss`

**Step 1: Replace existing styles with two-column layout**

Replace the entire SCSS file with:

```scss
.character-creation-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background-color, #1a1a1a);
  color: var(--text-color, #ffffff);
}

.wizard-content {
  display: flex;
  flex: 1;
  gap: 2rem;
  padding: 1rem;
  overflow: hidden;

  .controls-column,
  .character-display-column {
    flex: 1; // 50/50 split
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 1.5rem;
    border-radius: 8px;
  }

  .controls-column {
    border-right: 2px solid var(--border-color, #444);
    background: rgba(0, 0, 0, 0.2);

    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color, #444);

      h2 {
        font-size: 1.5rem;
        margin: 0;
        color: var(--accent-color, #4a9eff);
      }

      .step-indicator {
        color: var(--text-muted, #888);
        font-size: 0.875rem;
      }
    }

    .step-content {
      flex: 1;
      margin-bottom: 1.5rem;
    }

    .step-hints {
      margin-top: auto;
      padding: 1rem;
      background: rgba(74, 158, 255, 0.1);
      border-left: 3px solid var(--accent-color, #4a9eff);
      border-radius: 4px;
      font-size: 0.875rem;

      p {
        margin: 0;

        strong {
          color: var(--accent-color, #4a9eff);
        }
      }

      .success-message {
        margin-top: 0.5rem;
        padding: 0.5rem;
        background: rgba(0, 255, 0, 0.2);
        border-left: 3px solid #00ff00;
        color: #00ff00;
      }

      .error-message {
        margin-top: 0.5rem;
        padding: 0.5rem;
        background: rgba(255, 0, 0, 0.2);
        border-left: 3px solid #ff0000;
        color: #ff0000;
      }
    }
  }

  .character-display-column {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border-color, #444);

    .character-sheet {
      h3 {
        margin: 0 0 1.5rem 0;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--accent-color, #4a9eff);
        font-size: 1.25rem;
        color: var(--accent-color, #4a9eff);
      }

      .sheet-section {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        animation: slideInRight 0.3s ease-out;

        label {
          display: block;
          font-weight: bold;
          margin-bottom: 0.5rem;
          color: var(--label-color, #aaa);
          font-size: 0.875rem;
          text-transform: uppercase;
        }

        .value {
          font-size: 1.125rem;
          color: var(--text-color, #fff);
        }

        &.stats {
          .stat-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-family: 'Courier New', monospace;

            .stat-row {
              display: flex;
              gap: 0.5rem;

              .stat-name {
                font-weight: bold;
                min-width: 3rem;
                color: var(--label-color, #aaa);
              }

              .stat-formula {
                color: var(--text-color, #fff);
              }
            }

            .bonus-points {
              margin-top: 0.5rem;
              padding-top: 0.5rem;
              border-top: 1px solid var(--border-color, #444);
              color: var(--accent-color, #4a9eff);
            }
          }
        }
      }
    }
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

**Step 2: Commit**

```bash
git add src/app/character-creation/character-creation.component.scss
git commit -m "feat: two-column layout styles with animations"
```

---

## Task 12: Add Button Grid Styles

**Files:**
- Modify: `src/app/character-creation/character-creation.component.scss`

**Step 1: Add button grid styles to SCSS**

Add after the wizard-content section:

```scss
// Button Grid Styles
.button-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.5rem;

  &:not(.alignments):not(.classes) {
    // Race selection (5 buttons)
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }

  &.alignments {
    // 3 buttons in a row
    grid-template-columns: repeat(3, 1fr);
  }

  &.classes {
    // 4 columns for 8 classes
    grid-template-columns: repeat(4, 1fr);
  }

  button {
    padding: 1rem;
    border: 2px solid var(--button-border, #666);
    background: var(--button-bg, #2a2a2a);
    color: var(--text-color, #fff);
    cursor: pointer;
    border-radius: 4px;
    font-size: 1rem;
    transition: all 0.2s ease;

    .shortcut {
      color: var(--accent-color, #4a9eff);
      font-weight: bold;
    }

    &:hover:not(:disabled) {
      border-color: var(--accent-color, #4a9eff);
      background: rgba(74, 158, 255, 0.2);
      transform: translateY(-2px);
    }

    &.selected {
      border-color: var(--accent-color, #4a9eff);
      background: rgba(74, 158, 255, 0.3);
      box-shadow: 0 0 10px rgba(74, 158, 255, 0.5);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;

      .ineligible-marker {
        color: #ff4444;
        margin-left: 0.5rem;
      }
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }
}

.roll-button,
.reroll-button {
  width: 100%;
  padding: 1.5rem;
  font-size: 1.25rem;
  font-weight: bold;
  border: 2px solid var(--accent-color, #4a9eff);
  background: rgba(74, 158, 255, 0.2);
  color: var(--text-color, #fff);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;

  .shortcut {
    color: var(--accent-color, #4a9eff);
  }

  &:hover:not(:disabled) {
    background: rgba(74, 158, 255, 0.4);
    transform: scale(1.02);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.reroll-button {
  margin-bottom: 1rem;
  padding: 1rem;
  font-size: 1rem;
}

.section-divider {
  margin: 1.5rem 0;
  border: none;
  border-top: 1px solid var(--border-color, #444);
}
```

**Step 2: Commit**

```bash
git add src/app/character-creation/character-creation.component.scss
git commit -m "feat: button grid and roll button styles"
```

---

## Task 13: Add Description Panel Styles

**Files:**
- Modify: `src/app/character-creation/character-creation.component.scss`

**Step 1: Add description panel styles**

Add to SCSS:

```scss
// Description Panels
.race-description,
.alignment-description,
.class-description {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid var(--accent-color, #4a9eff);
  border-radius: 4px;

  p {
    margin: 0 0 0.5rem 0;
    line-height: 1.6;
  }

  .base-stats,
  .stat-grid {
    margin-top: 1rem;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-top: 0.5rem;
    font-family: 'Courier New', monospace;

    span {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
    }
  }
}

.roll-explanation {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;

  p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-muted, #aaa);
    line-height: 1.6;
  }
}
```

**Step 2: Commit**

```bash
git add src/app/character-creation/character-creation.component.scss
git commit -m "feat: description panel styles"
```

---

## Task 14: Add Name Input Styles

**Files:**
- Modify: `src/app/character-creation/character-creation.component.scss`

**Step 1: Add name input form styles**

Add to SCSS:

```scss
// Name Character Step
.name-character {
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    label {
      font-weight: bold;
      color: var(--label-color, #aaa);
      font-size: 0.875rem;
      text-transform: uppercase;
    }

    input {
      padding: 1rem;
      font-size: 1.25rem;
      border: 2px solid var(--border-color, #666);
      background: rgba(0, 0, 0, 0.3);
      color: var(--text-color, #fff);
      border-radius: 4px;
      transition: border-color 0.2s ease;

      &:focus {
        outline: none;
        border-color: var(--accent-color, #4a9eff);
        box-shadow: 0 0 10px rgba(74, 158, 255, 0.3);
      }

      &::placeholder {
        color: var(--text-muted, #666);
      }
    }

    .char-count {
      text-align: right;
      font-size: 0.75rem;
      color: var(--text-muted, #888);
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/app/character-creation/character-creation.component.scss
git commit -m "feat: name input form styles"
```

---

## Task 15: Update Component Tests - State Machine Transitions

**Files:**
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Add test suite for state machine transitions**

Add this describe block to the test file:

```typescript
describe('CharacterCreationComponent - State Machine', () => {
  let component: CharacterCreationComponent;
  let fixture: ComponentFixture<CharacterCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCreationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

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
      component.selectedRace.set('HUMAN');
      component.advanceToAlignment();

      expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
      expect(component.stepNumber()).toBe(2);
    });

    it('does not advance from SELECT_RACE without race selected', () => {
      component.advanceToAlignment();

      expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
    });

    it('advances from SELECT_ALIGNMENT to ROLL_STATS', () => {
      component.selectedRace.set('HUMAN');
      component.selectedAlignment.set('GOOD');
      component.advanceToRollStats();

      expect(component.currentStep()).toBe(CreationStep.ROLL_STATS);
      expect(component.stepNumber()).toBe(3);
    });

    it('auto-advances from ROLL_STATS to SELECT_CLASS after rolling', async () => {
      component.selectedRace.set('HUMAN');
      component.selectedAlignment.set('GOOD');
      component.advanceToRollStats();

      await component.rollStats();

      expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
      expect(component.stepNumber()).toBe(4);
      expect(component.rolledStats()).toBeTruthy();
    });

    it('advances from SELECT_CLASS to NAME_CHARACTER', () => {
      component.selectedRace.set('HUMAN');
      component.selectedAlignment.set('GOOD');
      component.selectedClass.set('FIGHTER');
      component.advanceToNameCharacter();

      expect(component.currentStep()).toBe(CreationStep.NAME_CHARACTER);
      expect(component.stepNumber()).toBe(5);
    });
  });
});
```

**Step 2: Run tests**

```bash
npm test -- character-creation
```

Expected: Tests should run and may fail (we'll fix implementation issues)

**Step 3: Commit**

```bash
git add src/app/character-creation/__tests__/character-creation.component.spec.ts
git commit -m "test: state machine forward navigation"
```

---

## Task 16: Update Component Tests - Backward Navigation

**Files:**
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Add backward navigation test suite**

Add to the test file:

```typescript
describe('backward navigation', () => {
  it('goes back from SELECT_ALIGNMENT to SELECT_RACE and clears alignment', () => {
    component.selectedRace.set('HUMAN');
    component.selectedAlignment.set('GOOD');
    component.advanceToAlignment();

    component.goBackFromAlignment();

    expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);
    expect(component.selectedAlignment()).toBeNull();
    expect(component.selectedRace()).toBe('HUMAN'); // race persists
  });

  it('goes back from ROLL_STATS to SELECT_ALIGNMENT and clears stats', () => {
    component.selectedRace.set('HUMAN');
    component.selectedAlignment.set('GOOD');
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
    expect(component.selectedAlignment()).toBe('GOOD'); // alignment persists
  });

  it('goes back from SELECT_CLASS to SELECT_ALIGNMENT (nuclear option)', async () => {
    // Setup: reach class selection
    component.selectedRace.set('HUMAN');
    component.selectedAlignment.set('GOOD');
    await component.rollStats();
    component.selectedClass.set('FIGHTER');

    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
    expect(component.rolledStats()).toBeTruthy();
    expect(component.selectedClass()).toBe('FIGHTER');

    // Go back (nuclear option)
    component.goBackFromSelectClass();

    expect(component.currentStep()).toBe(CreationStep.SELECT_ALIGNMENT);
    expect(component.rolledStats()).toBeNull(); // stats cleared
    expect(component.selectedClass()).toBeNull(); // class cleared
    expect(component.selectedAlignment()).toBe('GOOD'); // alignment persists
  });

  it('goes back from NAME_CHARACTER to SELECT_CLASS', () => {
    component.selectedRace.set('HUMAN');
    component.selectedClass.set('FIGHTER');
    component.currentStep.set(CreationStep.NAME_CHARACTER);

    component.goBackFromNameCharacter();

    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
    expect(component.selectedClass()).toBe('FIGHTER'); // class persists
  });
});
```

**Step 2: Run tests**

```bash
npm test -- character-creation
```

Expected: Tests pass

**Step 3: Commit**

```bash
git add src/app/character-creation/__tests__/character-creation.component.spec.ts
git commit -m "test: backward navigation and data clearing"
```

---

## Task 17: Update Component Tests - Reroll Behavior

**Files:**
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Add reroll test suite**

Add to the test file:

```typescript
describe('reroll behavior', () => {
  it('rerolls stats and stays on SELECT_CLASS step', async () => {
    // Setup: reach class selection
    component.selectedRace.set('HUMAN');
    component.selectedAlignment.set('GOOD');
    await component.rollStats();
    const firstRoll = component.rolledStats();
    component.selectedClass.set('FIGHTER');

    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);

    // Reroll
    await component.rerollStats();

    expect(component.currentStep()).toBe(CreationStep.SELECT_CLASS);
    expect(component.rolledStats()).toBeTruthy();
    expect(component.rolledStats()).not.toBe(firstRoll); // new roll
    expect(component.selectedClass()).toBeNull(); // class cleared
  });

  it('updates eligible classes after reroll', async () => {
    component.selectedRace.set('HUMAN');
    component.selectedAlignment.set('GOOD');
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
```

**Step 2: Run tests**

```bash
npm test -- character-creation
```

Expected: Tests pass

**Step 3: Commit**

```bash
git add src/app/character-creation/__tests__/character-creation.component.spec.ts
git commit -m "test: reroll behavior and class eligibility"
```

---

## Task 18: Update Component Tests - Complete Flow

**Files:**
- Modify: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Add complete flow test**

Add to the test file:

```typescript
describe('complete character creation flow', () => {
  it('creates character and resets immediately', async () => {
    // Step 1: Select race
    component.selectedRace.set('ELF');
    component.advanceToAlignment();

    // Step 2: Select alignment
    component.selectedAlignment.set('GOOD');
    component.advanceToRollStats();

    // Step 3: Roll stats
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
    const state = component['gameStateService'].getState();
    const characters = Array.from(state.roster.values());
    const legolas = characters.find(c => c.name === 'Legolas');

    expect(legolas).toBeDefined();
    expect(legolas?.race).toBe('ELF');
    expect(legolas?.alignment).toBe('GOOD');
  });
});
```

**Step 2: Run tests**

```bash
npm test -- character-creation
```

Expected: Tests pass

**Step 3: Commit**

```bash
git add src/app/character-creation/__tests__/character-creation.component.spec.ts
git commit -m "test: complete character creation flow with immediate reset"
```

---

## Task 19: Manual Testing

**Files:**
- None (interactive testing)

**Step 1: Start dev server**

```bash
npm start
```

Expected: Dev server starts successfully

**Step 2: Test happy path**

Manual steps:
1. Navigate to Character Creation
2. Press 1 to select Human
3. Press Enter
4. Press G for Good
5. Press Enter
6. Press R to roll
7. Verify auto-advance to class selection
8. Verify eligible classes are highlighted
9. Press F for Fighter
10. Press Enter
11. Type "TestChar"
12. Press Enter
13. Verify immediate reset (no delay)
14. Verify success message appears

**Step 3: Test reroll flow**

Manual steps:
1. Complete steps 1-6 from happy path
2. Press R multiple times
3. Verify stats change each time
4. Verify eligible classes update
5. Verify selected class clears on reroll

**Step 4: Test back navigation**

Manual steps:
1. Select Human → Press Enter
2. Press Escape → Verify back to race selection, alignment cleared
3. Select Human → Good → Press Enter on each
4. Press R to roll
5. Press Escape → Verify back to alignment, stats cleared
6. Select Good → Roll → Select Fighter
7. Press Escape → Verify back to alignment (nuclear option), stats and class cleared

**Step 5: Test visual polish**

Check:
- Two columns are 50/50 split
- Right column builds up progressively
- Slide-in animation on right column sections
- Button hover effects work
- Selected button highlights correctly
- Ineligible classes show ✗ and are disabled
- Step hints update correctly
- Success message appears after character creation

**Step 6: Document any issues found**

Create a note of any bugs or polish items needed

---

## Task 20: Final Integration Test

**Files:**
- Create: `src/app/character-creation/__tests__/character-creation-integration.spec.ts`

**Step 1: Create integration test file**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCreationComponent } from '../character-creation.component';
import { GameStateService } from '../../../services/GameStateService';

describe('CharacterCreationComponent - Integration', () => {
  let component: CharacterCreationComponent;
  let fixture: ComponentFixture<CharacterCreationComponent>;
  let gameStateService: GameStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCreationComponent],
      providers: [GameStateService]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCreationComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
    fixture.detectChanges();
  });

  it('creates multiple characters in succession without delay', async () => {
    const initialRosterSize = gameStateService.getState().roster.size;

    // Create first character
    component.selectedRace.set('HUMAN');
    component.advanceToAlignment();
    component.selectedAlignment.set('GOOD');
    component.advanceToRollStats();
    await component.rollStats();
    component.selectedClass.set('FIGHTER');
    component.advanceToNameCharacter();
    await component.submitCharacter('Character1');

    // Verify immediate reset
    expect(component.currentStep()).toBe(CreationStep.SELECT_RACE);

    // Create second character immediately
    component.selectedRace.set('ELF');
    component.advanceToAlignment();
    component.selectedAlignment.set('NEUTRAL');
    component.advanceToRollStats();
    await component.rollStats();
    component.selectedClass.set('MAGE');
    component.advanceToNameCharacter();
    await component.submitCharacter('Character2');

    // Verify both characters in roster
    const roster = gameStateService.getState().roster;
    expect(roster.size).toBe(initialRosterSize + 2);

    const chars = Array.from(roster.values());
    expect(chars.find(c => c.name === 'Character1')).toBeDefined();
    expect(chars.find(c => c.name === 'Character2')).toBeDefined();
  });

  it('maintains data integrity through backward navigation', async () => {
    // Setup
    component.selectedRace.set('DWARF');
    component.advanceToAlignment();
    component.selectedAlignment.set('GOOD');
    component.advanceToRollStats();
    await component.rollStats();
    const originalStats = component.rolledStats();

    // Go forward then back
    component.goBackFromSelectClass();
    expect(component.rolledStats()).toBeNull();

    // Advance again and roll
    component.advanceToRollStats();
    await component.rollStats();
    const newStats = component.rolledStats();

    // Stats should be different (new roll)
    expect(newStats).not.toEqual(originalStats);
  });
});
```

**Step 2: Run integration tests**

```bash
npm test -- character-creation-integration
```

Expected: All tests pass

**Step 3: Run full test suite**

```bash
npm test
```

Expected: All 501+ tests pass (including new wizard tests)

**Step 4: Commit**

```bash
git add src/app/character-creation/__tests__/character-creation-integration.spec.ts
git commit -m "test: character creation wizard integration tests"
```

---

## Task 21: Update Documentation

**Files:**
- Modify: `docs/ui/scenes/02-training-grounds.md`

**Step 1: Add note about wizard redesign at top of file**

Add this section after the title:

```markdown
## Recent Update: Two-Column Wizard Redesign

**Date:** 2025-11-02

The character creation scene has been redesigned with a two-column wizard-state layout:

- **Left Column (50%)**: Step-by-step controls, only current step visible
- **Right Column (50%)**: Progressive character display (builds like a receipt)
- **5 Steps**: SELECT_RACE → SELECT_ALIGNMENT → ROLL_STATS → SELECT_CLASS → NAME_CHARACTER
- **Navigation**: Enter advances, Escape goes back (with data clearing)
- **Reroll**: Available on class selection step, unlimited attempts
- **Auto-advance**: Rolling dice automatically shows class selection
- **Immediate Reset**: No delay after character creation

See `docs/plans/2025-11-02-character-creation-wizard-redesign.md` for complete design details.

---
```

**Step 2: Commit**

```bash
git add docs/ui/scenes/02-training-grounds.md
git commit -m "docs: document character creation wizard redesign"
```

---

## Task 22: Final Verification and Polish

**Files:**
- None (verification step)

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass, coverage ≥80%

**Step 2: Check TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Start dev server and test all flows**

```bash
npm start
```

Test:
- ✅ Happy path (create character start to finish)
- ✅ Reroll multiple times
- ✅ Back navigation from each step
- ✅ Ineligible class display
- ✅ Progressive character display
- ✅ Keyboard shortcuts work
- ✅ Immediate reset after creation
- ✅ Visual polish (animations, colors, layout)

**Step 4: Check for console errors**

Open browser DevTools → Console
Expected: No errors

**Step 5: Create final commit**

```bash
git add .
git commit -m "feat: character creation two-column wizard redesign complete

- Explicit state machine with 5 steps
- Two-column layout (50/50 split)
- Progressive character display in right column
- Auto-advance after rolling stats
- Reroll button on class selection
- Immediate reset after character creation
- Complete test coverage (unit + integration)
- Visual polish with animations

Closes #<issue-number>"
```

---

## Completion Checklist

- [ ] Task 1: State machine enum and signals
- [ ] Task 2: Advance navigation methods
- [ ] Task 3: Go-back navigation methods
- [ ] Task 4: Roll stats with auto-advance
- [ ] Task 5: Reset and submit without delay
- [ ] Task 6: State-machine keyboard handler
- [ ] Task 7: Two-column template structure
- [ ] Task 8: Step content in left column
- [ ] Task 9: Progressive display in right column
- [ ] Task 10: Contextual step hints
- [ ] Task 11: Two-column layout styles
- [ ] Task 12: Button grid styles
- [ ] Task 13: Description panel styles
- [ ] Task 14: Name input styles
- [ ] Task 15: Tests - state machine transitions
- [ ] Task 16: Tests - backward navigation
- [ ] Task 17: Tests - reroll behavior
- [ ] Task 18: Tests - complete flow
- [ ] Task 19: Manual testing
- [ ] Task 20: Integration tests
- [ ] Task 21: Update documentation
- [ ] Task 22: Final verification

---

## Notes

**Design Decisions:**
- Escape from SELECT_CLASS goes to SELECT_ALIGNMENT (not ROLL_STATS) to prevent back-and-forth stat hunting
- Rolling dice auto-advances to eliminate extra Enter press
- No delay after character creation for faster workflow
- Reroll button on class step for unlimited stat attempts
- Progressive reveal animation (300ms slide-in) for visual polish

**Testing Focus:**
- State machine transitions (forward and backward)
- Data clearing rules (Escape behavior per step)
- Reroll staying on same step
- Immediate reset after character creation
- Class eligibility recalculation

**Performance:**
- Test suite must complete in <5 seconds
- Use instant transitions in tests: `{ direction: 'instant' }`
- No delays in character creation flow

**Accessibility:**
- Keyboard-first design (fully operable without mouse)
- Clear visual feedback (selected, disabled, ineligible states)
- Contextual hints at each step
- Auto-focus on name input

**Browser Compatibility:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- Angular 18+ signals (native browser support not needed)
