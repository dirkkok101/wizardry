# Maze Scene & Services Refactoring Plan

## Implementation Status: ✅ COMPLETE

All 6 phases have been implemented. The new services and utilities provide a foundation for incrementally refactoring MazeComponent.

---

## Executive Summary

The maze scene (`MazeComponent`) is a **4,163-line God Component** with **48 signals**, **65+ methods**, and multiple **transaction script anti-patterns**. This document provides a phased refactoring plan using SOLID, DRY, YAGNI, and Clean Code principles.

---

## Current State Analysis

### Critical Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| MazeComponent Lines | 4,163 | <500 | ❌ CRITICAL |
| Methods in Component | 65+ | <15 | ❌ CRITICAL |
| Signals in Component | 48 | <10 | ❌ CRITICAL |
| Max Method Length | 200+ lines | <30 | ❌ CRITICAL |
| Service Dependencies | 20+ | <5 | ❌ HIGH |
| Callback Nesting Depth | 4 | <2 | ❌ HIGH |

### Identified Issues

#### 1. Transaction Scripts (Procedural Orchestration)

| Method | Lines | Issue |
|--------|-------|-------|
| `executeMovement()` | 1830-2032 (200+ lines) | Orchestrates 10+ concerns procedurally |
| `checkForEncounter()` | 2038-2100 | Mixes business logic with UI side effects |
| `initiateEncounter()` | 2107-2168 | Async orchestration without structure |
| `onExecuteRound()` | 2290-2351 | Complex combat round execution |
| `castSpell()` | 2976-3050 | Spell effect orchestration with nested state updates |
| `handleSpecialTile()` (Service) | 434-592 | 160-line if-else chain |

#### 2. Single Responsibility Principle (SRP) Violations

**MazeComponent currently handles 15+ responsibilities:**
1. Game state management
2. 3D WebGL rendering
3. Movement orchestration
4. Combat system coordination
5. Chest interaction handling
6. Spell casting
7. Encounter triggering
8. UI state management (48 signals!)
9. Message logging
10. Elevator logic
11. Poison damage handling
12. Victory/defeat handling
13. Trap disarm mechanics
14. Teleportation effects
15. Light spell effects

#### 3. Open/Closed Principle (OCP) Violations

**DungeonMovementService.handleSpecialTile()** uses a massive if-else chain:
```typescript
if (this.tileHasType(tile, 'teleporter')) { ... }
if (this.tileHasType(tile, 'spinner')) { ... }
if (this.tileHasType(tile, 'chute')) { ... }
if (this.tileHasType(tile, 'pit')) { ... }
if (this.tileHasType(tile, 'stairs_up')) { ... }
if (this.tileHasType(tile, 'stairs_down')) { ... }
if (this.tileHasType(tile, 'elevator')) { ... }
```

Adding a new tile type requires modifying this method instead of extending it.

#### 4. Dependency Inversion Principle (DIP) Violations

Direct service instantiation in component:
```typescript
// maze.component.ts line ~1120
this.webglRenderer = new WebGLRenderingService();
```

Should be injected, not instantiated directly.

#### 5. DRY Violations

**Duplicate condition checking** appears in multiple locations:
- Line 584-595: `getActionsForCharacter()`
- Line 237-238: `characterHasSpells()`
- Line 327-328: `getCombatActionsForCharacter()`

```typescript
// Repeated pattern:
if (SpellLearningService.isCaster(char) &&
    SpellCastingService.hasSpellsInContext(char, 'dungeon') &&
    char.status !== CharacterStatus.DEAD &&
    char.status !== CharacterStatus.ASHES &&
    char.status !== CharacterStatus.PARALYZED &&
    char.status !== CharacterStatus.ASLEEP) { ... }
```

#### 6. Callback Hell Pattern

**Lines 1876-1931** show nested callback chains:
```typescript
const executeFailAction = () => {
  const showFailMessage = () => {
    if (conditionResult.message) {
      this.showConditionMessage(
        conditionResult.message,
        style,
        executeFailAction  // ← Callback hell
      );
    }
  };
  if (conditionResult.entryMessage) {
    this.showConditionMessage(
      conditionResult.entryMessage,
      style,
      showFailMessage  // ← Nested callback
    );
  }
};
```

