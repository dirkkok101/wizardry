# Maze Scene Phase 2: Basic Maze Component

**Date**: 2025-11-06
**Status**: Approved
**Estimated Timeline**: 1 week (8-10 hours)

## Overview

Phase 2 implements the complete Maze Scene UI with full movement system, party display, message logging, and encounter detection. This phase delivers a fully functional dungeon navigation experience without 3D Canvas rendering (deferred to Phase 3).

**Key Achievement**: Transform maze stub into production-ready scene with 100% test coverage and complete keyboard navigation.

## Design Decisions

### Scope Clarification

| Original Phase 2 Plan | Actual Phase 2 Scope | Rationale |
|----------------------|---------------------|-----------|
| "Console logs, no rendering" | Full UI with message log + party display | Deliver complete UX earlier, validate integration patterns |
| Movement validation only | Include encounter detection | Enable end-to-end testing, prove Phase 1 services work |
| Defer MessageLog to Phase 4 | Build MessageLogComponent now | Reusable component, immediate visual feedback |
| No combat transition | Create CombatStubComponent | Prove navigation flow, enable integration testing |

**Result**: Phase 2 combines original Phase 2 + Phase 4 deliverables for faster iteration.

### Architecture Approach

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Implementation Order** | Component-First (Bottom-Up) | Reusable pieces ready early, test in isolation before integration |
| **Canvas Rendering** | Placeholder div only | Focus on movement logic, defer 3D to Phase 3 |
| **Combat Scene** | Minimal stub | Proves routing works, replaced in Phase 6 |
| **Testing Rigor** | 100% coverage | Critical path for navigation, same standard as Phase 1 services |
| **Component Reuse** | Maximum (7 existing components) | Follow established patterns, reduce development time |

### Component Inventory

**Reused Components** (7):
- SceneTitleComponent - Header with title
- SceneFooterComponent - Action menu wrapper
- CharacterCardComponent - Party member display
- MenuComponent - Keyboard shortcuts (used by footer)
- CharacterStatsComponent - Stat display
- StatusBadgeComponent - Status indicators
- ConfirmationDialogComponent - Modal dialogs

**New Components** (3):
- MessageLogComponent - Scrollable event log
- ActiveSpellsComponent - Spell status display
- CombatStubComponent - Temporary encounter placeholder

**Enhanced** (1):
- MazeComponent - Stub (25 lines) → Full implementation

## Architecture

### Component Structure

```
MazeComponent
├── SceneTitleComponent (reused)
│   └── "MAZE - LEVEL 1"
│
├── Content Grid (2-column layout)
│   ├── Left Column (50%)
│   │   └── Canvas Placeholder
│   │       └── <div>"3D rendering in Phase 3"</div>
│   │
│   └── Right Column (50%)
│       ├── ActiveSpellsComponent (NEW)
│       │   └── "💡 MILWA (Radius: 1)" or "No active spells"
│       │
│       └── Party Grid (2×3)
│           └── CharacterCardComponent × 6 (reused)
│
├── MessageLogComponent (NEW)
│   └── Last 10 dungeon events (scrollable)
│
└── SceneFooterComponent (reused)
    └── Action menu: Forward (W), Back (S), Turn L/R (A/D), Strafe L/R (Q/E), Camp (ESC)
```

### State Flow

```
User Input (Keyboard)
    ↓
@HostListener (MazeComponent)
    ↓
handleKeyPress() → switch(key)
    ↓
Movement Method (e.g., moveForward)
    ↓
┌───────────────────────────────────────┐
│ 1. Validate: DungeonService.canMove() │
│    ├─ allowed: true → continue        │
│    └─ allowed: false → show error     │
└───────────────────────────────────────┘
    ↓ (if allowed)
┌───────────────────────────────────────┐
│ 2. Update: NavigationService method   │
│    Returns new GameState (immutable)  │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 3. Persist: GameStateService.update() │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 4. Log: messages.update([...new msg]) │
└───────────────────────────────────────┘
    ↓
┌───────────────────────────────────────┐
│ 5. Encounter: EncounterService.roll()  │
│    ├─ true → navigate to /combat-stub │
│    └─ false → continue                │
└───────────────────────────────────────┘
    ↓
Angular Change Detection
    ↓
Template Re-renders (Signals update)
```

## Component Specifications

