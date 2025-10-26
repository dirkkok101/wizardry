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

## Building a Scene - Complete Guide

This section provides a step-by-step guide to building a new scene using modern patterns and utilities.

### Step 1: Create Scene File Structure

```bash
src/scenes/my-scene/
  - MyScene.ts           # Scene implementation
  /commands/             # Optional: scene-specific commands
    - MyCommand.ts
```

### Step 2: Define Scene State

```typescript
import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { BUTTON_SIZES } from '../../ui/theme'

type MySceneMode = 'LOADING' | 'READY' | 'TRANSITIONING'

export class MyScene implements Scene {
  readonly type = SceneType.MY_SCENE

  // Canvas references
  private canvas!: HTMLCanvasElement

  // Input management
  private inputManager!: SceneInputManager
  private mouseX = 0
  private mouseY = 0

  // Scene state
  private mode: MySceneMode = 'LOADING'

  // Assets
  private backgroundImage: HTMLImageElement | null = null

  // UI state
  private buttons: ButtonState[] = [
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height,
      text: '(O)PTION 1', key: 'o', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height,
      text: '(P)TION 2', key: 'p', disabled: false, hovered: false }
  ]

  // ... lifecycle methods follow
}
```

### Step 3: Implement init() with Modern Utilities

```typescript
import { AssetLoadingService } from '../../services/AssetLoadingService'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'

async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
  this.canvas = canvas
  this.inputManager = new SceneInputManager()

  // 1. Calculate responsive button layout
  const layouts = LayoutHelpers.calculateHorizontalButtonLayout({
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    buttonCount: this.buttons.length,
    buttonHeight: BUTTON_SIZES.MEDIUM.height,
    bottomMargin: 40,
    sideMargin: 20,
    spacing: 20
  })

  // 2. Apply calculated layouts to buttons
  ButtonStateHelpers.applyLayout(this.buttons, layouts)

  // 3. Load background image (optional)
  try {
    this.backgroundImage = await AssetLoadingService.loadMySceneAssets()
  } catch (error) {
    console.error('Failed to load assets:', error)
  }

  // 4. Register keyboard handlers
  MenuSceneHelpers.registerButtonHandlers(
    this.inputManager,
    this.buttons,
    (key) => this.handleNavigation(key)
  )

  // 5. Register mouse handlers
  MenuSceneHelpers.registerMouseHandlers(
    this.inputManager,
    canvas,
    this.buttons,
    (x, y) => {
      this.mouseX = x
      this.mouseY = y
    },
    (button) => this.handleNavigation(button.key)
  )
}
```

### Step 4: Implement Scene Lifecycle Methods

```typescript
enter(_data?: SceneTransitionData): void {
  this.mode = 'READY'
}

update(_deltaTime: number): void {
  // Update button hover states based on mouse position
  ButtonStateHelpers.updateHoverState(this.buttons, this.mouseX, this.mouseY)
}

render(ctx: CanvasRenderingContext2D): void {
  // 1. Clear screen
  ctx.fillStyle = COLORS.BACKGROUND
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

  // 2. Draw background image (optional)
  if (this.backgroundImage) {
    ImageRenderer.renderBackgroundImage(ctx, {
      image: this.backgroundImage,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      fit: 'contain',
      pixelArt: true
    })
  }

  // 3. Draw buttons
  this.buttons.forEach(button => {
    const state = button.disabled ? 'disabled' : (button.hovered ? 'hover' : 'normal')

    ButtonRenderer.renderButton(ctx, {
      x: button.x,
      y: button.y,
      width: button.width,
      height: button.height,
      text: button.text,
      state,
      showPulse: false
    })
  })
}

destroy(): void {
  this.inputManager?.destroy()
}
```

### Step 5: Implement Business Logic

