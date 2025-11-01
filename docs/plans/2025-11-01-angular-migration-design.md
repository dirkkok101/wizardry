# Angular 19 Migration Design

**Date**: 2025-11-01
**Status**: Approved (v1.1 - revised after code review)
**Author**: Design session with project owner

---

## Executive Summary

**Decision**: Migrate the Wizardry remake from Canvas-based UI to Angular 19 with full framework adoption.

**Primary Driver**: Developer familiarity with Angular for improved productivity in building the menu-heavy UI.

**Scope**: Complete replacement of UI layer (Canvas → Angular components). Most service layer logic remains unchanged, with SceneNavigationService refactored to use Angular Router.

**Estimated Effort**: 28-36 days base (5.5-7 weeks), plus 20% buffer = 34-43 days realistic total

---

## 1. Architecture Overview

### 1.1 Four-Layer Architecture (Preserved)

The existing clean architecture remains intact. Angular only replaces the UI layer:

```
┌─────────────────────────────────────┐
│ Angular UI Layer (NEW)              │
│ - 14 scene components               │
│ - Shared UI components              │
│ - Directives for keyboard input     │
│ - Signal-based state management     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Command Layer (UNCHANGED)           │
│ - MovePartyCommand                  │
│ - CastSpellCommand                  │
│ - All existing commands             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Service Layer (UNCHANGED)           │
│ - Pure functions                    │
│ - PartyService, CombatService, etc. │
│ - No side effects                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Data Layer (UNCHANGED)              │
│ - GameState with event sourcing     │
│ - IndexedDB via SaveService         │
└─────────────────────────────────────┘
```

### 1.2 Key Preservation Principles

**What stays exactly the same**:
- ✅ 4-layer architecture (UI/Command/Service/Data)
- ✅ Command pattern for all user actions
- ✅ Stateless service functions (PartyService, CombatService, SpellService, etc.)
- ✅ Immutable state updates
- ✅ Scene-based vertical slice organization
- ✅ All game logic and business rules
- ✅ Testing strategy for services (pure function tests)

**What requires refactoring**:
- 🔄 SceneNavigationService → Refactored to use Angular Router (currently has module-level state)
- 🔄 Commands → Simplified to use Router navigation (remove manual state management)

**What changes**:
- ❌ Vite → Angular CLI with esbuild
- ❌ Canvas rendering → Angular component templates (except Maze 3D view uses Canvas)
- ❌ Vitest → Jest with @angular-builders/jest
- ✅ 14 scenes become 14 Angular components (same structure, different rendering technology)

**Event Sourcing Note**: Event sourcing is mentioned in architecture docs but not currently implemented. Migration will use simple state management with Angular Signals. Event sourcing can be added later if needed for dungeon/combat replay functionality.

---

## 2. Technology Stack

### 2.1 Complete Stack After Migration

```
Framework:     Angular 19 (standalone components, signals)
Build Tool:    Angular CLI 19 with esbuild
Testing:       Jest + @angular-builders/jest
State:         Angular Signals (reactive primitives)
Routing:       Angular Router with functional guards
HTTP:          Angular HttpClient (for loading data/*.json)
Styling:       SCSS with retro/CRT theme
Bundle Size:   ~340-440KB total (gzipped)
Node Version:  18+ (Angular 19 requirement)
TypeScript:    5.5+ (Angular 19 requirement)
```

### 2.2 Angular 19 Advantages

**Signals for State Management** (simpler than RxJS):
- Automatic change detection
- Fine-grained reactivity
- Computed values update automatically
- Cleaner than BehaviorSubject/Observable pattern

**Standalone Components** (no NgModules):
- Less boilerplate
- Explicit imports
- Better tree-shaking

