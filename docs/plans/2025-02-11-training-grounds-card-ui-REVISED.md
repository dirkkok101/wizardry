# Training Grounds Card-Based UI Implementation Plan (REVISED)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Training Grounds from character creation wizard to roster management hub with card-based UI.

**Architecture:** Smart component pattern - TrainingGrounds (smart) orchestrates workflows and state, CharacterCard (presentational) displays data and emits events. Services remain pure functions. Immutable state updates. Event-driven communication.

**Tech Stack:** Angular 20.3.8, TypeScript, Jest, Playwright

---

## Task 0: Verify Prerequisites and Document Current State

**Files:**
- Read: `src/components/confirmation-dialog/confirmation-dialog.component.ts`
- Read: `src/test-helpers/test-factories.ts`
- Read: `src/types/Character.ts`
- Read: `src/types/SceneType.ts`

**Step 1: Verify ConfirmationDialogComponent exists**

Run: `ls -la src/components/confirmation-dialog/`
Expected: Component files exist (component.ts, component.html, component.scss)

**Step 2: Read and verify Character type structure**

Read: `src/types/Character.ts`
Expected fields:
- `id: string`
- `name: string`
- `race: Race`
- `class: CharacterClass`
- `alignment: Alignment`
- `status: CharacterStatus`
- `strength, intelligence, piety, vitality, agility, luck: number`
- `level, experience, hp, maxHp, ac: number`
- `inventory: Item[]`
- `password: string`
- `createdAt, lastModified: number`

**Step 3: Verify test factory creates valid Character**

Read: `src/test-helpers/test-factories.ts`
Confirm: `createTestCharacter()` creates all required Character fields

**Step 4: Verify SceneType enum**

Read: `src/types/SceneType.ts`
Expected: Has `TRAINING_GROUNDS` value

**Step 5: Document wizard code to migrate**

Read: `src/app/training-grounds/training-grounds.component.ts` (lines 1-437)

Document all wizard-related code:
- Type definitions: `WizardStep`, `WizardState` (lines 12-28)
- Signals: `currentStep`, `wizardState`, `errorMessage`, `successMessage` (lines 54-66)
- Step sequence array (lines 69-77)
- All methods from `selectRace()` to `confirmCharacterCreation()` (lines 94-411)
- Template needs to be copied entirely

**Step 6: Verify template exists**

Run: `ls -la src/app/training-grounds/training-grounds.component.html`
Expected: Template file exists and contains wizard steps

---

## Task 1: Create CharacterCard Component (Presentational)

**Files:**
- Create: `src/components/character-card/character-card.component.ts`
- Create: `src/components/character-card/character-card.component.html`
- Create: `src/components/character-card/character-card.component.scss`
- Create: `src/components/character-card/__tests__/character-card.component.spec.ts`

**Step 1: Write the failing test for CharacterCard rendering**

Create `src/components/character-card/__tests__/character-card.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCardComponent } from '../character-card.component';
import { Character } from '../../../types/Character';
import { CharacterStatus } from '../../../types/CharacterStatus';
import { Race } from '../../../types/Race';
import { CharacterClass } from '../../../types/CharacterClass';
import { Alignment } from '../../../types/Alignment';

describe('CharacterCardComponent', () => {
  let component: CharacterCardComponent;
  let fixture: ComponentFixture<CharacterCardComponent>;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    race: Race.ELF,
    class: CharacterClass.MAGE,
    level: 5,
    alignment: Alignment.GOOD,
    status: CharacterStatus.OK,
    strength: 10,
    intelligence: 18,
    piety: 15,
    vitality: 12,
    agility: 14,
    luck: 13,
    hp: 25,
    maxHp: 25,
    ac: 10,
    experience: 5000,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardComponent);
    component = fixture.componentInstance;
    component.character = mockCharacter;
    component.status = CharacterStatus.OK;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display character name', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Gandalf');
  });

  it('should display race and class', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('ELF');
    expect(compiled.textContent).toContain('MAGE');
  });

  it('should display level', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Level 5');
  });

  it('should display status badge', () => {
    const compiled = fixture.nativeElement;
    const statusBadge = compiled.querySelector('.status-badge');
    expect(statusBadge).toBeTruthy();
    expect(statusBadge.textContent).toContain('OK');
  });

  it('should emit inspect event when inspect button clicked', () => {
    jest.spyOn(component.inspect, 'emit');
    const inspectBtn = fixture.nativeElement.querySelector('.inspect-btn');
    inspectBtn.click();
    expect(component.inspect.emit).toHaveBeenCalledWith('char-1');
  });

  it('should emit delete event when delete button clicked', () => {
    jest.spyOn(component.delete, 'emit');
    const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
    deleteBtn.click();
    expect(component.delete.emit).toHaveBeenCalledWith('char-1');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- character-card.component`
