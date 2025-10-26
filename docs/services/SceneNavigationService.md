# SceneNavigationService

**Pure function service for managing scene transitions and navigation state.**

## Responsibility

Manages transitions between game scenes (UI screens), handles scene lifecycle, maintains navigation state, and provides smooth visual transitions between scenes.

## Overview

The SceneNavigationService acts as the navigation controller for the entire game UI. It manages the transition between different scenes (Title Screen, Castle Menu, Training Grounds, Dungeon, Combat, etc.) and ensures consistent behavior across all transitions.

**Key Concepts:**
- **Scene:** A distinct UI screen with its own state and behavior
- **Transition:** The process of moving from one scene to another
- **Scene Lifecycle:** Entry, active, exit phases for each scene
- **Navigation History:** Stack of previous scenes for back navigation

## API Reference

### transitionTo

Transition from current scene to a new scene.

**Signature:**
```typescript
function transitionTo(
  sceneType: SceneType,
  options?: TransitionOptions
): Promise<void>
```

**Parameters:**
- `sceneType`: Target scene identifier
- `options`: Optional transition configuration

**Returns:** Promise that resolves when transition completes

**Throws:**
- `InvalidSceneError` if scene type is invalid
- `TransitionBlockedError` if transition is not allowed from current scene
- `TransitionFailedError` if transition fails during execution

**Example:**
```typescript
// Simple transition
await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)

// Transition with fade effect
await SceneNavigationService.transitionTo(
  SceneType.TRAINING_GROUNDS,
  {
    fadeTime: 500,
    direction: 'fade'
  }
)

// Transition with state
await SceneNavigationService.transitionTo(
  SceneType.CAMP,
  {
    fadeTime: 300,
    preserveState: true,
    data: { fromDungeon: true }
  }
)
```

### getCurrentScene

Get the currently active scene.

**Signature:**
```typescript
function getCurrentScene(): SceneType
```

**Returns:** Current scene type

**Example:**
```typescript
const currentScene = SceneNavigationService.getCurrentScene()
// currentScene === SceneType.TITLE_SCREEN
```

### getPreviousScene

Get the previous scene (for back navigation).

**Signature:**
```typescript
function getPreviousScene(): SceneType | null
```

**Returns:** Previous scene type or null if no history

**Example:**
```typescript
const previousScene = SceneNavigationService.getPreviousScene()
// previousScene === SceneType.CASTLE_MENU (or null if first scene)
```

### canTransitionTo

Check if transition to target scene is allowed.

**Signature:**
```typescript
function canTransitionTo(
  sceneType: SceneType,
  fromScene?: SceneType
): boolean
```

**Parameters:**
- `sceneType`: Target scene to check
- `fromScene`: Optional source scene (defaults to current scene)

**Returns:** True if transition is allowed, false otherwise

**Example:**
```typescript
// Can we go to Training Grounds from Castle Menu?
const canGo = SceneNavigationService.canTransitionTo(
  SceneType.TRAINING_GROUNDS,
  SceneType.CASTLE_MENU
)
// canGo === true

// Can we go to Title Screen from Training Grounds?
const cannotGo = SceneNavigationService.canTransitionTo(
  SceneType.TITLE_SCREEN,
  SceneType.TRAINING_GROUNDS
)
// cannotGo === false (Title Screen is one-way entry point)
```

### goBack

Navigate back to previous scene.

**Signature:**
```typescript
function goBack(options?: TransitionOptions): Promise<void>
```

**Parameters:**
- `options`: Optional transition configuration

**Returns:** Promise that resolves when transition completes

**Throws:**
- `NoHistoryError` if no previous scene exists

**Example:**
```typescript
// Go back to previous scene
await SceneNavigationService.goBack()

// Go back with custom transition
await SceneNavigationService.goBack({ fadeTime: 200 })
```

### onSceneEnter

Register handler called when entering a scene.

**Signature:**
```typescript
function onSceneEnter(
  sceneType: SceneType,
  handler: SceneEnterHandler
): void
```

**Parameters:**
- `sceneType`: Scene to watch for entry
- `handler`: Callback function executed on scene entry

**Example:**
```typescript
SceneNavigationService.onSceneEnter(
  SceneType.CASTLE_MENU,
  (data) => {
    console.log('Entered Castle Menu', data)
    // Initialize castle menu state
    // Play background music
  }
)
```

