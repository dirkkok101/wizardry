# Maze Services Refactoring: Completion Plan

## Implementation Progress

**Status: ~70% Complete**

### Completed Integration Work

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | TileHandlerRegistry integration into DungeonMovementService | ✅ Complete |
| Phase 2+5 | CombatOrchestrationService integration (initiateEncounter, onExecuteRound) | ✅ Complete |
| Phase 3+6 | ChestOrchestrationService integration (computed signals) | ✅ Complete |
| Phase 4.1 | Tile message signal migration to MazeStateMachine | ✅ Complete |
| Phase 4.2 | Spell casting signal migration | ⏳ Deferred (current signals work) |
| Phase 4.3 | Deprecated signal removal | ⏳ Deferred |
| Phase 7 | Component decomposition | ⏳ Pending |
| Phase 8 | Async/await pattern verification | ✅ Already in place |

### Key Changes Made (Latest Session)

1. **Phase 4.1 - Tile Message Migration:**
   - `showTileMessage()` now delegates to `MazeStateMachine.showTileMessage()`
   - `dismissTileMessageOverlay()` now uses `MazeStateMachine.dismissTileMessage()`
   - Local signals maintained during migration for backward compatibility

2. **Orchestration Service Fixes:**
   - ChestOrchestrationService: Fixed CharacterClass enum comparison, removed unused methods
   - CombatOrchestrationService: Fixed `createCommand()` signature, removed unused `processVictory()`
   - MovementOrchestrationService: Fixed `encounterReason` type, corrected `applyPoisonDamage()` API

3. **Build Fixes:**
   - Fixed VictoryRewards import in MazeStateMachine
   - Fixed type exports in tile-handlers/index.ts (isolatedModules compliance)
   - Created missing version.ts config (gitignored, auto-generated)

### Previous Session Changes

1. **DungeonMovementService.handleSpecialTile()**: Reduced from 160 lines to 70 lines using TileHandlerRegistry
2. **MazeComponent.initiateEncounter()**: Now uses CombatOrchestrationService
3. **MazeComponent.onExecuteRound()**: Now uses CombatOrchestrationService
4. **MazeComponent chest computed signals**: Now delegate to ChestOrchestrationService
5. **handleConditionFailUI/Success**: Already using async/await patterns

---

## Executive Summary

The maze services refactoring is approximately **60% complete**. Core service integrations are done, but full signal migration and component decomposition remain. The current MazeComponent has grown to **4,301 lines** with approximately **48 individual signals** that need to be migrated to the centralized `MazeStateMachine`.

## Current State Analysis

### What Has Been Completed

| Component | Status | Location |
|-----------|--------|----------|
| MazeStateMachine | Created with full discriminated union types | `src/app/services/MazeStateMachine.ts` |
| MazeStateMachine Tests | 581 lines of comprehensive tests | `src/app/services/__tests__/MazeStateMachine.spec.ts` |
| TileHandlerRegistry | Strategy pattern with 8 handlers | `src/app/services/tile-handlers/` |
| MovementOrchestrationService | Created with partial integration | `src/app/services/MovementOrchestrationService.ts` |
| CombatOrchestrationService | Created and fixed | `src/app/services/CombatOrchestrationService.ts` |
| ChestOrchestrationService | Created | `src/app/services/ChestOrchestrationService.ts` |
| MessageSequencer | Async/await utility ready | `src/app/services/MessageSequencer.ts` |
| LightMessageService | DRY messaging utility | `src/app/services/LightMessageService.ts` |
| CharacterQueries | DRY utility with delegation | `src/app/utils/CharacterQueries.ts` |

### Signals Requiring Migration

Based on analysis of `src/app/scenes/maze/maze.component.ts`, the following 48 signals need migration:

**Spell Casting Signals (6):**
- `showSpellDialog`, `showTargetDialog`, `selectedCaster`
- `selectedSpell`, `targetOptions`, `spellContext`