Expected: FAIL with "Cannot find module '../character-card.component'"

**Step 3: Create CharacterCard component**

Create `src/components/character-card/character-card.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';

/**
 * CharacterCard Component - Presentational component for displaying character data
 *
 * Responsibilities:
 * - Display character information (name, race, class, level, status)
 * - Emit events for user actions (inspect, delete)
 * - No service injection (pure presentation)
 */
@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss']
})
export class CharacterCardComponent {
  @Input() character!: Character;
  @Input() status!: CharacterStatus;

  @Output() inspect = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  onInspect(): void {
    this.inspect.emit(this.character.id);
  }

  onDelete(): void {
    this.delete.emit(this.character.id);
  }
}
```

**Step 4: Create CharacterCard template**

Create `src/components/character-card/character-card.component.html`:

```html
<div class="character-card">
  <div class="card-header">
    <h3 class="character-name">{{ character.name }}</h3>
    <span class="status-badge" [class]="'status-' + status">
      {{ status }}
    </span>
  </div>

  <div class="card-body">
    <div class="char-info">
      <span class="race-class">{{ character.race }} {{ character.class }}</span>
      <span class="level">Level {{ character.level }}</span>
    </div>
  </div>

  <div class="card-actions">
    <button class="inspect-btn" (click)="onInspect()">Inspect</button>
    <button class="delete-btn" (click)="onDelete()">Delete</button>
  </div>
</div>
```

**Step 5: Create CharacterCard styles**

Create `src/components/character-card/character-card.component.scss`:

```scss
.character-card {
  background: #000;
  border: 2px solid #0f0;
  padding: 1rem;
  margin: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-family: 'Courier New', monospace;
  color: #0f0;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #0f0;
    padding-bottom: 0.5rem;

    .character-name {
      margin: 0;
      font-size: 1.2rem;
      color: #0f0;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border: 1px solid;
      font-size: 0.875rem;
      font-weight: bold;

      &.status-OK {
        color: #0f0;
        border-color: #0f0;
      }

      &.status-IN_MAZE {
        color: #ff0;
        border-color: #ff0;
      }

      &.status-DEAD {
        color: #f00;
        border-color: #f00;
      }

      &.status-ASHES {
        color: #a00;
        border-color: #a00;
      }
    }
  }

  .card-body {
    .char-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .race-class,
      .level {
        font-size: 0.95rem;
      }
    }
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #0f0;

    button {
      flex: 1;
      background: #000;
      border: 1px solid #0f0;
      color: #0f0;
      padding: 0.5rem;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;

      &:hover {
        background: #0f0;
        color: #000;
      }

      &.delete-btn:hover {
        border-color: #f00;
        background: #f00;
        color: #000;
      }
    }
  }
}
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- character-card.component`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/components/character-card/
git commit -m "feat(training-grounds): create CharacterCard presentational component

- Add CharacterCard component with inputs/outputs
- Display name, race, class, level, status badge
- Emit inspect and delete events
- Wizardry green-on-black styling with color-coded status
- Full test coverage for rendering and event emission"
```

---

## Task 2: Add CharacterService.deleteCharacter Method

**Files:**
- Modify: `src/services/CharacterService.ts`
- Create: `src/services/__tests__/CharacterService.delete.spec.ts`

**Step 1: Write failing test for deleteCharacter**

Create `src/services/__tests__/CharacterService.delete.spec.ts`:

```typescript
import { CharacterService } from '../CharacterService';
import { GameState } from '../../types/GameState';
import { createTestCharacter, createEmptyParty } from '../../test-helpers/test-factories';
import { SceneType } from '../../types/SceneType';

