# Title Screen Implementation Plan

**Implementation roadmap for the Title Screen (Scene 00)**

## Overview

This document outlines the complete implementation plan for the Title Screen based on [00-title-screen.md](../ui/scenes/00-title-screen.md). It identifies all required services, commands, components, and implementation phases.

## Requirements Analysis

### Functional Requirements

1. **Boot Sequence**
   - Display title screen immediately on app launch
   - Show "Loading..." state while assets load
   - Transition to "(S)TART" when ready
   - Support both keyboard (S key) and mouse/touch input

2. **Asset Loading**
   - Load title bitmap graphic
   - Load UI fonts and styles
   - Load game data files (classes, races, spells, items, monsters, maps)
   - Load sprite sheets and sound effects
   - Show visual feedback during loading

3. **Save Detection**
   - Check for existing save data
   - Validate save data if found
   - Handle corrupted saves gracefully
   - Determine destination scene (Castle Menu or Camp)

4. **Scene Transition**
   - Fade transition to next scene
   - Initialize new game if no save exists
   - Load game state if save exists
   - Route to Castle Menu (default) or Camp (if party IN_MAZE)

### Non-Functional Requirements

1. **Performance**
   - Load time: 1-3 seconds target
   - Bitmap file: < 10KB optimized PNG
   - Responsive to input within 100ms

2. **Accessibility**
   - ARIA labels for screen readers
   - Keyboard navigation (S key)
   - Sufficient color contrast
   - Large touch target (44x44px minimum)

3. **Visual Design**
   - Pixel-perfect bitmap rendering
   - Smooth fade transitions
   - Atmospheric effects (torch flicker, mist, optional CRT scanlines)
   - Responsive scaling for different screen sizes

## Required Services

### ✅ Existing Services (Already Documented)

1. **SaveService** (`docs/services/SaveService.md`)
   - `checkForSaveData()` - Check if save exists
   - `validateSaveData()` - Verify save integrity
   - Used for: Save detection during boot

2. **LoadService** (`docs/services/LoadService.md`)
   - `loadGame(slotName)` - Load complete game state
   - `validateSaveData(saveData)` - Validate save structure
   - Used for: Loading existing save on start

3. **NavigationService** (`docs/services/NavigationService.md`)
   - Movement validation (not directly used in title screen)
   - Referenced for dungeon navigation after load

### ❌ Missing Services (Need Documentation)

#### 1. SceneNavigationService

**Purpose:** Manage scene transitions and state

**Required Methods:**
```typescript
interface SceneNavigationService {
  // Transition to a new scene
  transitionTo(
    sceneType: SceneType,
    options?: TransitionOptions
  ): Promise<void>

  // Get current scene
  getCurrentScene(): SceneType

  // Check if can transition to scene
  canTransitionTo(sceneType: SceneType): boolean

  // Register scene transition handlers
  onSceneEnter(sceneType: SceneType, handler: () => void): void
  onSceneExit(sceneType: SceneType, handler: () => void): void
}

enum SceneType {
  TITLE_SCREEN = 'TITLE_SCREEN',
  CASTLE_MENU = 'CASTLE_MENU',
  CAMP = 'CAMP',
  // ... other scenes
}

interface TransitionOptions {
  fadeTime?: number        // Fade duration in ms (default: 300)
  direction?: 'fade' | 'slide'
  preserveState?: boolean  // Keep previous scene state
}
```

**Usage in Title Screen:**
- `transitionTo(SceneType.CASTLE_MENU)` - Navigate to castle
- `transitionTo(SceneType.CAMP)` - Navigate to camp (if party IN_MAZE)

**Implementation Priority:** HIGH (required for any scene transition)

**Location:** `docs/services/SceneNavigationService.md`

---

#### 2. AssetLoadingService

**Purpose:** Load and manage game assets (graphics, sounds, data)

**Required Methods:**
```typescript
interface AssetLoadingService {
  // Load title screen assets (bitmap, fonts)
  loadTitleAssets(): Promise<TitleAssets>

  // Load all game assets (sprites, sounds, data files)
  loadGameAssets(): Promise<GameAssets>

  // Check if specific asset is loaded
  isAssetLoaded(assetId: string): boolean

  // Get loading progress (0-100)
  getLoadingProgress(): number

  // Preload specific assets
  preloadAssets(assetIds: string[]): Promise<void>

  // Get asset by ID
  getAsset<T>(assetId: string): T | null

  // Register loading callbacks
  onLoadStart(callback: () => void): void
  onLoadProgress(callback: (progress: number) => void): void
  onLoadComplete(callback: () => void): void
  onLoadError(callback: (error: Error) => void): void
}

interface TitleAssets {
  titleBitmap: HTMLImageElement
  fonts: FontFace[]
  uiSounds?: AudioBuffer[]
}

interface GameAssets {
  sprites: Record<string, HTMLImageElement>
  sounds: Record<string, AudioBuffer>
  dataFiles: {
    classes: Map<string, Class>
    races: Map<string, Race>
    spells: Map<string, Spell>
    items: Map<string, Item>
    monsters: Map<string, Monster>
    maps: Map<number, DungeonLevel>
  }
}
```

