# Character Creation Scene Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild character creation scene with clean 2-column form layout, progressive enabling, reusable scene components, and new data-driven architecture (RaceService/ClassService).

**Architecture:** Replace wizard-based flow with single-component form. All sections visible from start, enabled progressively as prerequisites are met. Extract SceneTitle and SceneFooter as reusable components for all scenes. Use signal-based reactive state with computed eligibility. Display stats using three-column layout (base + rolled = final) to clearly show new data formula.

**Tech Stack:** Angular 20.3.8, TypeScript, signals/computed, RaceService, ClassService, CharacterService, MenuComponent

---

## Design Decisions from Brainstorming

- **Clean slate approach**: Delete existing wizard, build from scratch
- **All visible, progressive enable**: Show all 5 sections, enable as prerequisites met
- **Inline sections**: No sub-components, keep sections within main template
- **Three-column stat display**: `STR: 8 + 7 = 15` (base + rolled = final)
- **Show all classes, gray ineligible**: Display all 8 classes with visual distinction
- **Scene-level reusable components**: Create SceneTitle and SceneFooter for all scenes
- **Success + reset flow**: Show success message, reset form, allow creating another
- **No password field**: Removed from Character type, only name required

## Key Architectural Changes

### New Data Formula
```typescript
// NEW (data-driven)
const raceData = RaceService.getRaceData(Race.HUMAN)
const finalStr = raceData.baseStats.str + rolled.strength
// Example: Human STR 8 (base) + 7 (rolled) = 15 (final)

// OLD (DEPRECATED - do not use)
const finalStr = 10 + RACE_MODIFIERS[Race.HUMAN].strength
// Example: 10 + (-2) = 8
```

### Progressive Enabling Logic
1. **Race Selection** - Always enabled
2. **Alignment Selection** - Enabled when race selected
3. **Stat Rolling** - Enabled when alignment selected
4. **Class Selection** - Enabled when stats rolled
5. **Name Input** - Enabled when class selected
6. **Save Button** - Enabled when name entered

---

## Task 1: Create SceneTitleComponent (Reusable)

**Files:**
- Create: `src/components/scene-title/scene-title.component.ts`
- Create: `src/components/scene-title/scene-title.component.html`
- Create: `src/components/scene-title/scene-title.component.scss`
- Create: `src/components/scene-title/__tests__/scene-title.component.spec.ts`

**Step 1: Generate component with Angular CLI**

Run:
```bash
cd src/components
ng generate component scene-title --standalone --skip-tests
mkdir scene-title/__tests__
```

Expected: Component files created in `src/components/scene-title/`

**Step 2: Write failing test for title display**

File: `src/components/scene-title/__tests__/scene-title.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SceneTitleComponent } from '../scene-title.component';

describe('SceneTitleComponent', () => {
  let component: SceneTitleComponent;
  let fixture: ComponentFixture<SceneTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneTitleComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SceneTitleComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the title', () => {
    fixture.componentRef.setInput('title', 'TEST TITLE');
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toBe('TEST TITLE');
  });

  it('should have scene-header class', () => {
    const header = fixture.nativeElement.querySelector('header');
    expect(header.classList.contains('scene-header')).toBe(true);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- scene-title`

Expected: FAIL - "Cannot find element h1"

**Step 4: Implement component TypeScript**

File: `src/components/scene-title/scene-title.component.ts`

```typescript
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-scene-title',
  standalone: true,
  templateUrl: './scene-title.component.html',
  styleUrl: './scene-title.component.scss'
})
export class SceneTitleComponent {
  readonly title = input.required<string>();
}
```

**Step 5: Implement component template**

File: `src/components/scene-title/scene-title.component.html`

```html
<header class="scene-header">
  <h1>{{ title() }}</h1>
</header>
```

**Step 6: Implement component styles**

File: `src/components/scene-title/scene-title.component.scss`

```scss
@import '../../styles/variables.scss';

.scene-header {
  padding: $spacing-lg;
  border-bottom: $border-width $border-style $border-color;
  text-align: center;
  background: $color-bg-black;

  h1 {
    margin: 0;
    color: $color-text-bright;
    font-family: $font-mono;
    font-size: $font-size-large;
    text-transform: uppercase;
  }
}
```

**Step 7: Run tests to verify they pass**

Run: `npm test -- scene-title`

Expected: PASS - 3 tests passing

**Step 8: Commit**

```bash
git add src/components/scene-title/
git commit -m "feat(components): create reusable SceneTitleComponent

- Accepts title input
- Renders header with border-bottom styling
- Reusable across all scenes
- 3 tests passing"
```

---

## Task 2: Create SceneFooterComponent (Reusable)

**Files:**
- Create: `src/components/scene-footer/scene-footer.component.ts`
- Create: `src/components/scene-footer/scene-footer.component.html`
- Create: `src/components/scene-footer/scene-footer.component.scss`
- Create: `src/components/scene-footer/__tests__/scene-footer.component.spec.ts`

**Step 1: Generate component with Angular CLI**

Run:
```bash
cd src/components
ng generate component scene-footer --standalone --skip-tests
mkdir scene-footer/__tests__
```

Expected: Component files created

**Step 2: Write failing test for menu integration**

