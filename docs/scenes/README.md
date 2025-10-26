# Scene Architecture

**Location**: `src/scenes/`

**Purpose**: Scenes are the fundamental building blocks of the game's UI and user experience. Each scene represents a distinct game screen or feature that the player interacts with.

---

## Overview

In this Wizardry remake, **scenes ARE features** from the player's perspective. The codebase uses **vertical slice architecture** to organize code by scene, with each scene folder containing everything needed for that feature:

- Scene implementation (rendering, animation, lifecycle)
- Commands (scene-specific business logic)
- Components (reusable UI elements) - future
- Tests (mirroring the source structure)

## Scene Interface

All scenes implement the `Scene` interface (`src/scenes/Scene.ts:8`):

```typescript
export interface Scene {
  readonly type: SceneType
  init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void>
  enter?(data?: SceneTransitionData): void
  exit?(): void
  update(deltaTime: number): void
  render(ctx: CanvasRenderingContext2D): void
  destroy?(): void
}
```

## Scene Lifecycle

Every scene goes through a predictable lifecycle:

```
┌──────────────────────────────────────────────┐
│                                              │
│  1. CREATION                                 │
│     new TitleScreenScene()                   │
│     - Constructor runs                       │
│     - Initialize basic properties            │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  2. INITIALIZATION (async)                   │
│     await scene.init(canvas, ctx)            │
│     - Load assets                            │
│     - Setup canvas references                │
│     - Prepare initial state                  │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  3. ENTER (optional)                         │
│     scene.enter(transitionData)              │
│     - Receive data from previous scene       │
│     - Reset scene-specific state             │
│     - Register input handlers                │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  4. ACTIVE LOOP                              │
│     ┌─────────────────────────────┐          │
│     │ scene.update(deltaTime)     │          │
│     │  - Update animations        │          │
│     │  - Process input            │          │
│     │  - Update game state        │          │
│     └─────────────┬───────────────┘          │
│                   ↓                          │
│     ┌─────────────────────────────┐          │
│     │ scene.render(ctx)           │          │
│     │  - Clear canvas             │          │
│     │  - Draw background          │          │
│     │  - Draw UI elements         │          │
│     │  - Draw overlays            │          │
│     └─────────────┬───────────────┘          │
│                   │                          │
│                   └──→ repeat 60fps          │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  5. EXIT (optional)                          │
│     scene.exit()                             │
│     - Called before transition               │
│     - Optional cleanup                       │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│  6. DESTRUCTION                              │
│     scene.destroy()                          │
│     - Unregister input handlers              │
│     - Clear references                       │
│     - Release resources                      │
│                                              │
└──────────────────────────────────────────────┘
```

## Vertical Slice Organization

Each scene is organized as a vertical slice containing all its related code:

```
/src/scenes/
  /title-screen-scene/
    - TitleScreenScene.ts        # Scene implementation
    /commands/
      - StartGameCommand.ts      # Scene-specific commands
    /components/  (future)
      - Button.ts                # Reusable UI components

  /castle-menu-scene/
    - CastleMenuScene.ts
    /commands/ (future)
      - NavigateToLocationCommand.ts

  /training-grounds-scene/
    - TrainingGroundsScene.ts
    /commands/ (future)
      - CreateCharacterCommand.ts
      - InspectCharacterCommand.ts
```

**Benefits**:
- All code for a feature lives together
- Easy to find and modify scene-specific logic
- Commands scoped to the scenes that use them
- Clear feature boundaries

## Implemented Scenes

### TitleScreenScene
**Location**: `src/scenes/title-screen-scene/TitleScreenScene.ts:1`
**Purpose**: Game entry point with start button
**Status**: ✅ Fully implemented

**Features**:
- Asset loading with progress tracking
- Animated title bitmap rendering
- Save game detection
- Button with hover/click handling
- Keyboard input (S key to start)
- Smooth transition to Castle Menu or Camp

See [TitleScreenScene Documentation](./title-screen-scene.md)

### CastleMenuScene
**Location**: `src/scenes/castle-menu-scene/CastleMenuScene.ts:1`
**Purpose**: Main hub for accessing castle locations
**Status**: ⚠️ Placeholder

**Planned Features**:
- Menu with location options
- Navigate to: Training Grounds, Tavern, Trading Post, Temple, Inn, Edge of Town

### CampScene
**Location**: `src/scenes/camp-scene/CampScene.ts:1`
**Purpose**: Party management at maze entrance
**Status**: ⚠️ Placeholder

**Planned Features**:
- Enter/exit maze
- Character inspection
- Spell casting
- Item management

## Scene Pattern: State Machine

Scenes typically implement an internal state machine to manage different modes:

```typescript
type SceneMode = 'LOADING' | 'READY' | 'TRANSITIONING'

export class ExampleScene implements Scene {
  private mode: SceneMode = 'LOADING'

  async init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    // Start in LOADING
    await this.loadAssets()
    this.mode = 'READY'
  }

  update(deltaTime: number) {
    if (this.mode === 'LOADING') {
      // Update loading spinner
    } else if (this.mode === 'READY') {
      // Update interactive UI
    } else if (this.mode === 'TRANSITIONING') {
      // Play exit animation
    }
  }
}
```

## Scene Pattern: Command Delegation

Scenes delegate business logic to Command classes:

