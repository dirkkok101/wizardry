# Training Grounds Card UI - REVISED Plan Part 2 (Tasks 4-7)

> This is a continuation of `2025-02-11-training-grounds-card-ui-REVISED.md`

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
import { createTestCharacter, createEmptyParty } from '../../../test-helpers/test-factories';
import { SceneType } from '../../../types/SceneType';
import { CharacterStatus } from '../../../types/CharacterStatus';

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
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2],
          [char3.id, char3]
        ]),
        party: {
          members: [char2.id], // Frodo is in party
          formation: { frontRow: [char2.id], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' as const },
          light: false,
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
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
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: {
          members: [char.id],
          formation: { frontRow: [char.id], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' as const },
          light: false,
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };

      gameStateService.setState(state);
      fixture.detectChanges();

      expect(component.availableCharacters().length).toBe(0);
    });

    it('computes status correctly', () => {
      const char = createTestCharacter({
        id: 'char-1',
        status: CharacterStatus.OK
      });
      const state = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };

      gameStateService.setState(state);
      fixture.detectChanges();

      const available = component.availableCharacters();
      expect(available[0].status).toBe(CharacterStatus.OK);
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
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
      };
      gameStateService.setState(state);

      component.handleDeleteCharacter('char-1');

      expect(component.showDeleteConfirmation()).toBe(true);
      expect(component.deleteConfirmationMessage()).toContain('Gandalf');
    });

    it('deletes character on confirmation', () => {
      const char = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const state = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
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
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL' as const,
          soundEnabled: true,
          musicEnabled: true
        }
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

Replace entire contents of `src/app/training-grounds/training-grounds.component.ts` with:

```typescript
import { Component, OnInit, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { CharacterService } from '../../services/CharacterService';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';
import { Party } from '../../types/GameState';
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
   * Handle keyboard shortcuts
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'c') {
      this.handleCreateCharacter();
      event.preventDefault();
    } else if (key === 'l') {
      this.returnToCastle();
      event.preventDefault();
    }
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
      // TODO: Show error toast/message to user
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
    if (party.members.includes(char.id)) return CharacterStatus.IN_MAZE;
    if (char.status === CharacterStatus.DEAD) return CharacterStatus.DEAD;
    if (char.status === CharacterStatus.ASHES) return CharacterStatus.ASHES;
    return CharacterStatus.OK;
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

Replace entire contents of `src/app/training-grounds/training-grounds.component.html` with:

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

Replace entire contents of `src/app/training-grounds/training-grounds.component.scss` with:

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

**Step 7: Verify reactivity - new character appears automatically**

Run: `npm start`

Manual test:
1. Navigate to http://localhost:4200/training-grounds
2. Verify empty state shows
3. Click "Create Character"
4. Complete wizard (create a character named "TestHero")
5. After 1.5 seconds, verify navigation returns to training-grounds
6. **Verify new character card appears immediately without page refresh**
7. Verify status badge shows "OK" in green

Expected: Character card appears automatically due to computed signal reactivity

**Step 8: Commit**

```bash
git add src/app/training-grounds/
git commit -m "refactor(training-grounds): convert to smart component with card-based UI

- Display available characters (exclude party members) in grid
- Integrate CharacterCard component for display
- Add event handlers for inspect, delete, create
- Show confirmation dialog for deletion
- Compute character status (OK/IN_MAZE/DEAD/ASHES)
- Navigate to character-creation and character-inspection routes
- Add keyboard shortcuts: C=create, L=leave
- Responsive grid layout (3 cols desktop, 1 col mobile)
- Empty state when no characters available
- Computed signal ensures automatic reactivity on state changes
- Full test coverage for roster filtering and actions"
```

---

## Task 5: Integration Testing with Playwright

**Files:**
- Create: `e2e/training-grounds.spec.ts`

**Step 1: Write integration test for full workflow**

Create `e2e/training-grounds.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Training Grounds', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200');
    await page.waitForLoadState('networkidle');
  });

  test('displays training grounds via castle menu', async ({ page }) => {
    // Navigate from title screen
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/.*castle-menu/);

    // Navigate to training grounds
    await page.keyboard.press('G');
    await expect(page).toHaveURL(/.*training-grounds/);
    await expect(page.locator('h1')).toContainText('TRAINING GROUNDS');
  });

  test('displays empty state when no characters', async ({ page }) => {
    // Navigate to training grounds
    await page.keyboard.press('Enter');
    await page.keyboard.press('G');

    // Check empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('text=No characters available')).toBeVisible();
  });

  test('navigates to character creation via button', async ({ page }) => {
    await page.keyboard.press('Enter');
    await page.keyboard.press('G');

    await page.click('button:has-text("Create Character")');
    await expect(page).toHaveURL(/.*character-creation/);
  });

  test('navigates to character creation via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Enter');
    await page.keyboard.press('G');
    await page.keyboard.press('c');

    await expect(page).toHaveURL(/.*character-creation/);
  });

  test('full workflow: create, view, inspect, delete character', async ({ page }) => {
    // Navigate to training grounds
    await page.keyboard.press('Enter');
    await page.keyboard.press('G');

    // Create character
    await page.click('button:has-text("Create Character")');

    // Step 1: Select race (HUMAN)
    await page.click('button:has-text("HUMAN")');

    // Step 2: Select alignment (GOOD)
    await page.waitForSelector('button:has-text("GOOD")');
    await page.click('button:has-text("GOOD")');

    // Step 3: Roll stats
    await page.waitForSelector('button:has-text("Roll")');
    await page.click('button:has-text("Roll")');

    // Accept stats
    await page.waitForSelector('button:has-text("Accept")');
    await page.click('button:has-text("Accept")');

    // Step 4: Skip bonus allocation (click Continue)
    await page.waitForSelector('button:has-text("Continue")');
    await page.click('button:has-text("Continue")');

    // Step 5: Select class (FIGHTER should be available)
    await page.waitForSelector('button:has-text("FIGHTER")');
    await page.click('button:has-text("FIGHTER")');

    // Step 6: Enter name and password
    await page.waitForSelector('input[name="name"]');
    await page.fill('input[name="name"]', 'TestHero');
    await page.fill('input[name="password"]', 'secret123');
    await page.click('button:has-text("Continue")');

    // Step 7: Confirm creation
    await page.waitForSelector('button:has-text("Confirm")');
    await page.click('button:has-text("Confirm")');

    // Wait for success message
    await expect(page.locator('text=created successfully')).toBeVisible();

    // Should auto-navigate to training grounds
    await page.waitForURL(/.*training-grounds/, { timeout: 3000 });

    // Character should appear in grid
    await expect(page.locator('app-character-card')).toBeVisible();
    await expect(page.locator('text=TestHero')).toBeVisible();
    await expect(page.locator('.status-badge:has-text("OK")')).toBeVisible();

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
    // Pre-requisite: create a character first
    // (simplified - assume character exists from previous test or setup)

    await page.keyboard.press('Enter');
    await page.keyboard.press('G');

    // Verify character exists
    const hasCard = await page.locator('app-character-card').count();
    if (hasCard === 0) {
      test.skip('No character available for deletion test');
    }

    // Click delete
    await page.click('.delete-btn');

    // Cancel deletion
    await page.click('button:has-text("Cancel")');

    // Dialog closes
    await expect(page.locator('app-confirmation-dialog')).not.toBeVisible();

    // Character still visible
    await expect(page.locator('app-character-card')).toBeVisible();
  });

  test('returns to castle menu via button', async ({ page }) => {
    await page.keyboard.press('Enter');
    await page.keyboard.press('G');

    await page.click('button:has-text("Return to Castle")');
    await expect(page).toHaveURL(/.*castle-menu/);
  });

  test('returns to castle menu via keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Enter');
    await page.keyboard.press('G');
    await page.keyboard.press('l');

    await expect(page).toHaveURL(/.*castle-menu/);
  });
});
```

**Step 2: Run integration tests**

Terminal 1:
```bash
npm start
```

Terminal 2 (wait for server to start):
```bash
npx playwright test e2e/training-grounds.spec.ts
```

Expected: All integration tests PASS

**Step 3: Fix any issues found during integration testing**

If tests fail, debug and fix issues. Common problems:
- Selector mismatches (verify actual button/input names in wizard)
- Timing issues (add `page.waitForSelector()` calls)
- Navigation not working (verify routes are correct)
- State not updating (check GameStateService reactivity)

**Step 4: Commit**

```bash
git add e2e/training-grounds.spec.ts
git commit -m "test(training-grounds): add Playwright integration tests

