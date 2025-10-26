# Title Screen - Documentation Gaps Analysis

**Gap analysis for missing services and commands required by Title Screen**

## Executive Summary

To implement the Title Screen (Scene 00), we need to document and implement **4 new services** and **1 new command**. This document identifies the gaps and provides specifications for each missing piece.

## Services Status

### ✅ Already Documented

| Service | Location | Status |
|---------|----------|--------|
| SaveService | `docs/services/SaveService.md` | ✅ Complete |
| LoadService | `docs/services/LoadService.md` | ✅ Complete |
| NavigationService | `docs/services/NavigationService.md` | ✅ Complete |

### ❌ Missing - High Priority

| Service | Required For | Priority | Effort |
|---------|--------------|----------|--------|
| SceneNavigationService | Scene transitions | HIGH | 3-4 hours |
| AssetLoadingService | Asset management | HIGH | 4-5 hours |
| InputService | Keyboard/mouse input | HIGH | 2-3 hours |
| GameInitializationService | New game creation | MEDIUM | 2 hours |

**Total Documentation Gap:** 11-14 hours of work

## Commands Status

### ✅ Already Documented

| Command | Location | Status |
|---------|----------|--------|
| LoadGameCommand | `docs/commands/meta/LoadGameCommand.md` | ✅ Complete |
| SaveGameCommand | `docs/commands/meta/SaveGameCommand.md` | ✅ Complete |

### ❌ Missing - High Priority

| Command | Required For | Priority | Effort |
|---------|--------------|----------|--------|
| StartGameCommand | Starting game from title | HIGH | 2-3 hours |

**Total Documentation Gap:** 2-3 hours of work

## Missing Service Specifications

### 1. SceneNavigationService

**Purpose:** Manage transitions between game scenes (Title → Castle Menu → Training Grounds, etc.)

**Why Needed:**
- Title screen must transition to Castle Menu or Camp
- All UI scenes need consistent transition handling
- Manage scene state lifecycle

**Key Methods Required:**
```typescript
interface SceneNavigationService {
  transitionTo(sceneType: SceneType, options?: TransitionOptions): Promise<void>
  getCurrentScene(): SceneType
  canTransitionTo(sceneType: SceneType): boolean
  onSceneEnter(sceneType: SceneType, handler: () => void): void
  onSceneExit(sceneType: SceneType, handler: () => void): void
}
```

**Usage in Title Screen:**
```typescript
// After user presses START
await SceneNavigationService.transitionTo(
  saveExists && party.inMaze ? SceneType.CAMP : SceneType.CASTLE_MENU,
  { fadeTime: 300 }
)
```

**Documentation File:** `docs/services/SceneNavigationService.md`

**Implementation Priority:** HIGH - Required for any scene transition

---

### 2. AssetLoadingService

**Purpose:** Load and manage game assets (graphics, sounds, data files)

**Why Needed:**
- Title screen shows "Loading..." until assets ready
- Progressive loading (title bitmap first, game assets second)
- Track loading progress and completion

**Key Methods Required:**
```typescript
interface AssetLoadingService {
  loadTitleAssets(): Promise<TitleAssets>
  loadGameAssets(): Promise<GameAssets>
  isAssetLoaded(assetId: string): boolean
  getLoadingProgress(): number
  onLoadComplete(callback: () => void): void
  onLoadError(callback: (error: Error) => void): void
}
```

**Usage in Title Screen:**
```typescript
// On mount
await AssetLoadingService.loadTitleAssets()
// Title bitmap now visible

AssetLoadingService.onLoadComplete(() => {
  // Enable START button
  setState({ mode: 'READY', assetsLoaded: true })
})

AssetLoadingService.loadGameAssets() // Background loading
```

**Critical Path Assets:**
- Title bitmap (< 10KB PNG)
- UI fonts
- Basic UI sounds

**Parallel Loading:**
- Sprite sheets (characters, monsters, items)
- Sound effects and music
- Data files (classes, races, spells, items, monsters, maps)

**Documentation File:** `docs/services/AssetLoadingService.md`

**Implementation Priority:** HIGH - Required for asset management

---

### 3. InputService

**Purpose:** Handle keyboard and mouse/touch input consistently

**Why Needed:**
- Title screen responds to S key and mouse clicks
- Centralized input handling across all scenes
- Support keyboard shortcuts and touch

