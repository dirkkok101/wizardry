# Pure Services Refactoring Plan

## Problem Statement

Current architecture has confused abstractions:

| Issue | Description |
|-------|-------------|
| **God Classes** | MazeComponent (4163 lines), ChestFlowController (732 lines) |
| **Duplicated State** | MazeStateMachine and FlowControllers both hold signals |
| **Callback Anti-Pattern** | FlowControllers require `setCallbacks()` with 10+ functions |
| **Mixed Concerns** | FlowControllers do UI state + business logic + game state updates |

## Target Architecture

### Three-Tier Service Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPONENTS (Thin)                        │
│  - Inject services directly                                  │
│  - Template bindings to state store                          │
│  - Event handlers call service methods                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   STATE STORE (Single)                       │
│  MazeStateStore                                              │
│  - Owns ALL maze UI signals                                  │
│  - Provides selectors (computed)                             │
│  - Exposes actions (state transitions)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PURE SERVICES (Stateless)                   │
│  CombatService, ChestService, TrapService, etc.              │
│  - No signals, no state                                      │
│  - Pure functions: input → output                            │
│  - Fully testable without mocks                              │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Consolidate State Store

### 1.1 Create MazeStateStore (replaces MazeStateMachine + FlowController signals)

**File:** `src/app/services/MazeStateStore.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class MazeStateStore {
  // ============================================================
  // SINGLE SOURCE OF TRUTH - All maze UI state lives here
  // ============================================================

  // Navigation state
  readonly mode = signal<'exploration' | 'combat' | 'chest' | 'tile_message'>('exploration')
  readonly messages = signal<string[]>([])

  // Combat state (moved from CombatFlowController)
  readonly combatPhase = signal<CombatPhase>('idle')
  readonly letterboxType = signal<LetterboxType>(null)
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())
  readonly isTargetingMode = signal<boolean>(false)
  readonly targetingCharacterId = signal<string | null>(null)
  readonly showCinematicArena = signal<boolean>(false)
  readonly arenaEvents = signal<CombatRoundEvent[]>([])

  // Chest state (moved from ChestFlowController)
  readonly chestPhase = signal<ChestPhase>('idle')
  readonly pendingChest = signal<Chest | null>(null)
  readonly chestOpener = signal<Character | null>(null)
  readonly scrambledTrapState = signal<ScrambledTrapState | null>(null)

  // Spell state (moved from SpellFlowController)
  readonly showSpellDialog = signal<boolean>(false)
  readonly selectedCaster = signal<Character | null>(null)
  readonly spellContext = signal<'dungeon' | 'combat'>('dungeon')

  // ============================================================
  // SELECTORS (computed values)
  // ============================================================

  readonly inCombat = computed(() => this.combatPhase() !== 'idle')
  readonly showChestOverlay = computed(() => this.chestPhase() !== 'idle')
  readonly showMonsterCards = computed(() =>
    this.inCombat() && !this.showCinematicArena()
  )

  // ============================================================
  // ACTIONS (state transitions)
  // ============================================================

  startCombat(): void { ... }
  selectAction(charId: string, command: CombatCommand): void { ... }
  startTargeting(charId: string): void { ... }
  cancelTargeting(): void { ... }

  startChest(chest: Chest): void { ... }
  selectChestOpener(char: Character): void { ... }
  closeChest(): void { ... }

  addMessage(msg: string): void { ... }
  reset(): void { ... }
}
```

### 1.2 Delete Redundant Controllers

After migrating to MazeStateStore, delete:
- `CombatFlowController.ts` (505 lines) → logic moves to MazeStateStore actions
- `SpellFlowController.ts` (548 lines) → logic moves to MazeStateStore actions
- `TileMessageController.ts` (244 lines) → logic moves to MazeStateStore actions
- `CombatUIStateService.ts` (236 lines) → redundant

**ChestFlowController special case:** Contains business logic mixed with UI state.
- Move UI state to MazeStateStore
- Move business logic to ChestInteractionService (new pure service)

## Phase 2: Extract Pure Services from ChestFlowController

### 2.1 Create ChestInteractionService (Pure)

**File:** `src/app/services/ChestInteractionService.ts`