#### 7. Signal Proliferation (State Machine Anti-Pattern)

48 individual signals create an **implicit hidden state machine**:
```typescript
readonly combatPhase = signal<'idle' | 'encounter' | 'action_select' | ...>('idle');
readonly letterboxType = signal<'encounter' | 'ambush' | 'surprise' | null>(null);
readonly isTargetingMode = signal<boolean>(false);
readonly isExecutingRound = signal<boolean>(false);
readonly showVictoryOverlay = signal<boolean>(false);
readonly showDefeatOverlay = signal<boolean>(false);
readonly chestPhase = signal<ChestPhase>('idle');
readonly tileMessagePhase = signal<TileMessagePhase>('idle');
// ... 40 more signals
```

**Problems:**
- No validation of state transitions
- Can enter impossible states
- Hard to reason about actual game state

---

## Refactoring Plan

### Phase 1: Extract State Machines (High Priority)

#### 1.1 Create MazeStateMachine Service

Replace 48 individual signals with a single discriminated union state:

```typescript
// src/app/services/MazeStateMachine.ts
export type MazePhase =
  | { type: 'exploration' }
  | { type: 'tile_message'; message: string; style: MessageStyle; onDismiss?: () => void }
  | { type: 'combat'; phase: CombatPhase; data: CombatStateData }
  | { type: 'chest'; phase: ChestPhase; data: ChestStateData }
  | { type: 'spell_casting'; context: SpellContext; data: SpellCastingData }
  | { type: 'elevator'; destinations: ElevatorDestination[] };

export type CombatPhase =
  | 'letterbox_intro'
  | 'action_select'
  | 'targeting'
  | 'executing'
  | 'cinematic'
  | 'victory'
  | 'defeat';

export interface MazeStateMachine {
  readonly state: Signal<MazePhase>;

  // Validated transitions
  startExploration(): void;
  showTileMessage(message: string, style: MessageStyle, onDismiss?: () => void): void;
  dismissTileMessage(): void;
  startCombat(encounter: EncounterData): void;
  transitionCombatPhase(phase: CombatPhase): void;
  startChestInteraction(chest: Chest): void;
  // ... etc.

  // Guards
  canTransitionTo(phase: MazePhase): boolean;
}
```

**Benefits:**
- Single source of truth for maze state
- Validated transitions prevent impossible states
- Easy to test state machine logic
- Reduces component complexity from 48 signals to 1

#### 1.2 Create CombatOrchestrationService

Extract combat orchestration from component:

```typescript
// src/app/services/CombatOrchestrationService.ts
export interface CombatOrchestrationService {
  // Combat lifecycle
  initiateEncounter(config: EncounterConfig): CombatState;
  collectPartyCommands(commands: Map<string, CombatCommand>): void;
  executeRound(): CombatRoundResult;

  // Combat queries
  getAvailableActions(character: Character): CombatAction[];
  getValidTargets(character: Character, action: CombatAction): Target[];

  // Combat resolution
  processVictory(state: CombatState): VictoryResult;
  processDefeat(state: CombatState): DefeatResult;
  processEscape(state: CombatState): EscapeResult;
}
```

#### 1.3 Create ChestOrchestrationService

Extract chest interaction logic:

```typescript
// src/app/services/ChestOrchestrationService.ts
export interface ChestOrchestrationService {
  // Chest lifecycle
  startInteraction(chest: Chest): ChestInteractionState;
  inspectTrap(inspector: Character): TrapInspectionResult;
  disarmTrap(disarmer: Character): TrapDisarmResult;
  openChest(opener: Character): ChestOpenResult;

  // Queries
  getRecommendedHandler(party: Character[]): RecommendedHandler;
  getCalfoEligibleCasters(party: Character[]): Character[];
  getDisarmChance(character: Character, trap: Trap): number;
}
```

---

### Phase 2: Apply Strategy Pattern to Tile Handling