**Key Methods Required:**
```typescript
interface InputService {
  waitForSingleKeystroke(validKeys?: string[]): Promise<string>
  onKeyPress(key: string, handler: () => void, options?: KeyOptions): void
  onButtonClick(elementId: string, handler: () => void): void
  offKeyPress(key: string): void
  setInputEnabled(enabled: boolean): void
}
```

**Usage in Title Screen:**
```typescript
// Register S key
InputService.onKeyPress('S', () => {
  if (state.assetsLoaded) {
    handleStartGame()
  }
}, { caseSensitive: false })

// Register button click
InputService.onButtonClick('start-button', () => {
  if (state.assetsLoaded) {
    handleStartGame()
  }
})
```

**Documentation File:** `docs/services/InputService.md`

**Implementation Priority:** HIGH - Required for user input

---

### 4. GameInitializationService

**Purpose:** Create new game state with defaults

**Why Needed:**
- Title screen initializes new game if no save exists
- Centralize new game creation logic
- Ensure consistent starting state

**Key Methods Required:**
```typescript
interface GameInitializationService {
  createNewGame(): GameState
  initializeRoster(): Character[]
  setStartingState(): GameState
  isNewGame(state: GameState): boolean
}
```

**Usage in Title Screen:**
```typescript
// If no save data
if (!saveDetected) {
  const newGameState = GameInitializationService.createNewGame()
  // Transition to Castle Menu with empty roster
}
```

**Default State:**
- Empty character roster (0 characters)
- Party gold: 0
- Current location: Castle/Town
- All quest flags: false

**Documentation File:** `docs/services/GameInitializationService.md`

**Implementation Priority:** MEDIUM - Can inline initially, extract later

---

## Missing Command Specifications

### 1. StartGameCommand

**Purpose:** Execute the START action from title screen

**Why Needed:**
- Encapsulates all logic for starting game
- Handles save detection and loading
- Determines destination scene
- Manages error cases

**Command Interface:**
```typescript
interface StartGameCommand {
  execute(state: TitleScreenState): Promise<CommandResult>
  canExecute(state: TitleScreenState): boolean
  getDescription(): string
}
```

**Implementation Logic:**
```typescript
async execute(state: TitleScreenState): Promise<CommandResult> {
  // 1. Validate assets loaded
  if (!state.assetsLoaded) {
    return { success: false, error: 'Assets not loaded' }
  }

  // 2. Check for save data
  const saveExists = await SaveService.checkForSaveData()

  // 3. Load or initialize
  let gameState: GameState
  let nextScene: SceneType

  if (saveExists) {
    const loadResult = await LoadService.loadGame('autosave')
    gameState = loadResult.state
    nextScene = gameState.party.inMaze ? SceneType.CAMP : SceneType.CASTLE_MENU
  } else {
    gameState = GameInitializationService.createNewGame()
    nextScene = SceneType.CASTLE_MENU
  }

  // 4. Transition
  await SceneNavigationService.transitionTo(nextScene, {
    fadeTime: 300,
    gameState
  })

  return { success: true, nextScene, gameState }
}
```

**Edge Cases Handled:**
- Assets not loaded → Return error, keep button disabled
- Save corrupted → Log error, initialize new game
- Scene transition fails → Log error, remain on title screen

**Documentation File:** `docs/commands/meta/StartGameCommand.md`

**Implementation Priority:** HIGH - Core command for title screen

---

## Impact Analysis

### Implementation Blockers

**Cannot implement Title Screen without:**
1. ❌ SceneNavigationService - Required to leave title screen
2. ❌ AssetLoadingService - Required to show loading state
3. ❌ InputService - Required to respond to user input
4. ❌ StartGameCommand - Required to execute start action

**Can implement Title Screen with temporary workarounds:**
1. ⚠️ GameInitializationService - Can inline new game logic

### Implementation Order

**Phase 1: Critical Path** (Required to show title screen)
1. AssetLoadingService - Load title bitmap
2. InputService - Handle S key and clicks
3. SceneNavigationService - Transition to next scene
4. StartGameCommand - Execute start logic

**Phase 2: Polish** (Can defer or inline)
1. GameInitializationService - Extract new game logic

### Estimated Total Effort

**Documentation:** 13-17 hours
- 4 services × 2-4 hours each = 8-16 hours
- 1 command × 2-3 hours = 2-3 hours
- Review and examples = 3 hours

**Implementation:** 40-60 hours
- SceneNavigationService: 8-12 hours (with state machine)
- AssetLoadingService: 12-16 hours (with progressive loading)
- InputService: 6-8 hours
- GameInitializationService: 4-6 hours
- StartGameCommand: 4-6 hours
- Integration testing: 6-12 hours

