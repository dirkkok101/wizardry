# Training Grounds Card-Based UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Training Grounds from character creation wizard to roster management hub with card-based UI.

**Architecture:** Smart component pattern - TrainingGrounds (smart) orchestrates workflows and state, CharacterCard (presentational) displays data and emits events. Services remain pure functions. Immutable state updates. Event-driven communication.

**Tech Stack:** Angular 20.3.8, TypeScript, Jest, Playwright

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

describe('CharacterCardComponent', () => {
  let component: CharacterCardComponent;
  let fixture: ComponentFixture<CharacterCardComponent>;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    race: 'ELF',
    class: 'MAGE',
    level: 5,
    alignment: 'GOOD',
    status: 'OK',
    stats: { str: 10, iq: 18, pie: 15, vit: 12, agi: 14, luk: 13 },
    hp: 25,
    maxHp: 25,
    spellPoints: { 1: 3, 2: 2, 3: 1, 4: 0, 5: 0, 6: 0, 7: 0 },
    experience: 5000,
    gold: 100,
    inventory: [],
    knownSpells: []
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardComponent);
    component = fixture.componentInstance;
    component.character = mockCharacter;
    component.status = 'OK';
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
import { createTestCharacter, createGameState } from '../../test-helpers/test-factories';

describe('CharacterService', () => {
  describe('deleteCharacter', () => {
    it('removes character from roster', () => {
      const char1 = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const char2 = createTestCharacter({ id: 'char-2', name: 'Frodo' });

      const initialState: GameState = {
        ...createGameState(),
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ])
      };

      const newState = CharacterService.deleteCharacter(initialState, 'char-1');

      expect(newState.roster.has('char-1')).toBe(false);
      expect(newState.roster.has('char-2')).toBe(true);
      expect(newState.roster.size).toBe(1);
    });

    it('returns same state if character does not exist', () => {
      const initialState = createGameState();

      const newState = CharacterService.deleteCharacter(initialState, 'nonexistent');

      expect(newState).toEqual(initialState);
    });

    it('throws error if character is in party', () => {
      const char = createTestCharacter({ id: 'char-1', name: 'Gandalf' });

      const initialState: GameState = {
        ...createGameState(),
        roster: new Map([[char.id, char]]),
        party: {
          members: [char.id],
          formation: { frontRow: [char.id], backRow: [] },
          gold: 0,
          alignment: 'GOOD'
        }
      };

      expect(() => {
        CharacterService.deleteCharacter(initialState, 'char-1');
      }).toThrow('Cannot delete character: character is in party');
    });

    it('creates immutable update (does not mutate original)', () => {
      const char = createTestCharacter({ id: 'char-1' });
      const initialState: GameState = {
        ...createGameState(),
        roster: new Map([[char.id, char]])
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

// Add to exports
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
- Read: `src/app/training-grounds/training-grounds.component.ts` (copy wizard code)

**Step 1: Create CharacterCreation component with wizard code**

Create `src/app/character-creation/character-creation.component.ts`:

Copy the entire existing wizard code from `src/app/training-grounds/training-grounds.component.ts`. The component should include:
- All 7 wizard steps (race, alignment, stats, bonus, class, name, confirm)
- All existing methods and state management
- Change navigation on completion to return to `/training-grounds`

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameStateService } from '../../services/GameStateService';
import { CharacterCreationService } from '../../services/CharacterCreationService';
import { CharacterService } from '../../services/CharacterService';
// ... other imports from training-grounds component

/**
 * Character Creation Component
 *
 * 7-step wizard for creating new characters:
 * 1. Race selection
 * 2. Alignment selection
 * 3. Stat rolling
 * 4. Bonus point allocation
 * 5. Class selection
 * 6. Name and password entry
 * 7. Confirmation
 */
@Component({
  selector: 'app-character-creation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-creation.component.html',
  styleUrls: ['./character-creation.component.scss']
})
export class CharacterCreationComponent implements OnInit {
  // Copy all wizard-related code from training-grounds component
  // Update returnToCastle() to navigate to '/training-grounds'

  // ... (wizard implementation from existing training-grounds component) ...

  cancelCreation(): void {
    this.router.navigate(['/training-grounds']);
  }

  completeCreation(): void {
    // ... existing completion logic ...
    this.router.navigate(['/training-grounds']);
  }
}
```

**Step 2: Copy template and styles**

Create `src/app/character-creation/character-creation.component.html`:

Copy the entire wizard template from `src/app/training-grounds/training-grounds.component.html`.

Create `src/app/character-creation/character-creation.component.scss`:

Copy styles from `src/app/training-grounds/training-grounds.component.scss`.

**Step 3: Add route for character-creation**

Modify `src/app/app.routes.ts` - add route:

```typescript
export const routes: Routes = [
  // ... existing routes ...
  {
    path: 'character-creation',
    component: CharacterCreationComponent
  },
  // ... rest of routes ...
];
```

Also add import at top:

```typescript
import { CharacterCreationComponent } from './character-creation/character-creation.component';
```

**Step 4: Verify character creation still works**

Run: `npm start`

Manual test:
1. Navigate to http://localhost:4200/character-creation
2. Complete wizard flow
3. Verify character is created
4. Verify navigation returns to training-grounds

Expected: Wizard works exactly as before, just on different route

**Step 5: Commit**

```bash
git add src/app/character-creation/ src/app/app.routes.ts
git commit -m "refactor(training-grounds): move character creation wizard to separate route

- Extract wizard to /character-creation component
- Keep all 7 steps and existing logic intact
- Update navigation to return to training-grounds on completion
- Add route in app.routes.ts
- Separation of concerns: roster management vs character creation"
```

---

## Task 4: Refactor TrainingGrounds to Smart Component

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`
- Modify: `src/app/training-grounds/training-grounds.component.html`
- Modify: `src/app/training-grounds/training-grounds.component.scss`
- Create: `src/app/training-grounds/__tests__/training-grounds.component.spec.ts`

**Step 1: Write failing test for TrainingGrounds roster display**

Create `src/app/training-grounds/__tests__/training-grounds.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TrainingGroundsComponent } from '../training-grounds.component';
import { GameStateService } from '../../../services/GameStateService';
import { CharacterService } from '../../../services/CharacterService';
import { createTestCharacter, createGameState } from '../../../test-helpers/test-factories';

describe('TrainingGroundsComponent', () => {
  let component: TrainingGroundsComponent;
  let fixture: ComponentFixture<TrainingGroundsComponent>;
  let mockRouter: jest.Mocked<Router>;
  let gameStateService: GameStateService;

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [TrainingGroundsComponent],
      providers: [
        GameStateService,
        CharacterService,
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingGroundsComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('availableCharacters', () => {
    it('shows characters not in party', () => {
      const char1 = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const char2 = createTestCharacter({ id: 'char-2', name: 'Frodo' });
      const char3 = createTestCharacter({ id: 'char-3', name: 'Sam' });

      const state = {
        ...createGameState(),
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2],
          [char3.id, char3]
        ]),
        party: {
          members: [char2.id], // Frodo is in party
          formation: { frontRow: [char2.id], backRow: [] },
          gold: 0,
          alignment: 'GOOD'
        }
      };

      gameStateService.setState(state);
      fixture.detectChanges();

      const available = component.availableCharacters();

      expect(available.length).toBe(2);
      expect(available.find(c => c.character.id === 'char-1')).toBeTruthy();
      expect(available.find(c => c.character.id === 'char-3')).toBeTruthy();
      expect(available.find(c => c.character.id === 'char-2')).toBeFalsy();
    });

    it('shows empty when all characters in party', () => {
      const char = createTestCharacter({ id: 'char-1' });
      const state = {
        ...createGameState(),
        roster: new Map([[char.id, char]]),
        party: {
          members: [char.id],
          formation: { frontRow: [char.id], backRow: [] },
          gold: 0,
          alignment: 'GOOD'
        }
      };

      gameStateService.setState(state);
      fixture.detectChanges();

      expect(component.availableCharacters().length).toBe(0);
    });

    it('computes status correctly', () => {
      const char = createTestCharacter({
        id: 'char-1',
        status: 'OK'
      });
      const state = {
        ...createGameState(),
        roster: new Map([[char.id, char]])
      };

      gameStateService.setState(state);
      fixture.detectChanges();

      const available = component.availableCharacters();
      expect(available[0].status).toBe('OK');
    });
  });

  describe('handleInspectCharacter', () => {
    it('navigates to character-inspection with correct params', () => {
      component.handleInspectCharacter('char-123');

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/character-inspection'],
        {
          queryParams: {
            characterId: 'char-123',
            returnTo: 'training-grounds'
          }
        }
      );
    });
  });

  describe('handleCreateCharacter', () => {
    it('navigates to character-creation', () => {
      component.handleCreateCharacter();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/character-creation']);
    });
  });

  describe('handleDeleteCharacter', () => {
    it('shows confirmation dialog', () => {
      const char = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const state = {
        ...createGameState(),
        roster: new Map([[char.id, char]])
      };
      gameStateService.setState(state);

      component.handleDeleteCharacter('char-1');

      expect(component.showDeleteConfirmation()).toBe(true);
      expect(component.deleteConfirmationMessage()).toContain('Gandalf');
    });

    it('deletes character on confirmation', () => {
      const char = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const state = {
        ...createGameState(),
        roster: new Map([[char.id, char]])
      };
      gameStateService.setState(state);

      component.handleDeleteCharacter('char-1');
      component.confirmDelete();

      const newState = gameStateService.state();
      expect(newState.roster.has('char-1')).toBe(false);
    });

    it('does not delete character on cancel', () => {
      const char = createTestCharacter({ id: 'char-1' });
      const state = {
        ...createGameState(),
        roster: new Map([[char.id, char]])
      };
      gameStateService.setState(state);

      component.handleDeleteCharacter('char-1');
      component.cancelDelete();

      const newState = gameStateService.state();
      expect(newState.roster.has('char-1')).toBe(true);
      expect(component.showDeleteConfirmation()).toBe(false);
    });
  });

  describe('returnToCastle', () => {
    it('navigates to castle-menu', () => {
      component.returnToCastle();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- training-grounds.component`
Expected: FAIL with multiple errors (methods don't exist)

**Step 3: Implement TrainingGrounds smart component**

Modify `src/app/training-grounds/training-grounds.component.ts`:

```typescript
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { CharacterService } from '../../services/CharacterService';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';
import { Party } from '../../types/Party';
import { SceneType } from '../../types/SceneType';

interface CharacterWithStatus {
  character: Character;
  status: CharacterStatus;
}

/**
 * Training Grounds Component - Roster Management Hub
 *
 * Responsibilities:
 * - Display available characters (not in party)
 * - Navigate to character creation wizard
 * - Navigate to character inspection
 * - Handle character deletion with confirmation
 * - Coordinate state updates via services
 */
@Component({
  selector: 'app-training-grounds',
  standalone: true,
  imports: [CommonModule, CharacterCardComponent, ConfirmationDialogComponent],
  templateUrl: './training-grounds.component.html',
  styleUrls: ['./training-grounds.component.scss']
})
export class TrainingGroundsComponent implements OnInit {
  // Confirmation dialog state
  readonly showDeleteConfirmation = signal(false);
  readonly deleteConfirmationMessage = signal('');
  private pendingDeleteId: string | null = null;

  // Computed available characters
  readonly availableCharacters = computed<CharacterWithStatus[]>(() => {
    const state = this.gameState.state();
    const party = this.gameState.party();

    return Array.from(state.roster.values())
      .filter(char => !party.members.includes(char.id))
      .map(char => ({
        character: char,
        status: this.getCharacterStatus(char, party)
      }));
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Update scene type
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }));
  }

  /**
   * Navigate to character creation wizard
   */
  handleCreateCharacter(): void {
    this.router.navigate(['/character-creation']);
  }

  /**
   * Navigate to character inspection
   */
  handleInspectCharacter(characterId: string): void {
    this.router.navigate(['/character-inspection'], {
      queryParams: {
        characterId,
        returnTo: 'training-grounds'
      }
    });
  }

  /**
   * Show confirmation dialog for character deletion
   */
  handleDeleteCharacter(characterId: string): void {
    const character = this.gameState.state().roster.get(characterId);
    if (!character) return;

    this.pendingDeleteId = characterId;
    this.deleteConfirmationMessage.set(
      `Are you sure you want to delete ${character.name}? This action cannot be undone.`
    );
    this.showDeleteConfirmation.set(true);
  }

  /**
   * Confirm deletion and update state
   */
  confirmDelete(): void {
    if (!this.pendingDeleteId) return;

    try {
      const currentState = this.gameState.state();
      const newState = CharacterService.deleteCharacter(currentState, this.pendingDeleteId);
      this.gameState.setState(newState);
    } catch (error) {
      console.error('Failed to delete character:', error);
      // In production, show error toast/message to user
    }

    this.closeDeleteDialog();
  }

  /**
   * Cancel deletion
   */
  cancelDelete(): void {
    this.closeDeleteDialog();
  }

  /**
   * Return to castle menu
   */
  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Get character status for display
   */
  private getCharacterStatus(char: Character, party: Party): CharacterStatus {
    if (party.members.includes(char.id)) return 'IN_MAZE';
    if (char.status === 'DEAD') return 'DEAD';
    if (char.status === 'ASHES') return 'ASHES';
    return 'OK';
  }

  /**
   * Close confirmation dialog and reset state
   */
  private closeDeleteDialog(): void {
    this.showDeleteConfirmation.set(false);
    this.deleteConfirmationMessage.set('');
    this.pendingDeleteId = null;
  }
}
```

**Step 4: Create TrainingGrounds template**

Modify `src/app/training-grounds/training-grounds.component.html`:

```html
<div class="training-grounds">
  <!-- Title -->
  <header class="scene-header">
    <h1>TRAINING GROUNDS</h1>
  </header>

  <!-- Character Cards Grid -->
  <main class="character-grid">
    @if (availableCharacters().length === 0) {
      <div class="empty-state">
        <p>No characters available</p>
        <p>Create your first adventurer to begin!</p>
      </div>
    } @else {
      @for (item of availableCharacters(); track item.character.id) {
        <app-character-card
          [character]="item.character"
          [status]="item.status"
          (inspect)="handleInspectCharacter($event)"
          (delete)="handleDeleteCharacter($event)">
        </app-character-card>
      }
    }
  </main>

  <!-- Navigation Footer -->
  <footer class="scene-footer">
    <button class="nav-button" (click)="handleCreateCharacter()">
      [C] Create Character
    </button>
    <button class="nav-button" (click)="returnToCastle()">
      [L] Return to Castle
    </button>
  </footer>

  <!-- Confirmation Dialog -->
  @if (showDeleteConfirmation()) {
    <app-confirmation-dialog
      [title]="'Delete Character?'"
      [message]="deleteConfirmationMessage()"
      (confirm)="confirmDelete()"
      (cancel)="cancelDelete()">
    </app-confirmation-dialog>
  }
</div>
```

**Step 5: Create TrainingGrounds styles**

Modify `src/app/training-grounds/training-grounds.component.scss`:

```scss
.training-grounds {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  color: #0f0;
  font-family: 'Courier New', monospace;

  .scene-header {
    padding: 1rem;
    border-bottom: 2px solid #0f0;
    text-align: center;

    h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #0f0;
    }
  }

  .character-grid {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    align-content: start;

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 3rem 1rem;
      border: 2px dashed #0f0;
      margin: 2rem;

      p {
        margin: 0.5rem 0;
        font-size: 1.1rem;

        &:first-child {
          font-weight: bold;
          font-size: 1.3rem;
        }
      }
    }
  }

  .scene-footer {
    padding: 1rem;
    border-top: 2px solid #0f0;
    display: flex;
    gap: 1rem;
    justify-content: center;

    .nav-button {
      background: #000;
      border: 2px solid #0f0;
      color: #0f0;
      padding: 0.75rem 1.5rem;
      font-family: 'Courier New', monospace;
      font-size: 1rem;
      cursor: pointer;
      min-width: 200px;

      &:hover {
        background: #0f0;
        color: #000;
      }

      &:active {
        transform: translateY(2px);
      }
    }
  }

  // Responsive
  @media (max-width: 768px) {
    .character-grid {
      grid-template-columns: 1fr;
    }

    .scene-footer {
      flex-direction: column;

      .nav-button {
        width: 100%;
      }
    }
  }
}
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- training-grounds.component`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/app/training-grounds/
git commit -m "refactor(training-grounds): convert to smart component with card-based UI

- Display available characters (exclude party members) in grid
- Integrate CharacterCard component for display
- Add event handlers for inspect, delete, create
- Show confirmation dialog for deletion
- Compute character status (OK/IN_MAZE/DEAD/ASHES)
- Navigate to character-creation and character-inspection routes
- Responsive grid layout (3 cols desktop, 1 col mobile)
- Empty state when no characters available
- Full test coverage for roster filtering and actions"
```

---

## Task 5: Integration Testing with Playwright

**Files:**
- Create: `e2e/training-grounds.spec.ts` (if using Playwright)

**Step 1: Write integration test for full workflow**

Create `e2e/training-grounds.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Training Grounds', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200');
    // Navigate to training grounds
    await page.keyboard.press('Enter'); // Title screen
    await page.keyboard.press('G'); // Castle menu -> Training Grounds
  });

  test('displays empty state when no characters', async ({ page }) => {
    // Assuming fresh state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('text=No characters available')).toBeVisible();
  });

  test('navigates to character creation', async ({ page }) => {
    await page.click('button:has-text("Create Character")');
    await expect(page).toHaveURL(/.*character-creation/);
  });

  test('full workflow: create, view, inspect, delete character', async ({ page }) => {
    // Create character
    await page.click('button:has-text("Create Character")');

    // Complete wizard (simplified - adjust selectors based on actual wizard)
    await page.click('button:has-text("HUMAN")');
    await page.click('button:has-text("GOOD")');
    await page.click('button:has-text("Roll Stats")');
    await page.click('button:has-text("Accept")');
    await page.click('button:has-text("FIGHTER")');
    await page.fill('input[name="name"]', 'TestHero');
    await page.fill('input[name="password"]', 'secret');
    await page.click('button:has-text("Confirm")');

    // Should return to training grounds
    await expect(page).toHaveURL(/.*training-grounds/);

    // Character should appear in grid
    await expect(page.locator('app-character-card')).toBeVisible();
    await expect(page.locator('text=TestHero')).toBeVisible();

    // Inspect character
    await page.click('.inspect-btn');
    await expect(page).toHaveURL(/.*character-inspection.*characterId=.*/);
    await expect(page).toHaveURL(/.*returnTo=training-grounds/);

    // Return to training grounds
    await page.click('button:has-text("Back")');
    await expect(page).toHaveURL(/.*training-grounds/);

    // Delete character
    await page.click('.delete-btn');

    // Confirmation dialog appears
    await expect(page.locator('app-confirmation-dialog')).toBeVisible();
    await expect(page.locator('text=Delete Character?')).toBeVisible();
    await expect(page.locator('text=TestHero')).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Character removed from grid
    await expect(page.locator('app-character-card')).not.toBeVisible();
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('cancel deletion keeps character', async ({ page }) => {
    // Assume character exists (create one first if needed)
    // Click delete
    await page.click('.delete-btn');

    // Cancel deletion
    await page.click('button:has-text("Cancel")');

    // Dialog closes
    await expect(page.locator('app-confirmation-dialog')).not.toBeVisible();

    // Character still visible
    await expect(page.locator('app-character-card')).toBeVisible();
  });

  test('returns to castle menu', async ({ page }) => {
    await page.click('button:has-text("Return to Castle")');
    await expect(page).toHaveURL(/.*castle-menu/);
  });
});
```

**Step 2: Run integration tests**

Run: `npm start` (in one terminal)
Run: `npx playwright test e2e/training-grounds.spec.ts` (in another terminal)

Expected: All integration tests PASS

**Step 3: Fix any issues found during integration testing**

If tests fail, debug and fix issues. Common problems:
- Selector mismatches
- Timing issues (add waits)
- Navigation not working
- State not updating

**Step 4: Commit**

```bash
git add e2e/training-grounds.spec.ts
git commit -m "test(training-grounds): add Playwright integration tests

- Test empty state display
- Test navigation to character creation
- Test full workflow: create, inspect, delete character
- Test delete confirmation and cancellation
- Test navigation back to castle menu
- End-to-end verification of card-based UI"
```

---

## Task 6: Documentation Update

**Files:**
- Modify: `docs/ui/scenes/02-training-grounds.md`
- Create: `docs/components/character-card.md`

**Step 1: Update Training Grounds documentation**

Modify `docs/ui/scenes/02-training-grounds.md`:

Add section describing new card-based UI:

```markdown
## Current Implementation

### Architecture
- **Smart Component**: TrainingGrounds orchestrates workflows
- **Presentational Component**: CharacterCard displays character data
- **Event-Driven**: Cards emit events, parent handles state updates
- **Immutable State**: All updates via CharacterService pure functions

### UI Layout
```
┌─────────────────────────────────────┐
│       TRAINING GROUNDS       [TITLE]│
├─────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐        │
│  │Character │  │Character │  [GRID]│
│  │  Card 1  │  │  Card 2  │        │
│  └──────────┘  └──────────┘        │
├─────────────────────────────────────┤
│ [Create] [Return to Castle]  [NAV] │
└─────────────────────────────────────┘
```

### Character Card
- **Display**: Name, Race, Class, Level, Status Badge
- **Actions**: Inspect button, Delete button
- **Status Colors**:
  - Green (OK) - Available
  - Yellow (IN_MAZE) - In party
  - Red (DEAD) - Needs resurrection
  - Dark Red (ASHES) - Critical state

### Workflows
1. **Create Character**: Navigate to /character-creation wizard
2. **Inspect Character**: Navigate to /character-inspection with returnTo param
3. **Delete Character**: Show confirmation dialog → Call CharacterService → Update state
4. **Return to Castle**: Navigate to /castle-menu

### Component Responsibilities
- **TrainingGrounds**: Filter roster, compute status, handle events, coordinate navigation
- **CharacterCard**: Display data, emit user actions
- **CharacterService**: Delete character (validation, immutable update)
- **GameStateService**: State management and persistence
```

**Step 2: Create CharacterCard component documentation**

Create `docs/components/character-card.md`:

```markdown
# CharacterCard Component

## Overview
Presentational component for displaying character information with action buttons.

## Type
**Presentational Component** - No service injection, pure display and event emission

## Inputs
- `character: Character` - Character data to display
- `status: CharacterStatus` - Computed status (OK, IN_MAZE, DEAD, ASHES)

## Outputs
- `inspect: EventEmitter<string>` - Emits character ID when Inspect clicked
- `delete: EventEmitter<string>` - Emits character ID when Delete clicked

## Display Elements
1. **Header**: Character name + status badge (color-coded)
2. **Body**: Race, Class, Level
3. **Actions**: Inspect and Delete buttons

## Visual Design
- Wizardry green-on-black aesthetic
- Color-coded status badges:
  - `OK`: Green (#0f0)
  - `IN_MAZE`: Yellow (#ff0)
  - `DEAD`: Red (#f00)
  - `ASHES`: Dark Red (#a00)
- Hover effects on buttons
- Delete button turns red on hover

## Usage Example
```typescript
<app-character-card
  [character]="character"
  [status]="'OK'"
  (inspect)="handleInspect($event)"
  (delete)="handleDelete($event)">
</app-character-card>
```

## Responsibilities
✅ Display character data
✅ Emit user action events
❌ No business logic
❌ No service injection
❌ No state management

## Testing
- Renders all character data correctly
- Emits inspect event with character ID
- Emits delete event with character ID
- Displays status badge with correct color
- Buttons have correct hover states
```

**Step 3: Commit**

```bash
git add docs/ui/scenes/02-training-grounds.md docs/components/character-card.md
git commit -m "docs: update training grounds and add character card documentation

- Document new card-based UI architecture
- Describe smart/presentational component pattern
- Add visual layout diagram
- Document workflows and responsibilities
- Create CharacterCard component reference
- Include usage examples and testing guidelines"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] CharacterCard component displays correctly with all data
- [ ] Status badges show correct colors (OK=green, IN_MAZE=yellow, DEAD=red, ASHES=dark red)
- [ ] Character grid filters out party members
- [ ] Empty state shows when no characters available
- [ ] "Create Character" navigates to /character-creation
- [ ] Character creation wizard still works (all 7 steps)
- [ ] Completing wizard returns to training-grounds and shows new character
- [ ] "Inspect" button navigates to /character-inspection with correct query params
- [ ] Character inspection can navigate back to training-grounds
- [ ] "Delete" button shows confirmation dialog
- [ ] Confirmation dialog shows character name
- [ ] Confirming deletion removes character from roster and grid
- [ ] Canceling deletion closes dialog and keeps character
- [ ] "Return to Castle" navigates to /castle-menu
- [ ] All unit tests pass (npm test)
- [ ] All integration tests pass (Playwright)
- [ ] Responsive layout works (desktop 2-3 columns, mobile 1 column)
- [ ] Documentation updated and accurate

## Success Metrics

✅ Training Grounds is now a roster management hub
✅ Card-based UI is modern and intuitive
✅ All character operations work (create, inspect, delete)
✅ SOLID principles maintained (SRP, OCP, DIP)
✅ DRY - CharacterCard reusable component
✅ Immutable state - predictable updates
✅ Event-driven - decoupled architecture
✅ Fully tested - unit and integration coverage
✅ Documented - implementation and component docs