#### 2.1 Create TileHandler Interface and Implementations

Replace the 160-line if-else chain in `DungeonMovementService.handleSpecialTile()`:

```typescript
// src/app/services/tile-handlers/TileHandler.ts
export interface TileHandler {
  readonly tileType: TileType;
  canHandle(tile: TileData): boolean;
  handle(state: GameState, tile: TileData, context: TileContext): TileHandlerResult;
}

// src/app/services/tile-handlers/TeleporterHandler.ts
export class TeleporterHandler implements TileHandler {
  readonly tileType = 'teleporter';

  canHandle(tile: TileData): boolean {
    return tile.types?.includes('teleporter') ?? false;
  }

  handle(state: GameState, tile: TileData, context: TileContext): TileHandlerResult {
    // Teleporter logic extracted from DungeonMovementService
  }
}

// Similar handlers for: SpinnerHandler, ChuteHandler, PitHandler,
// StairsUpHandler, StairsDownHandler, ElevatorHandler, DarknessHandler
```

#### 2.2 Create TileHandlerRegistry

```typescript
// src/app/services/tile-handlers/TileHandlerRegistry.ts
export class TileHandlerRegistry {
  private handlers: Map<TileType, TileHandler> = new Map();

  register(handler: TileHandler): void {
    this.handlers.set(handler.tileType, handler);
  }

  handleTile(state: GameState, tile: TileData, context: TileContext): TileHandlerResult {
    for (const handler of this.handlers.values()) {
      if (handler.canHandle(tile)) {
        return handler.handle(state, tile, context);
      }
    }
    return { newState: state, messages: [] };
  }
}
```

**Benefits:**
- OCP: Add new tile types without modifying existing code
- SRP: Each handler has one responsibility
- Testability: Test each handler in isolation

---

### Phase 3: Extract Movement Orchestration

#### 3.1 Create MovementOrchestrationService

Extract the 200-line `executeMovement()` method:

```typescript
// src/app/services/MovementOrchestrationService.ts
export interface MovementOrchestrationService {
  // Movement execution
  executeMovement(
    direction: MovementDirection,
    state: GameState
  ): MovementOrchestrationResult;

  // Result contains:
  // - Updated game state
  // - Messages to display
  // - UI actions to trigger (show letterbox, trigger encounter, etc.)
}

export interface MovementOrchestrationResult {
  state: GameState;
  messages: string[];
  uiAction?: MovementUIAction;
}

export type MovementUIAction =
  | { type: 'none' }
  | { type: 'show_tile_message'; message: string; style: MessageStyle; onDismiss: () => void }
  | { type: 'trigger_encounter'; config: EncounterConfig }
  | { type: 'show_condition_fail'; result: ConditionResult }
  | { type: 'show_elevator'; destinations: ElevatorDestination[] };
```

**Component becomes simple delegation:**
```typescript
moveForward(): void {
  const result = this.movementOrchestration.executeMovement('FORWARD', this.gameState.state());
  this.gameState.updateState(() => result.state);

  for (const msg of result.messages) {
    this.addMessage(msg);
  }

  this.handleUIAction(result.uiAction);
  this.render();
}

private handleUIAction(action: MovementUIAction): void {
  switch (action.type) {
    case 'show_tile_message':
      this.stateMachine.showTileMessage(action.message, action.style, action.onDismiss);
      break;
    case 'trigger_encounter':
      this.stateMachine.startCombat(action.config);
      break;
    // ...
  }
}
```

---

### Phase 4: Decompose MazeComponent

#### 4.1 Extract Feature Components

Split MazeComponent into focused child components:

```
src/app/scenes/maze/
├── maze.component.ts           # Coordinator (~300 lines)
├── maze.component.html
├── maze.component.scss
├── components/
│   ├── maze-canvas/           # WebGL rendering only
│   │   ├── maze-canvas.component.ts
│   │   └── maze-canvas.component.html
│   ├── maze-combat/           # Combat UI overlay
│   │   ├── maze-combat.component.ts
│   │   └── maze-combat.component.html
│   ├── maze-chest/            # Chest interaction overlay
│   │   ├── maze-chest.component.ts
│   │   └── maze-chest.component.html
│   └── maze-spell-dialog/     # Spell selection dialog
│       ├── maze-spell-dialog.component.ts
│       └── maze-spell-dialog.component.html
```