**Built-in Control Flow** (@if/@for):
- More readable than *ngIf/*ngFor
- Better type inference
- Improved performance

**Functional Guards**:
- Simpler than class-based guards
- Use inject() function
- Less ceremony

**Performance Improvements**:
- Incremental hydration (faster initial load)
- Improved esbuild integration (faster builds ~30% vs v17)
- Better tree-shaking (smaller bundles)
- Signals reduce change detection overhead

---

## 3. Component Structure

### 3.1 Project Organization

The scene-based vertical slice architecture maps directly to Angular's component model:

```
/src
  /app
    /scenes
      /title-screen
        - title-screen.component.ts
        - title-screen.component.html
        - title-screen.component.scss
        /commands (unchanged from current structure)
          - StartGameCommand.ts

      /castle-menu
        - castle-menu.component.ts
        - castle-menu.component.html
        - castle-menu.component.scss
        /commands (unchanged)
          - NavigateToTavernCommand.ts
          - NavigateToTempleCommand.ts
          - NavigateToShopCommand.ts
          - NavigateToInnCommand.ts
          - NavigateToEdgeOfTownCommand.ts

      /edge-of-town
        - edge-of-town.component.ts
        - edge-of-town.component.html
        - edge-of-town.component.scss
        /commands (unchanged)
          - ReturnToCastleCommand.ts
          - EnterTrainingGroundsCommand.ts
          - EnterMazeCommand.ts

      ... (11 more scene components)

    /shared
      /components
        - character-list.component.ts (reusable)
        - menu.component.ts (Pattern 1: Standard Menu)
        - confirmation-dialog.component.ts (Pattern 5)
        - error-display.component.ts (Pattern 4)
        - transaction-wizard.component.ts (Pattern 6)
        - list-navigator.component.ts (Pattern 7)

      /directives
        - keystroke-input.directive.ts (Pattern 3: Single-keystroke)

      /services (Angular services - wrappers)
        - game-state.service.ts (manages GameState signal)
        - command-executor.service.ts (executes commands)
        - scene-navigation.service.ts (wraps SceneNavigationService)

  /services (UNCHANGED - pure TypeScript functions)
    - PartyService.ts
    - CombatService.ts
    - SpellService.ts
    - DungeonService.ts
    - CharacterService.ts
    - BodyRecoveryService.ts
    - SceneNavigationService.ts
    - AssetLoadingService.ts
    - SaveService.ts
    - GameInitializationService.ts

  /types (UNCHANGED)
    - GameState.ts
    - Character.ts
    - Party.ts
    - etc.

  /assets
    /data (moved from /data in root)
      /maps
      /spells
      /monsters
      /items
    /images (if any)
```

### 3.2 Component Mapping

**One component per scene** - 14 total:

1. TitleScreenComponent
2. CastleMenuComponent
3. TrainingGroundsComponent
4. TavernComponent (Gilgamesh's Tavern)
5. ShopComponent (Boltac's Trading Post)
6. TempleComponent (Temple of Cant)
7. InnComponent (Adventurer's Inn)
8. EdgeOfTownComponent
9. UtilitiesComponent
10. CampComponent
11. MazeComponent
12. CombatComponent
13. ChestComponent
14. CharacterInspectionComponent

Plus auxiliary components:
- CharacterCreationComponent (sub-flow of Training Grounds)
- CharacterListComponent (roster management)

---

## 4. UI Pattern Implementation

### 4.1 Pattern-to-Component Mapping

The 7 documented UI patterns from `docs/ui/ui-patterns.md` translate to reusable Angular components:

**Pattern 1 - Standard Menu** → `<app-menu>` component

**Pattern 2 - Character Selection** → `<app-character-list>` component

**Pattern 3 - Single-Keystroke Input** → `appKeystrokeInput` directive

**Pattern 4 - Error Handling** → `<app-error-display>` component + ErrorService

**Pattern 5 - Confirmation Dialog** → `<app-confirmation-dialog>` component

**Pattern 6 - Multi-Step Transaction** → `<app-transaction-wizard>` component

**Pattern 7 - List Navigation** → `<app-list-navigator>` component

### 4.2 Example Implementation: Pattern 1 (Standard Menu)

**Component Usage**:
```typescript
// In CastleMenuComponent
export class CastleMenuComponent {
  private gameState = inject(GameStateService);
  private commandExecutor = inject(CommandExecutorService);

  state = this.gameState.state;

  menuActions: MenuAction[] = [
    {
      key: 'G',
      label: "ILGAMESH'S TAVERN",
      handler: () => this.navigateToTavern()
    },
    {
      key: 'T',
      label: "EMPLE OF CANT",
      handler: () => this.navigateToTemple()
    },
    {
      key: 'B',
      label: "OLTAC'S TRADING POST",
      handler: () => this.navigateToShop()
    },
    {
      key: 'A',
      label: "DVENTURER'S INN",
      handler: () => this.navigateToInn()
    },
    {
      key: 'E',
      label: "DGE OF TOWN",
      handler: () => this.navigateToEdgeOfTown()
    }
  ];

  navigateToTavern(): void {
    const command = new NavigateToTavernCommand();
    this.commandExecutor.execute(command);
  }

  // ... other navigation methods
}
```

**Template**:
```html
<div class="retro-screen">
  <app-menu
    [title]="'CASTLE'"
    [actions]="menuActions">
  </app-menu>
</div>
```

### 4.3 Example Implementation: Pattern 3 (Single-Keystroke Input)

**Directive**:
```typescript
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Directive({
  selector: '[appKeystrokeInput]',
  standalone: true
})
export class KeystrokeInputDirective implements OnInit, OnDestroy {
  @Input() validKeys: string[] = [];
  @Output() keyPressed = new EventEmitter<string>();

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Listen for keydown events with proper cleanup
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntil(this.destroy$),  // Prevents memory leak
        map(event => {
          event.preventDefault();  // Prevent browser shortcuts
          return event.key.toUpperCase();
        }),
        filter(key => this.validKeys.includes(key))
      )
      .subscribe(key => this.keyPressed.emit(key));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Usage**:
```html
<div appKeystrokeInput
     [validKeys]="['G', 'T', 'B', 'A', 'E']"
     (keyPressed)="handleKey($event)">
  <!-- Menu content -->
</div>
```

### 4.4 Retro Styling Approach

**SCSS Theme** (`/src/styles/retro-theme.scss`):
```scss
// CRT Green monitor style
.retro-screen {
  background-color: #000;
  color: #00ff00;
  font-family: 'VT323', 'Courier New', monospace;
  padding: 20px;
  position: relative;
}

// CRT glow effect
.retro-text {
  text-shadow:
    0 0 5px #00ff00,
    0 0 10px #00ff00;
}

// Scanlines overlay
.scanlines::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    transparent 50%,
    rgba(0, 0, 0, 0.5) 50%
  );
  background-size: 100% 4px;
  pointer-events: none;
}

// CRT curvature (optional)
.crt-curve {
  border-radius: 10px;
  box-shadow: inset 0 0 50px rgba(0, 255, 0, 0.1);
}

// Amber monitor alternative
.retro-screen.amber {
  color: #ffb000;

  .retro-text {
    text-shadow:
      0 0 5px #ffb000,
      0 0 10px #ffb000;
  }
}
```

### 4.5 Maze 3D Rendering Strategy

**Decision**: Use Canvas inside Angular component for authentic Wizardry first-person 3D wireframe view.

**Rationale**:
- Preserves retro Wizardry aesthetic (wireframe corridors, walls, doors)
- Canvas 2D API provides full control over rendering
- Familiar technology for developer
- Best performance for 2D wireframe drawing
- Angular manages UI overlays (stats, compass, commands)

**Implementation**:

```typescript
import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { GameStateService } from '../../shared/services/game-state.service';

@Component({
  selector: 'app-maze',
  standalone: true,
  template: `
    <div class="maze-container">
      <!-- Canvas for 3D first-person view -->
      <canvas #mazeCanvas
              width="800"
              height="600"
              class="maze-canvas">
      </canvas>

      <!-- Angular UI overlays -->
      <div class="maze-ui">
        <div class="compass">Facing: {{ facing() }}</div>
        <div class="position">Level {{ level() }}, ({{ x() }}, {{ y() }})</div>
        <div class="controls">
          (W)Forward (A)Left (S)Back (D)Right (Q)Turn-L (E)Turn-R
        </div>
      </div>
    </div>
  `,
  styles: [`
    .maze-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .maze-canvas {
      display: block;
      image-rendering: pixelated;  /* Retro sharp pixels */
    }

    .maze-ui {
      position: absolute;
      top: 10px;
      left: 10px;
      color: #00ff00;
      font-family: 'VT323', monospace;
    }
  `]
})
export class MazeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mazeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private gameState = inject(GameStateService);
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  // Signals for UI overlays
  facing = computed(() => this.gameState.state().party.facing);
  level = computed(() => this.gameState.state().currentDungeonLevel);
  x = computed(() => this.gameState.state().party.position.x);
  y = computed(() => this.gameState.state().party.position.y);

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.render3DView();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private render3DView(): void {
    if (!this.ctx) return;

    const state = this.gameState.getCurrentState();

    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, 800, 600);

    // Draw 3D wireframe view (Wizardry-style)
    // TODO: Implement full 3D rendering logic
    // - Draw walls based on party position and facing
    // - Draw doors
    // - Draw distance fog effect
    // - Render party view distance (3 tiles ahead typical for Wizardry)

    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 2;

    // Example: Draw simple corridor
    this.drawCorridor(this.ctx);
  }

  private drawCorridor(ctx: CanvasRenderingContext2D): void {
    // Simplified example - full implementation would check dungeon map
    // and draw walls/doors based on actual tile data

    // Draw perspective lines
    ctx.beginPath();
    ctx.moveTo(100, 100);
    ctx.lineTo(400, 300);
    ctx.moveTo(700, 100);
    ctx.lineTo(400, 300);
    ctx.stroke();
  }
}
```

