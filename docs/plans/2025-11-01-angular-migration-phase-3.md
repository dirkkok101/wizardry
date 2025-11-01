# Phase 3: Core Scene Implementation

**Created:** 2025-11-01
**Status:** Ready for Implementation
**Estimated Time:** 4-6 hours
**Prerequisites:** Phase 2 (Shared Infrastructure) completed

## Overview

Implement the first three scenes to establish the core navigation flow:
1. **Title Screen** - Application entry point with asset loading
2. **Castle Menu** - Central hub for all town services
3. **Edge of Town** - Gateway to Training Grounds, dungeon, and utilities

These scenes form the minimum viable navigation path and demonstrate all infrastructure components working together.

## Prerequisites Verification

Before starting, verify Phase 2 completion:

```bash
# Verify all infrastructure services exist
ls -la src/services/{GameStateService,CommandExecutorService,LoggerService}.ts

# Verify shared components exist
ls -la src/components/menu/menu.component.ts

# Verify route guards exist
ls -la src/guards/{party-exists,party-not-in-maze}.guard.ts

# Verify all tests pass
npm test -- --run
```

**Expected output:**
- All files exist
- 68 tests pass
- No TypeScript errors

## Task Breakdown

### Task 1: Title Screen Component
### Task 2: Castle Menu Component
### Task 3: Edge of Town Component
### Task 4: App Routing Configuration
### Task 5: Integration Testing
### Task 6: Code Review and Polish

---

## Task 1: Title Screen Component

**Goal:** Implement the application entry point with asset loading and "press any key" navigation.

**Reference:** `docs/ui/scenes/00-title-screen.md`

### Step 1.1: Create Title Screen Component (Test First)

**File:** `src/app/title-screen/title-screen.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TitleScreenComponent } from './title-screen.component';
import { AssetLoadingService } from '../../services/AssetLoadingService';
import { SaveService } from '../../services/SaveService';

describe('TitleScreenComponent', () => {
  let component: TitleScreenComponent;
  let fixture: ComponentFixture<TitleScreenComponent>;
  let assetService: AssetLoadingService;
  let saveService: SaveService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TitleScreenComponent],
      providers: [AssetLoadingService, SaveService]
    });

    fixture = TestBed.createComponent(TitleScreenComponent);
    component = fixture.componentInstance;
    assetService = TestBed.inject(AssetLoadingService);
    saveService = TestBed.inject(SaveService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('loads title screen assets on init', async () => {
      const loadSpy = jest.spyOn(assetService, 'loadTitleScreenAssets');

      await component.ngOnInit();

      expect(loadSpy).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('shows loading state initially', () => {
      expect(component.isLoading()).toBe(true);
      expect(component.canPressKey()).toBe(false);
    });

    it('checks for existing save data on load', async () => {
      const hasSaveSpy = jest.spyOn(saveService, 'hasSaveData');

      await component.ngOnInit();

      expect(hasSaveSpy).toHaveBeenCalled();
    });
  });

  describe('key press handling', () => {
    beforeEach(async () => {
      await component.ngOnInit(); // Complete loading
    });

    it('navigates to castle menu on any key press', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.handleKeyPress(event);

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('ignores key presses during loading', () => {
      component.isLoading.set(true);
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.handleKeyPress(event);

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('ignores repeated key presses after navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      component.handleKeyPress(event);
      component.handleKeyPress(event); // Second press

      expect(router.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('save data detection', () => {
    it('shows "Load Game" option when save exists', async () => {
      jest.spyOn(saveService, 'hasSaveData').mockResolvedValue(true);

      await component.ngOnInit();

      expect(component.hasSaveData()).toBe(true);
    });

    it('does not show "Load Game" when no save exists', async () => {
      jest.spyOn(saveService, 'hasSaveData').mockResolvedValue(false);

      await component.ngOnInit();

      expect(component.hasSaveData()).toBe(false);
    });
  });
});
```

**Commands:**
```bash
# Run failing test
npm test -- title-screen
```

**Expected:** Test fails (component doesn't exist yet)

### Step 1.2: Create Title Screen Component Implementation

**File:** `src/app/title-screen/title-screen.component.ts`

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AssetLoadingService } from '../../services/AssetLoadingService';
import { SaveService } from '../../services/SaveService';
import { KeystrokeInputDirective } from '../../directives/keystroke-input.directive';