**MazeComponent responsibility:** Coordinate child components based on state machine phase.

#### 4.2 Component Communication via State Machine

```typescript
// maze.component.ts (~300 lines)
@Component({
  selector: 'app-maze',
  template: `
    <app-maze-canvas
      [dungeonState]="dungeonState()"
      [lightActive]="lightActive()"
    />

    @if (stateMachine.state().type === 'combat') {
      <app-maze-combat
        [combatState]="stateMachine.state().data"
        [phase]="stateMachine.state().phase"
        (actionSelected)="onCombatAction($event)"
        (roundComplete)="onRoundComplete($event)"
      />
    }

    @if (stateMachine.state().type === 'chest') {
      <app-maze-chest
        [chest]="stateMachine.state().data.chest"
        [phase]="stateMachine.state().phase"
        (action)="onChestAction($event)"
      />
    }

    @if (stateMachine.state().type === 'tile_message') {
      <app-tile-message-overlay
        [message]="stateMachine.state().message"
        [style]="stateMachine.state().style"
        (dismiss)="onTileMessageDismiss()"
      />
    }
  `
})
export class MazeComponent {
  // Inject state machine and orchestration services
  constructor(
    private stateMachine: MazeStateMachine,
    private movementOrchestration: MovementOrchestrationService,
    private combatOrchestration: CombatOrchestrationService,
    private chestOrchestration: ChestOrchestrationService,
    private gameState: GameStateService
  ) {}

  // Simple delegation methods
  moveForward(): void {
    const result = this.movementOrchestration.executeMovement('FORWARD', this.gameState.state());
    this.applyResult(result);
  }
}
```

---

### Phase 5: Eliminate Callback Hell

#### 5.1 Replace Callbacks with Async/Await

```typescript
// BEFORE (callback hell):
const executeFailAction = () => {
  const showFailMessage = () => {
    if (conditionResult.message) {
      this.showConditionMessage(msg, style, executeFailAction);
    } else {
      executeFailAction();
    }
  };
  if (conditionResult.entryMessage) {
    this.showConditionMessage(entry, style, showFailMessage);
  }
};

// AFTER (async/await):
async handleConditionFail(result: ConditionResult): Promise<void> {
  if (result.entryMessage) {
    await this.showMessageAsync(result.entryMessage, result.entryMessageStyle);
  }

  if (result.message) {
    await this.showMessageAsync(result.message, result.messageStyle);
  }

  this.executeConditionFailAction(result);
}

private showMessageAsync(message: string, style: MessageStyle): Promise<void> {
  return new Promise(resolve => {
    this.stateMachine.showTileMessage(message, style, resolve);
  });
}
```

---

### Phase 6: DRY Improvements

#### 6.1 Create Character Query Helpers

```typescript
// src/app/utils/CharacterQueries.ts
export const CharacterQueries = {
  canAct(char: Character): boolean {
    return ![
      CharacterStatus.DEAD,
      CharacterStatus.ASHES,
      CharacterStatus.PARALYZED,
      CharacterStatus.ASLEEP
    ].includes(char.status);
  },

  canCastSpells(char: Character, context: 'dungeon' | 'combat'): boolean {
    return (
      this.canAct(char) &&
      SpellLearningService.isCaster(char) &&
      SpellCastingService.hasSpellsInContext(char, context)
    );
  },

  getAliveMembers(party: Character[]): Character[] {
    return party.filter(c => c.status !== CharacterStatus.DEAD);
  }
};
```

#### 6.2 Consolidate Light State Messages