**Canvas Rendering Tasks** (to be implemented during migration):
- Ray-casting or perspective projection for walls
- Door rendering with open/closed states
- Distance fog for depth perception
- Special tile markers (stairs, fountains, etc.)
- Monster encounter overlays

**Separation of Concerns**:
- **Canvas**: Renders 3D dungeon view only
- **Angular**: Handles all UI (stats, controls, messages)
- **Services**: Provide dungeon map data, party position, facing direction

---

## 5. State Management & Data Flow

### 5.1 GameStateService (Angular Signals)

**Core state management service**:
```typescript
import { Injectable, signal, computed } from '@angular/core';
import { GameState } from '../types/GameState';
import { GameInitializationService } from '../services/GameInitializationService';
import { PartyStatus } from '../types/Party';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  // Private signal for state
  private stateSignal = signal<GameState>(this.initializeState());

  // Public readonly signal
  state = this.stateSignal.asReadonly();

  // Computed signals for common queries
  partyGold = computed(() => this.state().party.gold);
  partyMembers = computed(() => this.state().party.members);
  currentScene = computed(() => this.state().currentScene);
  isInMaze = computed(() => this.state().party.status === PartyStatus.IN_MAZE);

  // Navigation error state (for route guards)
  private navigationErrorSignal = signal<string | null>(null);
  navigationError = this.navigationErrorSignal.asReadonly();

  // Update state (called by services/components)
  updateState(newState: GameState): void {
    this.stateSignal.set(newState);
  }

  // Set navigation error (called by route guards)
  setNavigationError(error: string | null): void {
    this.navigationErrorSignal.set(error);
  }

  // Get current state synchronously (for guards, services)
  getCurrentState(): GameState {
    return this.stateSignal();
  }

  private initializeState(): GameState {
    // Use existing GameInitializationService
    return GameInitializationService.createInitialState();
  }
}
```

