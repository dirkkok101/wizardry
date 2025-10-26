# StartGameCommand

**Command to start the game from title screen, handling save detection and scene navigation.**

## Overview

The StartGameCommand is executed when the user presses the START button (or S key) on the title screen. It determines whether to load an existing save or create a new game, then transitions to the appropriate scene (Castle Menu or Camp).

## Responsibility

- Check for existing save data
- Load save if it exists and is valid
- Create new game if no save exists or save is corrupted
- Determine destination scene based on game state
- Transition to Castle Menu or Camp
- Handle errors gracefully

## Command Pattern

This command follows the Command Pattern with validation and execution phases.

```typescript
interface Command {
  canExecute(context: CommandContext): boolean
  execute(context: CommandContext): Promise<CommandResult>
  undo?(): Promise<void> // Not applicable for StartGame
}
```

## API Reference

### execute

Execute the start game command.

**Signature:**
```typescript
async function execute(
  context: StartGameContext
): Promise<CommandResult>
```

**Parameters:**
- `context`: Execution context with title screen state

**Returns:** Promise resolving to command result

**Throws:**
- `AssetNotLoadedError` if assets not ready
- `TransitionFailedError` if scene transition fails

**Example:**
```typescript
const result = await StartGameCommand.execute({
  assetsLoaded: true,
  saveDataDetected: true
})

if (result.success) {
  console.log('Started game, now in:', result.nextScene)
} else {
  console.error('Failed to start:', result.error)
}
```

### canExecute

Check if command can be executed.

**Signature:**
```typescript
function canExecute(context: StartGameContext): boolean
```

**Parameters:**
- `context`: Execution context to validate

**Returns:** True if command can execute, false otherwise

**Example:**
```typescript
if (StartGameCommand.canExecute({ assetsLoaded: true })) {
  await StartGameCommand.execute({ assetsLoaded: true })
} else {
  console.log('Cannot start game - assets not loaded')
}
```

## Data Structures

### StartGameContext

Context required to execute command.

```typescript
interface StartGameContext {
  // Are all assets loaded and ready?
  assetsLoaded: boolean

  // Was save data detected? (optional, for optimization)
  saveDataDetected?: boolean

  // Title screen current mode
  mode?: 'LOADING' | 'READY' | 'TRANSITIONING'
}
```

### CommandResult

Result of command execution.

```typescript
interface CommandResult {
  // Did command succeed?
  success: boolean

  // Which scene did we navigate to?
  nextScene: SceneType

  // Loaded or created game state
  gameState?: GameState

  // Error message if failed
  error?: string

  // Additional context
  metadata?: {
    isNewGame: boolean
    loadTime?: number
  }
}
```

## Execution Flow

### Flow Diagram

```
User presses START
    ↓
canExecute() → Check assets loaded
    ↓
  [If not loaded]
    → Return error: "Assets not loaded"
    ↓
execute()
    ↓
Check for save data
    ↓
    ├─ [Save exists and valid]
    │   ↓
    │   Load save data
    │   ↓
    │   Check party.inMaze
    │   ↓
    │   ├─ [In maze] → Transition to CAMP
    │   └─ [Not in maze] → Transition to CASTLE_MENU
    │
    └─ [No save or corrupted]
        ↓
        Create new game
        ↓
        Transition to CASTLE_MENU
```

### Detailed Steps

**1. Validation Phase**
```typescript
// Check if command can execute
if (!context.assetsLoaded) {
  return {
    success: false,
    nextScene: SceneType.TITLE_SCREEN,
    error: 'Assets not loaded'
  }
}
```

**2. Save Detection Phase**
```typescript
// Check for existing save
const saveExists = await SaveService.checkForSaveData()
```

**3. Load or Create Phase**
```typescript
let gameState: GameState
let isNewGame: boolean

if (saveExists) {
  // Load existing save
  try {
    const loadResult = await LoadService.loadGame('autosave')
    gameState = loadResult.state
    isNewGame = false
  } catch (error) {
    // Corrupted save - fall back to new game
    console.error('Save corrupted, creating new game:', error)
    gameState = GameInitializationService.createNewGame()
    isNewGame = true
  }
} else {
  // No save - create new game
  gameState = GameInitializationService.createNewGame()
  isNewGame = true
}
```

**4. Destination Determination Phase**
```typescript
// Determine where to go
const destination = gameState.party.inMaze
  ? SceneType.CAMP
  : SceneType.CASTLE_MENU
```

**5. Transition Phase**
```typescript
// Navigate to destination
await SceneNavigationService.transitionTo(destination, {
  fadeTime: 300,
  data: { isNewGame }
})
```

**6. Result Phase**
```typescript
return {
  success: true,
  nextScene: destination,
  gameState,
  metadata: { isNewGame }
}
```

## Implementation

### Command Class