/**
 * Title Screen Component
 *
 * Entry point for the application. Displays the Wizardry title,
 * loads assets, checks for save data, and waits for user input.
 */
@Component({
  selector: 'app-title-screen',
  standalone: true,
  imports: [CommonModule, KeystrokeInputDirective],
  templateUrl: './title-screen.component.html',
  styleUrls: ['./title-screen.component.scss']
})
export class TitleScreenComponent implements OnInit {
  // Loading state
  readonly isLoading = signal(true);
  readonly canPressKey = signal(false);
  readonly hasSaveData = signal(false);

  // Navigation state
  private hasNavigated = false;

  constructor(
    private assetService: AssetLoadingService,
    private saveService: SaveService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Load title screen assets
      await this.assetService.loadTitleScreenAssets();

      // Check for existing save data
      const saveExists = await this.saveService.hasSaveData();
      this.hasSaveData.set(saveExists);

      // Ready for input
      this.isLoading.set(false);
      this.canPressKey.set(true);
    } catch (error) {
      console.error('Failed to load title screen:', error);
      // Show error state (future enhancement)
    }
  }

  handleKeyPress(event: KeyboardEvent): void {
    // Ignore if loading or already navigated
    if (this.isLoading() || this.hasNavigated) {
      return;
    }

    // Prevent repeated navigation
    this.hasNavigated = true;

    // Navigate to castle menu
    this.router.navigate(['/castle-menu']);
  }
}
```

**File:** `src/app/title-screen/title-screen.component.html`

```html
<div class="title-screen" [class.loading]="isLoading()">
  <!-- Title Bitmap (placeholder for future graphic) -->
  <div class="title-logo">
    <h1>WIZARDRY</h1>
    <p class="subtitle">Proving Grounds of the Mad Overlord</p>
  </div>

  <!-- Loading indicator -->
  <div class="loading-status" *ngIf="isLoading()">
    <p>Loading assets...</p>
  </div>

  <!-- Ready state -->
  <div class="ready-prompt" *ngIf="!isLoading()" appKeystrokeInput (keystroke)="handleKeyPress($event)">
    <p class="press-key">Press any key to continue</p>

    <!-- Save data indicator -->
    <p class="save-indicator" *ngIf="hasSaveData()">
      Saved game detected
    </p>
  </div>

  <!-- Copyright -->
  <div class="copyright">
    <p>&copy; 1981 Sir-Tech Software, Inc.</p>
    <p>Remake 2025</p>
  </div>
</div>
```

**File:** `src/app/title-screen/title-screen.component.scss`

```scss
@use '../../styles/variables' as *;

.title-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: $padding-standard;
  text-align: center;

  &.loading {
    cursor: wait;
  }
}

.title-logo {
  margin-bottom: $spacing-xl;

  h1 {
    font-size: 48px;
    font-weight: bold;
    color: $color-text-bright;
    margin: 0 0 $spacing-md 0;
    letter-spacing: 4px;
  }

  .subtitle {
    font-size: 14px;
    color: $color-text-green;
    margin: 0;
  }
}

.loading-status {
  margin: $spacing-xl 0;

  p {
    color: $color-text-green;
    animation: blink 1s infinite;
  }
}

.ready-prompt {
  margin: $spacing-xl 0;

  .press-key {
    font-size: 16px;
    color: $color-text-bright;
    animation: pulse 2s ease-in-out infinite;
  }

  .save-indicator {
    margin-top: $spacing-md;
    font-size: 12px;
    color: $color-text-dim;
  }
}

.copyright {
  position: absolute;
  bottom: $padding-standard;

  p {
    font-size: 10px;
    color: $color-text-dim;
    margin: 4px 0;
  }
}