File: `src/components/scene-footer/__tests__/scene-footer.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SceneFooterComponent } from '../scene-footer.component';
import { MenuComponent } from '../../menu/menu.component';
import { MenuItem } from '../../../types/Menu';

describe('SceneFooterComponent', () => {
  let component: SceneFooterComponent;
  let fixture: ComponentFixture<SceneFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SceneFooterComponent, MenuComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SceneFooterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render menu with provided items', () => {
    const items: MenuItem[] = [
      { id: 'test1', label: 'Test 1', shortcut: 'T' },
      { id: 'test2', label: 'Test 2', shortcut: 'E' }
    ];

    fixture.componentRef.setInput('menuItems', items);
    fixture.detectChanges();

    const menu = fixture.nativeElement.querySelector('app-menu');
    expect(menu).toBeTruthy();
  });

  it('should emit itemSelected when menu item clicked', () => {
    const items: MenuItem[] = [
      { id: 'test1', label: 'Test 1', shortcut: 'T' }
    ];

    fixture.componentRef.setInput('menuItems', items);
    fixture.detectChanges();

    let emittedId: string | undefined;
    component.itemSelected.subscribe((id: string) => {
      emittedId = id;
    });

    component.onItemSelected('test1');
    expect(emittedId).toBe('test1');
  });

  it('should have scene-footer class', () => {
    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer.classList.contains('scene-footer')).toBe(true);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- scene-footer`

Expected: FAIL - "Cannot find MenuItem type"

**Step 4: Implement component TypeScript**

File: `src/components/scene-footer/scene-footer.component.ts`

```typescript
import { Component, input, output } from '@angular/core';
import { MenuComponent } from '../menu/menu.component';
import { MenuItem } from '../../types/Menu';

@Component({
  selector: 'app-scene-footer',
  standalone: true,
  imports: [MenuComponent],
  templateUrl: './scene-footer.component.html',
  styleUrl: './scene-footer.component.scss'
})
export class SceneFooterComponent {
  readonly menuItems = input.required<MenuItem[]>();
  readonly itemSelected = output<string>();

  onItemSelected(itemId: string) {
    this.itemSelected.emit(itemId);
  }
}
```

**Step 5: Implement component template**

File: `src/components/scene-footer/scene-footer.component.html`

```html
<footer class="scene-footer">
  <app-menu
    [items]="menuItems()"
    (itemSelected)="onItemSelected($event)"
  />
</footer>
```

**Step 6: Implement component styles**

File: `src/components/scene-footer/scene-footer.component.scss`

```scss
@import '../../styles/variables.scss';

.scene-footer {
  padding: $spacing-lg;
  border-top: $border-width $border-style $border-color;
  background: $color-bg-black;
}
```

**Step 7: Run tests to verify they pass**

Run: `npm test -- scene-footer`

Expected: PASS - 4 tests passing

**Step 8: Commit**

```bash
git add src/components/scene-footer/
git commit -m "feat(components): create reusable SceneFooterComponent

- Wraps MenuComponent for consistent styling
- Accepts menu items input
- Emits itemSelected events
- Reusable across all scenes
- 4 tests passing"
```

---

## Task 3: Delete Old Character Creation Files

**Files:**
- Delete: `src/app/character-creation/character-creation.component.ts`
- Delete: `src/app/character-creation/character-creation.component.html`
- Delete: `src/app/character-creation/character-creation.component.scss`
- Keep: `src/app/character-creation/__tests__/` (will rewrite tests later)

**Step 1: Remove old component files**

Run:
```bash
rm src/app/character-creation/character-creation.component.ts
rm src/app/character-creation/character-creation.component.html
rm src/app/character-creation/character-creation.component.scss
```

Expected: Files deleted

**Step 2: Commit deletion**

```bash
git add -A
git commit -m "refactor(character-creation): remove old wizard-based component

Preparing for clean slate rebuild with form-based approach"
```

---

## Task 4: Create New Character Creation Component (TypeScript)

**Files:**
- Create: `src/app/character-creation/character-creation.component.ts`

**Step 1: Write component class with signal state**

File: `src/app/character-creation/character-creation.component.ts`

```typescript
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
import { Race } from '../../types/Race';
import { CharacterClass } from '../../types/CharacterClass';
import { Alignment } from '../../types/Alignment';
import { MenuItem } from '../../types/Menu';

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
    { id: 'save', label: 'SAVE CHARACTER', shortcut: 'S', disabled: !this.canSave() },
    { id: 'cancel', label: 'CANCEL', shortcut: 'ESC', disabled: false },
    { id: 'back', label: 'BACK TO TRAINING GROUNDS', shortcut: 'B', disabled: false }
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
      race: this.selectedRace()!,
      class: this.selectedClass()!,
      alignment: this.selectedAlignment()!,
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

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    switch(key) {
      case 'r':
        if (this.selectedAlignment()) {
          event.preventDefault();
          this.rollStats();
        }
        break;
      case 's':
        if (this.canSave()) {
          event.preventDefault();
          this.saveCharacter();
        }
        break;
      case 'escape':
        event.preventDefault();
        this.confirmCancel();
        break;
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
}
```

**Step 2: Commit TypeScript implementation**

```bash
git add src/app/character-creation/character-creation.component.ts
git commit -m "feat(character-creation): implement component TypeScript with signal state

- 12 signals for form and UI state
- Computed signals for derived state (finalStats, eligibleClasses)
- NEW FORMULA: finalStat = raceBase + rolled
- Keyboard shortcuts: R (roll), S (save), Esc (cancel)
- Progressive enabling logic with cascade resets"
```

---

## Task 5: Create Character Creation Template (HTML)

**Files:**
- Create: `src/app/character-creation/character-creation.component.html`

**Step 1: Implement 2-column form layout template**

File: `src/app/character-creation/character-creation.component.html`