```typescript
/**
 * Pure service for chest interaction logic
 * No signals, no state - pure functions only
 */
export class ChestInteractionService {
  /**
   * Attempt to inspect a chest for traps
   */
  static attemptInspection(
    opener: Character,
    chest: Chest
  ): { success: boolean; triggered: boolean; scrambledState?: ScrambledTrapState } {
    const result = TrapService.attemptInspection(opener, chest)
    if (result.triggered) return { success: false, triggered: true }
    if (!result.success) return { success: false, triggered: false }

    if (chest.trapped && chest.trapId) {
      const scrambled = TrapService.createScrambledState(chest.trapId)
      const inspected = TrapService.performInspection(opener, scrambled)
      return { success: true, triggered: false, scrambledState: inspected }
    }
    return { success: true, triggered: false }
  }

  /**
   * Attempt to disarm a trap
   */
  static attemptDisarm(
    opener: Character,
    chest: Chest,
    trapNameGuess: string
  ): { success: boolean; triggered: boolean } {
    return TrapService.attemptDisarm(opener, chest, trapNameGuess)
  }

  /**
   * Apply trap effects to party
   */
  static applyTrapEffects(
    trapId: TrapId,
    opener: Character,
    party: Character[]
  ): TrapEffectResult {
    return TrapService.applyTrapEffects(trapId, opener, party)
  }

  /**
   * Distribute treasure from chest
   */
  static distributeTreasure(
    chest: Chest,
    party: Character[],
    preSelectedRecipient?: Character
  ): TreasureDistributionResult {
    return ChestService.distributeTreasure(chest, party, preSelectedRecipient)
  }
}
```

### 2.2 Create TrapEffectOrchestrator (Coordinates async trap effects)

**File:** `src/app/services/TrapEffectOrchestrator.ts`

```typescript
/**
 * Orchestrates trap effect visualization (damage indicators, etc.)
 * Coordinates between state store and pure services
 */
@Injectable({ providedIn: 'root' })
export class TrapEffectOrchestrator {
  constructor(
    private stateStore: MazeStateStore,
    private gameState: GameStateService
  ) {}

  /**
   * Execute trap effect with visualization
   */
  async executeTrapEffect(
    chest: Chest,
    opener: Character,
    party: Character[]
  ): Promise<void> {
    if (!chest.trapId) return

    // Get trap effects from pure service
    const result = ChestInteractionService.applyTrapEffects(
      chest.trapId, opener, party
    )

    // Update state store for visualization
    this.stateStore.setTrapLetterbox(result.trapName)
    await this.delay(1500)
    this.stateStore.clearTrapLetterbox()

    // Show damage indicators sequentially
    for (const [charId, damage] of result.damageDealt) {
      this.stateStore.showDamageIndicator(charId, damage)
      await this.delay(800)
    }
    this.stateStore.clearDamageIndicator()

    // Apply damage to game state
    this.gameState.updateState(state =>
      applyTrapDamageToRoster(state, result)
    )
  }
}
```

## Phase 3: Simplify Components

### 3.1 MazeComponent Becomes Thin Coordinator

```typescript
@Component({ ... })
export class MazeComponent implements OnInit, OnDestroy {
  // Inject services directly - NO callbacks needed
  private stateStore = inject(MazeStateStore)
  private gameState = inject(GameStateService)
  private combatOrchestrator = inject(CombatOrchestrator)
  private chestOrchestrator = inject(ChestOrchestrator)

  // Template bindings - direct from state store
  readonly mode = this.stateStore.mode
  readonly messages = this.stateStore.messages
  readonly inCombat = this.stateStore.inCombat
  readonly showChestOverlay = this.stateStore.showChestOverlay

  // Event handlers - call services directly
  onAttackClicked(charId: string): void {
    this.stateStore.startTargeting(charId)
  }

  onGroupClicked(groupId: string): void {
    const charId = this.stateStore.targetingCharacterId()
    if (!charId) return

    const command = CombatService.createAttackCommand(...)
    this.stateStore.selectAction(charId, command)
    this.stateStore.cancelTargeting()
  }

  async onExecuteRound(): Promise<void> {
    await this.combatOrchestrator.executeRound()
  }

  onChestOpen(): void {
    this.chestOrchestrator.openChest()
  }
}
```

### 3.2 Sub-Components Become Pure Presenters

```typescript
@Component({ ... })
export class MazeCombatComponent {
  // Inject state store directly
  private stateStore = inject(MazeStateStore)

  // Direct bindings - no computed proxies needed
  readonly combatPhase = this.stateStore.combatPhase
  readonly letterboxType = this.stateStore.letterboxType
  readonly showMonsterCards = this.stateStore.showMonsterCards

  // Events emit to parent (or call state store directly)
  onGroupClicked(groupId: string): void {
    this.stateStore.selectTargetGroup(groupId)
  }
}
```

## Phase 4: Create Orchestrators for Complex Flows

### 4.1 CombatOrchestrator (Replaces CombatFlowController)