@keyframes blink {
  0%, 50%, 100% { opacity: 1; }
  25%, 75% { opacity: 0.3; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

// Mobile responsive
@media (max-width: 640px) {
  .title-logo h1 {
    font-size: 32px;
  }
}
```

**Commands:**
```bash
# Run tests to verify implementation
npm test -- title-screen

# Check TypeScript compilation
npx ng build --configuration development
```

**Expected:** All tests pass

### Step 1.3: Add Missing SaveService Method

The tests require `hasSaveData()` method which doesn't exist yet.

**File:** `src/services/SaveService.ts`

Add this method to the SaveService class:

```typescript
/**
 * Check if save data exists for a given save slot.
 */
async hasSaveData(saveSlot: number = 1): Promise<boolean> {
  try {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['saves'], 'readonly');
      const store = transaction.objectStore('saves');
      const request = store.get(saveSlot);

      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error checking for save data:', error);
    return false;
  }
}
```

**File:** `src/services/__tests__/SaveService.spec.ts`

Add this test:

```typescript
describe('hasSaveData', () => {
  beforeEach(async () => {
    // Clear IndexedDB before each test
    // Note: indexedDB.deleteDatabase() is async but returns void
    const deleteRequest = indexedDB.deleteDatabase('wizardry-db');
    await new Promise<void>((resolve) => {
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Resolve even on error
    });
  });

  it('returns false when no save exists', async () => {
    const result = await service.hasSaveData(1);
    expect(result).toBe(false);
  });

  it('returns true when save exists', async () => {
    const gameState = GameInitializationService.createNewGame();
    await service.saveGame(gameState, 1);

    const result = await service.hasSaveData(1);
    expect(result).toBe(true);
  });

  it('checks specific save slot', async () => {
    const gameState = GameInitializationService.createNewGame();
    await service.saveGame(gameState, 1);

    expect(await service.hasSaveData(1)).toBe(true);
    expect(await service.hasSaveData(2)).toBe(false);
  });
});
```

**Commands:**
```bash
# Run SaveService tests
npm test -- SaveService

# Run Title Screen tests again
npm test -- title-screen
```

**Expected:** All tests pass

### Step 1.4: Commit Title Screen

```bash
git add src/app/title-screen/ src/services/SaveService.ts src/services/__tests__/SaveService.spec.ts
git commit -m "$(cat <<'EOF'
feat: implement Title Screen component

- Add title screen with asset loading and "press any key" flow
- Add SaveService.hasSaveData() method for save detection
- Add keystroke navigation using KeystrokeInputDirective
- Add retro styling with animations (blink, pulse)
- Add comprehensive unit tests (16 tests)

Title Screen is the application entry point and demonstrates:
- Asset loading with AssetLoadingService
- Save data detection with SaveService
- Single-key navigation to Castle Menu
- Loading state management with signals

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Castle Menu Component

**Goal:** Implement the central navigation hub for all town services.

**Reference:** `docs/ui/scenes/01-castle-menu.md`

### Step 2.1: Create Castle Menu Component (Test First)

**File:** `src/app/castle-menu/castle-menu.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CastleMenuComponent } from './castle-menu.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('CastleMenuComponent', () => {
  let component: CastleMenuComponent;
  let fixture: ComponentFixture<CastleMenuComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CastleMenuComponent]
    });

    fixture = TestBed.createComponent(CastleMenuComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('displays castle menu title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('CASTLE');
    });

    it('shows all 5 service options', () => {
      fixture.detectChanges();

      expect(component.menuItems.length).toBe(5);
      expect(component.menuItems[0].label).toContain('TAVERN');
      expect(component.menuItems[1].label).toContain('TEMPLE');
      expect(component.menuItems[2].label).toContain('TRADING POST');
      expect(component.menuItems[3].label).toContain('INN');
      expect(component.menuItems[4].label).toContain('EDGE OF TOWN');
    });

    it('updates game state to CASTLE_MENU on init', () => {
      component.ngOnInit();

      expect(gameState.currentScene()).toBe(SceneType.CASTLE_MENU);
    });
  });

  describe('menu navigation', () => {
    it('navigates to tavern when selected', () => {
      component.handleMenuSelect('tavern');

      expect(router.navigate).toHaveBeenCalledWith(['/tavern']);
    });

    it('navigates to temple when selected', () => {
      component.handleMenuSelect('temple');

      expect(router.navigate).toHaveBeenCalledWith(['/temple']);
    });

    it('navigates to shop when selected', () => {
      component.handleMenuSelect('shop');

      expect(router.navigate).toHaveBeenCalledWith(['/shop']);
    });

    it('navigates to inn when selected', () => {
      component.handleMenuSelect('inn');

      expect(router.navigate).toHaveBeenCalledWith(['/inn']);
    });

    it('navigates to edge of town when selected', () => {
      component.handleMenuSelect('edge-of-town');

      expect(router.navigate).toHaveBeenCalledWith(['/edge-of-town']);
    });
  });

  describe('keyboard shortcuts', () => {
    it('supports (G) for tavern', () => {
      expect(component.menuItems[0].shortcut).toBe('G');
    });

    it('supports (T) for temple', () => {
      expect(component.menuItems[1].shortcut).toBe('T');
    });

    it('supports (B) for shop', () => {
      expect(component.menuItems[2].shortcut).toBe('B');
    });

    it('supports (A) for inn', () => {
      expect(component.menuItems[3].shortcut).toBe('A');
    });

    it('supports (E) for edge of town', () => {
      expect(component.menuItems[4].shortcut).toBe('E');
    });
  });
});
```

**Commands:**
```bash
npm test -- castle-menu
```

**Expected:** Test fails (component doesn't exist yet)

### Step 2.2: Create Castle Menu Component Implementation

**File:** `src/app/castle-menu/castle-menu.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';

/**
 * Castle Menu Component
 *
 * Central hub for all town services. Player navigates to:
 * - Tavern (party formation)
 * - Temple (healing/resurrection)
 * - Shop (equipment)
 * - Inn (rest/level up)
 * - Edge of Town (dungeon access)
 */
@Component({
  selector: 'app-castle-menu',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './castle-menu.component.html',
  styleUrls: ['./castle-menu.component.scss']
})
export class CastleMenuComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'tavern',
      label: "GILGAMESH'S TAVERN",
      enabled: true,
      shortcut: 'G'
    },
    {
      id: 'temple',
      label: 'TEMPLE OF CANT',
      enabled: true,
      shortcut: 'T'
    },
    {
      id: 'shop',
      label: "BOLTAC'S TRADING POST",
      enabled: true,
      shortcut: 'B'
    },
    {
      id: 'inn',
      label: "ADVENTURER'S INN",
      enabled: true,
      shortcut: 'A'
    },
    {
      id: 'edge-of-town',
      label: 'EDGE OF TOWN',
      enabled: true,
      shortcut: 'E'
    }
  ];

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Update game state to CASTLE_MENU
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CASTLE_MENU
    }));
  }

  handleMenuSelect(itemId: string): void {
    // Navigate to selected service
    this.router.navigate([`/${itemId}`]);
  }
}
```

**File:** `src/app/castle-menu/castle-menu.component.html`

```html
<div class="castle-menu">
  <header>
    <h1>CASTLE</h1>
  </header>

  <main>
    <app-menu
      [items]="menuItems"
      (select)="handleMenuSelect($event)"
    />
  </main>
</div>
```

**File:** `src/app/castle-menu/castle-menu.component.scss`

```scss
@use '../../styles/variables' as *;

.castle-menu {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $padding-standard;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

// Mobile responsive
@media (max-width: 640px) {
  .castle-menu {
    padding: $padding-small;

    header h1 {
      font-size: 20px;
    }
  }
}
```

**Commands:**
```bash
npm test -- castle-menu
```

**Expected:** All tests pass

### Step 2.3: Commit Castle Menu

```bash
git add src/app/castle-menu/
git commit -m "$(cat <<'EOF'
feat: implement Castle Menu component

- Add central navigation hub for all town services
- Support 5 service destinations (Tavern, Temple, Shop, Inn, Edge of Town)
- Use MenuComponent for consistent keyboard navigation
- Update GameState to CASTLE_MENU on init
- Add comprehensive unit tests (13 tests)

Castle Menu demonstrates:
- MenuComponent reusability
- Router navigation integration
- GameStateService state updates
- Keyboard shortcuts (G/T/B/A/E)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Edge of Town Component

**Goal:** Implement the gateway to Training Grounds, dungeon, and utilities with party display.

**Reference:** `docs/ui/scenes/07-edge-of-town.md`

### Step 3.1: Create Edge of Town Component (Test First)

**File:** `src/app/edge-of-town/edge-of-town.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EdgeOfTownComponent } from './edge-of-town.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

describe('EdgeOfTownComponent', () => {
  let component: EdgeOfTownComponent;
  let fixture: ComponentFixture<EdgeOfTownComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EdgeOfTownComponent]
    });

    fixture = TestBed.createComponent(EdgeOfTownComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  describe('initialization', () => {
    it('displays edge of town title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1')?.textContent).toContain('EDGE OF TOWN');
    });

    it('shows all 5 menu options', () => {
      fixture.detectChanges();

      expect(component.menuItems.length).toBe(5);
      expect(component.menuItems[0].label).toContain('TRAINING GROUNDS');
      expect(component.menuItems[1].label).toContain('MAZE');
      expect(component.menuItems[2].label).toContain('CASTLE');
      expect(component.menuItems[3].label).toContain('UTILITIES');
      expect(component.menuItems[4].label).toContain('LEAVE GAME');
    });

    it('updates game state to EDGE_OF_TOWN on init', () => {
      component.ngOnInit();

      expect(gameState.currentScene()).toBe(SceneType.EDGE_OF_TOWN);
    });

    it('displays current party members', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: ['char-1', 'char-2']
        }
      }));

      fixture.detectChanges();

      expect(component.currentParty().members.length).toBe(2);
    });
  });

  describe('menu navigation', () => {
    it('navigates to training grounds when selected', () => {
      component.handleMenuSelect('training-grounds');

      expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
    });

    it('navigates to maze when party exists', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: ['char-1'] }
      }));

      component.handleMenuSelect('maze');

      expect(router.navigate).toHaveBeenCalledWith(['/camp']);
    });

    it('shows error when entering maze without party', () => {
      gameState.updateState(state => ({
        ...state,
        party: { ...state.party, members: [] }
      }));

      component.handleMenuSelect('maze');

      expect(router.navigate).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBeTruthy();
    });

    it('navigates to castle when selected', () => {
      component.handleMenuSelect('castle');

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('navigates to utilities when selected', () => {
      component.handleMenuSelect('utilities');

      expect(router.navigate).toHaveBeenCalledWith(['/utilities']);
    });
  });

  describe('leave game', () => {
    it('shows confirmation dialog', () => {
      component.handleMenuSelect('leave-game');

      expect(component.showExitConfirmation()).toBe(true);
    });

    it('cancels exit when user chooses No', () => {
      component.handleMenuSelect('leave-game');
      component.cancelExit();

      expect(component.showExitConfirmation()).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
```

**Commands:**
```bash
npm test -- edge-of-town
```

**Expected:** Test fails (component doesn't exist yet)

### Step 3.2: Create Edge of Town Component Implementation

**File:** `src/app/edge-of-town/edge-of-town.component.ts`

```typescript
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

/**
 * Edge of Town Component
 *
 * Gateway menu for:
 * - Training Grounds (character creation)
 * - Maze (dungeon entry via Camp)
 * - Castle (return to hub)
 * - Utilities (system options)
 * - Leave Game (save and exit)
 */
@Component({
  selector: 'app-edge-of-town',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './edge-of-town.component.html',
  styleUrls: ['./edge-of-town.component.scss']
})
export class EdgeOfTownComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'training-grounds',
      label: 'TRAINING GROUNDS',
      enabled: true,
      shortcut: 'T'
    },
    {
      id: 'maze',
      label: 'MAZE',
      enabled: true,
      shortcut: 'M'
    },
    {
      id: 'castle',
      label: 'CASTLE',
      enabled: true,
      shortcut: 'C'
    },
    {
      id: 'utilities',
      label: 'UTILITIES',
      enabled: true,
      shortcut: 'U'
    },
    {
      id: 'leave-game',
      label: 'LEAVE GAME',
      enabled: true,
      shortcut: 'L'
    }
  ];

  // Party display
  readonly currentParty = computed(() => this.gameState.party());

  // Party characters with full details
  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  // Error and confirmation state
  readonly errorMessage = signal<string | null>(null);
  readonly showExitConfirmation = signal(false);

  constructor(
    private gameState: GameStateService,
    private saveService: SaveService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Update game state to EDGE_OF_TOWN
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.EDGE_OF_TOWN
    }));
  }

  handleMenuSelect(itemId: string): void {
    // Clear previous errors
    this.errorMessage.set(null);

    switch (itemId) {
      case 'training-grounds':
        this.router.navigate(['/training-grounds']);
        break;

      case 'maze':
        this.enterMaze();
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;

      case 'utilities':
        this.router.navigate(['/utilities']);
        break;

      case 'leave-game':
        this.showExitConfirmation.set(true);
        break;
    }
  }

  private enterMaze(): void {
    const party = this.currentParty();

    // Validate party exists
    if (party.members.length === 0) {
      this.errorMessage.set('You need a party to enter the maze (visit Tavern)');
      return;
    }

    // Navigate to Camp (dungeon entry)
    this.router.navigate(['/camp']);
  }

  async confirmExit(): Promise<void> {
    // Save game state
    const state = this.gameState.state();
    await this.saveService.saveGame(state);

    // Close browser window/tab
    // Note: window.close() only works if window was opened by script
    // For user-opened tabs, this will have no effect
    window.close();

    // If window.close() fails (most browsers), show a message
    // informing the user they can safely close the tab
    this.showExitConfirmation.set(false);
    alert('Game saved successfully. You can now close this window.');
  }

  cancelExit(): void {
    this.showExitConfirmation.set(false);
  }
}
```

**File:** `src/app/edge-of-town/edge-of-town.component.html`

```html
<div class="edge-of-town">
  <header>
    <h1>EDGE OF TOWN</h1>
  </header>

  <main>
    <div class="menu-section">
      <app-menu
        [items]="menuItems"
        (select)="handleMenuSelect($event)"
      />
    </div>

    <div class="party-section">
      <h2>CURRENT PARTY:</h2>
      <ul *ngIf="partyCharacters().length > 0; else noParty">
        <li *ngFor="let char of partyCharacters(); let i = index">
          {{ i + 1 }}. {{ char.name }} - {{ char.class }} (Lv{{ char.level }})
        </li>
      </ul>
      <ng-template #noParty>
        <p class="no-party">No party formed</p>
      </ng-template>
    </div>
  </main>

  <!-- Error message -->
  <div class="error-message" *ngIf="errorMessage()">
    <p>{{ errorMessage() }}</p>
  </div>

  <!-- Exit confirmation -->
  <div class="confirmation-dialog" *ngIf="showExitConfirmation()">
    <div class="dialog-content">
      <p>Save and quit?</p>
      <div class="dialog-actions">
        <button (click)="confirmExit()">(Y)es</button>
        <button (click)="cancelExit()">(N)o</button>
      </div>
    </div>
  </div>