**Note**: Event sourcing removed for simplicity. Can be added later if dungeon/combat replay functionality is needed.

### 5.2 Component Usage Pattern

**Example: CastleMenuComponent**
```typescript
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../../shared/services/game-state.service';
import { SaveService } from '../../services/SaveService';

@Component({
  selector: 'app-castle-menu',
  standalone: true,
  imports: [MenuComponent],
  templateUrl: './castle-menu.component.html',
  styleUrl: './castle-menu.component.scss'
})
export class CastleMenuComponent {
  private gameState = inject(GameStateService);
  private router = inject(Router);

  // Signals available in template
  state = this.gameState.state;
  partyGold = this.gameState.partyGold;

  menuActions: MenuAction[] = [
    { key: 'G', label: "ILGAMESH'S TAVERN", handler: () => this.navigateToTavern() },
    { key: 'T', label: "EMPLE OF CANT", handler: () => this.navigateToTemple() },
    { key: 'B', label: "OLTAC'S TRADING POST", handler: () => this.navigateToShop() },
    { key: 'A', label: "DVENTURER'S INN", handler: () => this.navigateToInn() },
    { key: 'E', label: "DGE OF TOWN", handler: () => this.navigateToEdgeOfTown() }
  ];

  async navigateToTavern(): Promise<void> {
    // Auto-save before navigation (safe zone)
    await SaveService.saveGame(this.gameState.getCurrentState());
    this.router.navigate(['/tavern']);
  }

  // ... other navigation methods follow same pattern
}
```

**Template (no async pipe needed)**:
```html
<div class="retro-screen scanlines">
  <app-menu [title]="'CASTLE'" [actions]="menuActions"></app-menu>

  <!-- Direct signal access -->
  <div class="party-info retro-text">
    Gold: {{ partyGold() }}
  </div>
</div>
```

### 5.3 Data Flow Diagram

```
User Input (Keyboard)
    ↓
Component handles key via directive
    ↓
Component creates Command object
    ↓
CommandExecutorService.execute(command)
    ↓
Command.execute(currentState)
    → Calls pure service functions (PartyService, etc.)
    → Returns new GameState
    ↓
GameStateService updates signal
    ↓
Automatic change detection
    ↓
Template re-renders with new state
```

**Key benefits**:
- Signals provide automatic dependency tracking
- No manual subscriptions needed (no memory leaks)
- Event sourcing preserved (every command creates event)
- Pure services unchanged (same business logic)
- Immutable state updates work perfectly with signals

---

## 6. Scene Navigation & Routing

### 6.1 Router Configuration

Maps directly to the navigation map from `docs/ui/navigation-map.md`:

```typescript
import { Routes } from '@angular/router';
import { partyNotInMazeGuard } from './shared/guards/party-not-in-maze.guard';
import { partyFormedGuard } from './shared/guards/party-formed.guard';

export const routes: Routes = [
  {
    path: '',
    component: TitleScreenComponent
  },
  {
    path: 'castle',
    component: CastleMenuComponent,
    canActivate: [partyNotInMazeGuard]
  },
  {
    path: 'tavern',
    component: TavernComponent
  },
  {
    path: 'temple',
    component: TempleComponent
  },
  {
    path: 'shop',
    component: ShopComponent
  },
  {
    path: 'inn',
    component: InnComponent
  },
  {
    path: 'edge-of-town',
    component: EdgeOfTownComponent
  },
  {
    path: 'training-grounds',
    component: TrainingGroundsComponent
  },
  {
    path: 'character-creation',
    component: CharacterCreationComponent
  },
  {
    path: 'character-list',
    component: CharacterListComponent
  },
  {
    path: 'camp',
    component: CampComponent,
    canActivate: [partyFormedGuard]
  },
  {
    path: 'maze',
    component: MazeComponent
  },
  {
    path: 'combat',
    component: CombatComponent
  },
  {
    path: 'chest',
    component: ChestComponent
  },
  {
    path: 'character-inspection',
    component: CharacterInspectionComponent
  },
  {
    path: 'utilities',
    component: UtilitiesComponent
  }
];
```