**Combat Signals (15):**
- `combatPhase`, `letterboxType`, `selectedTargetGroupId`, `isTargetingMode`
- `selectedActions`, `isExecutingRound`, `showVictoryOverlay`, `showDefeatOverlay`
- `victoryRewards`, `combatIntroActive`, `showCinematicArena`, `arenaEvents`
- `arenaAudit`, `pendingCombatSpell`, `isTargetingCharacterId`

**Chest Signals (15):**
- `chestPhase`, `chestLetterboxType`, `pendingChest`, `chestSprite`
- `chestOpener`, `chestCaster`, `scrambledTrapState`, `chestTrapInput`
- `chestSummary`, `chestLastMessage`, `chestInventoryWarning`, `preSelectedRecipient`
- `pendingTrapInfo`, `trapLetterboxName`, `hitCharacterIds`

**Tile Message Signals (6):**
- `tileMessagePhase`, `tileMessageText`, `tileMessageItem`
- `tileMessageAutoDismiss`, `pendingFixedEncounter`, `pendingConditionCallback`

**Other UI Signals (6):**
- `messages`, `errorMessage`, `isLoadingLevel`
- `retreatCooldownActive`, `elevatorDismissed`, `currentDamageIndicator`

---

## Phase 1: TileHandlerRegistry Integration into DungeonMovementService

**Objective:** Replace the 160-line `handleSpecialTile()` method with TileHandlerRegistry delegation.

**Files to Modify:**
- `src/app/services/DungeonMovementService.ts`

**Current State (lines 434-592):**
```typescript
handleSpecialTile(state: GameState, tile: TileData, previousPosition: Position): SpecialTileResult {
  // 160 lines of if-else chains
  if (this.tileHasType(tile, 'teleporter')) { ... }
  if (this.tileHasType(tile, 'spinner')) { ... }
  // etc...
}
```

**Target State:**
```typescript
handleSpecialTile(state: GameState, tile: TileData, previousPosition: Position): SpecialTileResult {
  const result = tileHandlerRegistry.handleTile(state, tile, previousPosition)
  return this.convertToSpecialTileResult(result)
}
```

**Implementation Steps:**
1. Add `TileHandlerRegistry` import to DungeonMovementService
2. Create `convertToSpecialTileResult()` adapter method
3. Replace `handleSpecialTile()` body with registry delegation
4. Preserve `processLightState()` integration

**Testing Approach:**
- Create `src/app/services/__tests__/DungeonMovementService-TileHandler.spec.ts`
- Test all tile types through the registry
- Verify backward compatibility

**Risk Mitigation:**
- Keep original as `handleSpecialTileLegacy()` temporarily
- Feature flag to switch implementations

**Estimated Effort:** 1.5 days

---

## Phase 2: Combat Signal Migration to MazeStateMachine

**Objective:** Replace 15 combat-related signals with MazeStateMachine state.

**Signals to Remove:**
```typescript
// DELETE these 15 signals:
readonly combatPhase = signal<...>('idle');
readonly letterboxType = signal<...>(null);
readonly selectedTargetGroupId = signal<...>(null);
readonly isTargetingMode = signal<boolean>(false);
readonly selectedActions = signal<Map<...>>(new Map());
readonly isExecutingRound = signal<boolean>(false);
readonly showVictoryOverlay = signal<boolean>(false);
readonly showDefeatOverlay = signal<boolean>(false);
readonly victoryRewards = signal<VictoryRewards | null>(null);
readonly combatIntroActive = signal<boolean>(false);
readonly showCinematicArena = signal<boolean>(false);
readonly arenaEvents = signal<CombatRoundEvent[]>([]);
readonly arenaAudit = signal<CombatRoundAudit | null>(null);
readonly pendingCombatSpell = signal<SpellData | null>(null);
readonly isTargetingCharacterId = signal<string | null>(null);
```