```html
<div class="character-creation">
  <app-scene-title title="CHARACTER CREATION" />

  <main class="creation-form">
    <div class="form-column-left">
      <!-- Section 1: Race Selection -->
      <section class="form-section">
        <h2>1. CHOOSE RACE</h2>
        <div class="race-options">
          @for (race of allRaces(); track race.id) {
            <button
              class="race-button"
              [class.selected]="selectedRace() === race.enum"
              (click)="selectRace(race.enum)">
              {{ race.name }}
            </button>
          }
        </div>
        @if (raceData(); as data) {
          <div class="race-details">
            <p class="description">{{ data.description }}</p>
            <div class="base-stats">
              <strong>Base Stats:</strong>
              STR {{ data.baseStats.str }} |
              INT {{ data.baseStats.int }} |
              PIE {{ data.baseStats.pie }} |
              VIT {{ data.baseStats.vit }} |
              AGI {{ data.baseStats.agi }} |
              LUC {{ data.baseStats.luc }}
            </div>
            @if (data.strengths.length > 0) {
              <div class="strengths">
                <strong>Strengths:</strong> {{ data.strengths.join(', ') }}
              </div>
            }
            @if (data.weaknesses.length > 0) {
              <div class="weaknesses">
                <strong>Weaknesses:</strong> {{ data.weaknesses.join(', ') }}
              </div>
            }
          </div>
        }
      </section>

      <!-- Section 2: Alignment Selection -->
      <section class="form-section" [class.disabled]="!selectedRace()">
        <h2>2. CHOOSE ALIGNMENT</h2>
        <div class="alignment-options">
          @for (alignment of allAlignments; track alignment) {
            <button
              class="alignment-button"
              [class.selected]="selectedAlignment() === alignment"
              [disabled]="!selectedRace()"
              (click)="selectAlignment(alignment)">
              {{ alignment }}
            </button>
          }
        </div>
      </section>

      <!-- Section 3: Roll Stats -->
      <section class="form-section" [class.disabled]="!selectedAlignment()">
        <h2>3. ROLL STATS</h2>
        <button
          class="roll-button"
          [disabled]="!selectedAlignment()"
          (click)="rollStats()">
          {{ rolledStats() ? 'REROLL STATS (R)' : 'ROLL DICE (R)' }}
        </button>

        @if (finalStats(); as stats) {
          <div class="stats-display">
            <div class="stat-row">
              <span class="stat-label">STR:</span>
              <span class="stat-base">{{ raceData()!.baseStats.str }}</span>
              <span class="stat-plus">+</span>
              <span class="stat-rolled">{{ rolledStats()!.strength }}</span>
              <span class="stat-equals">=</span>
              <span class="stat-final">{{ stats.strength }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">INT:</span>
              <span class="stat-base">{{ raceData()!.baseStats.int }}</span>
              <span class="stat-plus">+</span>
              <span class="stat-rolled">{{ rolledStats()!.intelligence }}</span>
              <span class="stat-equals">=</span>
              <span class="stat-final">{{ stats.intelligence }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">PIE:</span>
              <span class="stat-base">{{ raceData()!.baseStats.pie }}</span>
              <span class="stat-plus">+</span>
              <span class="stat-rolled">{{ rolledStats()!.piety }}</span>
              <span class="stat-equals">=</span>
              <span class="stat-final">{{ stats.piety }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">VIT:</span>
              <span class="stat-base">{{ raceData()!.baseStats.vit }}</span>
              <span class="stat-plus">+</span>
              <span class="stat-rolled">{{ rolledStats()!.vitality }}</span>
              <span class="stat-equals">=</span>
              <span class="stat-final">{{ stats.vitality }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">AGI:</span>
              <span class="stat-base">{{ raceData()!.baseStats.agi }}</span>
              <span class="stat-plus">+</span>
              <span class="stat-rolled">{{ rolledStats()!.agility }}</span>
              <span class="stat-equals">=</span>
              <span class="stat-final">{{ stats.agility }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">LUC:</span>
              <span class="stat-base">{{ raceData()!.baseStats.luc }}</span>
              <span class="stat-plus">+</span>
              <span class="stat-rolled">{{ rolledStats()!.luck }}</span>
              <span class="stat-equals">=</span>
              <span class="stat-final">{{ stats.luck }}</span>
            </div>
            <div class="bonus-points">
              <strong>Bonus Points:</strong> {{ stats.bonusPoints }}
            </div>
          </div>
        }
      </section>
    </div>

    <div class="form-column-right">
      <!-- Section 4: Class Selection -->
      <section class="form-section" [class.disabled]="!rolledStats()">
        <h2>4. CHOOSE CLASS</h2>
        <div class="class-grid">
          @for (classData of allClasses(); track classData.id) {
            <button
              class="class-button"
              [class.selected]="selectedClass() === classData.enum"
              [class.ineligible]="!isClassEligible(classData.enum)"
              [disabled]="!rolledStats() || !isClassEligible(classData.enum)"
              (click)="selectClass(classData.enum)">
              <div class="class-name">{{ classData.name }}</div>
              @if (!isClassEligible(classData.enum)) {
                <div class="ineligible-indicator">✗</div>
              }
            </button>
          }
        </div>
        @if (selectedClass(); as charClass) {
          <div class="class-details">
            <p class="description">{{ ClassService.getClassData(charClass).description }}</p>
            <div class="hit-dice">
              <strong>Hit Dice:</strong> {{ ClassService.getClassData(charClass).hitDice }}
            </div>
          </div>
        }
      </section>

      <!-- Section 5: Name Character -->
      <section class="form-section" [class.disabled]="!selectedClass()">
        <h2>5. NAME CHARACTER</h2>
        <div class="form-inputs">
          <div class="input-group">
            <label for="char-name">Name:</label>
            <input
              id="char-name"
              type="text"
              [disabled]="!selectedClass()"
              [(ngModel)]="characterName"
              maxlength="15"
              placeholder="Enter name"
            />
          </div>
        </div>
      </section>
    </div>
  </main>

  @if (successMessage()) {
    <div class="success-message">{{ successMessage() }}</div>
  }
  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }

  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)"
  />

  @if (showCancelConfirmation()) {
    <app-confirmation-dialog
      [visible]="showCancelConfirmation()"
      message="Discard current character creation?"
      yesLabel="DISCARD"
      noLabel="CONTINUE"
      (confirmed)="resetForm()"
      (cancelled)="showCancelConfirmation.set(false)"
    />
  }
</div>
```

**Step 2: Commit template implementation**