### 6.2 Functional Route Guards

**Guard Pattern**: Guards validate and set error state, components display errors.

**Example: Party Not In Maze Guard**
```typescript
import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { GameStateService } from '../services/game-state.service';
import { PartyStatus } from '../../types/Party';

export const partyNotInMazeGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const state = gameState.getCurrentState();

  if (state.party.status === PartyStatus.IN_MAZE) {
    // Set error flag - component will display it
    gameState.setNavigationError('YOUR PARTY IS IN THE MAZE. You must return to town first.');
    return false;  // Stay on current page
  }

  // Clear any previous error
  gameState.setNavigationError(null);
  return true;
};
```

**Example: Party Formed Guard**
```typescript
export const partyFormedGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const state = gameState.getCurrentState();

  if (state.party.members.length === 0) {
    gameState.setNavigationError('YOU MUST FORM A PARTY FIRST. Visit Gilgamesh\'s Tavern to add characters.');
    return false;
  }

  gameState.setNavigationError(null);
  return true;
};
```

**Component displays error** (example in any scene component):
```typescript
export class CastleMenuComponent implements OnInit {
  private gameState = inject(GameStateService);
  navigationError = this.gameState.navigationError;

  // Template shows: @if (navigationError()) { <div class="error">{{ navigationError() }}</div> }
}
```

### 6.3 Scene Navigation Service

**Angular wrapper for existing SceneNavigationService**:
```typescript
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from './game-state.service';
import { SceneType } from '../../types/SceneType';
import { SceneNavigationService } from '../../services/SceneNavigationService';
import { SaveService } from '../../services/SaveService';

const SAFE_ZONES: SceneType[] = [
  SceneType.TITLE_SCREEN,
  SceneType.CASTLE_MENU,
  SceneType.TRAINING_GROUNDS,
  SceneType.TAVERN,
  SceneType.SHOP,
  SceneType.TEMPLE,
  SceneType.INN,
  SceneType.EDGE_OF_TOWN,
  SceneType.UTILITIES
];

@Injectable({ providedIn: 'root' })
export class AngularSceneNavigationService {
  private router = inject(Router);
  private gameState = inject(GameStateService);

  navigateTo(sceneType: SceneType): void {
    const currentState = this.gameState.getCurrentState();

    // Check if transition is valid (using existing validation logic)
    const canNavigate = SceneNavigationService.canNavigateTo(
      currentState.currentScene,
      sceneType,
      currentState
    );

    if (!canNavigate.allowed) {
      // Show error via ErrorService
      return;
    }

    // Auto-save if entering safe zone
    if (SAFE_ZONES.includes(sceneType)) {
      SaveService.autoSave(currentState);
    }

    // Map SceneType to route path
    const path = this.sceneTypeToPath(sceneType);

    // Navigate using Angular Router
    this.router.navigate([path]);
  }

  private sceneTypeToPath(sceneType: SceneType): string {
    // Map SceneType enum to route paths
    const pathMap: Record<SceneType, string> = {
      [SceneType.TITLE_SCREEN]: '',
      [SceneType.CASTLE_MENU]: 'castle',
      [SceneType.TAVERN]: 'tavern',
      [SceneType.TEMPLE]: 'temple',
      [SceneType.SHOP]: 'shop',
      [SceneType.INN]: 'inn',
      [SceneType.EDGE_OF_TOWN]: 'edge-of-town',
      [SceneType.TRAINING_GROUNDS]: 'training-grounds',
      [SceneType.CHARACTER_CREATION]: 'character-creation',
      [SceneType.CAMP]: 'camp',
      [SceneType.MAZE]: 'maze',
      [SceneType.COMBAT]: 'combat',
      [SceneType.CHEST]: 'chest',
      [SceneType.CHARACTER_INSPECTION]: 'character-inspection',
      [SceneType.UTILITIES]: 'utilities'
    };

    return pathMap[sceneType];
  }
}
```

---

## 7. Migration Strategy

### 7.1 Phased Migration Approach

**Phase 1: Create Angular Workspace (2-3 days)**

Tasks:
- Run `ng new wizardry-angular --standalone --routing --style=scss`
- Configure `angular.json` for project structure
- Set up Jest testing with `@angular-builders/jest`
- Configure TypeScript (`tsconfig.json`, `tsconfig.app.json`)
- Copy unchanged code:
  - `/src/services` → `/wizardry-angular/src/services`
  - `/src/types` → `/wizardry-angular/src/types`
  - `/data` → `/wizardry-angular/src/assets/data`
- Install dependencies: RxJS, signals, etc.
- Verify build works: `ng build`

Deliverable: Empty Angular workspace with copied business logic

---

**Phase 2: Build Shared Infrastructure (2-3 days)**

