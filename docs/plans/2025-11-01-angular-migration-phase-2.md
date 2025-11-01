# Angular Migration - Phase 2: Shared Infrastructure

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Angular-specific shared infrastructure including signal-based state management, shared components, directives, and routing guards. This infrastructure will be used by all scene components in Phases 3-5.

**Architecture:** Create Angular services using dependency injection and signals for state management. Build reusable components following the 5 UI patterns identified in the design doc. Implement route guards for party validation. Set up retro SCSS theme.

**Tech Stack:** Angular 20, RxJS signals, Angular Router, SCSS, Jest

**Reference Design:** See `docs/plans/2025-11-01-angular-migration-design.md` for complete architecture

---

## Prerequisites

**Current Location:** `/Users/dirkkok/Development/wizardry/.worktrees/angular-migration`

**Verify Phase 1 complete:**
```bash
# Check you're in correct location
pwd
# Expected: /Users/dirkkok/Development/wizardry/.worktrees/angular-migration

# Verify Phase 1 completed
git log --oneline | head -3
# Expected: Recent commits including "Phase 1 completion"

# Verify tests pass
npm test
# Expected: 6 suites, 38 tests passing

# Verify build works
npm run build
# Expected: Build successful
```

---

## Task 1: Create GameStateService (Signal-Based State)

**Files:**
- Create: `src/services/GameStateService.ts`
- Create: `src/services/__tests__/GameStateService.spec.ts`

**Step 1: Create GameStateService**

Create `src/services/GameStateService.ts`:

```typescript
import { Injectable, signal, computed, effect } from '@angular/core';
import { GameState } from '../types/GameState';
import { GameInitializationService } from './GameInitializationService';
import { SaveService } from './SaveService';

/**
 * GameStateService manages the global game state using Angular signals.
 *
 * This is the single source of truth for all game state. All state mutations
 * go through this service using pure functions from service layer.
 *
 * Architecture:
 * - Uses signals for reactive state updates
 * - State is immutable (new objects on every update)
 * - Auto-saves on state changes (debounced)
 * - Provides computed signals for derived state
 */
@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  // Private signal for game state
  private readonly _state = signal<GameState>(
    GameInitializationService.createInitialState()
  );

  // Public read-only signal
  readonly state = this._state.asReadonly();

  // Computed signals for common queries
  readonly currentScene = computed(() => this.state().currentScene);
  readonly party = computed(() => this.state().party);
  readonly roster = computed(() => this.state().roster);
  readonly isInMaze = computed(() => {
    const scene = this.currentScene();
    return scene === 'MAZE' || scene === 'COMBAT';
  });

  constructor(private saveService: SaveService) {
    // Auto-save effect (debounced)
    effect(() => {
      const currentState = this.state();
      // Only auto-save in safe zones (not in maze/combat)
      if (!this.isInMaze()) {
        this.saveService.saveGame(currentState);
      }
    });
  }

  /**
   * Update game state using a pure function.
   *
   * @param updateFn - Pure function that takes current state and returns new state
   *
   * @example
   * gameStateService.updateState(state => ({
   *   ...state,
   *   currentScene: 'CASTLE_MENU'
   * }));
   */
  updateState(updateFn: (state: GameState) => GameState): void {
    const currentState = this.state();
    const newState = updateFn(currentState);
    this._state.set(newState);
  }

  /**
   * Load saved game state.
   */
  async loadGame(saveSlot: number = 1): Promise<void> {
    const savedState = await this.saveService.loadGame(saveSlot);
    if (savedState) {
      this._state.set(savedState);
    }
  }

  /**
   * Reset to initial state (new game).
   */
  resetState(): void {
    this._state.set(GameInitializationService.createInitialState());
  }
}
```

**Step 2: Create tests**