</div>
```

**File:** `src/app/edge-of-town/edge-of-town.component.scss`

```scss
@use '../../styles/variables' as *;

.edge-of-town {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $padding-standard;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-xl;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }

  .menu-section {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .party-section {
    border-left: 1px solid $color-text-dim;
    padding-left: $spacing-lg;

    @media (max-width: 640px) {
      border-left: none;
      border-top: 1px solid $color-text-dim;
      padding-left: 0;
      padding-top: $spacing-lg;
    }

    h2 {
      font-size: 16px;
      color: $color-text-green;
      margin: 0 0 $spacing-md 0;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        color: $color-text-green;
        margin-bottom: $spacing-sm;
      }
    }

    .no-party {
      color: $color-text-dim;
      font-style: italic;
    }
  }

  .error-message {
    margin-top: $spacing-lg;
    text-align: center;

    p {
      color: $color-error;
      font-weight: bold;
    }
  }

  .confirmation-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;

    .dialog-content {
      background: $color-bg-black;
      border: 2px solid $color-text-bright;
      padding: $spacing-xl;
      text-align: center;

      p {
        font-size: 18px;
        color: $color-text-bright;
        margin: 0 0 $spacing-lg 0;
      }

      .dialog-actions {
        display: flex;
        gap: $spacing-md;
        justify-content: center;

        button {
          background: none;
          border: 1px solid $color-text-green;
          color: $color-text-green;
          font-family: $font-mono;
          font-size: 14px;
          padding: $spacing-sm $spacing-lg;
          cursor: pointer;

          &:hover {
            background: $color-text-green;
            color: $color-bg-black;
          }
        }
      }
    }
  }
}
```

### Step 3.3: Add Missing Color Variables

**File:** `src/styles/variables.scss`

Add these missing color variables:

```scss
// Existing colors
$color-bg-black: #000000;
$color-text-green: #00ff00;
$color-text-bright: #00ff88;