**Replace With:**
```typescript
// Use MazeStateMachine computed signals:
readonly inCombat = computed(() => this.mazeStateMachine.isInCombat());
readonly combatSubPhase = computed(() => this.mazeStateMachine.combatSubPhase());
readonly isTargetingMode = computed(() => this.mazeStateMachine.isTargetingMode());
readonly showCinematicArena = computed(() => this.mazeStateMachine.showCinematicArena());
readonly showVictoryOverlay = computed(() => this.mazeStateMachine.showVictoryOverlay());
readonly showDefeatOverlay = computed(() => this.mazeStateMachine.showDefeatOverlay());
```

**Method Updates Required:**
- `onExecuteRound()` - Use `mazeStateMachine.startRoundExecution()`
- `resetForNextRound()` - Use `mazeStateMachine.completeRoundExecution()`
- `startCombatTargeting()` - Use `mazeStateMachine.startTargeting()`
- `selectParryAction()` - Use `mazeStateMachine.setCombatAction()`
- `onCombatTargetSelected()` - Use `mazeStateMachine.setCombatAction()`

**Implementation Steps:**
1. Update computed signals to delegate to MazeStateMachine
2. Update combat initiation to use `mazeStateMachine.startCombat()`
3. Update action selection to use `mazeStateMachine.setCombatAction()`
4. Update round execution to use state machine transitions
5. Update victory/defeat handling
6. Remove deprecated signals

**Risk Mitigation:**
- Migrate one combat phase at a time
- Keep parallel signals until verified
- Test each phase transition independently

**Estimated Effort:** 2 days

---

## Phase 3: Chest Signal Migration to MazeStateMachine

**Objective:** Replace 15 chest-related signals with MazeStateMachine state.

**Signals to Remove:**
```typescript
readonly chestPhase = signal<ChestPhase>('idle');
readonly chestLetterboxType = signal<ChestLetterboxType>(null);
readonly pendingChest = signal<Chest | null>(null);
readonly chestSprite = signal<'closed' | 'open'>('closed');
readonly chestOpener = signal<Character | null>(null);
readonly chestCaster = signal<Character | null>(null);
// ... 9 more
```

**Replace With:**
```typescript
readonly showChestOverlay = computed(() => this.mazeStateMachine.showChestOverlay());
readonly chestSubPhase = computed(() => this.mazeStateMachine.chestSubPhase());

get currentChest(): Chest | null {
  const state = this.mazeStateMachine.state();
  return state.type === 'chest' ? state.chest : null;
}
```

**Method Updates Required:**
- `handleChestOpenWith()` - Use `mazeStateMachine.openChest()`
- `handleChestInspectWith()` - Use `mazeStateMachine.showTrapInspection()`
- `handleChestCalfoWith()` - Use state machine trap reveal
- `handleChestDisarmWith()` - Use `mazeStateMachine.updateTrapInput()`
- `triggerChestTrap()` - Use `mazeStateMachine.showTrapTriggered()`

**Estimated Effort:** 1.5 days

---

## Phase 4: Tile Message and Spell Signal Migration

**Objective:** Replace remaining UI signals with MazeStateMachine state.

**Signals to Migrate:**

**Tile Message (6):**
- `tileMessagePhase`, `tileMessageText`, `tileMessageItem`
- `tileMessageAutoDismiss`, `pendingFixedEncounter`, `pendingConditionCallback`

**Spell Casting (6):**
- `showSpellDialog`, `showTargetDialog`, `selectedCaster`
- `selectedSpell`, `targetOptions`, `spellContext`

**Replace With:**
```typescript
readonly showTileMessage = computed(() => this.mazeStateMachine.isShowingTileMessage());
readonly isCastingSpell = computed(() => this.mazeStateMachine.isCastingSpell());
```

**Method Updates:**
- `showTileMessage()` - Use `mazeStateMachine.showTileMessage()`
- `handleTileMessageDismiss()` - Use `mazeStateMachine.dismissTileMessage()`
- `openSpellDialog()` - Use `mazeStateMachine.openSpellDialog()`
- `onSpellSelected()` - Use `mazeStateMachine.selectSpell()`