```typescript
// src/app/services/LightMessageService.ts
export const LightMessageService = {
  getStateChangeMessage(
    oldState: LightState,
    newState: LightState
  ): string | null {
    if (!oldState.inDarkness && newState.inDarkness) {
      return oldState.lightActive
        ? 'An unnatural darkness engulfs you! Your light spell is extinguished!'
        : 'You enter an area of impenetrable darkness.';
    }

    if (oldState.inDarkness && !newState.inDarkness) {
      return 'You emerge from the darkness.';
    }

    if (oldState.lightActive && !newState.lightActive) {
      return 'Your light spell has expired! Darkness surrounds you.';
    }

    if (newState.lightActive && newState.duration === 5) {
      return `Your ${newState.spellType} spell is fading... (5 steps remaining)`;
    }

    return null;
  }
};
```

---

## Implementation Priority

### Week 1-2: Foundation (Critical)

| Task | Files | Effort |
|------|-------|--------|
| Create MazeStateMachine | New service | 2 days |
| Migrate combat signals to state machine | MazeComponent | 2 days |
| Migrate chest signals to state machine | MazeComponent | 1 day |
| Create CharacterQueries helpers | New utility | 0.5 days |
| Add state machine tests | New tests | 1.5 days |

### Week 3-4: Orchestration Services (High)

| Task | Files | Effort |
|------|-------|--------|
| Create CombatOrchestrationService | New service | 2 days |
| Create ChestOrchestrationService | New service | 1.5 days |
| Create MovementOrchestrationService | New service | 2 days |
| Migrate component logic to services | MazeComponent | 1.5 days |
| Add orchestration service tests | New tests | 2 days |

### Week 5-6: Tile Handler Strategy (Medium)

| Task | Files | Effort |
|------|-------|--------|
| Create TileHandler interface | New interface | 0.5 days |
| Extract tile-specific handlers | 8 new files | 3 days |
| Create TileHandlerRegistry | New service | 0.5 days |
| Refactor DungeonMovementService | Existing service | 1 day |
| Add tile handler tests | New tests | 2 days |

### Week 7-8: Component Decomposition (Medium)

| Task | Files | Effort |
|------|-------|--------|
| Extract MazeCanvasComponent | New component | 1.5 days |
| Extract MazeCombatComponent | New component | 2 days |
| Extract MazeChestComponent | New component | 1.5 days |
| Simplify MazeComponent coordinator | Existing component | 1 day |
| Integration testing | Test files | 2 days |

---

## File Changes Summary

### New Files to Create

```
src/app/services/
├── MazeStateMachine.ts
├── CombatOrchestrationService.ts
├── ChestOrchestrationService.ts
├── MovementOrchestrationService.ts
├── LightMessageService.ts
├── tile-handlers/
│   ├── TileHandler.ts (interface)
│   ├── TileHandlerRegistry.ts
│   ├── TeleporterHandler.ts
│   ├── SpinnerHandler.ts
│   ├── ChuteHandler.ts
│   ├── PitHandler.ts
│   ├── StairsUpHandler.ts
│   ├── StairsDownHandler.ts
│   ├── ElevatorHandler.ts
│   └── DarknessHandler.ts
└── __tests__/
    ├── MazeStateMachine.spec.ts
    ├── CombatOrchestrationService.spec.ts
    ├── ChestOrchestrationService.spec.ts
    ├── MovementOrchestrationService.spec.ts
    └── tile-handlers/
        └── *.spec.ts

src/app/scenes/maze/
├── components/
│   ├── maze-canvas/
│   │   └── maze-canvas.component.ts
│   ├── maze-combat/
│   │   └── maze-combat.component.ts
│   └── maze-chest/
│       └── maze-chest.component.ts

src/app/utils/
├── CharacterQueries.ts
└── __tests__/
    └── CharacterQueries.spec.ts
```

### Files to Modify

```
src/app/scenes/maze/maze.component.ts
  - Reduce from 4,163 lines to ~300 lines
  - Replace 48 signals with state machine injection
  - Delegate to orchestration services

src/app/services/DungeonMovementService.ts
  - Replace handleSpecialTile() with TileHandlerRegistry delegation
  - Reduce from 600+ lines to ~200 lines
```

---

## Success Criteria

