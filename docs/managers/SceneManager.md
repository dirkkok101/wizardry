# SceneManager

**Location**: `src/managers/SceneManager.ts:12`

**Purpose**: Manages scene lifecycle and transitions, acting as the orchestrator between SceneNavigationService events and actual scene instances.

---

## Overview

The SceneManager is responsible for:
- Creating scene instances via factory pattern
- Managing scene lifecycle (init, enter, update, render, exit, destroy)
- Listening to SceneNavigationService events
- Preventing invalid transitions (e.g., double transitions)
- Coordinating with the game loop

## Architecture Role

```
Game Loop (main.ts)
       ↓
SceneManager ← listens to → SceneNavigationService
       ↓                            ↑
Creates/Manages                     │
Scene Instances              Commands trigger transitions
       ↓
Individual Scenes
(TitleScreen, Castle, etc.)
```

## API Reference

### Constructor

```typescript
constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D)
```

**Parameters**:
- `canvas` - The main game canvas element
- `ctx` - The 2D rendering context

**Example**:
```typescript
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const sceneManager = new SceneManager(canvas, ctx)
```

### Methods

#### `init(initialSceneType?: SceneType): Promise<void>`

Initializes the scene manager and loads the initial scene.

**Parameters**:
- `initialSceneType` - Starting scene (defaults to `SceneType.TITLE_SCREEN`)

**What it does**:
1. Sets up navigation event listeners
2. Loads and initializes the initial scene

**Example**:
```typescript
await sceneManager.init() // Loads title screen
// or
await sceneManager.init(SceneType.CASTLE_MENU) // Start at castle
```

#### `update(deltaTime: number): void`

Updates the current scene's state.

**Parameters**:
- `deltaTime` - Time elapsed since last frame (milliseconds)

**Behavior**:
- Only updates if not transitioning
- Skips update during scene transitions

**Example**:
```typescript
// In game loop
function gameLoop(currentTime: number) {
  const deltaTime = currentTime - lastTime
  sceneManager.update(deltaTime)
  sceneManager.render(ctx)
  requestAnimationFrame(gameLoop)
}
```

#### `render(ctx: CanvasRenderingContext2D): void`

Renders the current scene.

**Parameters**:
- `ctx` - The 2D rendering context

**Behavior**:
- Only renders if not transitioning
- Skips render during scene transitions

#### `getCurrentSceneType(): SceneType | null`

Returns the current scene type or null if no scene loaded.

**Returns**: `SceneType | null`

**Example**:
```typescript
const sceneType = sceneManager.getCurrentSceneType()
if (sceneType === SceneType.TITLE_SCREEN) {
  console.log('On title screen')
}
```

#### `isTransitionInProgress(): boolean`

Checks if a scene transition is currently happening.

**Returns**: `boolean` - true if transitioning, false otherwise

**Example**:
```typescript
if (!sceneManager.isTransitionInProgress()) {
  // Safe to trigger new transition
}
```

#### `destroy(): void`

Cleans up all resources.

**What it does**:
1. Unsubscribes from all scene navigation events
2. Destroys current scene
3. Clears references

**Example**:
```typescript
// On application shutdown
sceneManager.destroy()
```

## Scene Transition Lifecycle

When a scene transition occurs (via SceneNavigationService.goTo):

```
1. Event triggered in SceneNavigationService
          ↓
2. SceneManager receives event via listener
          ↓
3. transitionToScene() called
          ↓
4. OLD SCENE:
   - exit() called (optional cleanup)
   - destroy() called (remove handlers, clear resources)
          ↓
5. NEW SCENE:
   - Factory creates scene instance
   - init() called (async - load assets, setup)
   - enter() called (receive transition data)
          ↓
6. Transition complete, resume update/render loop
```

## Scene Factory

The SceneManager uses a factory pattern to create scene instances:

```typescript
private createScene(sceneType: SceneType): Scene {
  switch (sceneType) {
    case SceneType.TITLE_SCREEN:
      return new TitleScreenScene()
    case SceneType.CASTLE_MENU:
      return new CastleMenuScene()
    case SceneType.CAMP:
      return new CampScene()
    default:
      throw new Error(`Unknown scene type: ${sceneType}`)
  }
}
```