// Add these new colors
$color-text-dim: #008800;
$color-error: #ff0000;

// Existing variables
$font-mono: 'Courier New', 'Courier', monospace;
$screen-width: 640px;

// Add spacing variables
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

$padding-small: 8px;
$padding-standard: 16px;
```

**Commands:**
```bash
npm test -- edge-of-town
```

**Expected:** All tests pass

### Step 3.4: Commit Edge of Town

```bash
git add src/app/edge-of-town/ src/styles/variables.scss
git commit -m "$(cat <<'EOF'
feat: implement Edge of Town component

- Add gateway menu for Training Grounds, Maze, Castle, Utilities, Leave Game
- Display current party roster with member list
- Add maze entry validation (requires party)
- Add exit confirmation dialog (Y/N)
- Add error message display for invalid actions
- Add comprehensive unit tests (12 tests)

Edge of Town demonstrates:
- Computed signals for reactive party display
- Conditional navigation with validation
- Confirmation dialogs
- Grid layout with responsive design

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: App Routing Configuration

**Goal:** Configure Angular Router for all three scenes with proper navigation flow.

### Step 4.1: Update App Routes

**File:** `src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { TitleScreenComponent } from './title-screen/title-screen.component';
import { CastleMenuComponent } from './castle-menu/castle-menu.component';
import { EdgeOfTownComponent } from './edge-of-town/edge-of-town.component';

export const routes: Routes = [
  {
    path: '',
    component: TitleScreenComponent
  },
  {
    path: 'castle-menu',
    component: CastleMenuComponent
  },
  {
    path: 'edge-of-town',
    component: EdgeOfTownComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
```