### 1. MessageLogComponent

**Purpose**: Reusable scrollable log for dungeon events

**Interface**:
```typescript
@Component({
  selector: 'app-message-log',
  standalone: true,
  imports: [CommonModule]
})
export class MessageLogComponent {
  readonly messages = input.required<string[]>();

  ngAfterViewInit() {
    // Auto-scroll to newest message
  }
}
```

**Template**:
```html
<div class="message-log">
  <div class="message-log-title">Recent Events:</div>
  <div class="message-log-content" #logContent>
    @for (message of messages(); track $index) {
      <div class="message">{{ message }}</div>
    }
  </div>
</div>
```

**Styling**:
- Height: 150px fixed
- Overflow-y: auto
- Font: monospace
- Auto-scroll to bottom on new messages

**Tests** (4):
- Displays all messages in order
- Shows empty state appropriately
- Auto-scrolls to newest message
- Handles 10+ messages (slices to last 10)

**Coverage Target**: 100%

---

### 2. ActiveSpellsComponent

**Purpose**: Display active party spell effects

**Interface**:
```typescript
export interface ActiveSpell {
  name: string;      // "MILWA", "DUMAPIC"
  icon: string;      // "💡", "🧭"
  description: string; // "Light (Radius: 1)"
}

@Component({
  selector: 'app-active-spells',
  standalone: true,
  imports: [CommonModule]
})
export class ActiveSpellsComponent {
  readonly spells = input.required<ActiveSpell[]>();
}
```

**Template**:
```html
<div class="active-spells">
  <div class="title">Active Spells:</div>
  @if (spells().length === 0) {
    <div class="empty">No active spells</div>
  } @else {
    @for (spell of spells(); track spell.name) {
      <div class="spell">
        <span class="icon">{{ spell.icon }}</span>
        <span class="name">{{ spell.name }}</span>
        <span class="desc">{{ spell.description }}</span>
      </div>
    }
  }
</div>
```

**Tests** (3):
- Displays spell list with icons
- Shows "No active spells" when empty
- Displays spell descriptions correctly

**Coverage Target**: 100%

---

### 3. CombatStubComponent

**Purpose**: Temporary placeholder for encounters (replaced in Phase 6)

**Interface**:
```typescript
@Component({
  selector: 'app-combat-stub',
  standalone: true,
  imports: [CommonModule, SceneTitleComponent, SceneFooterComponent]
})
export class CombatStubComponent {
  readonly footerMenuItems: MenuItem[] = [
    { id: 'return', label: 'Return to Maze (ESC)', shortcut: 'ESC', enabled: true }
  ];

  @HostListener('window:keydown.escape')
  handleEscape() {
    this.router.navigate(['/maze']);
  }

  handleFooterAction(action: string) {
    if (action === 'return') {
      this.router.navigate(['/maze']);
    }
  }
}
```

**Template**:
```html
<div class="combat-stub-scene">
  <app-scene-title title="COMBAT!" />

  <div class="combat-stub-content">
    <p>You encounter monsters!</p>
    <p><em>(Full combat system coming in Phase 6)</em></p>
  </div>

  <app-scene-footer
    [menuItems]="footerMenuItems"
    (itemSelected)="handleFooterAction($event)"
  />
</div>
```

**Route**:
```typescript
// Add to src/app/app.routes.ts
{ path: 'combat-stub', component: CombatStubComponent }
```

**Tests** (3):
- Displays combat message
- Navigates back to maze on footer action
- Handles ESC key to return to maze

**Coverage Target**: 100%

---

### 4. MazeComponent (Enhanced)

**Current State**: 25-line stub with placeholder text