**Usage in Title Screen:**
- `loadTitleAssets()` - Load critical path assets first
- `loadGameAssets()` - Load remaining assets in parallel
- `getLoadingProgress()` - Optional: Show loading percentage
- `onLoadComplete()` - Enable START button when ready

**Loading Strategy:**
```typescript
// Critical path (immediate render)
const titleAssets = await AssetLoadingService.loadTitleAssets()
// Title screen now visible with "Loading..." button

// Parallel loading (background)
AssetLoadingService.onLoadProgress((progress) => {
  // Optional: Update loading indicator
})

AssetLoadingService.onLoadComplete(() => {
  // Enable START button
  setState({ mode: 'READY', assetsLoaded: true })
})

AssetLoadingService.loadGameAssets()
```

**Implementation Priority:** HIGH (required for asset management)

**Location:** `docs/services/AssetLoadingService.md`

---

#### 3. InputService

**Purpose:** Handle keyboard and mouse/touch input

**Required Methods:**
```typescript
interface InputService {
  // Wait for single keystroke
  waitForSingleKeystroke(validKeys?: string[]): Promise<string>

  // Register key handler
  onKeyPress(key: string, handler: () => void, options?: KeyOptions): void

  // Register button click handler
  onButtonClick(elementId: string, handler: () => void): void

  // Remove key handler
  offKeyPress(key: string): void

  // Check if key is currently pressed
  isKeyPressed(key: string): boolean

  // Enable/disable all input
  setInputEnabled(enabled: boolean): void
}

interface KeyOptions {
  caseSensitive?: boolean  // Default: false
  preventDefault?: boolean // Default: true
  requireFocus?: boolean  // Default: true
}
```

**Usage in Title Screen:**
```typescript
// Register S key handler
InputService.onKeyPress('S', () => {
  if (state.assetsLoaded) {
    startGame()
  }
}, { caseSensitive: false })

// Register button click
InputService.onButtonClick('start-button', () => {
  if (state.assetsLoaded) {
    startGame()
  }
})
```

**Implementation Priority:** HIGH (required for user input)

**Location:** `docs/services/InputService.md`

---

#### 4. GameInitializationService (Optional, but recommended)

**Purpose:** Initialize new game state

**Required Methods:**
```typescript
interface GameInitializationService {
  // Create new game with empty roster
  createNewGame(): GameState

  // Initialize character roster
  initializeRoster(): Character[]

  // Set starting game state
  setStartingState(): GameState

  // Check if state represents new game
  isNewGame(state: GameState): boolean
}
```

**Usage in Title Screen:**
```typescript
// If no save exists
if (!saveDetected) {
  const newGameState = GameInitializationService.createNewGame()
  SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
    state: newGameState
  })
}
```

**Implementation Priority:** MEDIUM (can inline logic initially)

**Location:** `docs/services/GameInitializationService.md`

## Required Commands

### ❌ Missing Commands (Need Documentation)

#### 1. StartGameCommand

**Purpose:** Start the game from title screen

**Command Specification:**

```typescript
interface StartGameCommand {
  // Execute command
  execute(state: TitleScreenState): Promise<CommandResult>

  // Validate can execute
  canExecute(state: TitleScreenState): boolean

  // Get command description
  getDescription(): string
}

interface TitleScreenState {
  mode: 'LOADING' | 'READY' | 'TRANSITIONING'
  assetsLoaded: boolean
  saveDataDetected: boolean
  saveDataValid: boolean
}

interface CommandResult {
  success: boolean
  nextScene: SceneType
  gameState?: GameState
  error?: string
}
```

**Implementation:**