### Step 4.2: Update App Component

**File:** `src/app/app.component.ts`

```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: []
})
export class AppComponent {}
```

### Step 4.3: Verify Routing

```bash
# Start dev server
npm start

# In browser, navigate to:
# http://localhost:4200/         (should show Title Screen)
# http://localhost:4200/castle-menu (should show Castle Menu)
# http://localhost:4200/edge-of-town (should show Edge of Town)
```

**Expected:**
- Title Screen loads at root
- Can navigate to Castle Menu
- Can navigate to Edge of Town
- All keyboard shortcuts work

### Step 4.4: Commit Routing

```bash
git add src/app/app.routes.ts src/app/app.component.ts
git commit -m "$(cat <<'EOF'
feat: configure routing for Title Screen, Castle Menu, Edge of Town

- Add routes for all three core scenes
- Configure wildcard redirect to Title Screen
- Update AppComponent to use RouterOutlet

Navigation flow:
  Title Screen (/) → Castle Menu → Edge of Town

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Integration Testing

**Goal:** Verify all three scenes work together with proper navigation flow.

### Step 5.1: Create Integration Test

**File:** `src/app/__tests__/navigation-flow.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { routes } from '../app.routes';

describe('Navigation Flow Integration', () => {
  let router: Router;
  let location: Location;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)]
    });

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  describe('Title Screen → Castle Menu', () => {
    it('navigates from title screen to castle menu', async () => {
      await router.navigate(['/']);
      expect(location.path()).toBe('');

      await router.navigate(['/castle-menu']);
      expect(location.path()).toBe('/castle-menu');
    });
  });

  describe('Castle Menu → Edge of Town', () => {
    it('navigates from castle menu to edge of town', async () => {
      await router.navigate(['/castle-menu']);
      expect(location.path()).toBe('/castle-menu');

      await router.navigate(['/edge-of-town']);
      expect(location.path()).toBe('/edge-of-town');
    });
  });

  describe('Edge of Town → Castle Menu (round trip)', () => {
    it('navigates back to castle menu from edge of town', async () => {
      await router.navigate(['/edge-of-town']);
      expect(location.path()).toBe('/edge-of-town');

      await router.navigate(['/castle-menu']);
      expect(location.path()).toBe('/castle-menu');
    });
  });

  describe('Invalid routes', () => {
    it('redirects invalid routes to title screen', async () => {
      await router.navigate(['/invalid-route']);
      expect(location.path()).toBe('');
    });
  });
});
```

**Commands:**
```bash
npm test -- navigation-flow
```

**Expected:** All integration tests pass

### Step 5.2: Run Full Test Suite

```bash
# Run all tests
npm test -- --run