**Enhanced State Management**:
```typescript
export class MazeComponent implements OnInit {
  // Dependencies
  private gameState = inject(GameStateService);
  private router = inject(Router);

  // Local signals
  readonly messages = signal<string[]>([]);
  readonly errorMessage = signal<string | null>(null);

  // Computed signals (from GameStateService)
  readonly dungeonState = computed(() => this.gameState.state().dungeon);
  readonly position = computed(() => this.dungeonState()?.position);
  readonly currentLevel = computed(() => this.dungeonState()?.currentLevel ?? 1);
  readonly party = computed(() => this.gameState.state().party);
  readonly partyCharacters = computed(() => {
    const roster = this.gameState.state().roster;
    return this.party().memberIds.map(id => roster.get(id)!);
  });

  // Active spells (computed from dungeon state)
  readonly activeSpells = computed((): ActiveSpell[] => {
    const spells: ActiveSpell[] = [];
    const dungeon = this.dungeonState();

    if (dungeon?.lightActive) {
      spells.push({
        name: 'MILWA',
        icon: '💡',
        description: `Light (Radius: ${dungeon.lightRadius})`
      });
    }

    // Future: Add DUMAPIC, LATUMAPIC, etc.

    return spells;
  });

  // Scene title
  readonly sceneTitle = computed(() => `MAZE - LEVEL ${this.currentLevel()}`);

  // Footer menu
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'forward', label: 'Forward (W)', shortcut: 'W', enabled: true },
    { id: 'back', label: 'Backward (S)', shortcut: 'S', enabled: true },
    { id: 'left', label: 'Turn Left (A)', shortcut: 'A', enabled: true },
    { id: 'right', label: 'Turn Right (D)', shortcut: 'D', enabled: true },
    { id: 'strafe_left', label: 'Strafe Left (Q)', shortcut: 'Q', enabled: true },
    { id: 'strafe_right', label: 'Strafe Right (E)', shortcut: 'E', enabled: true },
    { id: 'camp', label: 'Return to Camp (ESC)', shortcut: 'ESC', enabled: true }
  ]);

  ngOnInit() {
    // Set scene type
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.MAZE
    }));

    // Validate dungeon state
    const dungeon = this.dungeonState();
    if (!dungeon) {
      this.errorMessage.set('Dungeon not initialized. Returning to camp...');
      setTimeout(() => this.router.navigate(['/camp']), 2000);
      return;
    }

    // Add welcome message
    this.addMessage(`Entering Level ${this.currentLevel()}...`);
  }

  // Keyboard input
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    const key = event.key.toLowerCase();

    switch(key) {
      case 'w': this.moveForward(); break;
      case 's': this.moveBackward(); break;
      case 'a': this.turnLeft(); break;
      case 'd': this.turnRight(); break;
      case 'q': this.strafeLeft(); break;
      case 'e': this.strafeRight(); break;
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape() {
    this.router.navigate(['/camp']);
  }

  // Movement methods
  moveForward() {
    this.executeMovement('FORWARD', () => NavigationService.moveForward);
  }

  moveBackward() {
    this.executeMovement('BACKWARD', () => NavigationService.moveBackward);
  }

  strafeLeft() {
    this.executeMovement('STRAFE_LEFT', () => NavigationService.strafeLeft);
  }

  strafeRight() {
    this.executeMovement('STRAFE_RIGHT', () => NavigationService.strafeRight);
  }

  // Rotation methods
  turnLeft() {
    const state = this.gameState.state();
    const newState = NavigationService.turnLeft(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You turn left.');
  }

  turnRight() {
    const state = this.gameState.state();
    const newState = NavigationService.turnRight(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You turn right.');
  }

  // Generic movement executor
  private executeMovement(
    moveType: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT',
    serviceFn: (state: GameState) => GameState
  ) {
    const state = this.gameState.state();
    const level = DungeonService.loadLevel(this.currentLevel());
    const position = this.position()!;

    // Validate movement
    const validation = DungeonService.canMove(level, position, moveType);

    if (!validation.allowed) {
      this.addMessage(validation.reason!);
      return;
    }

    // Execute movement
    const newState = serviceFn(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You move forward.');

    // Check for encounter
    this.checkEncounter();
  }

  // Encounter detection
  private checkEncounter() {
    const encountered = EncounterService.rollRandomEncounter();

    if (encountered) {
      this.addMessage('You encounter monsters!');

      // Short delay before transition (allows message to display)
      setTimeout(() => {
        this.router.navigate(['/combat-stub']);
      }, 500);
    }
  }

  // Message log helper
  private addMessage(message: string) {
    this.messages.update(msgs => {
      const newMsgs = [...msgs, message];
      return newMsgs.slice(-10); // Keep last 10 messages
    });
  }

  // Footer action handler
  handleFooterAction(action: string) {
    switch(action) {
      case 'forward': this.moveForward(); break;
      case 'back': this.moveBackward(); break;
      case 'left': this.turnLeft(); break;
      case 'right': this.turnRight(); break;
      case 'strafe_left': this.strafeLeft(); break;
      case 'strafe_right': this.strafeRight(); break;
      case 'camp': this.router.navigate(['/camp']); break;
    }
  }
}
```