- Test empty state display
- Test navigation to character creation (button + keyboard)
- Test full workflow: create, inspect, delete character
- Test delete confirmation and cancellation
- Test navigation back to castle menu (button + keyboard)
- End-to-end verification of card-based UI
- Keyboard shortcut testing (C=create, L=leave)"
```

---

## Task 6: Documentation Update

**Files:**
- Modify: `docs/ui/scenes/02-training-grounds.md`
- Create: `docs/components/character-card.md`

**Step 1: Update Training Grounds documentation**

Read existing content: `docs/ui/scenes/02-training-grounds.md`

Append new section at end of file:

```markdown
---

## Current Implementation (Card-Based UI)

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
  - Green (OK) - Available for recruitment
  - Yellow (IN_MAZE) - Currently in party
  - Red (DEAD) - Needs resurrection
  - Dark Red (ASHES) - Critical state

### Workflows
1. **Create Character**: Navigate to /character-creation wizard
2. **Inspect Character**: Navigate to /character-inspection with returnTo param
3. **Delete Character**: Show confirmation dialog → Call CharacterService → Update state
4. **Return to Castle**: Navigate to /castle-menu

### Keyboard Shortcuts
- **C** - Create new character
- **L** - Leave (return to castle menu)

### Component Responsibilities
- **TrainingGrounds**: Filter roster, compute status, handle events, coordinate navigation
- **CharacterCard**: Display data, emit user actions
- **CharacterService**: Delete character (validation, immutable update)
- **GameStateService**: State management and persistence