```typescript
class StartGameCommand implements Command {
  constructor(
    private saveService: SaveService,
    private loadService: LoadService,
    private sceneNav: SceneNavigationService,
    private assetLoader: AssetLoadingService
  ) {}

  canExecute(state: TitleScreenState): boolean {
    return state.assetsLoaded && state.mode === 'READY'
  }

  async execute(state: TitleScreenState): Promise<CommandResult> {
    // Validate
    if (!this.canExecute(state)) {
      return {
        success: false,
        error: 'Assets not loaded',
        nextScene: SceneType.TITLE_SCREEN
      }
    }

    try {
      // Check for existing save
      const saveExists = await this.saveService.checkForSaveData()

      let gameState: GameState
      let nextScene: SceneType

      if (saveExists) {
        // Load existing save
        const loadResult = await this.loadService.loadGame('autosave')
        gameState = loadResult.state

        // Determine destination
        nextScene = gameState.party.inMaze
          ? SceneType.CAMP
          : SceneType.CASTLE_MENU
      } else {
        // Initialize new game
        gameState = GameInitializationService.createNewGame()
        nextScene = SceneType.CASTLE_MENU
      }

      // Transition to next scene
      await this.sceneNav.transitionTo(nextScene, {
        fadeTime: 300,
        preserveState: false
      })

      return {
        success: true,
        nextScene,
        gameState
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        nextScene: SceneType.TITLE_SCREEN
      }
    }
  }

  getDescription(): string {
    return 'Start the game or load existing save'
  }
}
```

**Usage:**
```typescript
// In Title Screen component
const handleStartGame = async () => {
  const result = await startGameCommand.execute(state)
  if (!result.success) {
    console.error('Failed to start game:', result.error)
  }
}
```

**Implementation Priority:** HIGH (core command)

**Location:** `docs/commands/meta/StartGameCommand.md`

## UI Components Required

### 1. TitleScreen Component

**File:** `src/ui/scenes/TitleScreen.tsx` (or `.vue`, `.svelte` depending on framework)

**Structure:**
```typescript
interface TitleScreenProps {
  // No props needed (entry point)
}

interface TitleScreenState {
  mode: 'LOADING' | 'READY' | 'TRANSITIONING'
  assetsLoaded: boolean
  saveDataDetected: boolean
  loadingProgress: number
}

const TitleScreen = () => {
  const [state, setState] = useState<TitleScreenState>({
    mode: 'LOADING',
    assetsLoaded: false,
    saveDataDetected: false,
    loadingProgress: 0
  })

  // Boot sequence on mount
  useEffect(() => {
    initializeTitleScreen()
  }, [])

  const initializeTitleScreen = async () => {
    // 1. Load title assets
    await AssetLoadingService.loadTitleAssets()

    // 2. Start game asset loading in background
    AssetLoadingService.loadGameAssets()

    // 3. Check for save data
    const saveExists = await SaveService.checkForSaveData()
    setState(prev => ({ ...prev, saveDataDetected: saveExists }))

    // 4. Wait for all assets
    AssetLoadingService.onLoadComplete(() => {
      setState({
        mode: 'READY',
        assetsLoaded: true,
        saveDataDetected: saveExists,
        loadingProgress: 100
      })
    })
  }

  const handleStartGame = async () => {
    setState(prev => ({ ...prev, mode: 'TRANSITIONING' }))
    await startGameCommand.execute(state)
  }

  return (
    <div className="title-screen">
      <img
        src="/assets/title-bitmap.png"
        className="title-bitmap"
        alt="Wizardry Title"
      />

      <h2 className="subtitle">
        Proving Grounds of the Mad Overlord
      </h2>

      <button
        className={`start-button ${state.mode}`}
        onClick={handleStartGame}
        disabled={!state.assetsLoaded}
      >
        {state.mode === 'LOADING' ? 'Loading...' : '(S)TART'}
      </button>

      <footer className="copyright">
        Copyright 1981 Sir-Tech Software<br/>
        Version 1.0
      </footer>
    </div>
  )
}
```

### 2. Supporting Components

**LoadingIndicator** (Optional)
- Show during asset loading
- Can be simple text or progress bar
- Hidden when ready

**FadeTransition** (For scene changes)
- Smooth fade out/in effect
- Configurable duration
- Used by SceneNavigationService

## Implementation Phases

### Phase 1: Core Services ✅

**Goal:** Document and implement essential services

**Tasks:**
1. ✅ Document SaveService (already done)
2. ✅ Document LoadService (already done)
3. ❌ Document SceneNavigationService
4. ❌ Document AssetLoadingService
5. ❌ Document InputService

**Deliverables:**
- Service interface definitions
- Implementation guidelines
- Usage examples
- Test specifications

**Priority:** HIGH
**Estimated Effort:** 2-3 days

---

### Phase 2: Commands ⚠️

**Goal:** Document and implement title screen commands