```typescript
export class StartGameCommand implements Command {
  constructor(
    private saveService: SaveService,
    private loadService: LoadService,
    private sceneNav: SceneNavigationService,
    private gameInit: GameInitializationService
  ) {}

  canExecute(context: StartGameContext): boolean {
    return context.assetsLoaded === true
  }

  async execute(context: StartGameContext): Promise<CommandResult> {
    // 1. Validate
    if (!this.canExecute(context)) {
      return {
        success: false,
        nextScene: SceneType.TITLE_SCREEN,
        error: 'Assets not loaded - cannot start game'
      }
    }

    const startTime = Date.now()

    try {
      // 2. Check for save
      const saveExists = await this.saveService.checkForSaveData()

      // 3. Load or create
      let gameState: GameState
      let isNewGame: boolean

      if (saveExists) {
        try {
          const loadResult = await this.loadService.loadGame('autosave')
          gameState = loadResult.state
          isNewGame = false
        } catch (error) {
          console.error('Save corrupted, creating new game:', error)
          gameState = this.gameInit.createNewGame()
          isNewGame = true
        }
      } else {
        gameState = this.gameInit.createNewGame()
        isNewGame = true
      }

      // 4. Determine destination
      const destination = gameState.party.inMaze
        ? SceneType.CAMP
        : SceneType.CASTLE_MENU

      // 5. Transition
      await this.sceneNav.transitionTo(destination, {
        fadeTime: 300,
        data: { isNewGame }
      })

      // 6. Return success
      const loadTime = Date.now() - startTime
      return {
        success: true,
        nextScene: destination,
        gameState,
        metadata: { isNewGame, loadTime }
      }
    } catch (error) {
      console.error('StartGameCommand failed:', error)
      return {
        success: false,
        nextScene: SceneType.TITLE_SCREEN,
        error: error.message || 'Unknown error'
      }
    }
  }

  // No undo for this command (cannot unstart game)
}
```

### Factory Function

```typescript
// Dependency injection via factory
export function createStartGameCommand(
  saveService: SaveService,
  loadService: LoadService,
  sceneNav: SceneNavigationService,
  gameInit: GameInitializationService
): StartGameCommand {
  return new StartGameCommand(
    saveService,
    loadService,
    sceneNav,
    gameInit
  )
}
```

## Edge Cases

### Assets Not Loaded

```typescript
// User presses S before assets ready
const result = await StartGameCommand.execute({
  assetsLoaded: false
})

// result = {
//   success: false,
//   nextScene: SceneType.TITLE_SCREEN,
//   error: 'Assets not loaded'
// }
```

**UI Behavior:**
- Button should be disabled (visual feedback)
- Command returns error immediately
- No scene transition occurs

### Corrupted Save Data

```typescript
// Save exists but is corrupted
const result = await StartGameCommand.execute({
  assetsLoaded: true,
  saveDataDetected: true
})

// Internally:
// 1. Try to load save → throws error
// 2. Catch error, log it
// 3. Fall back to new game
// 4. Transition to Castle Menu

// result = {
//   success: true,
//   nextScene: SceneType.CASTLE_MENU,
//   gameState: { ...new game... },
//   metadata: { isNewGame: true }
// }
```

**User Experience:**
- No error dialog shown
- Seamlessly creates new game
- Optional: Log warning to console for debugging

### Party IN_MAZE

```typescript
// Existing save with party in dungeon
const result = await StartGameCommand.execute({
  assetsLoaded: true
})

// Internally:
// 1. Load save
// 2. Check gameState.party.inMaze === true
// 3. Navigate to CAMP instead of CASTLE_MENU

// result = {
//   success: true,
//   nextScene: SceneType.CAMP,
//   gameState: { ...loaded state... },
//   metadata: { isNewGame: false }
// }
```

**User Experience:**
- Resume in dungeon camp
- Party position and state preserved
- Can use (C)astle command to return to town

### Scene Transition Failure

```typescript
// Transition to next scene fails
try {
  await StartGameCommand.execute({ assetsLoaded: true })
} catch (error) {
  // Handle transition failure
  console.error('Failed to start game:', error)
  // Stay on title screen
}
```

**Recovery:**
- Command catches error
- Returns failure result
- User stays on title screen
- Can retry by pressing START again

## Testing

See [StartGameCommand.test.ts](../../tests/commands/StartGameCommand.test.ts)

### Unit Tests

**Validation tests:**
- canExecute returns false when assets not loaded
- canExecute returns true when assets loaded
- execute fails when assets not loaded
- execute returns error when canExecute is false

**New game tests:**
- execute creates new game when no save exists
- execute transitions to Castle Menu for new game
- Result indicates isNewGame = true
- Game state is valid new game

**Load game tests:**
- execute loads save when save exists
- execute transitions to Castle Menu when not IN_MAZE
- execute transitions to Camp when IN_MAZE
- Result indicates isNewGame = false
- Loaded game state matches saved state

**Error handling tests:**
- execute handles corrupted save gracefully
- Falls back to new game on save corruption
- Logs error to console
- Does not show error to user
- execute handles transition failure
- Returns failure result on error

**Performance tests:**
- execute completes in < 1 second
- loadTime in metadata is accurate

### Integration Tests