describe('CharacterService', () => {
  describe('deleteCharacter', () => {
    it('removes character from roster', () => {
      const char1 = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const char2 = createTestCharacter({ id: 'char-2', name: 'Frodo' });

      const initialState: GameState = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL',
          soundEnabled: true,
          musicEnabled: true
        }
      };

      const newState = CharacterService.deleteCharacter(initialState, 'char-1');

      expect(newState.roster.has('char-1')).toBe(false);
      expect(newState.roster.has('char-2')).toBe(true);
      expect(newState.roster.size).toBe(1);
    });

    it('returns same state if character does not exist', () => {
      const initialState: GameState = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map(),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL',
          soundEnabled: true,
          musicEnabled: true
        }
      };

      const newState = CharacterService.deleteCharacter(initialState, 'nonexistent');

      expect(newState).toEqual(initialState);
    });

    it('throws error if character is in party', () => {
      const char = createTestCharacter({ id: 'char-1', name: 'Gandalf' });

      const initialState: GameState = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: {
          members: [char.id],
          formation: { frontRow: [char.id], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL',
          soundEnabled: true,
          musicEnabled: true
        }
      };

      expect(() => {
        CharacterService.deleteCharacter(initialState, 'char-1');
      }).toThrow('Cannot delete character: character is in party');
    });

    it('creates immutable update (does not mutate original)', () => {
      const char = createTestCharacter({ id: 'char-1' });
      const initialState: GameState = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL',
          soundEnabled: true,
          musicEnabled: true
        }
      };
      const originalSize = initialState.roster.size;

      const newState = CharacterService.deleteCharacter(initialState, 'char-1');

      expect(initialState.roster.size).toBe(originalSize);
      expect(newState.roster).not.toBe(initialState.roster);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- CharacterService.delete`
Expected: FAIL with "CharacterService.deleteCharacter is not a function"

**Step 3: Implement deleteCharacter method**

Modify `src/services/CharacterService.ts` - add this method:

```typescript
/**
 * Delete a character from the roster
 *
 * @param state - Current game state
 * @param characterId - ID of character to delete
 * @returns New game state with character removed
 * @throws Error if character is in party
 */
function deleteCharacter(state: GameState, characterId: string): GameState {
  const character = state.roster.get(characterId);

  // Character doesn't exist - return unchanged state
  if (!character) {
    return state;
  }

  // Validate: character must not be in party
  if (state.party.members.includes(characterId)) {
    throw new Error('Cannot delete character: character is in party');
  }

  // Create new roster without the character (immutable update)
  const newRoster = new Map(state.roster);
  newRoster.delete(characterId);

  return {
    ...state,
    roster: newRoster
  };
}

// Add to exports at bottom of file
export const CharacterService = {
  // ... existing methods ...
  deleteCharacter
};
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- CharacterService.delete`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/services/CharacterService.ts src/services/__tests__/CharacterService.delete.spec.ts
git commit -m "feat(services): add CharacterService.deleteCharacter method

- Pure function for removing character from roster
- Validates character not in party
- Immutable state update
- Returns unchanged state if character doesn't exist
- Full test coverage including edge cases"
```

---

## Task 3: Move Character Creation to Separate Route

**Files:**
- Create: `src/app/character-creation/character-creation.component.ts`
- Create: `src/app/character-creation/character-creation.component.html`
- Create: `src/app/character-creation/character-creation.component.scss`
- Modify: `src/app/app.routes.ts`

**Step 1: Copy wizard component code to new CharacterCreation component**

Create `src/app/character-creation/character-creation.component.ts`:

**IMPORTANT**: Copy lines 1-437 from `src/app/training-grounds/training-grounds.component.ts` with the following changes:
1. Change component selector: `selector: 'app-character-creation'`
2. Change class name: `export class CharacterCreationComponent`
3. Change `returnToCastle()` navigation:
   ```typescript
   returnToCastle(): void {
     this.router.navigate(['/training-grounds']);
   }
   ```
4. After character creation success, navigate to training-grounds:
   ```typescript
   confirmCharacterCreation(): void {
     // ... existing logic ...
     this.successMessage.set(`${character.name} created successfully!`);

     // Navigate to training grounds instead of resetting wizard
     setTimeout(() => {
       this.router.navigate(['/training-grounds']);
     }, 1500);
   }
   ```