```typescript
// ❌ BAD: Business logic in scene
export class TitleScreenScene implements Scene {
  async handleStart() {
    const saveGame = await SaveService.loadGame()
    if (saveGame && saveGame.party.inMaze) {
      SceneNavigationService.goTo(SceneType.CAMP)
    } else {
      SceneNavigationService.goTo(SceneType.CASTLE_MENU)
    }
  }
}

// ✅ GOOD: Delegate to command
export class TitleScreenScene implements Scene {
  async handleStart() {
    const result = await StartGameCommand.execute({
      assetsLoaded: this.assetsLoaded,
      saveDataDetected: this.saveDataDetected,
      mode: 'TRANSITIONING'
    })
    // Command handles all business logic and navigation
  }
}
```

**Benefits**:
- Business logic is testable in isolation
- Scenes focus on rendering and user interaction
- Commands can be reused or composed
- Clear separation of concerns

## Scene Pattern: Input Handling

Scenes register input handlers in `enter()` and clean them up in `destroy()`:

```typescript
export class ExampleScene implements Scene {
  private unsubscribeKeyPress?: () => void

  enter() {
    // Register keyboard handler
    this.unsubscribeKeyPress = InputService.onKeyPress('s', () => {
      this.handleStart()
    })
  }

  destroy() {
    // Clean up
    if (this.unsubscribeKeyPress) {
      this.unsubscribeKeyPress()
    }
  }
}
```

**Important**: Always clean up handlers to prevent memory leaks!

## Scene Pattern: Asset Loading

Scenes load their assets during `init()`:

```typescript
export class ExampleScene implements Scene {
  private backgroundImage?: HTMLImageElement

  async init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    // Register asset
    AssetLoadingService.registerAsset({
      id: 'background_image',
      type: 'image',
      path: 'assets/backgrounds/castle.png',
      priority: 'critical'
    })

    // Wait for asset
    this.backgroundImage = await AssetLoadingService.waitForAsset('background_image')
  }
}
```

## Scene Transition with Data

Scenes can pass data during transitions:

```typescript
// From source scene
SceneNavigationService.goTo(SceneType.COMBAT, {
  encounter: encounterData,
  canFlee: true
})

// In target scene
enter(data?: SceneTransitionData) {
  if (data?.encounter) {
    this.setupCombat(data.encounter)
  }
}
```

## Testing Scenes

Scenes have two levels of testing:

### Unit Tests
Test scene behavior in isolation:

```typescript
// tests/scenes/title-screen-scene/TitleScreenScene.test.ts
describe('TitleScreenScene', () => {
  it('should initialize with LOADING state', async () => {
    const scene = new TitleScreenScene()
    await scene.init(canvas, ctx)
    expect(scene.mode).toBe('LOADING')
  })
})
```

### Integration Tests
Test scene transitions end-to-end:

```typescript
// tests/integration/TitleScreenFlow.test.ts
it('should complete full flow from title screen to castle menu', async () => {
  sceneManager = new SceneManager(canvas, ctx)
  await sceneManager.init()

  // Verify on title screen
  expect(SceneNavigationService.getCurrentScene()).toBe(SceneType.TITLE_SCREEN)

  // Trigger start
  await titleScene.handleStart()

  // Verify navigation occurred
  expect(SceneNavigationService.getCurrentScene()).toBe(SceneType.CASTLE_MENU)
})
```

## Planned Scenes

Based on [UI Scene Specifications](../ui/scenes/):

1. ✅ **Title Screen** (00) - Implemented
2. ⚠️ **Castle Menu** (01) - Placeholder
3. ⚠️ **Training Grounds** (02) - Planned
4. ⚠️ **Gilgamesh's Tavern** (03) - Planned
5. ⚠️ **Boltac's Trading Post** (04) - Planned
6. ⚠️ **Temple of Cant** (05) - Planned
7. ⚠️ **Adventurer's Inn** (06) - Planned
8. ⚠️ **Edge of Town** (07) - Planned
9. ⚠️ **Utilities Menu** (08) - Planned
10. ⚠️ **Camp** (09) - Placeholder
11. ⚠️ **Maze** (10) - Planned
12. ⚠️ **Combat** (11) - Planned
13. ⚠️ **Chest** (12) - Planned
14. ⚠️ **Character Inspection** (13) - Planned

## Best Practices

### DO:
- ✅ Keep scenes focused on rendering and user interaction
- ✅ Delegate business logic to Commands
- ✅ Always clean up event handlers in destroy()
- ✅ Use state machines for complex scene behavior
- ✅ Load assets during init(), not in constructor
- ✅ Test scenes both in isolation and integration

### DON'T:
- ❌ Put business logic directly in scenes
- ❌ Forget to unsubscribe from event handlers
- ❌ Load assets synchronously
- ❌ Mutate shared global state
- ❌ Couple scenes together (use SceneNavigationService)
- ❌ Test private methods directly

## Related Documentation

- **[SceneManager](../managers/SceneManager.md)** - Scene lifecycle orchestration
- **[SceneNavigationService](../services/SceneNavigationService.md)** - Scene navigation state machine
- **[Architecture](../architecture.md)** - Overall system architecture
- **[UI Scene Specifications](../ui/scenes/)** - Design specs for all scenes
- **[TitleScreenScene Implementation](./title-screen-scene.md)** - Complete example

## Last Updated

2025-10-26