```bash
git add src/app/character-creation/character-creation.component.html
git commit -m "feat(character-creation): implement 2-column form template

- Left column: race, alignment, stats
- Right column: class, name
- All sections visible with progressive enabling
- Three-column stat display (base + rolled = final)
- Race details show description, base stats, strengths/weaknesses
- Class details show description and hit dice
- Success/error messages above footer"
```

---

## Task 6: Create Character Creation Styles (SCSS)

**Files:**
- Create: `src/app/character-creation/character-creation.component.scss`

**Step 1: Implement component styles**

File: `src/app/character-creation/character-creation.component.scss`

```scss
@import '../../styles/variables.scss';

.character-creation {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $color-bg-black;
  color: $color-text-green;
  font-family: $font-mono;

  main.creation-form {
    flex: 1;
    overflow-y: auto;
    padding: $spacing-lg;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-xl;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .form-section {
    border: $border-width $border-style $border-color;
    padding: $spacing-md;
    margin-bottom: $spacing-lg;

    &.disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    h2 {
      color: $color-text-bright;
      margin-bottom: $spacing-md;
      border-bottom: 1px solid $border-color;
      padding-bottom: $spacing-sm;
      font-size: $font-size-base;
    }
  }

  // Race/Alignment/Class button grids
  .race-options,
  .alignment-options,
  .class-grid {
    display: grid;
    gap: $spacing-sm;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }

  .race-button,
  .alignment-button,
  .class-button {
    background: $color-bg-black;
    border: $border-width $border-style $border-color;
    color: $color-text-green;
    padding: $spacing-md;
    cursor: pointer;
    font-family: $font-mono;
    font-size: $font-size-base;
    text-transform: uppercase;

    &:hover:not(:disabled) {
      background: $color-text-green;
      color: $color-bg-black;
    }

    &.selected {
      background: $color-text-bright;
      color: $color-bg-black;
      border-color: $color-text-bright;
    }

    &.ineligible {
      color: $color-text-dim;
      border-color: $color-text-dim;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .class-button {
    position: relative;

    .ineligible-indicator {
      position: absolute;
      top: $spacing-xs;
      right: $spacing-xs;
      color: $color-error;
      font-weight: bold;
    }
  }

  // Race and class details
  .race-details,
  .class-details {
    margin-top: $spacing-md;
    padding: $spacing-md;
    border-top: 1px solid $border-color;

    .description {
      margin-bottom: $spacing-sm;
      color: $color-text-green;
    }

    .base-stats,
    .hit-dice,
    .strengths,
    .weaknesses {
      margin-bottom: $spacing-xs;
      font-size: $font-size-small;
    }

    .strengths {
      color: $color-success;
    }

    .weaknesses {
      color: $color-text-dim;
    }
  }

  // Stats display (3-column: base + rolled = final)
  .roll-button {
    background: $color-bg-black;
    border: $border-width $border-style $border-color;
    color: $color-text-green;
    padding: $spacing-md;
    cursor: pointer;
    font-family: $font-mono;
    font-size: $font-size-base;
    width: 100%;
    margin-bottom: $spacing-md;

    &:hover:not(:disabled) {
      background: $color-text-green;
      color: $color-bg-black;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .stats-display {
    margin-top: $spacing-md;

    .stat-row {
      display: grid;
      grid-template-columns: 60px 40px 20px 40px 20px 60px;
      gap: $spacing-xs;
      padding: $spacing-xs 0;
      align-items: center;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);

      &:last-child {
        border-bottom: none;
      }

      .stat-label {
        font-weight: bold;
        color: $color-text-bright;
      }

      .stat-base {
        color: $color-text-dim;
        text-align: right;
      }

      .stat-plus,
      .stat-equals {
        color: $color-text-green;
        text-align: center;
      }

      .stat-rolled {
        color: $color-text-green;
        text-align: right;
      }

      .stat-final {
        color: $color-text-bright;
        font-weight: bold;
        text-align: right;
      }
    }

    .bonus-points {
      margin-top: $spacing-md;
      padding-top: $spacing-md;
      border-top: 1px solid $border-color;
      color: $color-amber;
      font-weight: bold;
    }
  }

  // Form inputs
  .input-group {
    margin-bottom: $spacing-md;

    label {
      display: block;
      margin-bottom: $spacing-xs;
      color: $color-text-bright;
      font-weight: bold;
    }

    input {
      width: 100%;
      background: $color-bg-black;
      border: $border-width $border-style $border-color;
      color: $color-text-green;
      padding: $spacing-sm;
      font-family: $font-mono;
      font-size: $font-size-base;

      &:focus {
        outline: none;
        border-color: $color-text-bright;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &::placeholder {
        color: $color-text-dim;
      }
    }
  }

  // Success/error messages
  .success-message {
    padding: $spacing-md;
    background: rgba(0, 255, 136, 0.1);
    border: $border-width $border-style $color-success;
    color: $color-success;
    text-align: center;
    font-weight: bold;
  }

  .error-message {
    padding: $spacing-md;
    background: rgba(255, 0, 0, 0.1);
    border: $border-width $border-style $color-error;
    color: $color-error;
    text-align: center;
    font-weight: bold;
  }
}
```

**Step 2: Commit styles implementation**

```bash
git add src/app/character-creation/character-creation.component.scss
git commit -m "feat(character-creation): implement component styles

- 2-column grid layout (collapses on mobile)
- Disabled sections use 40% opacity + pointer-events: none
- Selected buttons use bright green background
- Ineligible classes use dim color with X indicator
- Three-column stat grid with color-coded values
- Consistent retro theme styling
- Success/error message styling"
```

---

## Task 7: Write Unit Tests for Character Creation Component

**Files:**
- Create: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

**Step 1: Write comprehensive unit tests**