```typescript
private async handleNavigation(key: string): Promise<void> {
  if (this.mode === 'TRANSITIONING') return

  this.mode = 'TRANSITIONING'

  // Delegate to command
  const result = await MyNavigationCommand.execute({
    mode: this.mode,
    selectedOption: key
  })

  if (!result.success) {
    console.error('Navigation failed:', result.error)
    this.mode = 'READY'
  }
}
```

### Step 6: Write Tests

```typescript
// tests/scenes/my-scene/MyScene.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MyScene } from '../../src/scenes/my-scene/MyScene'
import { SceneType } from '../../src/types/SceneType'

describe('MyScene', () => {
  let scene: MyScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new MyScene()
  })

  afterEach(() => {
    scene.destroy?.()
  })

  it('should have correct scene type', () => {
    expect(scene.type).toBe(SceneType.MY_SCENE)
  })

  it('should initialize canvas and input manager', async () => {
    await scene.init(canvas, ctx)
    expect(scene['canvas']).toBe(canvas)
    expect(scene['inputManager']).toBeDefined()
  })

  it('should have correct number of buttons', async () => {
    await scene.init(canvas, ctx)
    expect(scene['buttons'].length).toBe(2)
  })
})
```

## Available UI Utilities

### ImageRenderer

**Location**: `src/ui/renderers/ImageRenderer.ts`

Handles background image rendering with aspect ratio preservation and pixel art scaling.

```typescript
import { ImageRenderer } from '../../ui/renderers/ImageRenderer'

// Render background image with 'contain' fit (letterboxing)
ImageRenderer.renderBackgroundImage(ctx, {
  image: backgroundImage,
  canvasWidth: canvas.width,
  canvasHeight: canvas.height,
  fit: 'contain',      // or 'cover'
  pixelArt: true       // disables image smoothing
})
```

**Features**:
- Aspect ratio preservation
- 'contain' mode: Letterbox/pillarbox to fit entire image
- 'cover' mode: Fill canvas, crop excess
- Pixel art mode: Nearest-neighbor scaling

### LayoutHelpers

**Location**: `src/ui/utils/LayoutHelpers.ts`

Calculates responsive button layouts for different patterns.

```typescript
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'

// Horizontal button bar (e.g., castle menu)
const layouts = LayoutHelpers.calculateHorizontalButtonLayout({
  canvasWidth: 800,
  canvasHeight: 600,
  buttonCount: 5,
  buttonHeight: 50,
  bottomMargin: 40,
  sideMargin: 20,
  spacing: 20
})

// Vertical button stack (e.g., pause menu)
const layouts = LayoutHelpers.calculateVerticalButtonLayout({
  canvasWidth: 800,
  canvasHeight: 600,
  buttonCount: 4,
  buttonWidth: 200,
  buttonHeight: 50,
  topMargin: 100,
  spacing: 15
})

// Grid layout (e.g., inventory)
const layouts = LayoutHelpers.calculateGridLayout({
  canvasWidth: 800,
  canvasHeight: 600,
  columns: 4,
  rows: 3,
  cellWidth: 100,
  cellHeight: 100,
  spacing: 10,
  marginTop: 50,
  marginLeft: 50
})

// Center a single element
const pos = LayoutHelpers.centerRectangle(
  canvasWidth,
  canvasHeight,
  buttonWidth,
  buttonHeight
)
```

### ButtonStateHelpers

**Location**: `src/ui/utils/ButtonStateHelpers.ts`

Manages button state updates (hover, disabled, etc.).

```typescript
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'

// Update hover states based on mouse position
ButtonStateHelpers.updateHoverState(
  buttons,        // ButtonState | ButtonState[]
  mouseX,
  mouseY
)

// Apply layout positions to buttons
ButtonStateHelpers.applyLayout(buttons, layouts)

// Enable/disable buttons
ButtonStateHelpers.setEnabled(button, true)
ButtonStateHelpers.setEnabledAll(buttons, false)
```

### MenuSceneHelpers