Full file content (437 lines - exact copy with modifications above):

```typescript
import { Component, OnInit, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../services/GameStateService'
import { CharacterCreationService, RolledStats, BaseStats } from '../../services/CharacterCreationService'
import { CharacterService } from '../../services/CharacterService'
import { SceneType } from '../../types/SceneType'
import { Race, RACE_MODIFIERS, RaceModifiers } from '../../types/Race'
import { Alignment } from '../../types/Alignment'
import { CharacterClass } from '../../types/CharacterClass'

export type WizardStep =
  | 'RACE'
  | 'ALIGNMENT'
  | 'STATS'
  | 'BONUS_POINTS'
  | 'CLASS'
  | 'NAME_PASSWORD'
  | 'CONFIRM'

export interface WizardState {
  selectedRace: Race | null
  selectedAlignment: Alignment | null
  rolledStats: RolledStats | null
  selectedClass: CharacterClass | null
  name: string
  password: string
}

/**
 * Character Creation Component
 *
 * Character creation wizard with 7 steps:
 * 1. Race selection (Human, Elf, Dwarf, Gnome, Hobbit)
 * 2. Alignment selection (Good, Neutral, Evil)
 * 3. Stat rolling (3d6 per attribute + bonus points)
 * 4. Bonus point allocation
 * 5. Class selection (based on stat requirements)
 * 6. Name and password entry
 * 7. Confirmation
 */
@Component({
  selector: 'app-character-creation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-creation.component.html',
  styleUrls: ['./character-creation.component.scss']
})
export class CharacterCreationComponent implements OnInit {
  // Expose enum to template
  readonly CharacterClass = CharacterClass

  // Wizard state
  readonly currentStep = signal<WizardStep>('RACE')
  readonly wizardState = signal<WizardState>({
    selectedRace: null,
    selectedAlignment: null,
    rolledStats: null,
    selectedClass: null,
    name: '',
    password: ''
  })

  // Error and success messages
  readonly errorMessage = signal<string | null>(null)
  readonly successMessage = signal<string | null>(null)

  // Step sequence for navigation
  private readonly stepSequence: WizardStep[] = [
    'RACE',
    'ALIGNMENT',
    'STATS',
    'BONUS_POINTS',
    'CLASS',
    'NAME_PASSWORD',
    'CONFIRM'
  ]

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }))
  }

  /**
   * Select race and advance to alignment step
   */
  selectRace(race: Race): void {
    this.wizardState.update(state => ({
      ...state,
      selectedRace: race
    }))
    this.nextStep()
  }

  /**
   * Select alignment and advance to stats step
   */
  selectAlignment(alignment: Alignment): void {
    this.wizardState.update(state => ({
      ...state,
      selectedAlignment: alignment
    }))
    this.nextStep()
  }

  /**
   * Roll stats (or reroll)
   */
  rollStats(): void {
    const baseStats = CharacterCreationService.rollStats()
    const race = this.wizardState().selectedRace

    if (!race) {
      this.errorMessage.set('Race not selected')
      return
    }

    // Apply race modifiers
    const modifiedStats = CharacterCreationService.applyRaceModifiers(
      baseStats,
      race
    )

    this.wizardState.update(state => ({
      ...state,
      rolledStats: {
        ...modifiedStats,
        bonusPoints: baseStats.bonusPoints
      }
    }))
  }

  /**
   * Advance to next step in wizard
   */
  private nextStep(): void {
    const currentIndex = this.stepSequence.indexOf(this.currentStep())
    if (currentIndex < this.stepSequence.length - 1) {
      this.currentStep.set(this.stepSequence[currentIndex + 1])
    }
  }

  /**
   * Go back to previous step in wizard
   */
  previousStep(): void {
    const currentIndex = this.stepSequence.indexOf(this.currentStep())
    if (currentIndex > 0) {
      this.currentStep.set(this.stepSequence[currentIndex - 1])
    }
  }

  /**
   * Get all available race options
   */
  getRaceOptions(): Race[] {
    return [Race.HUMAN, Race.ELF, Race.DWARF, Race.GNOME, Race.HOBBIT]
  }

  /**
   * Get stat modifiers for a race
   */
  getRaceModifiers(race: Race): RaceModifiers {
    return RACE_MODIFIERS[race]
  }

  /**
   * Get all available alignment options
   */
  getAlignmentOptions(): Alignment[] {
    return [Alignment.GOOD, Alignment.NEUTRAL, Alignment.EVIL]
  }

  /**
   * Get description for an alignment
   */
  getAlignmentDescription(alignment: Alignment): string {
    const descriptions: Record<Alignment, string> = {
      [Alignment.GOOD]: 'Virtuous and righteous characters who aid others',
      [Alignment.NEUTRAL]: 'Balanced characters who follow their own path',
      [Alignment.EVIL]: 'Self-serving characters who pursue power'
    }
    return descriptions[alignment]
  }

  /**
   * Accept rolled stats and advance to bonus point allocation
   */
  acceptStats(): void {
    if (!this.wizardState().rolledStats) {
      this.errorMessage.set('Roll stats first')
      return
    }

    this.errorMessage.set(null)
    this.nextStep()
  }

  /**
   * Get available bonus points
   */
  getAvailableBonusPoints(): number {
    return this.wizardState().rolledStats?.bonusPoints ?? 0
  }

  /**
   * Allocate bonus points to a specific stat
   */
  allocateBonusPoint(stat: keyof BaseStats, points: number): void {
    const currentStats = this.wizardState().rolledStats

    if (!currentStats) {
      this.errorMessage.set('No stats rolled')
      return
    }

    try {
      const updatedStats = CharacterCreationService.allocateBonusPoints(
        currentStats,
        stat,
        points
      )

      this.wizardState.update(state => ({
        ...state,
        rolledStats: updatedStats
      }))

      this.errorMessage.set(null)
    } catch (error) {
      this.errorMessage.set((error as Error).message)
    }
  }

  /**
   * Get eligible classes based on current stats (with bonus allocation)
   */
  getEligibleClasses(): CharacterClass[] {
    const { rolledStats, selectedAlignment } = this.wizardState()

    if (!rolledStats || !selectedAlignment) {
      return []
    }

    return CharacterService.getEligibleClasses(rolledStats, selectedAlignment)
  }

  /**
   * Finish bonus point allocation and advance to class selection
   */
  finishBonusAllocation(): void {
    this.nextStep()
  }

  /**
   * Get reason why a class is ineligible
   */
  getIneligibilityReason(characterClass: CharacterClass): string {
    const stats = this.wizardState().rolledStats

    if (!stats) {
      return 'No stats rolled'
    }

    const requirements: Record<CharacterClass, string> = {
      [CharacterClass.FIGHTER]: 'STR 11+',
      [CharacterClass.MAGE]: 'IQ 11+',
      [CharacterClass.PRIEST]: 'PIE 11+',
      [CharacterClass.THIEF]: 'AGI 11+',
      [CharacterClass.BISHOP]: 'IQ 12+, PIE 12+',
      [CharacterClass.SAMURAI]: 'STR 15+, IQ 11+, PIE 10+, VIT 14+, AGI 10+',
      [CharacterClass.LORD]: 'STR 15+, IQ 12+, PIE 12+, VIT 15+, AGI 14+, LUK 15+',
      [CharacterClass.NINJA]: 'ALL stats 17+'
    }

    return `Requires: ${requirements[characterClass]}`
  }

  /**
   * Select character class and advance to name/password step
   */
  selectClass(characterClass: CharacterClass): void {
    const eligible = this.getEligibleClasses()

    if (!eligible.includes(characterClass)) {
      this.errorMessage.set(
        `Character is not eligible for ${characterClass}`
      )
      return
    }

    this.wizardState.update(state => ({
      ...state,
      selectedClass: characterClass
    }))

    this.errorMessage.set(null)
    this.nextStep()
  }

  /**
   * Set character name with validation
   */
  setName(name: string): void {
    const validation = CharacterService.validateCharacterName(name)

    if (!validation.valid) {
      this.errorMessage.set(validation.error!)
      return
    }

    this.wizardState.update(state => ({
      ...state,
      name
    }))

    this.errorMessage.set(null)
  }

  /**
   * Set character password with validation
   */
  setPassword(password: string): void {
    const validation = CharacterService.validatePassword(password)

    if (!validation.valid) {
      this.errorMessage.set(validation.error!)
      return
    }

    this.wizardState.update(state => ({
      ...state,
      password
    }))

    this.errorMessage.set(null)
  }

  /**
   * Finish name/password entry and advance to confirmation
   */
  finishNamePassword(): void {
    const { name, password } = this.wizardState()

    // Validate both are set
    const nameValidation = CharacterService.validateCharacterName(name)
    const passwordValidation = CharacterService.validatePassword(password)

    if (!nameValidation.valid) {
      this.errorMessage.set(nameValidation.error!)
      return
    }

    if (!passwordValidation.valid) {
      this.errorMessage.set(passwordValidation.error!)
      return
    }

    this.errorMessage.set(null)
    this.nextStep()
  }

  /**
   * Confirm character creation and add to roster
   */
  confirmCharacterCreation(): void {
    const { selectedRace, selectedAlignment, rolledStats, selectedClass, name, password } =
      this.wizardState()

    // Validate all required fields
    if (
      !selectedRace ||
      !selectedAlignment ||
      !rolledStats ||
      !selectedClass ||
      !name ||
      !password
    ) {
      this.errorMessage.set('Wizard not complete')
      return
    }

    // Create character
    const character = CharacterService.createCharacterFromStats({
      name,
      password,
      race: selectedRace,
      alignment: selectedAlignment,
      stats: rolledStats,
      selectedClass
    })

    // Add to game state roster
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(character.id, character)
    }))

    // Show success message
    this.successMessage.set(`${character.name} created successfully!`)

    // Navigate back to training grounds after brief delay
    setTimeout(() => {
      this.router.navigate(['/training-grounds']);
    }, 1500);
  }

  /**
   * Return to training grounds
   */
  returnToCastle(): void {
    this.router.navigate(['/training-grounds'])
  }
}
```