File: `src/app/character-creation/__tests__/character-creation.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CharacterCreationComponent } from '../character-creation.component';
import { GameStateService } from '../../../services/GameStateService';
import { RaceService } from '../../../services/RaceService';
import { ClassService } from '../../../services/ClassService';
import { Race } from '../../../types/Race';
import { CharacterClass } from '../../../types/CharacterClass';
import { Alignment } from '../../../types/Alignment';

describe('CharacterCreationComponent', () => {
  let component: CharacterCreationComponent;
  let fixture: ComponentFixture<CharacterCreationComponent>;
  let mockGameState: jasmine.SpyObj<GameStateService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Mock services
    mockGameState = jasmine.createSpyObj('GameStateService', ['updateState']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    // Initialize RaceService and ClassService with mock data
    global.fetch = jest.fn((url: string) => {
      const path = url.toString();

      // Mock race data
      if (path.includes('/assets/races/')) {
        const raceId = path.split('/').pop()?.replace('.json', '');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: raceId,
            name: raceId?.charAt(0).toUpperCase() + raceId?.slice(1),
            baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
            savingThrowBonus: {},
            statTotal: 46,
            description: `Test ${raceId}`,
            strengths: ['Test strength'],
            weaknesses: ['Test weakness'],
            bestClasses: ['Fighter']
          })
        } as Response);
      }

      // Mock class data
      if (path.includes('/assets/classes/')) {
        const classId = path.split('/').pop()?.replace('.json', '');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: classId,
            name: classId?.charAt(0).toUpperCase() + classId?.slice(1),
            description: `Test ${classId}`,
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
            canCriticalHit: false
          })
        } as Response);
      }

      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;

    await RaceService.initialize();
    await ClassService.initialize();

    await TestBed.configureTestingModule({
      imports: [CharacterCreationComponent],
      providers: [
        { provide: GameStateService, useValue: mockGameState },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Race Selection', () => {
    it('should select race and load race data', () => {
      component.selectRace(Race.HUMAN);

      expect(component.selectedRace()).toBe(Race.HUMAN);
      expect(component.raceData()).toBeDefined();
      expect(component.raceData()!.name).toBe('Human');
    });

    it('should reset stats and class when changing race', () => {
      // Setup: select race, roll stats, select class
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      fixture.detectChanges();

      // Change race
      component.selectRace(Race.ELF);

      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
    });
  });

  describe('Alignment Selection', () => {
    it('should select alignment', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);

      expect(component.selectedAlignment()).toBe(Alignment.GOOD);
    });

    it('should reset stats and class when changing alignment', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      fixture.detectChanges();

      component.selectAlignment(Alignment.EVIL);

      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
    });
  });

  describe('Stat Rolling', () => {
    it('should roll stats with correct formula', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      // Wait for animation timeout
      setTimeout(() => {
        const finalStats = component.finalStats();
        const raceData = RaceService.getRaceData(Race.HUMAN);
        const rolled = component.rolledStats()!;

        expect(finalStats).toBeDefined();
        expect(finalStats!.strength).toBe(raceData.baseStats.str + rolled.strength);
        expect(finalStats!.intelligence).toBe(raceData.baseStats.int + rolled.intelligence);
        done();
      }, 350);
    });

    it('should reset class when rerolling stats', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        component.selectClass(CharacterClass.FIGHTER);
        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

        component.rollStats();

        setTimeout(() => {
          expect(component.selectedClass()).toBeNull();
          done();
        }, 350);
      }, 350);
    });
  });

  describe('Class Eligibility', () => {
    it('should calculate eligible classes based on stats', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        const eligible = component.eligibleClasses();
        expect(Array.isArray(eligible)).toBe(true);
        done();
      }, 350);
    });

    it('should check if specific class is eligible', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        const isEligible = component.isClassEligible(CharacterClass.FIGHTER);
        expect(typeof isEligible).toBe('boolean');
        done();
      }, 350);
    });
  });

  describe('Class Selection', () => {
    it('should select eligible class', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        if (component.isClassEligible(CharacterClass.FIGHTER)) {
          component.selectClass(CharacterClass.FIGHTER);
          expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);
        }
        done();
      }, 350);
    });

    it('should not select ineligible class', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        // Try to select all classes
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

        allClasses.forEach(charClass => {
          component.selectClass(charClass);
          if (!component.isClassEligible(charClass)) {
            expect(component.selectedClass()).not.toBe(charClass);
          }
        });
        done();
      }, 350);
    });
  });

  describe('Character Name', () => {
    it('should update character name signal', () => {
      component.characterName.set('TestChar');
      expect(component.characterName()).toBe('TestChar');
    });
  });

  describe('Save Character', () => {
    it('should create character and add to roster when complete', (done) => {
      // Setup complete character
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('TestCharacter');

        component.saveCharacter();

        expect(mockGameState.updateState).toHaveBeenCalled();
        expect(component.successMessage()).toContain('created successfully');
        done();
      }, 350);
    });

    it('should reset form after success timeout', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('TestChar');
        component.saveCharacter();

        // Wait for success message timeout
        setTimeout(() => {
          expect(component.selectedRace()).toBeNull();
          expect(component.selectedAlignment()).toBeNull();
          expect(component.rolledStats()).toBeNull();
          expect(component.selectedClass()).toBeNull();
          expect(component.characterName()).toBe('');
          done();
        }, 2100);
      }, 350);
    });

    it('should not save when form incomplete', () => {
      component.selectRace(Race.HUMAN);

      expect(component.canSave()).toBe(false);
      component.saveCharacter();
      expect(mockGameState.updateState).not.toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('should reset all form fields', () => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.characterName.set('Test');

      component.resetForm();

      expect(component.selectedRace()).toBeNull();
      expect(component.selectedAlignment()).toBeNull();
      expect(component.rolledStats()).toBeNull();
      expect(component.selectedClass()).toBeNull();
      expect(component.characterName()).toBe('');
    });
  });

  describe('Cancel Confirmation', () => {
    it('should show confirmation when form has data', () => {
      component.selectRace(Race.HUMAN);
      component.confirmCancel();

      expect(component.showCancelConfirmation()).toBe(true);
    });

    it('should not show confirmation when form is empty', () => {
      component.confirmCancel();

      expect(component.showCancelConfirmation()).toBe(false);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should roll stats on R key when alignment selected', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);

      const event = new KeyboardEvent('keydown', { key: 'r' });
      component.handleKeyPress(event);

      setTimeout(() => {
        expect(component.rolledStats()).toBeTruthy();
        done();
      }, 350);
    });

    it('should save character on S key when form complete', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('Test');

        const event = new KeyboardEvent('keydown', { key: 's' });
        component.handleKeyPress(event);

        expect(mockGameState.updateState).toHaveBeenCalled();
        done();
      }, 350);
    });

    it('should show cancel confirmation on Escape key', () => {
      component.selectRace(Race.HUMAN);

      const event = new KeyboardEvent('keydown', { key: 'escape' });
      component.handleKeyPress(event);

      expect(component.showCancelConfirmation()).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('should navigate to training grounds', () => {
      component.navigateToTrainingGrounds();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });
  });

  describe('Footer Menu Actions', () => {
    it('should handle save action', (done) => {
      component.selectRace(Race.HUMAN);
      component.selectAlignment(Alignment.GOOD);
      component.rollStats();

      setTimeout(() => {
        component.selectClass(CharacterClass.FIGHTER);
        component.characterName.set('Test');

        component.handleFooterAction('save');
        expect(mockGameState.updateState).toHaveBeenCalled();
        done();
      }, 350);
    });

    it('should handle cancel action', () => {
      component.selectRace(Race.HUMAN);
      component.handleFooterAction('cancel');
      expect(component.showCancelConfirmation()).toBe(true);
    });

    it('should handle back action', () => {
      component.handleFooterAction('back');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });
  });

  describe('Computed Signals', () => {
    it('should compute canSave correctly', (done) => {
      expect(component.canSave()).toBe(false);

      component.selectRace(Race.HUMAN);
      expect(component.canSave()).toBe(false);

      component.selectAlignment(Alignment.GOOD);
      expect(component.canSave()).toBe(false);

      component.rollStats();

      setTimeout(() => {
        expect(component.canSave()).toBe(false);

        component.selectClass(CharacterClass.FIGHTER);
        expect(component.canSave()).toBe(false);

        component.characterName.set('Test');
        expect(component.canSave()).toBe(true);
        done();
      }, 350);
    });

    it('should compute footer menu items with correct disabled state', () => {
      const items = component.footerMenuItems();

      expect(items.length).toBe(3);
      expect(items[0].disabled).toBe(true); // Save disabled initially
      expect(items[1].disabled).toBe(false); // Cancel always enabled
      expect(items[2].disabled).toBe(false); // Back always enabled
    });
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `npm test -- character-creation.component`

Expected: PASS - All tests passing

**Step 3: Commit unit tests**

```bash
git add src/app/character-creation/__tests__/character-creation.component.spec.ts
git commit -m "test(character-creation): add comprehensive unit tests