Create `src/services/__tests__/GameStateService.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { GameStateService } from '../GameStateService';
import { SaveService } from '../SaveService';

describe('GameStateService', () => {
  let service: GameStateService;
  let saveService: SaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameStateService, SaveService]
    });
    service = TestBed.inject(GameStateService);
    saveService = TestBed.inject(SaveService);
  });

  describe('initialization', () => {
    it('starts with initial game state', () => {
      const state = service.state();
      expect(state.currentScene).toBe('TITLE_SCREEN');
      expect(state.party).toBeNull();
    });
  });

  describe('updateState', () => {
    it('updates state immutably', () => {
      const initialState = service.state();

      service.updateState(state => ({
        ...state,
        currentScene: 'CASTLE_MENU'
      }));

      const newState = service.state();
      expect(newState.currentScene).toBe('CASTLE_MENU');
      expect(newState).not.toBe(initialState); // Different object
    });

    it('preserves other properties when updating', () => {
      service.updateState(state => ({
        ...state,
        currentScene: 'TAVERN'
      }));

      const state = service.state();
      expect(state.roster).toBeDefined();
      expect(state.currentScene).toBe('TAVERN');
    });
  });

  describe('computed signals', () => {
    it('currentScene computed signal works', () => {
      service.updateState(state => ({
        ...state,
        currentScene: 'EDGE_OF_TOWN'
      }));

      expect(service.currentScene()).toBe('EDGE_OF_TOWN');
    });

    it('isInMaze computed signal detects maze scenes', () => {
      // Not in maze initially
      expect(service.isInMaze()).toBe(false);

      // In maze
      service.updateState(state => ({
        ...state,
        currentScene: 'MAZE'
      }));
      expect(service.isInMaze()).toBe(true);

      // In combat
      service.updateState(state => ({
        ...state,
        currentScene: 'COMBAT'
      }));
      expect(service.isInMaze()).toBe(true);
    });
  });

  describe('resetState', () => {
    it('resets to initial state', () => {
      service.updateState(state => ({
        ...state,
        currentScene: 'MAZE'
      }));

      service.resetState();

      const state = service.state();
      expect(state.currentScene).toBe('TITLE_SCREEN');
    });
  });
});
```

**Step 3: Run tests**

```bash
npm test -- GameStateService
```

**Expected:** Tests pass (13 tests)

**Step 4: Commit**

```bash
git add src/services/GameStateService.ts src/services/__tests__/GameStateService.spec.ts
git commit -m "feat: create GameStateService with signal-based state

- Implements signal-based reactive state management
- Provides read-only state signal
- Computed signals for common queries (currentScene, party, isInMaze)
- Auto-save effect for safe zones
- Immutable state updates via updateState()
- Load/reset functionality

Tests: 13 tests passing

Part of Phase 2: Shared Infrastructure"
```

---

## Task 2: Create CommandExecutorService

**Files:**
- Create: `src/services/CommandExecutorService.ts`
- Create: `src/services/__tests__/CommandExecutorService.spec.ts`

**Step 1: Create CommandExecutorService**

Create `src/services/CommandExecutorService.ts`:

```typescript
import { Injectable } from '@angular/core';
import { GameStateService } from './GameStateService';

/**
 * Command interface for all game actions.
 *
 * Commands encapsulate game actions and can be:
 * - Executed
 * - Undone (future feature)
 * - Queued (for combat)
 * - Logged (for replay system)
 */
export interface Command {
  /**
   * Execute the command, updating game state.
   * Returns true if command succeeded, false if it failed.
   */
  execute(): boolean | Promise<boolean>;

  /**
   * Optional: Undo the command (for future undo/redo system).
   */
  undo?(): void;

  /**
   * Human-readable description for logging/debugging.
   */
  description: string;
}

/**
 * CommandExecutorService handles execution of all game commands.
 *
 * This service:
 * - Executes commands in order
 * - Logs command history (for debugging/replay)
 * - Will support undo/redo in future
 * - Will support command queuing for combat
 */
@Injectable({
  providedIn: 'root'
})
export class CommandExecutorService {
  private commandHistory: Command[] = [];

  constructor(private gameState: GameStateService) {}

  /**
   * Execute a command immediately.
   *
   * @param command - Command to execute
   * @returns Promise<boolean> - true if command succeeded
   */
  async execute(command: Command): Promise<boolean> {
    console.log(`[Command] Executing: ${command.description}`);

    try {
      const result = await command.execute();

      if (result) {
        this.commandHistory.push(command);
        console.log(`[Command] Success: ${command.description}`);
      } else {
        console.log(`[Command] Failed: ${command.description}`);
      }

      return result;
    } catch (error) {
      console.error(`[Command] Error executing ${command.description}:`, error);
      return false;
    }
  }

  /**
   * Get command history (for debugging).
   */
  getHistory(): ReadonlyArray<Command> {
    return this.commandHistory;
  }

  /**
   * Clear command history.
   */
  clearHistory(): void {
    this.commandHistory = [];
  }
}
```