Tasks:
- Create `GameStateService` (signal-based state)
- Create `CommandExecutorService`
- Create `AngularSceneNavigationService`
- Create `ErrorService`
- Build shared components:
  - `MenuComponent` (Pattern 1)
  - `CharacterListComponent` (Pattern 2)
  - `ErrorDisplayComponent` (Pattern 4)
  - `ConfirmationDialogComponent` (Pattern 5)
- Build directives:
  - `KeystrokeInputDirective` (Pattern 3)
- Set up SCSS theme (`retro-theme.scss`)
- Create functional route guards

Deliverable: Shared infrastructure ready for scene components

---

**Phase 3: Migrate Simple Scenes (3-4 days)**

**Priority 1: Title Screen**
- Simplest scene (logo, "Press any key to start")
- Verify:
  - Asset loading works
  - Keyboard input works
  - Navigation to Castle Menu works

**Priority 2: Castle Menu**
- Standard menu pattern only
- Verify:
  - Menu component works
  - Navigation to all town services works
  - Route guards work (partyNotInMazeGuard)

**Priority 3: Edge of Town**
- Simple menu with multiple destinations
- Verify:
  - Navigation works
  - Party validation works

Deliverable: 3 scenes working end-to-end

---

**Phase 4: Migrate Town Service Scenes (4-5 days)**

**Tavern** (party formation)
- Character selection pattern
- Add/remove characters from party
- Character inspection navigation

**Training Grounds** (character creation)
- Navigate to character creation
- Character list view
- Roster management