```typescript
@Injectable({ providedIn: 'root' })
export class CombatOrchestrator {
  constructor(
    private stateStore: MazeStateStore,
    private gameState: GameStateService,
    private combatOrchestration: CombatOrchestrationService
  ) {}

  /**
   * Show combat intro with letterbox animations
   */
  async showCombatIntro(combatState: CombatState): Promise<boolean> {
    this.stateStore.setCombatIntroActive(true)

    // Show ENCOUNTER letterbox
    this.stateStore.setLetterbox('encounter')
    await this.delay(1800)
    this.stateStore.clearLetterbox()

    // Handle surprise
    if (combatState.surpriseState === 'monsters') {
      this.stateStore.setLetterbox('ambush')
      await this.delay(2000)
      this.stateStore.clearLetterbox()
      this.stateStore.setCombatIntroActive(false)
      return true // Party surprised
    }

    this.stateStore.setCombatIntroActive(false)
    this.stateStore.setCombatPhase('action_select')
    return false
  }

  /**
   * Execute combat round
   */
  async executeRound(): Promise<void> {
    const actions = this.stateStore.selectedActions()
    const combat = this.gameState.state().combat
    if (!combat) return

    // Use pure service for round execution
    const result = this.combatOrchestration.executeRound(
      combat, actions, party, frontRow
    )

    // Update state store for arena playback
    this.stateStore.startArenaPlayback(result.events, result.audit)

    // Store result for after playback
    this.pendingResult = result
  }

  /**
   * Apply result after arena playback
   */
  applyRoundResult(): void {
    const result = this.pendingResult
    if (!result) return

    // Apply to game state
    this.gameState.updateState(state => ({
      ...state,
      combat: result.finalState,
      roster: VictoryService.updateRosterFromCombat(state.roster, result.characterUpdates)
    }))

    // Update UI state
    if (result.victory) {
      this.stateStore.showVictory(rewards)
    } else if (result.defeat) {
      this.stateStore.showDefeat()
    } else {
      this.stateStore.resetForNextRound()
    }
  }
}
```

### 4.2 ChestOrchestrator (Replaces ChestFlowController business logic)

```typescript
@Injectable({ providedIn: 'root' })
export class ChestOrchestrator {
  constructor(
    private stateStore: MazeStateStore,
    private gameState: GameStateService,
    private trapEffects: TrapEffectOrchestrator
  ) {}

  openChest(): void {
    const chest = this.stateStore.pendingChest()
    const opener = this.stateStore.chestOpener()
    if (!chest || !opener) return

    if (chest.trapped && !chest.trapDisarmed) {
      this.triggerTrap(chest, opener)
      return
    }

    this.distributeTreasure()
  }

  async triggerTrap(chest: Chest, opener: Character): Promise<void> {
    const party = this.gameState.getPartyCharacters()
    await this.trapEffects.executeTrapEffect(chest, opener, party)
    this.distributeTreasure()
  }

  distributeTreasure(): void {
    const chest = this.stateStore.pendingChest()
    const party = this.gameState.getPartyCharacters()

    // Use pure service
    const result = ChestInteractionService.distributeTreasure(chest, party)

    // Update game state
    this.gameState.updateState(state =>
      applyTreasureToState(state, result)
    )

    // Show result in UI
    this.stateStore.showChestResult(result)
  }
}
```

## Migration Order

### Week 1: State Consolidation
1. Create `MazeStateStore` with all signals from FlowControllers
2. Update MazeComponent to use MazeStateStore
3. Update sub-components to inject MazeStateStore directly
4. Delete callback interfaces from FlowControllers

### Week 2: Combat Flow
1. Create `CombatOrchestrator`
2. Move combat logic from CombatFlowController to CombatOrchestrator
3. Delete CombatFlowController
4. Update tests

### Week 3: Chest Flow
1. Create `ChestInteractionService` (pure)
2. Create `TrapEffectOrchestrator`
3. Create `ChestOrchestrator`
4. Move chest logic from ChestFlowController
5. Delete ChestFlowController
6. Update tests

### Week 4: Cleanup
1. Delete SpellFlowController (merge into MazeStateStore)
2. Delete TileMessageController (merge into MazeStateStore)
3. Delete MazeStateMachine (replaced by MazeStateStore)
4. Final testing and cleanup

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| MazeComponent | 4163 lines | ~500 lines |
| Total FlowControllers | 2029 lines | 0 (deleted) |
| State stores | 2 (duplicated) | 1 (MazeStateStore) |
| Callback interfaces | 4 | 0 |
| Pure services | 2 | 4 |
| Testable without mocks | ~60% | ~95% |

## Key Benefits

1. **Single Source of Truth** - All UI state in MazeStateStore
2. **No Callbacks** - Components inject services directly
3. **Pure Services** - Business logic fully testable
4. **Thin Components** - Just template bindings and event handlers
5. **Clear Separation** - State, orchestration, and business logic are distinct