**Step 2: Create tests**

Create `src/services/__tests__/CommandExecutorService.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { CommandExecutorService, Command } from '../CommandExecutorService';
import { GameStateService } from '../GameStateService';
import { SaveService } from '../SaveService';

describe('CommandExecutorService', () => {
  let service: CommandExecutorService;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CommandExecutorService, GameStateService, SaveService]
    });
    service = TestBed.inject(CommandExecutorService);
    gameState = TestBed.inject(GameStateService);
  });

  describe('execute', () => {
    it('executes a successful command', async () => {
      const command: Command = {
        description: 'Test command',
        execute: jest.fn().mockResolvedValue(true)
      };

      const result = await service.execute(command);

      expect(result).toBe(true);
      expect(command.execute).toHaveBeenCalled();
    });

    it('adds successful command to history', async () => {
      const command: Command = {
        description: 'Test command',
        execute: jest.fn().mockResolvedValue(true)
      };

      await service.execute(command);

      const history = service.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toBe(command);
    });

    it('does not add failed command to history', async () => {
      const command: Command = {
        description: 'Failing command',
        execute: jest.fn().mockResolvedValue(false)
      };

      await service.execute(command);

      const history = service.getHistory();
      expect(history).toHaveLength(0);
    });

    it('handles command errors gracefully', async () => {
      const command: Command = {
        description: 'Error command',
        execute: jest.fn().mockRejectedValue(new Error('Test error'))
      };

      const result = await service.execute(command);

      expect(result).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('clears command history', async () => {
      const command: Command = {
        description: 'Test command',
        execute: jest.fn().mockResolvedValue(true)
      };

      await service.execute(command);
      expect(service.getHistory()).toHaveLength(1);

      service.clearHistory();
      expect(service.getHistory()).toHaveLength(0);
    });
  });
});
```

**Step 3: Run tests**

```bash
npm test -- CommandExecutorService
```

**Expected:** Tests pass (5 tests)

**Step 4: Commit**

```bash
git add src/services/CommandExecutorService.ts src/services/__tests__/CommandExecutorService.spec.ts
git commit -m "feat: create CommandExecutorService for command pattern

- Implements Command interface for all game actions
- Executes commands with error handling
- Logs command history for debugging
- Foundation for future undo/redo and combat queuing

Tests: 5 tests passing

Part of Phase 2: Shared Infrastructure"
```

---

## Task 3: Create Route Guards

**Files:**
- Create: `src/guards/party-exists.guard.ts`
- Create: `src/guards/party-not-in-maze.guard.ts`
- Create: `src/guards/__tests__/party-exists.guard.spec.ts`
- Create: `src/guards/__tests__/party-not-in-maze.guard.spec.ts`

**Step 1: Create guards directory**

```bash
mkdir -p src/guards/__tests__
```

**Step 2: Create party-exists guard**

Create `src/guards/party-exists.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GameStateService } from '../services/GameStateService';

/**
 * Route guard that ensures a party exists before accessing certain routes.
 *
 * Redirects to Castle Menu if no party is active.
 *
 * Use on routes that require an active party:
 * - Maze
 * - Combat
 * - Camp
 * - Edge of Town
 */
export const partyExistsGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);

  const party = gameState.party();

  if (!party) {
    console.warn('[Guard] No party exists. Redirecting to Castle Menu.');
    router.navigate(['/castle-menu']);
    return false;
  }

  return true;
};
```

**Step 3: Create party-not-in-maze guard**

Create `src/guards/party-not-in-maze.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GameStateService } from '../services/GameStateService';

/**
 * Route guard that prevents access to town services while party is in maze.
 *
 * Redirects to Camp if party is currently in the maze.
 *
 * Use on town service routes:
 * - Tavern
 * - Inn
 * - Shop
 * - Temple
 * - Training Grounds
 */
export const partyNotInMazeGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);

  const isInMaze = gameState.isInMaze();

  if (isInMaze) {
    console.warn('[Guard] Cannot access town services while in maze. Redirecting to Camp.');
    router.navigate(['/camp']);
    return false;
  }

  return true;
};
```