**Estimated Effort:** 1 day

---

## Phase 5: CombatOrchestrationService Deep Integration

**Objective:** Move combat business logic from MazeComponent to CombatOrchestrationService.

**Methods to Migrate:**

1. **`initiateEncounter()`** (lines 2245-2306)
2. **`onExecuteRound()`** (lines 2428-2489)
3. **`onArenaComplete()`** (lines 2567-2644)

**New CombatOrchestrationService Methods:**
```typescript
interface CombatOrchestrationService {
  // Already exists
  initiateCombat(config): CombatInitResult
  executeRound(combatState, partyCommands): RoundExecutionResult

  // Add these
  processArenaComplete(pendingResult): StateUpdates
  reorderPartyAfterCasualties(members, roster): string[]
  updateRosterFromCombat(roster, updates): Map<string, Character>
}
```

**Component Becomes:**
```typescript
async onExecuteRound(): Promise<void> {
  const result = this.combatOrchestration.executeRound(
    this.combatState(),
    this.selectedActions(),
    this.partyCharacters(),
    this.gameState.state().party.formation.frontRow
  );

  this.mazeStateMachine.startRoundExecution(result.events, result.audit);
  this.pendingCombatResult = result;
}
```

**Estimated Effort:** 2 days

---

## Phase 6: ChestOrchestrationService Deep Integration

**Objective:** Move chest interaction logic from MazeComponent to ChestOrchestrationService.

**Methods to Migrate:**
1. `handleChestOpenWith()`
2. `handleChestInspectWith()`
3. `handleChestCalfoWith()`
4. `handleChestDisarmWith()`
5. `triggerChestTrap()`
6. `openChest()` - treasure distribution

**New ChestOrchestrationService Methods:**
```typescript
interface ChestOrchestrationService {
  // Already exists
  getRecommendedHandler(): RecommendedHandler
  inspectTrap(): TrapInspectionResult
  castCalfo(): { result, updatedState }
  attemptDisarm(): TrapDisarmResult
  triggerTrap(): TrapTriggerResult
  openChest(): ChestOpenResult

  // Add orchestration methods
  orchestrateOpen(chest, opener, state): ChestOpenFlowResult
  orchestrateInspect(chest, inspector): InspectFlowResult
  orchestrateCalfo(chest, caster, state): CalfoFlowResult
  orchestrateDisarm(chest, disarmer, guessedName): DisarmFlowResult
}
```

**Estimated Effort:** 1.5 days

---

## Phase 7: Component Decomposition

**Objective:** Extract focused child components from MazeComponent.

**New Components:**

### 1. MazeCanvasComponent
**Location:** `src/app/scenes/maze/components/maze-canvas/`
**Responsibilities:** WebGL initialization, texture loading, rendering
**Inputs:** `dungeonState`, `viewDistance`
**Size:** ~250 lines

### 2. MazeCombatComponent
**Location:** `src/app/scenes/maze/components/maze-combat/`
**Responsibilities:** Combat UI overlay, action selection, targeting
**Inputs:** `combatState`, `phase`, `partyCharacters`
**Outputs:** `(actionSelected)`, `(targetSelected)`, `(roundComplete)`
**Size:** ~400 lines

### 3. MazeChestComponent
**Location:** `src/app/scenes/maze/components/maze-chest/`
**Responsibilities:** Chest overlay UI, trap interaction
**Inputs:** `chestState`, `phase`
**Outputs:** `(action)`, `(dismissed)`
**Size:** ~300 lines