**Total:** 53-77 hours (~2 weeks full-time)

## Recommendations

### Immediate Actions (This Week)

1. **Document the 4 missing services**
   - SceneNavigationService (highest priority)
   - AssetLoadingService
   - InputService
   - GameInitializationService

2. **Document StartGameCommand**

3. **Update service and command READMEs**

### Implementation Strategy (Next 2 Weeks)

**Week 1: Core Infrastructure**
- Implement SceneNavigationService with basic fade transition
- Implement AssetLoadingService with progressive loading
- Implement InputService with keyboard/mouse support
- Write unit tests for all services

**Week 2: Commands & Integration**
- Implement StartGameCommand
- Create TitleScreen UI component
- Integration testing (all 8 test scenarios)
- Visual polish and accessibility

### Alternative: MVP Approach

**If timeline is tight, can implement minimal viable version:**

1. **Inline SceneNavigationService logic**
   - Simple fade transition without full state machine
   - Hard-coded scene transitions
   - **Pros:** Faster initial implementation
   - **Cons:** Need refactor later for complex nav

2. **Simplified AssetLoadingService**
   - Load all assets at once (no progressive loading)
   - No progress tracking
   - **Pros:** Simpler implementation
   - **Cons:** Longer initial load time

3. **Basic InputService**
   - Simple event listeners without abstraction
   - **Pros:** Quick to implement
   - **Cons:** Less maintainable

**MVP Effort:** ~1 week vs 2 weeks for full implementation

**Recommendation:** Implement full version - only 1 week difference, much better foundation

## Dependencies Between Missing Pieces

```
StartGameCommand
    ├─ SceneNavigationService  (HIGH - cannot transition without this)
    ├─ AssetLoadingService     (HIGH - must check assets loaded)
    ├─ InputService            (HIGH - triggered by input)
    ├─ SaveService             (✅ Already have)
    ├─ LoadService             (✅ Already have)
    └─ GameInitializationService (MEDIUM - can inline)

TitleScreen Component
    ├─ StartGameCommand        (HIGH - executes start)
    ├─ AssetLoadingService     (HIGH - shows loading state)
    └─ InputService            (HIGH - responds to S key/click)
```

**Critical Path:** All 3 services + 1 command must be implemented

## Testing Requirements

### Unit Tests

**Services:**
- SceneNavigationService: 15-20 tests
- AssetLoadingService: 15-20 tests
- InputService: 10-15 tests
- GameInitializationService: 8-12 tests

**Commands:**
- StartGameCommand: 10-15 tests

**Total:** 58-82 unit tests

### Integration Tests

**Title Screen Scenarios (from spec):**
1. Fresh install with loading flow
2. Load existing save
3. Load save with party IN_MAZE
4. Corrupted save handling
5. Asset loading failure
6. Button states and interaction
7. Keyboard vs mouse input
8. Invalid input handling

**Total:** 8 integration tests

### Test Coverage Target

- **Services:** 100% coverage
- **Commands:** 100% coverage
- **Components:** 85%+ coverage

## Risk Mitigation

### Risk 1: Services take longer than estimated

**Mitigation:**
- Start with simplest version
- Add features incrementally
- Use MVP approach if needed
- Defer GameInitializationService if tight on time

### Risk 2: Scene navigation is complex

**Mitigation:**
- Study existing navigation patterns
- Use state machine library if helpful
- Start with basic transitions, add complexity later
- Extensive testing of edge cases

### Risk 3: Asset loading performance issues

**Mitigation:**
- Optimize all assets beforehand
- Implement progressive loading
- Cache aggressively
- Test on slow connections
- Provide fallback for timeout

## Summary

**What We Have:**
- ✅ 3 services documented (Save, Load, Navigation - for dungeon movement)
- ✅ 2 commands documented (LoadGame, SaveGame)

**What We Need:**
- ❌ 4 services (SceneNav, AssetLoading, Input, GameInit)
- ❌ 1 command (StartGame)

**Estimated Effort:**
- Documentation: 13-17 hours
- Implementation: 40-60 hours
- Total: 53-77 hours (~2 weeks)

**Critical Path:**
1. Document services (this week)
2. Implement services (next week)
3. Implement command and UI (following week)

**Next Action:** Begin documenting SceneNavigationService

---

**Last Updated:** 2025-10-26

**Status:** Analysis Complete - Ready to begin documentation phase

**Next Step:** Create `docs/services/SceneNavigationService.md`