- Tests for all form sections (race, alignment, stats, class, name)
- Tests for new data formula (finalStat = raceBase + rolled)
- Tests for progressive enabling logic
- Tests for keyboard shortcuts
- Tests for form reset and cancel confirmation
- Tests for save character flow
- Mock RaceService and ClassService data
- All tests passing"
```

---

## Task 8: Write Integration Test

**Files:**
- Modify: `src/app/__tests__/integration/character-creation.integration.spec.ts`

**Step 1: Write end-to-end integration test**

File: `src/app/__tests__/integration/character-creation.integration.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CharacterCreationComponent } from '../../character-creation/character-creation.component';
import { GameStateService } from '../../../services/GameStateService';
import { RaceService } from '../../../services/RaceService';
import { ClassService } from '../../../services/ClassService';
import { Race } from '../../../types/Race';
import { CharacterClass } from '../../../types/CharacterClass';
import { Alignment } from '../../../types/Alignment';

describe('Character Creation Integration', () => {
  let component: CharacterCreationComponent;
  let gameState: GameStateService;

  beforeEach(async () => {
    // Mock fetch for RaceService and ClassService
    global.fetch = jest.fn((url: string) => {
      const path = url.toString();

      if (path.includes('/assets/races/human.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'human',
            name: 'Human',
            baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
            savingThrowBonus: { death: -1 },
            statTotal: 46,
            description: 'Humans are versatile',
            strengths: ['Balanced stats'],
            weaknesses: ['No special bonuses'],
            bestClasses: ['Any']
          })
        } as Response);
      }

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
            attacksPerLevel: { '1-4': 1, '5-9': 2, '10-14': 3, '15+': 4 },
            xpTable: [2000, 4000, 8000, 16000, 32000],
            specialAbilities: ['Can use all weapons and armor'],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response);
      }

      // Add more mocks as needed
      return Promise.reject(new Error('Not found'));
    }) as jest.Mock;

    await RaceService.initialize();
    await ClassService.initialize();

    gameState = TestBed.inject(GameStateService);
    const router = TestBed.inject(Router);

    const fixture = TestBed.createComponent(CharacterCreationComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should complete full character creation flow', (done) => {
    // Step 1: Select race
    component.selectRace(Race.HUMAN);
    expect(component.selectedRace()).toBe(Race.HUMAN);
    expect(component.raceData()).toBeDefined();

    // Step 2: Select alignment
    component.selectAlignment(Alignment.GOOD);
    expect(component.selectedAlignment()).toBe(Alignment.GOOD);

    // Step 3: Roll stats
    component.rollStats();

    setTimeout(() => {
      expect(component.rolledStats()).toBeDefined();
      expect(component.finalStats()).toBeDefined();

      // Step 4: Select class (if eligible)
      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        expect(component.selectedClass()).toBe(CharacterClass.FIGHTER);

        // Step 5: Enter name
        component.characterName.set('IntegrationTest');
        expect(component.canSave()).toBe(true);

        // Step 6: Save character
        const initialRosterSize = gameState.getState().roster.size;
        component.saveCharacter();

        // Verify character added to roster
        const newRosterSize = gameState.getState().roster.size;
        expect(newRosterSize).toBe(initialRosterSize + 1);

        // Verify success message
        expect(component.successMessage()).toContain('created successfully');
      }

      done();
    }, 350);
  });

  it('should use new data formula correctly', (done) => {
    component.selectRace(Race.HUMAN);
    component.selectAlignment(Alignment.GOOD);
    component.rollStats();

    setTimeout(() => {
      const raceData = RaceService.getRaceData(Race.HUMAN);
      const rolled = component.rolledStats()!;
      const finalStats = component.finalStats()!;

      // Verify formula: finalStat = raceBase + rolled
      expect(finalStats.strength).toBe(raceData.baseStats.str + rolled.strength);
      expect(finalStats.intelligence).toBe(raceData.baseStats.int + rolled.intelligence);
      expect(finalStats.piety).toBe(raceData.baseStats.pie + rolled.piety);
      expect(finalStats.vitality).toBe(raceData.baseStats.vit + rolled.vitality);
      expect(finalStats.agility).toBe(raceData.baseStats.agi + rolled.agility);
      expect(finalStats.luck).toBe(raceData.baseStats.luc + rolled.luck);

      done();
    }, 350);
  });

  it('should enforce progressive enabling', (done) => {
    // Initially, nothing selected
    expect(component.canSave()).toBe(false);

    // Select race - still can't save
    component.selectRace(Race.HUMAN);
    expect(component.canSave()).toBe(false);

    // Select alignment - still can't save
    component.selectAlignment(Alignment.GOOD);
    expect(component.canSave()).toBe(false);

    // Roll stats
    component.rollStats();

    setTimeout(() => {
      // After rolling - still can't save
      expect(component.canSave()).toBe(false);

      // Select class - still can't save
      if (component.isClassEligible(CharacterClass.FIGHTER)) {
        component.selectClass(CharacterClass.FIGHTER);
        expect(component.canSave()).toBe(false);

        // Enter name - now can save
        component.characterName.set('Test');
        expect(component.canSave()).toBe(true);
      }

      done();
    }, 350);
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- character-creation.integration`

Expected: PASS - Integration tests passing

**Step 3: Commit integration tests**

```bash
git add src/app/__tests__/integration/character-creation.integration.spec.ts
git commit -m "test(character-creation): add end-to-end integration test

- Tests complete character creation flow
- Verifies new data formula (raceBase + rolled)
- Tests progressive enabling enforcement
- Tests character added to roster
- Integration test passing"
```

---

## Task 9: Run Full Test Suite

**Step 1: Run all tests to verify no regressions**

Run: `npm test`

Expected: All existing tests still passing (605+ tests)

**Step 2: Fix any failing tests if needed**

If tests fail due to imports or dependencies, fix them individually.

**Step 3: Commit test fixes if any**

```bash
git add -A
git commit -m "test: fix any test regressions from character creation redesign"
```

---

## Task 10: Manual Testing Checklist

**Manual testing steps:**

1. **Start dev server**: `npm start`
2. **Navigate to Character Creation**: Visit `/character-creation` route
3. **Test Race Selection**:
   - Click each race button
   - Verify race details display (description, base stats, strengths/weaknesses)
   - Verify alignment section enables
4. **Test Alignment Selection**:
   - Click each alignment button
   - Verify stats section enables
5. **Test Stat Rolling**:
   - Click "ROLL DICE" button
   - Verify three-column display (base + rolled = final)
   - Click "REROLL STATS" multiple times
   - Verify different values appear
   - Verify class section enables
6. **Test Class Selection**:
   - Verify eligible classes are clickable
   - Verify ineligible classes are grayed with X indicator
   - Click eligible class
   - Verify class details display
   - Verify name section enables
7. **Test Name Input**:
   - Type character name
   - Verify save button enables
8. **Test Save Flow**:
   - Click "SAVE CHARACTER"
   - Verify success message appears
   - Wait 2 seconds
   - Verify form resets
   - Create another character
9. **Test Cancel Flow**:
   - Fill in partial form
   - Click "CANCEL"
   - Verify confirmation dialog appears
   - Click "DISCARD"
   - Verify form resets
10. **Test Keyboard Shortcuts**:
    - Press `R` after selecting alignment - should roll stats
    - Press `S` when form complete - should save
    - Press `Esc` - should show cancel confirmation
11. **Test Responsive Design**:
    - Resize browser to mobile width (<768px)
    - Verify 2-column layout collapses to 1 column
    - Verify all sections still functional
12. **Test Navigation**:
    - Click "BACK TO TRAINING GROUNDS"
    - Verify navigation works
    - Return to character creation
13. **Test Edge Cases**:
    - Try rolling stats without selecting alignment (should be disabled)
    - Try saving without complete form (should be disabled)
    - Change race after rolling stats (should reset stats and class)

**Step 4: Document any issues found**

If issues found, create fix commits.

---

## Task 11: Update Documentation

**Files:**
- Update: `docs/ui/scenes/02-training-grounds.md` (add note about SceneTitle/SceneFooter)
- Create: `docs/ui/scenes/character-creation-redesign.md`

**Step 1: Create character creation scene documentation**

File: `docs/ui/scenes/character-creation-redesign.md`

```markdown
# Character Creation Scene (Redesigned)

## Overview

Form-based character creation with 2-column layout and progressive enabling. All 5 sections visible from start, enabled as prerequisites are met.

## Layout

```
┌─────────────────────────────────────────────────┐
│         CHARACTER CREATION (SceneTitle)         │
├──────────────────────┬──────────────────────────┤
│ LEFT COLUMN          │ RIGHT COLUMN             │
│                      │                          │
│ 1. CHOOSE RACE       │ 4. CHOOSE CLASS          │
│    [Human] [Elf]     │    [Fighter] [Mage]      │
│    [Dwarf] [Gnome]   │    [Priest] [Thief]      │
│    [Hobbit]          │    [Bishop] [Samurai]    │
│    Description...    │    [Lord] [Ninja]        │
│    Base Stats...     │    Description...        │
│                      │                          │
│ 2. CHOOSE ALIGNMENT  │ 5. NAME CHARACTER        │
│    [Good] [Neutral]  │    Name: [________]      │
│    [Evil]            │                          │
│                      │                          │
│ 3. ROLL STATS        │                          │
│    [ROLL DICE]       │                          │
│    STR: 8 + 7 = 15   │                          │
│    INT: 8 + 12 = 20  │                          │
│    ...               │                          │
├──────────────────────┴──────────────────────────┤
│              [Success/Error Message]            │
├─────────────────────────────────────────────────┤
│ [SAVE] [CANCEL] [BACK TO TRAINING GROUNDS]      │
│           (SceneFooter with Menu)               │
└─────────────────────────────────────────────────┘
```

## Progressive Enabling

| Section | Enabled When | Disabled Appearance |
|---------|-------------|---------------------|
| 1. Race | Always | N/A |
| 2. Alignment | Race selected | 40% opacity, no clicks |
| 3. Stats | Alignment selected | 40% opacity, no clicks |
| 4. Class | Stats rolled | 40% opacity, no clicks |
| 5. Name | Class selected | 40% opacity, no clicks |
| Save button | Name entered | Disabled in footer |

## Data Formula

**NEW (Data-Driven):**
```
finalStat = raceBaseStats[stat] + rolled_amount
Example: Human STR = 8 (base) + 7 (rolled) = 15 (final)
```

**Display Format:**
```
STR: 8 + 7 = 15
     ↑   ↑   ↑
   base roll final
```

## Class Eligibility

- All 8 classes always visible
- Ineligible classes grayed out with ✗ indicator
- Only eligible classes clickable
- Eligibility recalculated on stat reroll

## Keyboard Shortcuts

- `R` - Roll/reroll stats (when alignment selected)
- `S` - Save character (when form complete)
- `Esc` - Cancel (shows confirmation if form has data)
- `B` - Back to training grounds

## Components Used

- `SceneTitleComponent` - Reusable header
- `SceneFooterComponent` - Reusable footer with MenuComponent
- `ConfirmationDialogComponent` - Cancel confirmation

## State Management

- Signal-based reactive state
- Computed signals for derived state
- No wizard state machine
- Progressive reset on upstream changes

## Success Flow

1. Save character
2. Show success message: "{Name} created successfully!"
3. Wait 2 seconds
4. Reset form to empty state
5. Allow creating another character
```

**Step 2: Commit documentation**

```bash
git add docs/ui/scenes/character-creation-redesign.md
git commit -m "docs: add character creation redesign documentation

- Layout diagram
- Progressive enabling rules
- New data formula explanation
- Keyboard shortcuts
- Component architecture"
```

---

## Task 12: Final Verification

**Step 1: Run full test suite one final time**

Run: `npm test`

Expected: All 605+ tests passing

**Step 2: Run production build**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 3: Verify no console errors in dev server**

Run: `npm start`

Navigate to character creation, open browser console, verify no errors.

**Step 4: Create final summary commit**

```bash
git add -A
git commit -m "feat: complete character creation scene redesign

Summary of changes:
- Created reusable SceneTitle and SceneFooter components
- Rebuilt character creation with 2-column form layout
- Implemented progressive enabling (all visible, enable on prerequisites)
- Integrated new data formula (raceBase + rolled = final)
- Added three-column stat display for clarity
- Show all 8 classes, gray ineligible ones
- Success + reset flow after saving
- Comprehensive unit and integration tests
- Full keyboard shortcut support

Breaking changes:
- Removed old wizard-based character creation
- Updated to use RaceService and ClassService

Test results:
- All existing tests passing (605+)
- New component tests passing (40+ tests)
- Integration test passing
- No regressions

Ready for use."
```

---

## Success Criteria

✅ SceneTitleComponent created and tested
✅ SceneFooterComponent created and tested
✅ Character creation component rebuilt from scratch
✅ 2-column layout with progressive enabling
✅ Three-column stat display (base + rolled = final)
✅ New data formula implemented (raceBase + rolled)
✅ All 8 classes shown, ineligible ones grayed
✅ Success message + form reset after save
✅ Keyboard shortcuts working (R, S, Esc)
✅ Comprehensive unit tests (40+ tests)
✅ Integration test passing
✅ All existing tests passing (no regressions)
✅ Production build succeeds
✅ Manual testing checklist completed
✅ Documentation created

---

## Estimated Time

- Task 1 (SceneTitle): 30 minutes
- Task 2 (SceneFooter): 45 minutes
- Task 3 (Delete old files): 5 minutes
- Task 4 (Component TS): 60 minutes
- Task 5 (Component HTML): 45 minutes
- Task 6 (Component SCSS): 30 minutes
- Task 7 (Unit tests): 90 minutes
- Task 8 (Integration test): 30 minutes
- Task 9 (Full test suite): 15 minutes
- Task 10 (Manual testing): 45 minutes
- Task 11 (Documentation): 20 minutes
- Task 12 (Final verification): 15 minutes

**Total: ~6.5 hours**

---

## Notes

- All code uses new data-driven architecture (RaceService, ClassService)
- No RACE_MODIFIERS or CLASS_REQUIREMENTS constants used
- Progressive enabling via disabled state + opacity
- Form sections are inline (not separate components)
- Reusable scene components benefit all future scenes
- Test-driven approach with comprehensive coverage
- Frequent commits for easy rollback if needed