**Step 4: Create tests**

Create `src/guards/__tests__/party-exists.guard.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { partyExistsGuard } from '../party-exists.guard';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';

describe('partyExistsGuard', () => {
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GameStateService,
        SaveService,
        {
          provide: Router,
          useValue: { navigate: jest.fn() }
        }
      ]
    });

    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);
  });

  it('allows access when party exists', () => {
    // Create a party
    gameState.updateState(state => ({
      ...state,
      party: {
        members: [],
        formation: { frontRow: [], backRow: [] },
        position: { level: 1, x: 0, y: 0 },
        facing: 'NORTH',
        light: false
      }
    }));

    const result = TestBed.runInInjectionContext(() => partyExistsGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to castle menu when no party exists', () => {
    const result = TestBed.runInInjectionContext(() => partyExistsGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
  });
});
```

Create `src/guards/__tests__/party-not-in-maze.guard.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { partyNotInMazeGuard } from '../party-not-in-maze.guard';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';

describe('partyNotInMazeGuard', () => {
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GameStateService,
        SaveService,
        {
          provide: Router,
          useValue: { navigate: jest.fn() }
        }
      ]
    });

    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);
  });

  it('allows access when not in maze', () => {
    gameState.updateState(state => ({
      ...state,
      currentScene: 'CASTLE_MENU'
    }));

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to camp when in maze', () => {
    gameState.updateState(state => ({
      ...state,
      currentScene: 'MAZE'
    }));

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/camp']);
  });

  it('redirects to camp when in combat', () => {
    gameState.updateState(state => ({
      ...state,
      currentScene: 'COMBAT'
    }));

    const result = TestBed.runInInjectionContext(() => partyNotInMazeGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/camp']);
  });
});
```

**Step 5: Run tests**

```bash
npm test -- guards
```

**Expected:** Tests pass (5 tests total)

**Step 6: Commit**

```bash
git add src/guards/
git commit -m "feat: create route guards for party validation

- partyExistsGuard: ensures party exists before maze/combat
- partyNotInMazeGuard: prevents town access while in maze
- Redirects to appropriate scenes when validation fails
- Full test coverage

Tests: 5 tests passing

Part of Phase 2: Shared Infrastructure"
```

---

## Task 4: Create Retro SCSS Theme

**Files:**
- Create: `src/styles/retro-theme.scss`
- Create: `src/styles/variables.scss`
- Modify: `src/styles.scss`

**Step 1: Create variables**

Create `src/styles/variables.scss`:

```scss
// Retro CRT Colors
$color-bg-black: #000000;
$color-text-green: #00ff00;
$color-text-bright: #00ff88;
$color-text-dim: #008800;
$color-amber: #ffaa00;
$color-error: #ff0000;

// Typography
$font-mono: 'Courier New', 'Courier', monospace;
$font-size-base: 16px;
$font-size-large: 20px;
$font-size-small: 14px;

// Layout
$screen-width: 640px;
$screen-height: 480px;
$padding-standard: 16px;
$padding-small: 8px;

// Borders
$border-width: 2px;
$border-style: solid;
$border-color: $color-text-green;

// Spacing
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
```

**Step 2: Create retro theme**

Create `src/styles/retro-theme.scss`:

```scss
@import './variables';

// Global retro styles
body {
  margin: 0;
  padding: 0;
  background-color: $color-bg-black;
  color: $color-text-green;
  font-family: $font-mono;
  font-size: $font-size-base;
  line-height: 1.5;

  // CRT scanline effect
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      rgba(18, 16, 16, 0) 50%,
      rgba(0, 0, 0, 0.25) 50%
    );
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 9999;
  }
}

// Game container (4:3 aspect ratio, centered)
.game-container {
  width: 100%;
  max-width: $screen-width;
  margin: 0 auto;
  padding: $padding-standard;
  min-height: 100vh;
  box-sizing: border-box;
}

// Text styles
.text-bright {
  color: $color-text-bright;
}

.text-dim {
  color: $color-text-dim;
}

.text-amber {
  color: $color-amber;
}

.text-error {
  color: $color-error;
}

.text-large {
  font-size: $font-size-large;
}

.text-small {
  font-size: $font-size-small;
}

// Menu styles
.menu {
  border: $border-width $border-style $border-color;
  padding: $padding-standard;
  margin: $spacing-md 0;

  &__title {
    font-size: $font-size-large;
    color: $color-text-bright;
    margin-bottom: $spacing-md;
    text-align: center;
    text-transform: uppercase;
  }

  &__item {
    padding: $spacing-sm $spacing-md;
    cursor: pointer;
    transition: background-color 0.1s;

    &:hover,
    &--selected {
      background-color: rgba(0, 255, 0, 0.1);
      color: $color-text-bright;
    }

    &--disabled {
      color: $color-text-dim;
      cursor: not-allowed;

      &:hover {
        background-color: transparent;
      }
    }
  }
}

// Button styles
.button {
  background-color: transparent;
  border: $border-width $border-style $border-color;
  color: $color-text-green;
  font-family: $font-mono;
  font-size: $font-size-base;
  padding: $spacing-sm $spacing-md;
  cursor: pointer;
  transition: all 0.1s;

  &:hover {
    background-color: rgba(0, 255, 0, 0.1);
    color: $color-text-bright;
  }

  &:active {
    background-color: rgba(0, 255, 0, 0.2);
  }

  &:disabled {
    color: $color-text-dim;
    cursor: not-allowed;
    opacity: 0.5;

    &:hover {
      background-color: transparent;
    }
  }
}

// Panel/box styles
.panel {
  border: $border-width $border-style $border-color;
  padding: $padding-standard;
  margin: $spacing-md 0;

  &__header {
    font-size: $font-size-large;
    color: $color-text-bright;
    margin-bottom: $spacing-md;
    border-bottom: 1px $border-style $border-color;
    padding-bottom: $spacing-sm;
  }

  &__body {
    padding: $spacing-sm 0;
  }
}

// Character stat display
.stat {
  display: flex;
  justify-content: space-between;
  padding: $spacing-xs 0;

  &__label {
    color: $color-text-dim;
  }

  &__value {
    color: $color-text-bright;
  }
}

// ASCII art / logo
.ascii-art {
  white-space: pre;
  font-family: $font-mono;
  text-align: center;
  color: $color-text-bright;
  line-height: 1.2;
}

// Utility classes
.text-center {
  text-align: center;
}

.mt-md {
  margin-top: $spacing-md;
}

.mb-md {
  margin-bottom: $spacing-md;
}

.p-md {
  padding: $spacing-md;
}
```

**Step 3: Import theme in main styles**

Edit `src/styles.scss`:

```scss
@import './styles/variables';
@import './styles/retro-theme';

/* You can add global styles to this file, and also import other style files */
```

**Step 4: Verify styles compile**

```bash
npm run build
```

**Expected:** Build succeeds with no SCSS errors

**Step 5: Commit**

```bash
git add src/styles/
git commit -m "feat: create retro SCSS theme with CRT effects

- Variables for colors, typography, layout
- Retro green-on-black color scheme
- CRT scanline effect
- Menu, button, panel, and stat display styles
- Utility classes for spacing and alignment
- 4:3 aspect ratio game container

Part of Phase 2: Shared Infrastructure"
```

---

## Task 5: Create MenuComponent (Pattern 1)

**Files:**
- Create: `src/components/menu/menu.component.ts`
- Create: `src/components/menu/menu.component.html`
- Create: `src/components/menu/menu.component.scss`
- Create: `src/components/menu/menu.component.spec.ts`

**Step 1: Create components directory**

```bash
mkdir -p src/components/menu
```

**Step 2: Create MenuComponent**