**Template**:
```html
<div class="maze-scene">
  <app-scene-title [title]="sceneTitle()" />

  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }

  <div class="maze-content">
    <!-- Left: Canvas Placeholder -->
    <div class="maze-viewport">
      <div class="canvas-placeholder">
        <p>3D Rendering</p>
        <p>Coming in Phase 3</p>
      </div>
    </div>

    <!-- Right: Party & Spells -->
    <div class="maze-panel">
      <!-- Active Spells -->
      <app-active-spells [spells]="activeSpells()" />

      <!-- Party Grid (2×3) -->
      <div class="party-grid">
        @for (char of partyCharacters(); track char.id) {
          <app-character-card [character]="char" />
        }
      </div>
    </div>
  </div>

  <!-- Message Log -->
  <app-message-log [messages]="messages()" />

  <!-- Footer Actions -->
  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)"
  />
</div>
```

**Styling** (maze.component.scss):
```scss
.maze-scene {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.maze-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  flex: 1;
  padding: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.maze-viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border: 2px solid #0f0;
}

.canvas-placeholder {
  text-align: center;
  color: #0f0;
  font-family: monospace;
}

.maze-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.party-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.error-message {
  background: #f00;
  color: #fff;
  padding: 1rem;
  text-align: center;
  font-weight: bold;
}
```

**Tests** (27):

**Group A: Initialization** (3 tests)
- Sets scene type to MAZE on init
- Loads dungeon state on init
- Initializes with empty message log

**Group B: Forward/Backward Movement** (6 tests)
- Moves forward when W pressed and path clear
- Shows error when moving into wall
- Adds message to log on successful move
- Moves backward when S pressed
- Wraps coordinates at edge (x=19 → x=0)
- Updates position in GameState immutably

**Group C: Rotation** (4 tests)
- Turns left when A pressed (NORTH → WEST)
- Turns right when D pressed (NORTH → EAST)
- Updates facing in GameState
- Full rotation cycle (4 turns = original direction)

**Group D: Strafe Movement** (4 tests)
- Strafes left when Q pressed
- Strafes right when E pressed
- Preserves facing direction during strafe
- Validates walls for strafe movement

**Group E: Encounter Detection** (5 tests)
- Rolls for encounter after successful movement
- Navigates to /combat-stub when encounter occurs
- Adds "You encounter monsters!" to message log
- Does not trigger encounter when movement blocked
- Statistical test: ~10% encounter rate over 100 moves

**Group F: Navigation** (2 tests)
- Returns to camp when ESC pressed
- Returns to camp via footer menu action

**Group G: Error Handling** (3 tests)
- Handles missing dungeon state gracefully
- Shows error for invalid movement attempt
- Clears error message after successful action

**Coverage Target**: 100%

## Error Handling & Edge Cases

### Movement Validation

| Edge Case | Detection | Handling | Test |
|-----------|-----------|----------|------|
| **Wall Collision** | DungeonService.canMove() → false | Show "You walk into a wall. Ouch!" message, no position change | Verify position unchanged, message added |
| **Door Blocking** | Wall type = 'door' | Show "A door blocks your way." (kicking in Phase 5) | Verify position unchanged, message shown |
| **Edge Wrapping** | x=19, move east | NavigationService wraps to x=0 seamlessly | Verify x=19 → x=0 and x=0 → x=19 |
| **Secret Door** | Wall type = 'secret' | Treat as wall, no hint it's secret | Verify blocks movement like wall |

### State Consistency

| Edge Case | Detection | Handling | Recovery |
|-----------|-----------|----------|----------|
| **Missing Dungeon State** | `dungeonState() === undefined` | Show error modal, navigate to camp after 2s | User returns to safe state |
| **Invalid Position** | x/y outside 0-19 | Clamp to valid range, log warning | Position corrected automatically |
| **Invalid Level** | level outside 1-10 | Clamp to 1-10 range, log warning | Level corrected automatically |
| **Invalid Facing** | facing not NORTH/SOUTH/EAST/WEST | Reset to NORTH, log warning | Facing corrected automatically |

### Encounter Edge Cases