### Reactivity
- Uses Angular computed signals for `availableCharacters`
- Automatically updates when GameState changes
- New characters appear immediately after creation
- Deleted characters disappear immediately from grid
```

**Step 2: Create CharacterCard component documentation**

Create `docs/components/character-card.md`:

```markdown
# CharacterCard Component

## Overview
Presentational component for displaying character information with action buttons.

## Type
**Presentational Component** - No service injection, pure display and event emission

## Location
`src/components/character-card/character-card.component.ts`

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
  [status]="CharacterStatus.OK"
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

## Dependencies
- `Character` type from `types/Character`
- `CharacterStatus` type from `types/CharacterStatus`

## Used By
- TrainingGroundsComponent
- (Future: Tavern, Temple, other roster displays)

## Design Rationale
Follows presentational component pattern to maximize reusability. Parent components compute derived data (like status) and handle all business logic. This component focuses solely on display and event emission.
```

**Step 3: Commit**

```bash
git add docs/ui/scenes/02-training-grounds.md docs/components/character-card.md
git commit -m "docs: update training grounds and add character card documentation

- Document new card-based UI architecture
- Describe smart/presentational component pattern
- Add visual layout diagram
- Document workflows and responsibilities
- Document keyboard shortcuts (C, L)
- Create CharacterCard component reference
- Include usage examples and testing guidelines
- Explain reactivity with computed signals"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] CharacterCard component displays correctly with all data
- [ ] Status badges show correct colors (OK=green, IN_MAZE=yellow, DEAD=red, ASHES=dark red)
- [ ] Character grid filters out party members
- [ ] Empty state shows when no characters available
- [ ] "Create Character" button navigates to /character-creation
- [ ] Keyboard shortcut 'C' navigates to /character-creation
- [ ] Character creation wizard still works (all 7 steps)
- [ ] Completing wizard shows success message
- [ ] Completing wizard navigates to training-grounds after 1.5s
- [ ] New character appears in grid automatically (reactivity works)
- [ ] "Inspect" button navigates to /character-inspection with correct query params
- [ ] Character inspection can navigate back to training-grounds
- [ ] "Delete" button shows confirmation dialog
- [ ] Confirmation dialog shows character name
- [ ] Confirming deletion removes character from roster and grid
- [ ] Canceling deletion closes dialog and keeps character
- [ ] "Return to Castle" button navigates to /castle-menu
- [ ] Keyboard shortcut 'L' navigates to /castle-menu
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
✅ Keyboard shortcuts for power users
✅ Fully tested - unit and integration coverage
✅ Documented - implementation and component docs
✅ Reactive - automatic UI updates on state changes