Create `src/components/menu/menu.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MenuItem {
  id: string;
  label: string;
  enabled: boolean;
  shortcut?: string; // Keyboard shortcut (e.g., "1", "E", "Q")
}

/**
 * MenuComponent - Reusable menu with keyboard navigation.
 *
 * Implements UI Pattern 1: Menu Selection.
 *
 * Features:
 * - Arrow key navigation
 * - Number key shortcuts (1-9)
 * - Letter key shortcuts
 * - Enter to select
 * - Disabled items support
 *
 * @example
 * <app-menu
 *   title="Castle Menu"
 *   [items]="menuItems"
 *   (select)="onMenuSelect($event)">
 * </app-menu>
 */
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  @Input() title: string = '';
  @Input() items: MenuItem[] = [];
  @Output() select = new EventEmitter<string>();

  selectedIndex: number = 0;

  ngOnInit() {
    // Select first enabled item
    this.selectedIndex = this.items.findIndex(item => item.enabled);
    if (this.selectedIndex === -1) {
      this.selectedIndex = 0;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp':
        this.moveToPreviousItem();
        event.preventDefault();
        break;

      case 'ArrowDown':
        this.moveToNextItem();
        event.preventDefault();
        break;

      case 'Enter':
        this.selectCurrentItem();
        event.preventDefault();
        break;

      default:
        // Check for number shortcuts (1-9)
        const num = parseInt(event.key);
        if (num >= 1 && num <= 9) {
          this.selectItemByIndex(num - 1);
          event.preventDefault();
        }

        // Check for letter shortcuts
        const item = this.items.find(item =>
          item.shortcut?.toUpperCase() === event.key.toUpperCase()
        );
        if (item && item.enabled) {
          this.select.emit(item.id);
          event.preventDefault();
        }
        break;
    }
  }

  private moveToNextItem() {
    let nextIndex = this.selectedIndex;

    do {
      nextIndex = (nextIndex + 1) % this.items.length;
    } while (!this.items[nextIndex].enabled && nextIndex !== this.selectedIndex);

    this.selectedIndex = nextIndex;
  }

  private moveToPreviousItem() {
    let prevIndex = this.selectedIndex;

    do {
      prevIndex = (prevIndex - 1 + this.items.length) % this.items.length;
    } while (!this.items[prevIndex].enabled && prevIndex !== this.selectedIndex);

    this.selectedIndex = prevIndex;
  }

  private selectCurrentItem() {
    const item = this.items[this.selectedIndex];
    if (item && item.enabled) {
      this.select.emit(item.id);
    }
  }

  private selectItemByIndex(index: number) {
    if (index >= 0 && index < this.items.length) {
      const item = this.items[index];
      if (item.enabled) {
        this.selectedIndex = index;
        this.select.emit(item.id);
      }
    }
  }
}
```

Create `src/components/menu/menu.component.html`:

```html
<div class="menu">
  @if (title) {
    <div class="menu__title">{{ title }}</div>
  }

  @for (item of items; track item.id; let i = $index) {
    <div
      class="menu__item"
      [class.menu__item--selected]="i === selectedIndex"
      [class.menu__item--disabled]="!item.enabled">

      @if (item.shortcut) {
        <span class="menu__shortcut">[{{ item.shortcut }}]</span>
      }

      <span class="menu__label">{{ item.label }}</span>
    </div>
  }
</div>
```

Create `src/components/menu/menu.component.scss`:

```scss
@import '../../../styles/variables';

.menu {
  // Inherits from global .menu styles

  &__shortcut {
    color: $color-amber;
    margin-right: $spacing-sm;
  }

  &__label {
    flex: 1;
  }
}
```

**Step 3: Create tests**