**Tasks:**
1. ❌ Document StartGameCommand
2. ❌ Implement StartGameCommand

**Deliverables:**
- Command interface definition
- Implementation
- Unit tests
- Integration tests

**Priority:** HIGH
**Estimated Effort:** 1 day

---

### Phase 3: Asset Management 📦

**Goal:** Set up asset loading infrastructure

**Tasks:**
1. ❌ Implement AssetLoadingService
2. ❌ Create asset manifest (list of all assets)
3. ❌ Optimize title bitmap (<10KB PNG)
4. ❌ Set up sprite sheet loader
5. ❌ Set up data file loader (JSON)
6. ❌ Implement loading progress tracking
7. ❌ Add error handling for failed loads

**Deliverables:**
- Working asset loader
- Optimized title bitmap
- Asset manifest
- Loading progress UI

**Priority:** HIGH
**Estimated Effort:** 2-3 days

---

### Phase 4: UI Components 🎨

**Goal:** Build title screen UI

**Tasks:**
1. ❌ Create TitleScreen component
2. ❌ Implement loading state UI
3. ❌ Implement ready state UI
4. ❌ Add keyboard input handler (S key)
5. ❌ Add mouse/touch input handler
6. ❌ Implement fade transition effect
7. ❌ Add atmospheric effects (optional: torch flicker, mist, CRT)
8. ❌ Implement responsive scaling
9. ❌ Add ARIA labels for accessibility

**Deliverables:**
- Functional title screen component
- Responsive design
- Accessibility support
- Visual polish

**Priority:** MEDIUM
**Estimated Effort:** 3-4 days

---

### Phase 5: Scene Navigation System 🗺️

**Goal:** Build scene management infrastructure

**Tasks:**
1. ❌ Implement SceneNavigationService
2. ❌ Create scene state machine
3. ❌ Implement fade transitions
4. ❌ Add scene lifecycle hooks (onEnter, onExit)
5. ❌ Connect to routing (if using URL-based routing)

**Deliverables:**
- Working scene navigation
- Smooth transitions
- State preservation

**Priority:** HIGH
**Estimated Effort:** 2-3 days

---

### Phase 6: Game Initialization 🎮

**Goal:** Handle new game creation

**Tasks:**
1. ❌ Implement GameInitializationService (optional)
2. ❌ Create default game state
3. ❌ Initialize empty character roster
4. ❌ Set starting gold (0)
5. ❌ Initialize quest flags

**Deliverables:**
- New game initialization
- Default state definition

**Priority:** MEDIUM
**Estimated Effort:** 1-2 days

---

### Phase 7: Testing & Polish ✨

**Goal:** Ensure quality and reliability

**Tasks:**
1. ❌ Write unit tests for all services
2. ❌ Write unit tests for commands
3. ❌ Write integration tests for boot sequence
4. ❌ Test all 8 test scenarios from title screen doc
5. ❌ Performance testing (load time < 3s)
6. ❌ Accessibility testing
7. ❌ Visual polish and animation tuning
8. ❌ Error handling edge cases

**Test Scenarios (from docs/ui/scenes/00-title-screen.md):**
1. Fresh install with loading flow
2. Load existing save
3. Load save with party IN_MAZE
4. Corrupted save handling
5. Asset loading failure
6. Button states and interaction
7. Keyboard vs mouse input
8. Invalid input handling

**Deliverables:**
- Full test coverage
- All test scenarios passing
- Performance benchmarks met
- Accessibility compliance

**Priority:** HIGH
**Estimated Effort:** 3-4 days

## Documentation Gaps Summary

### Services to Document

| Service | Priority | Status | Estimated Effort |
|---------|----------|--------|------------------|
| SceneNavigationService | HIGH | ❌ Missing | 3-4 hours |
| AssetLoadingService | HIGH | ❌ Missing | 4-5 hours |
| InputService | HIGH | ❌ Missing | 2-3 hours |
| GameInitializationService | MEDIUM | ❌ Missing | 2 hours |

**Total Documentation Effort:** ~11-14 hours

### Commands to Document

| Command | Priority | Status | Estimated Effort |
|---------|----------|--------|------------------|
| StartGameCommand | HIGH | ❌ Missing | 2-3 hours |

**Total Documentation Effort:** ~2-3 hours

## Implementation Checklist

### Documentation Phase

- [ ] Document SceneNavigationService
- [ ] Document AssetLoadingService
- [ ] Document InputService
- [ ] Document GameInitializationService (optional)
- [ ] Document StartGameCommand
- [ ] Update services README with new services
- [ ] Update commands README with StartGameCommand