**Adding New Scenes**:
1. Create scene class implementing `Scene` interface
2. Add case to factory method
3. Add to navigation listeners in `setupSceneNavigationListeners()`

## Double Transition Prevention

The SceneManager prevents double transitions using the `isTransitioning` flag:

```typescript
private async transitionToScene(sceneType: SceneType): Promise<void> {
  if (this.isTransitioning) {
    console.warn(`Transition already in progress, ignoring...`)
    return
  }

  this.isTransitioning = true
  try {
    // ... transition logic
  } finally {
    this.isTransitioning = false
  }
}
```

This prevents:
- Rapid-fire scene transitions
- Race conditions from multiple navigation events
- Interrupting async init/destroy operations

## Event Subscription Pattern

The SceneManager subscribes to navigation events for all scene types:

```typescript
private setupSceneNavigationListeners(): void {
  const sceneTypes = [SceneType.TITLE_SCREEN, SceneType.CASTLE_MENU, SceneType.CAMP]

  sceneTypes.forEach(sceneType => {
    const unsubscribe = SceneNavigationService.onSceneEnter(sceneType, (data) => {
      if (this.currentScene?.type !== sceneType) {
        this.transitionToScene(sceneType, data)
      }
    })
    this.unsubscribeEnterHandlers.push(unsubscribe)
  })
}
```

**Benefits**:
- Automatic scene transitions from any command
- Centralized transition logic
- Clean separation of concerns

## Integration with Game Loop

Typical integration in main game loop:

```typescript
// main.ts
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const sceneManager = new SceneManager(canvas, ctx)

await sceneManager.init()

let lastTime = 0
function gameLoop(currentTime: number) {
  const deltaTime = currentTime - lastTime
  lastTime = currentTime

  // Update current scene
  sceneManager.update(deltaTime)

  // Clear and render
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  sceneManager.render(ctx)

  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)
```

## Testing

The SceneManager is tested in integration tests:

**Test file**: `tests/managers/SceneManager.test.ts`

Key test scenarios:
- Scene initialization
- Scene transitions
- Double transition prevention
- Scene lifecycle (init → enter → update → render → exit → destroy)
- Event subscription cleanup

**Integration test**: `tests/integration/TitleScreenFlow.test.ts`
- End-to-end scene transitions
- Title → Castle Menu flow
- Title → Camp flow (load game in maze)

## Dependencies

**Required**:
- `Scene` interface (`src/scenes/Scene.ts`)
- `SceneType` enum (`src/types/SceneType.ts`)
- `SceneNavigationService` (`src/services/SceneNavigationService.ts`)

**Scene Classes**:
- `TitleScreenScene` (`src/scenes/title-screen-scene/TitleScreenScene.ts`)
- `CastleMenuScene` (`src/scenes/castle-menu-scene/CastleMenuScene.ts`)
- `CampScene` (`src/scenes/camp-scene/CampScene.ts`)

## Error Handling

**Transition Errors**:
```typescript
SceneNavigationService.onSceneEnter(sceneType, (data) => {
  this.transitionToScene(sceneType, data).catch(error => {
    console.error(`Failed to transition to ${sceneType}:`, error)
  })
})
```

Errors are logged but don't crash the application.

**Unknown Scene Type**:
```typescript
throw new Error(`Unknown scene type: ${sceneType}`)
```

Throws immediately if attempting to create an undefined scene.

## Performance Considerations

- Scenes are destroyed between transitions (no scene pooling)
- Only one scene active at a time
- Update/render skipped during transitions
- Event listeners properly cleaned up in destroy()

## Related Documentation

- **[SceneNavigationService](../services/SceneNavigationService.md)** - Navigation state machine
- **[Scene Architecture](../scenes/README.md)** - Scene implementation patterns
- **[TitleScreenScene](../scenes/title-screen-scene.md)** - Example scene implementation
- **[Architecture](../architecture.md)** - Overall system architecture

## Last Updated

2025-10-26