# Check coverage
npm test -- --coverage
```

**Expected:**
- All 116 tests pass (68 from Phase 2 + 48 new tests)
- Coverage remains above 80%
- No TypeScript errors

### Step 5.3: Commit Integration Tests

```bash
git add src/app/__tests__/navigation-flow.spec.ts
git commit -m "$(cat <<'EOF'
test: add integration tests for navigation flow

- Test Title Screen → Castle Menu navigation
- Test Castle Menu → Edge of Town navigation
- Test Edge of Town → Castle Menu round trip
- Test invalid route redirects

Verifies complete navigation flow works end-to-end.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Code Review and Polish

**Goal:** Review all code, verify quality standards, and prepare for PR.

### Step 6.1: Run Code Review

Use the code-reviewer subagent to verify implementation quality:

```bash
# Review against Phase 3 plan
# (User will trigger this manually)
```

### Step 6.2: Verify Build

```bash
# Production build
npm run build

# Check bundle size
ls -lh dist/wizardry-angular/browser/
```

**Expected:**
- Build succeeds
- No warnings
- Reasonable bundle size (<500KB for main bundle)

### Step 6.3: Manual Testing Checklist

Open browser to http://localhost:4200 and verify:

- [ ] Title Screen loads with "WIZARDRY" title
- [ ] "Press any key" navigation works
- [ ] Castle Menu displays 5 service options
- [ ] Keyboard shortcuts work (G/T/B/A/E)
- [ ] Edge of Town displays party section
- [ ] Edge of Town menu options work (T/M/C/U/L)
- [ ] Maze entry shows error when no party
- [ ] Leave Game shows confirmation dialog
- [ ] Retro styling looks correct (green on black)
- [ ] Mobile responsive layout works