**Step 2: Copy template file**

Create `src/app/character-creation/character-creation.component.html`:

Copy entire contents from `src/app/training-grounds/training-grounds.component.html`

Run: `cp src/app/training-grounds/training-grounds.component.html src/app/character-creation/character-creation.component.html`

**Step 3: Copy styles file**

Create `src/app/character-creation/character-creation.component.scss`:

Copy entire contents from `src/app/training-grounds/training-grounds.component.scss`

Run: `cp src/app/training-grounds/training-grounds.component.scss src/app/character-creation/character-creation.component.scss`

**Step 4: Add route for character-creation**

Modify `src/app/app.routes.ts` - add route after training-grounds route:

```typescript
import { CharacterCreationComponent } from './character-creation/character-creation.component';

export const routes: Routes = [
  // ... existing routes ...
  {
    path: 'training-grounds',
    component: TrainingGroundsComponent
  },
  {
    path: 'character-creation',
    component: CharacterCreationComponent
  },
  // ... rest of routes ...
];
```

**Step 5: Verify character creation still works**

Run: `npm start`

Manual test:
1. Navigate to http://localhost:4200/character-creation
2. Complete wizard flow through all 7 steps
3. Verify character is created
4. Verify success message appears
5. Verify navigation returns to training-grounds after 1.5 seconds

Expected: Wizard works exactly as before, just on different route

**Step 6: Commit**

```bash
git add src/app/character-creation/ src/app/app.routes.ts
git commit -m "refactor(training-grounds): move character creation wizard to separate route

- Extract wizard to /character-creation component
- Keep all 7 steps and existing logic intact
- Update navigation to return to training-grounds on completion
- Add route in app.routes.ts
- Show success message before navigating back
- Separation of concerns: roster management vs character creation"
```

---

## Task 4: Refactor TrainingGrounds to Smart Component

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`
- Modify: `src/app/training-grounds/training-grounds.component.html`
- Modify: `src/app/training-grounds/training-grounds.component.scss`
- Create: `src/app/training-grounds/__tests__/training-grounds.component.spec.ts`

**(Continuing in next message due to length...)**
```

Now let me continue with the rest of the revised plan (Tasks 4-7):