### onSceneExit

Register handler called when exiting a scene.

**Signature:**
```typescript
function onSceneExit(
  sceneType: SceneType,
  handler: SceneExitHandler
): void
```

**Parameters:**
- `sceneType`: Scene to watch for exit
- `handler`: Callback function executed on scene exit

**Example:**
```typescript
SceneNavigationService.onSceneExit(
  SceneType.COMBAT,
  (data) => {
    console.log('Exited Combat', data)
    // Clean up combat state
    // Stop battle music
  }
)
```

### clearHistory

Clear navigation history.

**Signature:**
```typescript
function clearHistory(): void
```

**Example:**
```typescript
// Clear history after game over
SceneNavigationService.clearHistory()
// Now goBack() will fail with NoHistoryError
```

### getNavigationHistory

Get complete navigation history.

**Signature:**
```typescript
function getNavigationHistory(): SceneType[]
```

**Returns:** Array of scene types in chronological order

**Example:**
```typescript
const history = SceneNavigationService.getNavigationHistory()
// history === [TITLE_SCREEN, CASTLE_MENU, TRAINING_GROUNDS, CASTLE_MENU]
```

### isTransitioning

Check if a transition is currently in progress.

**Signature:**
```typescript
function isTransitioning(): boolean
```

**Returns:** True if transition is active, false otherwise

**Example:**
```typescript
const transitioning = SceneNavigationService.isTransitioning()
if (transitioning) {
  // Disable input during transition
  InputService.setInputEnabled(false)
}
```

## Data Structures

### SceneType

All available game scenes.

```typescript
enum SceneType {
  // System Scenes
  TITLE_SCREEN = 'TITLE_SCREEN',
  LOADING = 'LOADING',

  // Castle/Town Scenes
  CASTLE_MENU = 'CASTLE_MENU',
  TRAINING_GROUNDS = 'TRAINING_GROUNDS',
  TAVERN = 'TAVERN',
  INN = 'INN',
  SHOP = 'SHOP',
  TEMPLE = 'TEMPLE',
  EDGE_OF_TOWN = 'EDGE_OF_TOWN',

  // Dungeon Scenes
  CAMP = 'CAMP',
  DUNGEON_NAVIGATION = 'DUNGEON_NAVIGATION',
  COMBAT = 'COMBAT',
  CHEST_ENCOUNTER = 'CHEST_ENCOUNTER',

  // Character Management
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  CHARACTER_INSPECT = 'CHARACTER_INSPECT',
  PARTY_FORMATION = 'PARTY_FORMATION',
}
```

### TransitionOptions

Configuration for scene transitions.

```typescript
interface TransitionOptions {
  // Transition duration in milliseconds
  fadeTime?: number // Default: 300ms

  // Transition type
  direction?: 'fade' | 'slide' | 'instant' // Default: 'fade'

  // Preserve previous scene state in history
  preserveState?: boolean // Default: false

  // Additional data to pass to next scene
  data?: Record<string, any>

  // Add to navigation history (enables back navigation)
  addToHistory?: boolean // Default: true

  // Block input during transition
  blockInput?: boolean // Default: true
}
```

### SceneEnterHandler

Callback type for scene entry.

```typescript
type SceneEnterHandler = (data?: SceneTransitionData) => void

interface SceneTransitionData {
  fromScene: SceneType
  toScene: SceneType
  data?: Record<string, any>
  timestamp: number
}
```

### SceneExitHandler

Callback type for scene exit.

```typescript
type SceneExitHandler = (data?: SceneTransitionData) => void
```

## Scene Transition Rules

### Allowed Transitions

Not all scenes can transition to all other scenes. The service enforces navigation rules:

**Title Screen:**
- ✅ → Castle Menu (default)
- ✅ → Camp (if party was IN_MAZE)
- ❌ → Cannot return to Title Screen without app restart

**Castle Menu:**
- ✅ → Training Grounds
- ✅ → Tavern
- ✅ → Inn
- ✅ → Shop
- ✅ → Temple
- ✅ → Edge of Town
- ✅ → Camp (if party formed and entering dungeon)
- ❌ → Title Screen (must use Leave Game from Edge of Town)