| Edge Case | Behavior | Rationale | Test |
|-----------|----------|-----------|------|
| **Back-to-Back Encounters** | Allow | Authentic Wizardry brutality | Mock two consecutive rolls → two combat transitions |
| **Encounter on Blocked Move** | Do NOT trigger | Movement failed, no time passes | Verify checkEncounter() only called after successful move |
| **Party Dead** | Redirect to camp | Shouldn't be in maze, defensive check | Verify all dead → navigate to camp |

### Input Handling

| Edge Case | Behavior | Implementation |
|-----------|----------|----------------|
| **Rapid Key Presses** | Debounce | Add `processing = signal(false)` flag, check before handling input |
| **Dialog Open** | Ignore keys | ConfirmationDialogComponent already handles stopPropagation |
| **Multiple Keys** | Process first only | Check processing flag before handling |

### Message Log

| Edge Case | Handling |
|-----------|----------|
| **Message Overflow** | Slice to last 10: `messages.update(m => [...m, new].slice(-10))` |
| **Long Messages** | CSS word-wrap: break-word |
| **Empty Messages** | Filter: `if (msg.trim()) { addMessage(msg); }` |

## Testing Strategy

### Coverage Target: 100% (Critical Path)

**Test Distribution**:
- MessageLogComponent: 4 tests (100%)
- ActiveSpellsComponent: 3 tests (100%)
- CombatStubComponent: 3 tests (100%)
- MazeComponent: 27 tests (100%)
- Integration: 1 test (full flow)
- **Total: 38 tests**

### Test Utilities

**Factory Functions** (add to `tests/helpers/test-factories.ts`):
```typescript
export function createTestDungeonState(overrides?: Partial<DungeonState>): DungeonState {
  return {
    currentLevel: 1,
    position: { x: 10, y: 10, facing: 'NORTH' },
    lightActive: false,
    lightRadius: 1,
    visitedTiles: new Set<string>(),
    defeatedEncounters: [],
    ...overrides
  };
}

export function createTestGameStateWithDungeon(
  dungeonOverrides?: Partial<DungeonState>
): GameState {
  return {
    ...createGameState(), // Existing factory
    dungeon: createTestDungeonState(dungeonOverrides)
  };
}
```

**Test Helpers**:
```typescript
export function simulateKeyPress(key: string, fixture: ComponentFixture<MazeComponent>) {
  const event = new KeyboardEvent('keydown', { key });
  window.dispatchEvent(event);
  fixture.detectChanges();
}
```

### Integration Test Example

```typescript
describe('Maze Scene Integration', () => {
  it('full navigation flow: Camp → Maze → Move → Encounter → Combat → Return', async () => {
    const { fixture, router, gameState } = setupIntegrationTest();

    // 1. Navigate from camp to maze
    await router.navigate(['/maze']);
    expect(gameState.currentScene()).toBe(SceneType.MAZE);

    // 2. Verify dungeon state initialized
    const dungeon = gameState.state().dungeon;
    expect(dungeon).toBeDefined();
    expect(dungeon!.currentLevel).toBe(1);

    // 3. Simulate forward movement
    const initialY = dungeon!.position.y;
    simulateKeyPress('w', fixture);

    // 4. Verify position updated and message added
    const newDungeon = gameState.state().dungeon;
    expect(newDungeon!.position.y).toBe(initialY + 1);
    const component = fixture.componentInstance;
    expect(component.messages().length).toBeGreaterThan(0);

    // 5. Force encounter
    jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(true);
    simulateKeyPress('w', fixture);

    // 6. Verify navigation to combat-stub
    await fixture.whenStable();
    expect(router.url).toBe('/combat-stub');

    // 7. Return to maze
    await router.navigate(['/maze']);
    expect(router.url).toBe('/maze');

    // 8. Return to camp (ESC)
    simulateKeyPress('Escape', fixture);
    await fixture.whenStable();
    expect(router.url).toBe('/camp');
  });
});
```

### Performance Requirements

- **Phase 2 Test Suite**: <1 second
- **Individual Component Tests**: <100ms each
- **Integration Test**: <500ms
- **No test should use setTimeout** (use fake timers or queueMicrotask)

## Implementation Tasks

### Task 1: MessageLogComponent
- **Files**: Create 4 files in `src/components/message-log/`
- **Tests**: 4 (display, empty, scroll, overflow)
- **Commit**: "feat: add MessageLogComponent for dungeon events"