**MazeComponent After Decomposition:**
```typescript
@Component({
  selector: 'app-maze',
  template: `
    <app-maze-canvas
      [dungeonState]="dungeonState()"
      [viewDistance]="viewDistance()"
    />

    @if (mazeStateMachine.isInCombat()) {
      <app-maze-combat
        [combatState]="combatState()"
        [phase]="combatSubPhase()"
        (actionSelected)="onCombatAction($event)"
      />
    }

    @if (mazeStateMachine.showChestOverlay()) {
      <app-maze-chest
        [chest]="currentChest"
        [phase]="chestSubPhase()"
        (action)="onChestAction($event)"
      />
    }
  `
})
export class MazeComponent {
  // Reduced to ~400 lines of orchestration
}
```

**Estimated Effort:** 3 days

---

## Phase 8: Async/Await Pattern Migration

**Objective:** Use MessageSequencer to replace nested callbacks.

**Current Pattern:**
```typescript
const executeFailAction = () => {
  const showFailMessage = () => {
    if (conditionResult.message) {
      this.showConditionMessage(msg, style, executeFailAction);
    }
  };
  if (conditionResult.entryMessage) {
    this.showConditionMessage(entry, style, showFailMessage);
  }
};
```

**Target Pattern:**
```typescript
async handleConditionFail(result: ConditionResult): Promise<void> {
  if (result.entryMessage) {
    await this.messageSequencer.showMessage(result.entryMessage, result.messageStyle);
  }
  if (result.message) {
    await this.messageSequencer.showMessage(result.message, result.messageStyle);
  }
  this.executeConditionFailAction(result);
}
```

**Methods to Convert:**
1. `handleConditionFailUI()`
2. `handleConditionSuccessUI()`
3. Chest trap sequences
4. Combat intro sequences

**Estimated Effort:** 1 day

---

## Implementation Timeline

| Week | Phase | Focus | Risk Level |
|------|-------|-------|------------|
| 1 | Phase 1 | TileHandlerRegistry integration | Medium |
| 1-2 | Phase 2 | Combat signal migration | High |
| 2 | Phase 3 | Chest signal migration | Medium |
| 2 | Phase 4 | Tile message + spell signal migration | Low |
| 3 | Phase 5 | CombatOrchestrationService deepening | Medium |
| 3 | Phase 6 | ChestOrchestrationService deepening | Medium |
| 4 | Phase 7 | Component decomposition | High |
| 4 | Phase 8 | Async/await patterns | Low |

**Total Estimated Effort:** 13.5 days (approximately 3 weeks)

---

## Testing Strategy

### Unit Tests
- Each tile handler: `src/app/services/tile-handlers/__tests__/`
- State machine transitions: Extend `src/app/services/__tests__/MazeStateMachine.spec.ts`
- Orchestration services: Create new test files

### Integration Tests
- Movement flow: Move -> tile effect -> encounter check
- Combat flow: Initiate -> action select -> execute -> victory/defeat
- Chest flow: Find -> inspect -> disarm -> open -> loot

### Regression Tests
- Run existing test suite after each phase
- Target: All 501+ tests passing throughout refactoring

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| MazeComponent lines | 4,301 | <600 |
| Signals in component | 48 | <10 |
| Methods in component | 65+ | <20 |
| Max method length | 200+ | <30 |
| Orchestration service usage | Partial | Full |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking combat flow | Parallel signal approach; feature flags |
| State machine complexity | Incremental migration; comprehensive tests |
| Performance regression | Profile before/after each phase |
| UI regression | Manual testing checklist for each phase |
| Merge conflicts | Small, focused PRs; frequent integration |

---

## Critical Files Summary

1. **`src/app/scenes/maze/maze.component.ts`** - Core component (4,301 -> ~600 lines)
2. **`src/app/services/MazeStateMachine.ts`** - State machine (needs integration)
3. **`src/app/services/DungeonMovementService.ts`** - TileHandlerRegistry integration
4. **`src/app/services/tile-handlers/TileHandlerRegistry.ts`** - Strategy pattern
5. **`src/app/services/CombatOrchestrationService.ts`** - Combat logic
6. **`src/app/services/ChestOrchestrationService.ts`** - Chest logic