**Dungeon Scenes (Camp, Navigation, Combat):**
- ✅ → Castle Menu (via Castle command)
- ✅ → Navigation ↔ Camp
- ✅ → Navigation ↔ Combat
- ✅ → Navigation ↔ Chest Encounter
- ❌ → Other town scenes directly

**Combat:**
- ✅ → Dungeon Navigation (combat ends)
- ✅ → Camp (party wipe, flee success)
- ✅ → Castle Menu (all dead, resurrect at temple)
- ❌ → Cannot exit combat without resolution

### Navigation Patterns

**Linear Navigation:**
```typescript
// Castle Menu → Training Grounds
await transitionTo(SceneType.TRAINING_GROUNDS)
// Training Grounds → Castle Menu
await goBack()
```

**Hub Navigation (Castle Menu as hub):**
```typescript
// Castle Menu → Training Grounds
await transitionTo(SceneType.TRAINING_GROUNDS)
// Training Grounds → Castle Menu
await goBack()
// Castle Menu → Tavern
await transitionTo(SceneType.TAVERN)
// Tavern → Castle Menu
await goBack()
```

**Context-Sensitive Navigation:**
```typescript
// Different destination based on game state
const destination = party.inMaze
  ? SceneType.CAMP
  : SceneType.CASTLE_MENU

await transitionTo(destination)
```

## Transition Effects

### Fade Transition (Default)

```typescript
await transitionTo(SceneType.CASTLE_MENU, {
  direction: 'fade',
  fadeTime: 300 // milliseconds
})
```

**Visual Effect:**
1. Current scene fades to black (150ms)
2. New scene fades in from black (150ms)
3. Total duration: 300ms

### Instant Transition

```typescript
await transitionTo(SceneType.COMBAT, {
  direction: 'instant',
  fadeTime: 0
})
```

**Visual Effect:**
- Immediate scene swap
- No animation
- Use for rapid transitions (combat start)

### Slide Transition (Optional)

```typescript
await transitionTo(SceneType.TRAINING_GROUNDS, {
  direction: 'slide',
  fadeTime: 400
})
```

**Visual Effect:**
1. New scene slides in from right
2. Current scene slides out to left
3. Total duration: 400ms

## Scene Lifecycle

Each scene goes through a lifecycle managed by the service:

```
┌──────────────┐
│   Inactive   │
└──────┬───────┘
       │ transitionTo() called
       ↓
┌──────────────┐
│   Entering   │ ← onSceneEnter() fired
└──────┬───────┘
       │ Transition complete
       ↓
┌──────────────┐
│    Active    │ ← Scene is visible and interactive
└──────┬───────┘
       │ transitionTo() called for different scene
       ↓
┌──────────────┐
│   Exiting    │ ← onSceneExit() fired
└──────┬───────┘
       │ Transition complete
       ↓
┌──────────────┐
│   Inactive   │
└──────────────┘
```

**Lifecycle Hooks:**
```typescript
// Called when scene is about to become visible
onSceneEnter(SceneType.CASTLE_MENU, (data) => {
  // Initialize scene state
  // Start background music
  // Enable input
})

// Called when scene is about to become hidden
onSceneExit(SceneType.CASTLE_MENU, (data) => {
  // Save scene state
  // Stop background music
  // Disable input
})
```

## Navigation History

The service maintains a history stack for back navigation:

```typescript
// User flow
Title Screen → Castle Menu → Training Grounds → Character Creation

// History stack
[TITLE_SCREEN, CASTLE_MENU, TRAINING_GROUNDS, CHARACTER_CREATION]

// Call goBack()
History: [TITLE_SCREEN, CASTLE_MENU, TRAINING_GROUNDS]
Current: TRAINING_GROUNDS

// Call goBack() again
History: [TITLE_SCREEN, CASTLE_MENU]
Current: CASTLE_MENU
```

**History Management:**
```typescript
// Clear history (e.g., after game over)
clearHistory()

// Get full history for debugging
const history = getNavigationHistory()
console.log('Navigation path:', history)
```

## State Management Integration

The service can integrate with global state management:

```typescript
// React example with context
const SceneContext = createContext<SceneContextType>(null!)

export function SceneProvider({ children }) {
  const [currentScene, setCurrentScene] = useState(SceneType.TITLE_SCREEN)

  useEffect(() => {
    // Subscribe to scene changes
    const unsubscribe = SceneNavigationService.subscribe((newScene) => {
      setCurrentScene(newScene)
    })

    return unsubscribe
  }, [])

  return (
    <SceneContext.Provider value={{ currentScene }}>
      {children}
    </SceneContext.Provider>
  )
}
```