### Task 2: ActiveSpellsComponent
- **Files**: Create 4 files in `src/components/active-spells/` + `src/types/active-spell.types.ts`
- **Tests**: 3 (display, empty, descriptions)
- **Commit**: "feat: add ActiveSpellsComponent for spell status"

### Task 3: CombatStubComponent + Route
- **Files**: Create 4 files in `src/app/combat-stub/`, modify `src/app/app.routes.ts`
- **Tests**: 3 (display, navigation, ESC)
- **Commit**: "feat: add CombatStubComponent as temporary encounter placeholder"

### Task 4: MazeComponent - Initialization
- **Files**: Modify 4 maze component files
- **Tests**: 3 (Group A)
- **Commit**: "feat: implement MazeComponent initialization and state setup"

### Task 5: MazeComponent - Forward/Backward Movement
- **Files**: Modify component + tests
- **Tests**: 6 (Group B)
- **Commit**: "feat: add forward/backward movement with wall collision"

### Task 6: MazeComponent - Rotation
- **Files**: Modify component + tests
- **Tests**: 4 (Group C)
- **Commit**: "feat: add rotation with A/D keys"

### Task 7: MazeComponent - Strafe Movement
- **Files**: Modify component + tests
- **Tests**: 4 (Group D)
- **Commit**: "feat: add strafe movement with Q/E keys"

### Task 8: MazeComponent - Encounter Detection
- **Files**: Modify component + tests
- **Tests**: 5 (Group E)
- **Commit**: "feat: add encounter detection and combat transitions"

### Task 9: MazeComponent - Navigation & Error Handling
- **Files**: Modify component + tests
- **Tests**: 5 (Groups F + G)
- **Commit**: "feat: add navigation and error handling to MazeComponent"

### Task 10: Integration Test
- **Files**: Create `src/app/maze/__tests__/maze-integration.spec.ts`
- **Tests**: 1 (full flow)
- **Commit**: "test: add maze scene integration test"

### Task 11: Verify Coverage & Performance
- **Action**: Run `npm test -- --coverage`, verify 100% for Phase 2
- **Commit**: "test: verify 100% coverage for Phase 2"

## Dependencies

### Required (Already Complete)
- ✅ Phase 1 Services (DungeonService, NavigationService, EncounterService)
- ✅ GameStateService with dungeon state support
- ✅ Camp scene (for entry/exit)
- ✅ Existing UI components (SceneTitleComponent, SceneFooterComponent, CharacterCardComponent)

### Not Required (Can Be Stubbed)
- ❌ Canvas rendering (Phase 3)
- ❌ Full combat system (Phase 6)
- ❌ Spell casting (Phase 6)
- ❌ Door kicking (Phase 5)
- ❌ Tile inspection (Phase 5)

## Success Criteria

- ✅ All 6 movement types functional (W/A/S/D/Q/E)
- ✅ Wall collision detection working
- ✅ Encounter detection with 10% rate
- ✅ Combat stub transitions work
- ✅ Message log displays last 10 events
- ✅ Active spells component displays (even if empty)
- ✅ Party display with 2×3 character grid
- ✅ ESC returns to camp
- ✅ 38 tests passing with 100% coverage
- ✅ Phase 2 tests run in <1 second
- ✅ No regressions in existing 791 tests

## What's NOT in Phase 2

**Explicitly Deferred**:
- Canvas 3D wireframe rendering → Phase 3
- Special tiles (teleporters, spinners, chutes) → Phase 5
- Door kicking mechanics → Phase 5
- Tile inspection (search) → Phase 5
- Spell casting UI → Phase 6
- Full combat system → Phase 6
- Item management → Phase 6

## Timeline

**Estimated**: 1 week (8-10 hours)

**Task Breakdown**:
- Tasks 1-3 (Components): 2-3 hours
- Tasks 4-9 (MazeComponent): 4-5 hours
- Tasks 10-11 (Testing): 2 hours

**Critical Path**: Task 1 → Task 2 → Task 3 → Tasks 4-9 (sequential) → Task 10

**Parallel Work**: None (Component-First requires sequential build-up)

---

**Document Status**: Complete and approved for implementation
**Next Steps**: Set up git worktree, create detailed implementation plan with code snippets