**Location**: `src/ui/utils/MenuSceneHelpers.ts`

Common patterns for menu-based scenes.

```typescript
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'

// Register keyboard shortcuts for all buttons
MenuSceneHelpers.registerButtonHandlers(
  inputManager,
  buttons,
  (key) => handleNavigation(key)
)

// Register mouse move and click handlers
MenuSceneHelpers.registerMouseHandlers(
  inputManager,
  canvas,
  buttons,
  (x, y) => {
    this.mouseX = x
    this.mouseY = y
  },
  (button) => handleNavigation(button.key)
)
```

## Real-World Examples

### Example 1: CastleMenuScene (Menu with Buttons)

**Full implementation**: `src/scenes/castle-menu-scene/CastleMenuScene.ts`

```typescript
export class CastleMenuScene implements Scene {
  readonly type = SceneType.CASTLE_MENU

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: CastleMenuMode = 'READY'
  private mouseX = 0
  private mouseY = 0
  private backgroundImage: HTMLImageElement | null = null

  private buttons: ButtonState[] = [
    { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height,
      text: '(G)TAVERN', key: 'g', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height,
      text: '(T)EMPLE', key: 't', disabled: false, hovered: false },
    // ... more buttons
  ]

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Calculate responsive layout
    const layouts = LayoutHelpers.calculateHorizontalButtonLayout({
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      buttonCount: this.buttons.length,
      buttonHeight: BUTTON_SIZES.SMALL.height,
      bottomMargin: 40,
      sideMargin: 20,
      spacing: 20
    })

    ButtonStateHelpers.applyLayout(this.buttons, layouts)

    // Load assets
    try {
      this.backgroundImage = await AssetLoadingService.loadCastleMenuAssets()
    } catch (error) {
      console.error('Failed to load castle menu background:', error)
    }

    // Register input handlers
    MenuSceneHelpers.registerButtonHandlers(
      this.inputManager,
      this.buttons,
      (key) => this.handleNavigation(key)
    )

    MenuSceneHelpers.registerMouseHandlers(
      this.inputManager,
      canvas,
      this.buttons,
      (x, y) => {
        this.mouseX = x
        this.mouseY = y
      },
      (button) => this.handleNavigation(button.key)
    )
  }

  update(_deltaTime: number): void {
    ButtonStateHelpers.updateHoverState(this.buttons, this.mouseX, this.mouseY)
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.backgroundImage) {
      ImageRenderer.renderBackgroundImage(ctx, {
        image: this.backgroundImage,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        fit: 'contain',
        pixelArt: true
      })
    }

    this.buttons.forEach(button => {
      const state = button.disabled ? 'disabled' : (button.hovered ? 'hover' : 'normal')
      ButtonRenderer.renderButton(ctx, {
        x: button.x,
        y: button.y,
        width: button.width,
        height: button.height,
        text: button.text,
        state,
        showPulse: false,
        fontSize: 16
      })
    })
  }

  private async handleNavigation(key: string): Promise<void> {
    if (this.mode === 'TRANSITIONING') return
    this.mode = 'TRANSITIONING'

    const result = await this.executeNavigationCommand(key)

    if (!result.success) {
      console.error('Navigation failed:', result.error)
      this.mode = 'READY'
    }
  }
}
```

### Example 2: TitleScreenScene (Single Button with Animation)

**Full implementation**: `src/scenes/title-screen-scene/TitleScreenScene.ts`