**Shop** (Boltac's Trading Post)
- Multi-step transaction pattern
- List navigation pattern (item catalog)
- Buy/sell/identify flows

**Temple** (Temple of Cant)
- Character selection with validation
- Resurrection/healing services
- Confirmation dialogs

**Inn** (Adventurer's Inn)
- Rest service
- Level-up handling
- Spell point restoration

Deliverable: All 5 town service scenes working

---

**Phase 5: Migrate Game-Critical Scenes (4-5 days)**

**Character Creation**
- Multi-step wizard
- Race/class selection
- Stat rolling
- Name input

**Character List** (roster management)
- View all created characters
- Delete characters (with confirmation)

**Camp** (pre-dungeon staging)
- Party status display
- Character inspection
- Navigation to maze

**Maze** (dungeon exploration)
- 3D-style first-person view (can be simplified initially)
- Movement commands (WASD + QE)
- Encounter triggering

**Combat**
- Party vs monsters
- Action selection
- Initiative resolution
- Damage display

**Chest** (treasure)
- Open/disarm
- Loot distribution
- Trap handling

**Character Inspection** (context-aware)
- Full character sheet
- Equipment display
- Spell list

Deliverable: All 14 scenes implemented and navigable

---

**Phase 6: Testing & Polish (2-3 days)**

Tasks:
- Migrate service tests from Vitest to Jest
  - Syntax is similar (describe/it/expect)
  - Update imports
  - Verify all tests pass
- Write component tests using Angular TestBed
- E2E smoke tests (navigate through all scenes)
- Retro styling refinement:
  - CRT scanlines
  - Glow effects
  - Color themes (green/amber options)
  - Font selection (VT323 or similar)
- Performance tuning:
  - OnPush change detection where needed
  - Lazy loading routes (if bundle too large)
  - Asset optimization
- Update documentation:
  - Update `CLAUDE.md` with Angular commands
  - Update `docs/architecture.md` with Angular references
  - Update `README.md` with new setup instructions

Deliverable: Production-ready Angular application

---

**Phase 7: Cleanup & Archival (1 day)**

Tasks:
- Archive old Vite project to `wizardry-canvas-archived/`
- Delete Canvas UI code from new Angular project
- Final smoke test of all scenes
- Git commit with migration complete message
- Update GitHub repository (if applicable)

Deliverable: Clean repository with Angular implementation

---

### 7.2 Total Estimated Effort

| Phase | Description | Duration | Notes |
|-------|-------------|----------|-------|
| 1 | Angular workspace setup | 2-3 days | ng new, Jest config, copy services |
| 2 | Shared infrastructure | 3-4 days | +1 day for SceneNavigationService refactoring |
| 3 | Simple scenes (Title, Castle, Edge) | 3-4 days | Validation of architecture |
| 4 | Town service scenes (5 scenes) | 7-8 days | Complex: Shop/Temple 1.5 days each |
| 5 | Game-critical scenes (7 scenes) | 11-12 days | Maze (3D): 3 days, Combat: 3 days |
| 6 | Testing & polish | 4-6 days | Rewrite Canvas tests, component tests |
| 7 | Cleanup & archival | 1 day | Archive old project |
| **Base Total** | | **31-40 days** | ~6-8 weeks |
| **Risk Buffer** | +20% contingency | +6-8 days | Unexpected issues |
| **Realistic Total** | | **37-48 days** | **7.5-9.5 weeks** |

**Assumptions**:
- Full-time development
- No major blockers or scope changes
- Most service layer logic works as-is (except SceneNavigationService)
- Single developer
- Maze 3D rendering uses Canvas (reduces complexity)

**Critical Path**: Maze rendering (3 days) + Combat system (3 days) = 6 days of highest-risk work

---

## 8. Testing Strategy

### 8.1 Service Layer Testing (Unchanged Logic)

**Current approach**: Pure function tests with Vitest
**After migration**: Same tests with Jest syntax

Migration example:
```typescript
// Before (Vitest)
import { describe, it, expect } from 'vitest';
import { PartyService } from '../services/PartyService';

describe('PartyService', () => {
  describe('addMember', () => {
    it('adds character to party', () => {
      const party = createEmptyParty();
      const character = createTestCharacter();

      const result = PartyService.addMember(party, character);

      expect(result.members).toHaveLength(1);
      expect(result.members[0]).toBe(character);
    });
  });
});
```

```typescript
// After (Jest - nearly identical)
import { describe, it, expect } from '@jest/globals';
import { PartyService } from '../services/PartyService';

describe('PartyService', () => {
  describe('addMember', () => {
    it('adds character to party', () => {
      const party = createEmptyParty();
      const character = createTestCharacter();

      const result = PartyService.addMember(party, character);

      expect(result.members).toHaveLength(1);
      expect(result.members[0]).toBe(character);
    });
  });
});
```

**Key point**: Service tests require minimal changes (just import statements).

### 8.2 Component Testing (New)

Use Angular TestBed for component tests:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CastleMenuComponent } from './castle-menu.component';
import { GameStateService } from '../../shared/services/game-state.service';

describe('CastleMenuComponent', () => {
  let component: CastleMenuComponent;
  let fixture: ComponentFixture<CastleMenuComponent>;
  let gameStateService: jasmine.SpyObj<GameStateService>;

  beforeEach(async () => {
    const gameStateSpy = jasmine.createSpyObj('GameStateService', ['state', 'executeCommand']);

    await TestBed.configureTestingModule({
      imports: [CastleMenuComponent],
      providers: [
        { provide: GameStateService, useValue: gameStateSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CastleMenuComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService) as jasmine.SpyObj<GameStateService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display castle title', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('CASTLE');
  });

  it('should have 5 menu actions', () => {
    expect(component.menuActions).toHaveLength(5);
  });
});
```

### 8.3 E2E Testing (Optional)

Use Playwright or Cypress for smoke tests:
- Navigate from Title Screen → Castle → each town service
- Create a character in Training Grounds
- Form a party in Tavern
- Enter dungeon (Camp → Maze)

---

## 9. Bundle Size & Performance

### 9.1 Expected Bundle Size

```
Angular 19 framework:     ~200KB (gzipped)
RxJS (for events):        ~40KB (gzipped)
Router:                   included in framework
Application code:         ~50-100KB (gzipped)
Game data (JSON):         ~30-50KB (gzipped)
Assets (fonts, images):   ~20-50KB (gzipped)
-------------------------------------------
Total:                    ~340-440KB (gzipped)
```

**Comparison to Canvas version**:
- Canvas version: ~100-150KB (no framework)
- Angular version: ~340-440KB (+240-290KB overhead)

**Acceptable for web game**: Yes. Modern broadband can download 440KB in <1 second. Mobile 4G downloads in ~2 seconds. This is acceptable overhead for the developer productivity gains.

### 9.2 Performance Optimizations

**Lazy Loading** (if needed):
```typescript
export const routes: Routes = [
  {
    path: 'castle',
    loadComponent: () => import('./scenes/castle-menu/castle-menu.component')
      .then(m => m.CastleMenuComponent)
  }
];
```

**OnPush Change Detection**:
```typescript
@Component({
  selector: 'app-castle-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

**Signals**: Already provide fine-grained reactivity (better than zone.js).

---

## 10. Risk Assessment

### 10.1 High Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Maze 3D rendering complex in Angular | Medium | High | Start simple (wireframe), iterate. Can use Canvas in Angular component if needed. |
| Existing services have side effects | Low | High | Review services before migration. Add tests if uncertain. |
| Bundle size too large | Low | Medium | Lazy loading, tree-shaking, analyze with `ng build --stats-json` |

### 10.2 Medium Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Test migration takes longer | Medium | Medium | Prioritize critical path tests. Defer less important tests. |
| Keyboard input conflicts | Medium | Medium | Use Angular directive with proper event handling and preventDefault. |
| Styling doesn't match retro aesthetic | Low | Medium | Prototype CRT effects early. Use CSS filters and overlays. |

### 10.3 Low Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Angular learning curve | Low | Low | Developer already familiar with Angular. |
| Route guard logic complex | Low | Low | Reuse existing validation from SceneNavigationService. |
| Asset loading issues | Low | Low | Use Angular HttpClient, same logic as AssetLoadingService. |

---

## 11. Success Criteria

### 11.1 Functional Requirements

- ✅ All 14 scenes render and are navigable
- ✅ All keyboard input patterns work (single-keystroke, character selection, etc.)
- ✅ Party formation, character creation, roster management functional
- ✅ Combat system works (initiative, actions, damage)
- ✅ Save/load functionality preserved
- ✅ Event sourcing pattern intact
- ✅ All existing service tests pass

### 11.2 Non-Functional Requirements

- ✅ Bundle size <500KB gzipped
- ✅ Initial load time <3 seconds on 3G
- ✅ Retro aesthetic achieved (CRT effects, monospace fonts)
- ✅ No console errors in production build
- ✅ Accessible via keyboard (no mouse required)
- ✅ Works in modern browsers (Chrome, Firefox, Safari, Edge)

### 11.3 Developer Experience

- ✅ Component structure intuitive for Angular developers
- ✅ Build time <30 seconds for development
- ✅ Hot reload works consistently
- ✅ Test suite runs in <10 seconds
- ✅ Clear separation of concerns (UI/Command/Service/Data)

---

## 12. Open Questions

### 12.1 Resolved

- ✅ Use Angular 19 (latest stable)
- ✅ Use Angular CLI with esbuild (not Vite)
- ✅ Use Jest for testing (not Jasmine/Karma)
- ✅ Use Signals for state (not RxJS BehaviorSubject)
- ✅ Full migration (not hybrid Canvas+Angular)

### 12.2 To Be Decided During Implementation

1. **Maze 3D rendering approach**:
   - Option A: Pure CSS 3D transforms
   - Option B: Canvas inside Angular component
   - Option C: WebGL with Three.js
   - Decision: Start with Option A, fallback to B if needed

2. **Font selection**:
   - Option A: VT323 (Google Font, authentic CRT look)
   - Option B: Courier New (system font, faster load)
   - Option C: Custom bitmap font (most authentic, complex)
   - Decision: Prototype with A and B, choose based on visual quality

3. **Lazy loading strategy**:
   - Option A: Lazy load all scenes
   - Option B: Eager load town scenes, lazy load dungeon scenes
   - Option C: No lazy loading (acceptable bundle size)
   - Decision: Start with C, implement B if bundle >500KB

---

## 13. Next Steps

### 13.1 Immediate Actions

1. **Create Git worktree** for Angular migration (keeps main branch clean)
2. **Initialize Angular workspace**: `ng new wizardry-angular`
3. **Set up Jest**: Install `@angular-builders/jest`
4. **Copy business logic**: Services, types, data files
5. **Create shared infrastructure**: GameStateService, shared components

### 13.2 First Milestone

**Goal**: Title Screen → Castle Menu navigation working end-to-end

**Tasks**:
- Build TitleScreenComponent
- Build CastleMenuComponent
- Implement router navigation
- Verify keyboard input works
- Verify state management works

**Success**: Can press key on Title Screen, navigate to Castle Menu, see menu options

**Duration**: 2-3 days

---

## Appendix A: Command Changes

### A.1 Development Commands

**Before (Vite)**:
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm test             # Run tests (Vitest)
npm test -- --run    # Single test run
```

**After (Angular CLI)**:
```bash
ng serve             # Development server (or npm start)
ng build             # Production build
ng serve --prod      # Preview production build
npm test             # Run tests (Jest)
npm test -- --watch  # Watch mode
```

### A.2 New Commands

```bash
ng generate component <name>    # Generate component
ng generate service <name>      # Generate service
ng generate directive <name>    # Generate directive
ng test --code-coverage         # Run tests with coverage
ng build --stats-json           # Build with bundle analysis
```

---

## Appendix B: File Structure Comparison

### B.1 Before (Vite + Canvas)

```
/wizardry
  /src
    /ui
      /renderers
      /managers
      /utils
    /scenes
      /title-screen-scene
        - TitleScreenScene.ts
        /commands
      /castle-menu-scene
        - CastleMenuScene.ts
        /commands
    /services
    /types
  /data
  /tests
```

### B.2 After (Angular CLI)

```
/wizardry-angular
  /src
    /app
      /scenes
        /title-screen
          - title-screen.component.ts
          - title-screen.component.html
          - title-screen.component.scss
          /commands
        /castle-menu
          - castle-menu.component.ts
          - castle-menu.component.html
          - castle-menu.component.scss
          /commands
      /shared
        /components
        /directives
        /services
    /services (pure functions)
    /types
    /assets
      /data (moved from /data)
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-01 | Initial design document created |
| 1.1 | 2025-11-01 | Major revisions after code review: Removed event sourcing, acknowledged SceneNavigationService refactoring, fixed KeystrokeInputDirective memory leak, corrected route guard pattern, added Maze 3D rendering strategy (Canvas), updated timeline to 37-48 days realistic, updated bundle size to 340-440KB |