## Dependencies

Uses:
- No direct service dependencies (foundational service)

Used by:
- `StartGameCommand` (title screen navigation)
- `EnterDungeonCommand` (castle → camp)
- `ReturnToCastleCommand` (camp → castle)
- All scene components (for navigation)

## Testing

See [SceneNavigationService.test.ts](../../tests/services/SceneNavigationService.test.ts)

**Key test cases:**
- Transition to valid scene succeeds
- Transition to invalid scene throws error
- getCurrentScene returns correct scene
- canTransitionTo validates transitions correctly
- goBack navigates to previous scene
- goBack throws NoHistoryError when no history
- onSceneEnter fires on scene entry
- onSceneExit fires on scene exit
- clearHistory removes all history
- isTransitioning returns true during transition
- Navigation history maintains correct order
- Title Screen cannot be navigated back to
- Castle Menu acts as hub for town scenes
- Combat blocks most transitions

**Edge cases:**
- Transition called during active transition (should queue or reject)
- Scene enter/exit handlers throw errors (should not block transition)
- Multiple handlers for same scene (all should fire)
- History limit (max 100 scenes to prevent memory leak)

## Performance Considerations

**Transition Timing:**
- Default fade: 300ms (balanced feel)
- Instant: 0ms (combat encounters)
- Slow fade: 500ms+ (dramatic transitions)

**History Limit:**
- Max 100 scenes in history stack
- Oldest entries removed when limit reached
- Prevents memory leaks in long play sessions

**Handler Optimization:**
- Handlers executed synchronously
- Keep handlers lightweight
- Avoid heavy computations in lifecycle hooks

## Usage Examples

### Basic Scene Navigation

```typescript
// Title Screen → Castle Menu
await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)

// Castle Menu → Training Grounds
await SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS)

// Back to Castle Menu
await SceneNavigationService.goBack()
```

### Conditional Navigation

```typescript
// Determine destination based on game state
async function startGame(gameState: GameState) {
  const destination = gameState.party.inMaze
    ? SceneType.CAMP
    : SceneType.CASTLE_MENU

  await SceneNavigationService.transitionTo(destination, {
    fadeTime: 300,
    data: { fromTitleScreen: true }
  })
}
```

### Scene Lifecycle Management

```typescript
// Castle Menu scene setup
SceneNavigationService.onSceneEnter(
  SceneType.CASTLE_MENU,
  ({ data }) => {
    // Play castle theme music
    AudioService.playMusic('castle_theme')

    // Show welcome message on first visit
    if (data?.fromTitleScreen) {
      showMessage('Welcome to the Castle!')
    }
  }
)

SceneNavigationService.onSceneExit(
  SceneType.CASTLE_MENU,
  () => {
    // Stop castle theme
    AudioService.stopMusic()
  }
)
```

### Combat Transition

```typescript
// Entering combat (instant transition)
await SceneNavigationService.transitionTo(
  SceneType.COMBAT,
  {
    direction: 'instant',
    fadeTime: 0,
    data: {
      encounter: monsterGroup,
      canFlee: true
    }
  }
)

// Exiting combat (fade back to dungeon)
await SceneNavigationService.transitionTo(
  SceneType.DUNGEON_NAVIGATION,
  {
    fadeTime: 300,
    data: {
      combatVictory: true,
      xpGained: 1500
    }
  }
)
```

### Error Handling

```typescript
try {
  await SceneNavigationService.transitionTo(SceneType.TITLE_SCREEN)
} catch (error) {
  if (error instanceof TransitionBlockedError) {
    console.error('Cannot return to title screen from this scene')
  } else if (error instanceof TransitionFailedError) {
    console.error('Transition failed:', error.message)
  }
}
```

## Related

- [Title Screen](../ui/scenes/00-title-screen.md) - Uses this service
- [Castle Menu](../ui/scenes/01-castle-menu.md) - Navigation hub
- [Navigation Map](../ui/navigation-map.md) - Complete scene graph
- [StartGameCommand](../commands/meta/StartGameCommand.md) - Uses transitionTo()
- [InputService](./InputService.md) - Input disabled during transitions

---

**Last Updated:** 2025-10-26