**End-to-end flow:**
```typescript
test('Title Screen → Castle Menu (new game)', async () => {
  // Setup: No save exists
  await clearSaveData()

  // Load title screen
  await loadTitleScreen()

  // Wait for assets
  await waitForAssets()

  // Click START
  await clickStartButton()

  // Verify: Now in Castle Menu
  expect(getCurrentScene()).toBe(SceneType.CASTLE_MENU)
  expect(getGameState()).toMatchNewGame()
})

test('Title Screen → Camp (resume in dungeon)', async () => {
  // Setup: Save with party IN_MAZE
  await createSaveWithPartyInDungeon()

  // Load title screen
  await loadTitleScreen()

  // Wait for assets
  await waitForAssets()

  // Press S key
  await pressKey('S')

  // Verify: Now in Camp
  expect(getCurrentScene()).toBe(SceneType.CAMP)
  expect(getGameState().party.inMaze).toBe(true)
})
```

## Dependencies

### Services Used

- **SaveService** - Check for save data existence
- **LoadService** - Load game from save
- **GameInitializationService** - Create new game
- **SceneNavigationService** - Transition to next scene

### Dependency Injection

```typescript
// Create command with dependencies
const startGameCommand = new StartGameCommand(
  SaveService,
  LoadService,
  SceneNavigationService,
  GameInitializationService
)
```

## Usage Examples

### Title Screen Component

```typescript
function TitleScreen() {
  const [state, setState] = useState({
    mode: 'LOADING',
    assetsLoaded: false
  })

  useEffect(() => {
    // Load assets
    AssetLoadingService.onLoadComplete(() => {
      setState({ mode: 'READY', assetsLoaded: true })
    })
  }, [])

  const handleStart = async () => {
    // Execute command
    const result = await StartGameCommand.execute({
      assetsLoaded: state.assetsLoaded
    })

    if (!result.success) {
      console.error('Failed to start:', result.error)
      // Show error to user
    }

    // Scene navigation handled by command
  }

  return (
    <div>
      <button
        onClick={handleStart}
        disabled={!state.assetsLoaded}
      >
        {state.mode === 'LOADING' ? 'Loading...' : '(S)TART'}
      </button>
    </div>
  )
}
```

### With Input Service

```typescript
// Register both keyboard and mouse handlers
function setupStartGameHandlers() {
  // S key handler
  InputService.onKeyPress('S', async () => {
    if (assetsLoaded) {
      await StartGameCommand.execute({ assetsLoaded: true })
    }
  })

  // Button click handler
  InputService.onButtonClick('start-button', async () => {
    if (assetsLoaded) {
      await StartGameCommand.execute({ assetsLoaded: true })
    }
  })
}
```

### Error Handling

```typescript
async function handleStartGame() {
  try {
    const result = await StartGameCommand.execute({
      assetsLoaded: true
    })

    if (result.success) {
      console.log('Game started successfully')
      console.log('New game:', result.metadata.isNewGame)
      console.log('Load time:', result.metadata.loadTime, 'ms')
    } else {
      // Command failed
      showErrorMessage(result.error)
    }
  } catch (error) {
    // Unexpected error
    console.error('Unexpected error:', error)
    showErrorMessage('An unexpected error occurred. Please try again.')
  }
}
```

## Performance Considerations

### Execution Time

- **New game:** < 100ms (create game state, transition)
- **Load game:** < 500ms (load from IndexedDB, deserialize, transition)
- **Corrupted save:** < 600ms (try load, fail, create new game, transition)

**Target:** Complete in < 1 second for all cases

### Optimization Strategies

**1. Parallel Operations**
```typescript
// Check save and preload next scene in parallel
const [saveExists, preloadResult] = await Promise.all([
  SaveService.checkForSaveData(),
  SceneNavigationService.preloadScene(SceneType.CASTLE_MENU)
])
```

**2. Caching**
```typescript
// Cache save check result
if (context.saveDataDetected !== undefined) {
  // Use cached result
  saveExists = context.saveDataDetected
} else {
  // Check fresh
  saveExists = await SaveService.checkForSaveData()
}
```

## Related Commands

- [LoadGameCommand](./LoadGameCommand.md) - Load specific save slot
- [SaveGameCommand](./SaveGameCommand.md) - Save current game
- [EnterDungeonCommand](../dungeon/EnterDungeonCommand.md) - Enter dungeon from castle

## Related Services

- [SceneNavigationService](../../services/SceneNavigationService.md) - Scene transitions
- [SaveService](../../services/SaveService.md) - Save data checking
- [LoadService](../../services/LoadService.md) - Loading saves
- [GameInitializationService](../../services/GameInitializationService.md) - New game creation

## Related Documentation

- [Title Screen](../../ui/scenes/00-title-screen.md) - Scene specification
- [Castle Menu](../../ui/scenes/01-castle-menu.md) - Destination for new games
- [Camp](../../ui/scenes/09-camp.md) - Destination for dungeon resume
- [Command Pattern](../../architecture.md#command-pattern) - Architecture

---

**Last Updated:** 2025-10-26