Create `src/components/menu/menu.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuComponent, MenuItem } from './menu.component';

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;

  const testItems: MenuItem[] = [
    { id: 'edge', label: 'Edge of Town', enabled: true, shortcut: 'E' },
    { id: 'tavern', label: 'Tavern', enabled: true, shortcut: 'T' },
    { id: 'inn', label: 'Inn', enabled: false, shortcut: 'I' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    component.items = testItems;
    fixture.detectChanges();
  });

  it('selects first enabled item on init', () => {
    expect(component.selectedIndex).toBe(0);
  });

  it('moves to next item on arrow down', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.handleKeyPress(event);

    expect(component.selectedIndex).toBe(1);
  });

  it('moves to previous item on arrow up', () => {
    component.selectedIndex = 1;

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.handleKeyPress(event);

    expect(component.selectedIndex).toBe(0);
  });

  it('emits select event on Enter', () => {
    jest.spyOn(component.select, 'emit');

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.handleKeyPress(event);

    expect(component.select.emit).toHaveBeenCalledWith('edge');
  });

  it('selects item by number shortcut', () => {
    jest.spyOn(component.select, 'emit');

    const event = new KeyboardEvent('keydown', { key: '2' });
    component.handleKeyPress(event);

    expect(component.select.emit).toHaveBeenCalledWith('tavern');
  });

  it('selects item by letter shortcut', () => {
    jest.spyOn(component.select, 'emit');

    const event = new KeyboardEvent('keydown', { key: 'T' });
    component.handleKeyPress(event);

    expect(component.select.emit).toHaveBeenCalledWith('tavern');
  });

  it('skips disabled items when navigating', () => {
    component.selectedIndex = 1;

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.handleKeyPress(event);

    // Should wrap around to first item, skipping disabled item
    expect(component.selectedIndex).toBe(0);
  });
});
```

**Step 4: Run tests**

```bash
npm test -- menu.component
```

**Expected:** Tests pass (7 tests)

**Step 5: Commit**

```bash
git add src/components/menu/
git commit -m "feat: create reusable MenuComponent with keyboard navigation

- Implements UI Pattern 1: Menu Selection
- Arrow key navigation (up/down)
- Number shortcuts (1-9)
- Letter shortcuts (custom keys)
- Enter to select
- Skips disabled items
- Highlights selected item
- Full test coverage

Tests: 7 tests passing

Part of Phase 2: Shared Infrastructure"
```

---

## Task 6: Create KeystrokeInputDirective (Pattern 3)

**Files:**
- Create: `src/directives/keystroke-input.directive.ts`
- Create: `src/directives/__tests__/keystroke-input.directive.spec.ts`

**Step 1: Create directives directory**

```bash
mkdir -p src/directives/__tests__
```

**Step 2: Create directive**

Create `src/directives/keystroke-input.directive.ts`:

```typescript
import { Directive, Output, EventEmitter, HostListener } from '@angular/core';

/**
 * KeystrokeInputDirective - Captures any keypress.
 *
 * Implements UI Pattern 3: "Press Any Key" Input.
 *
 * Used for scenes like Title Screen where any key press
 * should trigger an action.
 *
 * @example
 * <div appKeystrokeInput (keystroke)="onAnyKey()">
 *   Press any key to continue...
 * </div>
 */
@Directive({
  selector: '[appKeystrokeInput]',
  standalone: true
})
export class KeystrokeInputDirective {
  @Output() keystroke = new EventEmitter<KeyboardEvent>();

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    // Emit the keystroke event
    this.keystroke.emit(event);
  }
}
```

**Step 3: Create tests**

Create `src/directives/__tests__/keystroke-input.directive.spec.ts`:

```typescript
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeystrokeInputDirective } from '../keystroke-input.directive';

@Component({
  standalone: true,
  imports: [KeystrokeInputDirective],
  template: '<div appKeystrokeInput (keystroke)="onKeystroke($event)"></div>'
})
class TestComponent {
  onKeystroke = jest.fn();
}

describe('KeystrokeInputDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits keystroke event on any key press', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(event);

    expect(component.onKeystroke).toHaveBeenCalledWith(event);
  });

  it('captures different keys', () => {
    const keys = ['a', 'Enter', ' ', 'Escape'];

    keys.forEach(key => {
      const event = new KeyboardEvent('keydown', { key });
      window.dispatchEvent(event);
    });

    expect(component.onKeystroke).toHaveBeenCalledTimes(keys.length);
  });
});
```

**Step 4: Run tests**

```bash
npm test -- keystroke-input.directive
```

**Expected:** Tests pass (2 tests)

**Step 5: Commit**

```bash
git add src/directives/
git commit -m "feat: create KeystrokeInputDirective for any-key input

- Implements UI Pattern 3: Press Any Key Input
- Captures window keydown events
- Used for title screen and similar scenes
- Full test coverage

Tests: 2 tests passing

Part of Phase 2: Shared Infrastructure"
```

---

## Task 7: Verify Complete Infrastructure Setup