### Step 6.4: Update Phase 3 Documentation

**File:** `docs/plans/2025-11-01-angular-migration-phase-3.md`

Add completion section at top:

```markdown
**Status:** ✅ Completed
**Completion Date:** [DATE]
**Total Tests:** 116 passing
**Code Review:** Passed
```

### Step 6.5: Final Commit

```bash
git add docs/plans/2025-11-01-angular-migration-phase-3.md
git commit -m "$(cat <<'EOF'
docs: mark Phase 3 as completed

Phase 3 Implementation Summary:
- ✅ Title Screen component with asset loading
- ✅ Castle Menu component with 5 service options
- ✅ Edge of Town component with party display
- ✅ Routing configuration for all scenes
- ✅ Integration tests for navigation flow
- ✅ 48 new tests added (116 total)
- ✅ All tests passing
- ✅ Code review passed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## Verification

After completing all tasks, verify Phase 3 is complete:

```bash
# All tests pass
npm test -- --run
# Expected: 116 tests passing in <2.5 seconds

# TypeScript compiles
npx ng build --configuration development
# Expected: Build succeeds with no errors

# All three scenes exist
ls -la src/app/{title-screen,castle-menu,edge-of-town}/
# Expected: All three directories exist with component files

# Routing configured
grep -A 5 "export const routes" src/app/app.routes.ts
# Expected: Routes for /, /castle-menu, /edge-of-town
```

---

## Next Steps

After Phase 3 completion, proceed to Phase 4:

**Phase 4: Service Scenes** (Tavern, Temple, Shop, Inn)
- Implement complex UI flows (character selection, transactions)
- Add data tables and character displays
- Implement service-specific commands

**Phase 5: Training Grounds** (Character Creation)
- Implement character creation wizard
- Add stat rolling and class eligibility
- Add roster management

**Phase 6: Dungeon System** (Camp, Maze, Combat)
- Implement dungeon rendering
- Add movement and exploration
- Add turn-based combat system

---

## Notes

**Architecture Patterns Demonstrated:**
- Signal-based reactive state management
- Component composition with MenuComponent
- Route-based navigation
- Computed signals for derived data
- Error handling with signal state

**Testing Patterns:**
- Test-first development (TDD)
- Component testing with TestBed
- Integration testing with Router
- Signal testing patterns

**Code Quality:**
- TypeScript strict mode
- No console.log in production code
- Comprehensive test coverage
- Mobile-first responsive design
- Accessibility considerations (keyboard navigation)

**Performance:**
- Test suite completes in <2.5 seconds
- Minimal bundle size
- No unnecessary re-renders (signals)
- Lazy loading ready (future enhancement)