```typescript
export class TitleScreenScene implements Scene {
  readonly type = SceneType.TITLE_SCREEN

  private canvas!: HTMLCanvasElement
  private mode: TitleScreenMode = 'LOADING'
  private assetsLoaded = false
  private titleBitmap: HTMLImageElement | null = null
  private button: ButtonState = {
    x: 0,
    y: 0,
    width: BUTTON_SIZES.LARGE.width,
    height: BUTTON_SIZES.LARGE.height,
    text: 'Loading...',
    key: 's',
    disabled: true,
    hovered: false
  }

  private inputManager!: SceneInputManager
  private mouseX = 0
  private mouseY = 0
  private pulseTime = 0

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas

    // Center button using LayoutHelpers
    const pos = LayoutHelpers.centerRectangle(
      canvas.width,
      canvas.height,
      this.button.width,
      this.button.height
    )
    this.button.x = pos.x
    this.button.y = pos.y

    this.setupInputHandlers()
    await this.loadAssets()
  }

  private setupInputHandlers(): void {
    this.inputManager = new SceneInputManager()

    // Keyboard handler for single button
    this.inputManager.onKeyPress('s', () => {
      this.handleStart()
    })

    // Mouse handlers for single button
    this.inputManager.onMouseMove(this.canvas, (x, y) => {
      this.mouseX = x
      this.mouseY = y
    })

    this.inputManager.onMouseClick(this.canvas, (x, y) => {
      if (ButtonRenderer.isPointInButton(x, y, this.button) && !this.button.disabled) {
        this.handleStart()
      }
    })
  }

  update(deltaTime: number): void {
    this.pulseTime += deltaTime

    // Update single button hover state
    ButtonStateHelpers.updateHoverState(this.button, this.mouseX, this.mouseY)
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.titleBitmap) {
      ImageRenderer.renderBackgroundImage(ctx, {
        image: this.titleBitmap,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        fit: 'contain',
        pixelArt: true
      })
    }

    // Render button with pulse animation
    const state = this.button.disabled ? 'disabled' :
                  (this.button.hovered ? 'hover' : 'normal')

    ButtonRenderer.renderButton(ctx, {
      x: this.button.x,
      y: this.button.y,
      width: this.button.width,
      height: this.button.height,
      text: this.button.text,
      state,
      showPulse: this.mode === 'READY' && !this.button.disabled,
      pulseTime: this.pulseTime
    })
  }
}
```

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

### Modern Pattern: SceneInputManager

```typescript
import { SceneInputManager } from '../../ui/managers/InputManager'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'

export class ExampleScene implements Scene {
  private inputManager!: SceneInputManager

  async init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.inputManager = new SceneInputManager()

    // For menu scenes with buttons
    MenuSceneHelpers.registerButtonHandlers(
      this.inputManager,
      this.buttons,
      (key) => this.handleAction(key)
    )

    MenuSceneHelpers.registerMouseHandlers(
      this.inputManager,
      canvas,
      this.buttons,
      (x, y) => { this.mouseX = x; this.mouseY = y },
      (button) => this.handleAction(button.key)
    )
  }

  destroy() {
    // Automatically cleans up all handlers
    this.inputManager?.destroy()
  }
}
```

### Alternative Pattern: Manual Handler Registration

For scenes with custom input needs (not button-based):

```typescript
export class CustomScene implements Scene {
  private inputManager!: SceneInputManager

  async init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.inputManager = new SceneInputManager()

    // Register individual key handlers
    this.inputManager.onKeyPress('w', () => this.moveUp())
    this.inputManager.onKeyPress('a', () => this.moveLeft())
    this.inputManager.onKeyPress('s', () => this.moveDown())
    this.inputManager.onKeyPress('d', () => this.moveRight())

    // Register mouse handlers
    this.inputManager.onMouseMove(canvas, (x, y) => {
      this.mouseX = x
      this.mouseY = y
    })

    this.inputManager.onMouseClick(canvas, (x, y) => {
      this.handleClick(x, y)
    })
  }

  destroy() {
    this.inputManager?.destroy()
  }
}
```

**Benefits of SceneInputManager**:
- ✅ Automatic cleanup on destroy()
- ✅ No manual unsubscribe needed
- ✅ Centralized input management per scene
- ✅ Works with MenuSceneHelpers for common patterns

**Important**: Always call `inputManager.destroy()` to prevent memory leaks!

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