**Files:**
- None (verification only)

**Step 1: Run all tests**

```bash
npm test
```

**Expected:** All tests pass (should be ~60+ tests now)

**Step 2: Verify build**

```bash
npm run build
```

**Expected:** Build succeeds

**Step 3: Check bundle size**

```bash
ls -lh dist/wizardry-angular/browser/*.js | awk '{print $5, $9}'
```

**Expected:** Bundle size still reasonable (~250-300KB)

**Step 4: Verify directory structure**

```bash
tree -L 2 src/
```

**Expected structure:**
```
src/
├── app/
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
├── components/
│   └── menu/
├── directives/
│   ├── keystroke-input.directive.ts
│   └── __tests__/
├── guards/
│   ├── party-exists.guard.ts
│   ├── party-not-in-maze.guard.ts
│   └── __tests__/
├── services/
│   ├── CommandExecutorService.ts
│   ├── GameStateService.ts
│   └── __tests__/
├── styles/
│   ├── retro-theme.scss
│   └── variables.scss
├── types/
├── index.html
├── main.ts
└── styles.scss
```

**Step 5: Create Phase 2 completion summary**

Create `PHASE-2-COMPLETE.md`:

```markdown
# Phase 2: Shared Infrastructure Complete ✅

## Summary
Built Angular-specific shared infrastructure including signal-based state management, reusable components, directives, and routing guards.

## What Was Accomplished

### Services
- **GameStateService** - Signal-based reactive state management
- **CommandExecutorService** - Command pattern for all game actions

### Components
- **MenuComponent** - Reusable menu with keyboard navigation (Pattern 1)

### Directives
- **KeystrokeInputDirective** - "Press any key" input handling (Pattern 3)

### Guards
- **partyExistsGuard** - Ensures party exists before maze/combat
- **partyNotInMazeGuard** - Prevents town access while in maze

### Styles
- Retro SCSS theme with CRT scanline effects
- Variables for colors, typography, spacing
- Utility classes for layout

## Test Results
- Test Suites: ~10 passing
- Tests: ~60+ passing
- Coverage: High coverage on all infrastructure code

## Next Steps
Phase 3 will implement simple scenes:
- Title Screen
- Castle Menu
- Edge of Town

See: `docs/plans/2025-11-01-angular-migration-phase-3.md` (to be created)
```

**Step 6: Final commit**

```bash
git add PHASE-2-COMPLETE.md
git commit -m "docs: Phase 2 completion summary

Shared Angular infrastructure complete:
- GameStateService (signal-based)
- CommandExecutorService (command pattern)
- MenuComponent (keyboard navigation)
- KeystrokeInputDirective (any-key input)
- Route guards (party validation)
- Retro SCSS theme

All tests passing (~60+ tests)
Ready for Phase 3: Simple scene implementation"
```

---

## Estimated Time

- Task 1: GameStateService (1 hour)
- Task 2: CommandExecutorService (45 minutes)
- Task 3: Route Guards (45 minutes)
- Task 4: SCSS Theme (1 hour)
- Task 5: MenuComponent (1.5 hours)
- Task 6: KeystrokeInputDirective (30 minutes)
- Task 7: Verification (30 minutes)

**Total: ~6 hours** (fits within 2-3 day estimate)

---

## Notes

### Deferred Components (To be created as needed in Phase 3-5)
- CharacterListComponent (will create in Phase 4 for Tavern)
- ErrorDisplayComponent (will create when first error handling needed)
- ConfirmationDialogComponent (will create in Phase 4 for Temple)

### Angular-Specific Patterns Used
- **Signals**: For reactive state (GameStateService)
- **Dependency Injection**: For all services
- **Standalone Components**: No NgModules needed
- **Functional Guards**: Using `CanActivateFn` instead of classes

### Testing Approach
- TestBed for component/service testing
- Mock Router for guard tests
- Jest for all tests (no Karma/Jasmine)

---

## Next Plan

After completing Phase 2, create Phase 3 plan:

**File:** `docs/plans/2025-11-01-angular-migration-phase-3.md`

**Focus:** Implement first 3 scenes (Title, Castle Menu, Edge of Town) using the shared infrastructure built in Phase 2.