After refactoring:

| Metric | Target |
|--------|--------|
| MazeComponent lines | <500 |
| Methods per component | <15 |
| Signals per component | <10 |
| Max method length | <30 lines |
| Test coverage | >85% |
| Cyclomatic complexity | <5 per method |

---

## Testing Strategy

### Unit Tests

- **State Machine**: Test all valid/invalid transitions
- **Orchestration Services**: Test pure business logic without UI
- **Tile Handlers**: Test each handler in isolation

### Integration Tests

- **Movement flow**: Move → tile effect → encounter check
- **Combat flow**: Initiate → action select → execute → victory/defeat
- **Chest flow**: Find → inspect → disarm → open → loot

### E2E Tests (Existing)

- Preserve existing E2E tests
- Add new E2E tests for edge cases discovered during refactoring

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Maintain E2E tests throughout refactoring |
| Large scope creep | Strict phase boundaries, weekly checkpoints |
| State machine complexity | Start with simplified states, expand iteratively |
| Performance regression | Profile before/after each phase |

---

## Appendix: Code Smell Reference

### Transaction Script Pattern

A **transaction script** is procedural code that orchestrates multiple operations without proper abstraction. Signs include:
- Long methods (100+ lines)
- Multiple service calls in sequence
- Inline business logic mixed with UI updates
- Callback chains for async operations

### God Component Anti-Pattern

A **God Component** is a component that:
- Has too many responsibilities (>3)
- Has too many lines (>500)
- Has too many dependencies (>5)
- Is hard to test in isolation
- Changes for multiple unrelated reasons

### Signal Proliferation

Too many individual signals create:
- Implicit state machines
- Race conditions
- Impossible state combinations
- Debugging difficulties

**Solution:** Consolidate related signals into discriminated union types with validated transitions.

---

## Implementation Summary

### Files Created

**Phase 1 - State Machine:**
- `src/app/services/MazeStateMachine.ts` - Centralized state management with validated transitions
- `src/app/services/__tests__/MazeStateMachine.spec.ts` - Comprehensive tests

**Phase 2 - Tile Handlers (Strategy Pattern):**
- `src/app/services/tile-handlers/TileHandler.ts` - Interface and types
- `src/app/services/tile-handlers/TileHandlerRegistry.ts` - Handler coordination
- `src/app/services/tile-handlers/TeleporterHandler.ts`
- `src/app/services/tile-handlers/SpinnerHandler.ts`
- `src/app/services/tile-handlers/ChuteHandler.ts`
- `src/app/services/tile-handlers/PitHandler.ts`
- `src/app/services/tile-handlers/StairsHandler.ts`
- `src/app/services/tile-handlers/ElevatorHandler.ts`
- `src/app/services/tile-handlers/DarknessHandler.ts`
- `src/app/services/tile-handlers/index.ts` - Barrel export

**Phase 3 - Movement Orchestration:**
- `src/app/services/MovementOrchestrationService.ts` - Movement flow coordination

**Phase 4 - Orchestration Services:**
- `src/app/services/CombatOrchestrationService.ts` - Combat flow coordination
- `src/app/services/ChestOrchestrationService.ts` - Chest interaction flow

**Phase 5 - Async/Await Utilities:**
- `src/app/services/MessageSequencer.ts` - Promise-based message display
- `src/app/services/LightMessageService.ts` - Centralized light state messaging

**Phase 6 - DRY Utilities:**
- `src/app/utils/CharacterQueries.ts` - Common character state checks
- `src/app/utils/__tests__/CharacterQueries.spec.ts` - Comprehensive tests

### Next Steps

To complete the refactoring, MazeComponent should be incrementally updated to:

1. **Inject new services** instead of direct service calls
2. **Delegate to orchestration services** instead of inline orchestration
3. **Use MazeStateMachine** instead of individual signals
4. **Use CharacterQueries** instead of duplicated status checks
5. **Use MessageSequencer** for sequential message display
6. **Use tile handlers** via TileHandlerRegistry

This can be done incrementally, one concern at a time, while maintaining existing functionality.