### Implementation Phase

**Week 1: Core Infrastructure**
- [ ] Implement SceneNavigationService
- [ ] Implement AssetLoadingService
- [ ] Implement InputService
- [ ] Write unit tests for services

**Week 2: Commands & Assets**
- [ ] Implement StartGameCommand
- [ ] Create asset manifest
- [ ] Optimize title bitmap
- [ ] Set up data file loading
- [ ] Write command tests

**Week 3: UI Components**
- [ ] Create TitleScreen component
- [ ] Implement loading states
- [ ] Add input handlers
- [ ] Implement transitions
- [ ] Add visual effects

**Week 4: Integration & Testing**
- [ ] Integration testing
- [ ] All 8 test scenarios
- [ ] Performance optimization
- [ ] Accessibility compliance
- [ ] Visual polish

## Dependencies

### External Dependencies

1. **Image Rendering**
   - CSS `image-rendering: pixelated` support
   - PNG image format support

2. **Browser APIs**
   - localStorage or IndexedDB (for save data)
   - Audio API (for sound effects)
   - Canvas API (optional, for effects)

3. **Framework/Library**
   - React/Vue/Svelte (whichever is chosen)
   - CSS-in-JS or CSS modules
   - Testing framework (Jest, Vitest, etc.)

### Internal Dependencies

1. **Data Services** (from docs/services/data-services.md)
   - ClassDataService
   - RaceDataService
   - SpellDataService
   - ItemDataService
   - MonsterDataService
   - MapDataService

2. **Save/Load Services**
   - SaveService
   - LoadService
   - ReplayService (for event log)

## Success Criteria

### Functional

- ✅ Title screen displays on app launch
- ✅ Assets load in < 3 seconds
- ✅ Button shows correct loading/ready states
- ✅ S key and mouse click both work
- ✅ Save detection works correctly
- ✅ New game initializes properly
- ✅ Existing save loads correctly
- ✅ Corrupted save handled gracefully
- ✅ Transitions to Castle Menu or Camp

### Non-Functional

- ✅ Load time < 3 seconds on average connection
- ✅ No console errors
- ✅ Accessible (screen readers, keyboard nav)
- ✅ Responsive on mobile/tablet/desktop
- ✅ Smooth 60fps animations
- ✅ Pixel-perfect bitmap rendering

### Testing

- ✅ All 8 test scenarios passing
- ✅ 100% code coverage for services
- ✅ 100% code coverage for commands
- ✅ Integration tests passing
- ✅ Accessibility audit passing

## Risks & Mitigations

### Risk 1: Asset Loading Performance

**Risk:** Assets take too long to load, poor user experience

**Mitigation:**
- Implement progressive loading (critical path first)
- Optimize all assets (compress images, minify data)
- Use lazy loading for non-critical assets
- Show loading progress to set expectations
- Cache assets in browser storage

### Risk 2: Save Data Corruption

**Risk:** Corrupted save crashes app or prevents loading

**Mitigation:**
- Robust validation before loading
- Try-catch around all save operations
- Graceful fallback to new game
- Log errors for debugging
- Checksum verification

### Risk 3: Browser Compatibility

**Risk:** Different browsers render differently or lack features

**Mitigation:**
- Test on major browsers (Chrome, Firefox, Safari, Edge)
- Use feature detection for optional features
- Provide fallbacks for missing features
- Progressive enhancement approach

### Risk 4: Accessibility Compliance

**Risk:** Screen readers or keyboard-only users cannot use title screen

**Mitigation:**
- Use semantic HTML
- Add ARIA labels
- Test with screen reader
- Ensure keyboard navigation works
- Sufficient color contrast

## Next Steps

1. **Immediate:** Document the 4 missing services
2. **This Week:** Document StartGameCommand
3. **Next Week:** Begin implementation of SceneNavigationService
4. **Following Week:** Implement AssetLoadingService and InputService
5. **Month 2:** Complete UI components and integration

## Related Documentation

- [Title Screen Specification](../ui/scenes/00-title-screen.md) - Detailed scene requirements
- [Data Services](../services/data-services.md) - Data loading services
- [Save Format](../data-format/save-format.md) - Save data structure
- [SaveService](../services/SaveService.md) - Save operations
- [LoadService](../services/LoadService.md) - Load operations
- [Navigation Map](../ui/navigation-map.md) - Complete UI flow

---

**Last Updated:** 2025-10-26

**Status:** Planning Phase - Documentation in Progress

**Next Action:** Document SceneNavigationService, AssetLoadingService, InputService
