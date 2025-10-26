# TitleScreenScene Implementation

**Location**: `src/scenes/title-screen-scene/TitleScreenScene.ts:53`

**Purpose**: The game's entry point, displaying the title bitmap with a start button that detects save data and navigates appropriately.

**Status**: ✅ Fully implemented with 75 passing tests

---

## Overview

The TitleScreenScene is the first scene players encounter. It demonstrates the complete scene pattern with:
- Progressive asset loading
- Input handling (mouse + keyboard)
- State machine (LOADING → READY → TRANSITIONING)
- Command delegation (StartGameCommand)
- Canvas rendering with animations
- Proper resource cleanup

## Scene State Machine

```
LOADING
   │
   │ Assets loaded & game ready
   ↓
READY ←─────────┐
   │            │
   │ User       │ Error or
   │ clicks/    │ command failure
   │ presses S  │
   ↓            │
TRANSITIONING ──┘
   │
   │ StartGameCommand
   │ navigates to next scene
   ↓
(Scene destroyed)
```

## File Structure

```
/src/scenes/title-screen-scene/
  - TitleScreenScene.ts          # Scene implementation (this file)
  /commands/
    - StartGameCommand.ts         # Start game business logic

/tests/scenes/title-screen-scene/
  - TitleScreenScene.test.ts     # Unit tests (22 tests)
  /commands/
    - StartGameCommand.test.ts   # Command tests (9 tests)

/tests/integration/
  - TitleScreenFlow.test.ts      # Integration tests (3 tests)
```

## Key Features

### 1. Progressive Asset Loading

**Two-Phase Loading Strategy**:

```typescript
// Phase 1: Critical assets (blocks scene initialization)
const assets = await AssetLoadingService.loadTitleAssets()
this.titleBitmap = assets.titleBitmap  // 280x140 bitmap

// Phase 2: Game assets (loads in background)
AssetLoadingService.onLoadComplete(() => {
  this.mode = 'READY'
  // Enable button
})
AssetLoadingService.loadGameAssets()
```

**Why Two Phases?**
- Title bitmap loads fast (~10ms), scene becomes interactive quickly
- Game assets load in background while player sees title
- Better perceived performance than blocking on all assets

### 2. State Management

**Three States**:

1. **LOADING** - Assets loading, button shows "Loading..."
2. **READY** - Assets loaded, button shows "(S)TART"
3. **TRANSITIONING** - Start command executing, button disabled

**State Guards**:
```typescript
private async handleStart(): Promise<void> {
  if (!this.assetsLoaded || this.mode === 'TRANSITIONING') return
  this.mode = 'TRANSITIONING'
  // ... execute command
}
```

### 3. Input Handling

**Keyboard Input**:
```typescript
// Registered when assets loaded
this.unsubscribeKeyPress = InputService.onKeyPress('s', () => {
  this.handleStart()
})
```

**Mouse Input**:
```typescript
// Setup in init()
this.canvas.addEventListener('mousemove', this.mouseMoveHandler)
this.canvas.addEventListener('click', this.mouseClickHandler)
```

**Coordinate Transformation**:
```typescript
// Convert screen coords to canvas coords (handles scaling)
private screenToCanvasCoordinates(e: MouseEvent) {
  const rect = this.canvas.getBoundingClientRect()
  const scaleX = this.canvas.width / rect.width
  const scaleY = this.canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}
```

### 4. Button Implementation

**ButtonState Interface**:
```typescript
interface ButtonState {
  x: number        // Canvas x position
  y: number        // Canvas y position
  width: number    // 250px
  height: number   // 60px
  text: string     // "Loading..." | "(S)TART"
  disabled: boolean
  hovered: boolean
}
```

**Button States**:
- **Disabled**: Semi-transparent, faded text, no pulse
- **Normal**: Dark background, white border
- **Hovered**: Lighter background
- **Ready**: Animated pulse effect

**Pulse Animation**:
```typescript
// Sin wave for smooth pulsing
const pulseAlpha = 0.3 + 0.2 * Math.sin(this.pulseTime / 500)
const pulseSize = 5 + 10 * Math.sin(this.pulseTime / 500)

ctx.strokeRect(
  x - pulseSize/2,
  y - pulseSize/2,
  width + pulseSize,
  height + pulseSize
)
```

### 5. Command Delegation

**Business logic delegated to StartGameCommand**:

```typescript
private async handleStart(): Promise<void> {
  const result = await StartGameCommand.execute({
    assetsLoaded: this.assetsLoaded,
    saveDataDetected: this.saveDataDetected,
    mode: this.mode
  })

  if (!result.success) {
    // Handle error, re-enable button
  }
}
```

**StartGameCommand responsibilities**:
- Check for save data
- Load game or create new game
- Determine next scene (CASTLE_MENU or CAMP)
- Trigger scene navigation

See [StartGameCommand Documentation](./commands/StartGameCommand.md)

### 6. Rendering

**Render Pipeline**:

```
1. Clear screen (black)
      ↓
2. Draw title bitmap (scaled, centered)
      ↓
3. Draw button overlay
   - Semi-transparent background
   - Border
   - Pulse effect (if ready)
   - Button text
```

**Title Bitmap Scaling**:
```typescript
// Aspect ratio preserving scaling (CSS object-fit: contain)
const canvasAspect = canvas.width / canvas.height
const imageAspect = image.width / image.height

if (imageAspect > canvasAspect) {
  // Image wider than canvas - fit to width
  width = canvas.width
  height = width / imageAspect
} else {
  // Image taller than canvas - fit to height
  height = canvas.height
  width = height * imageAspect
}

// Center image
x = (canvas.width - width) / 2
y = (canvas.height - height) / 2
```

**Pixel-Perfect Rendering**:
```typescript
// Disable image smoothing for crisp pixel art
ctx.imageSmoothingEnabled = false
ctx.drawImage(titleBitmap, x, y, width, height)
```

## API Reference

### Constructor

```typescript
constructor()
```

No parameters. All initialization happens in `init()`.

### Lifecycle Methods

#### `init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void>`

**Called by**: SceneManager during scene creation

**Actions**:
1. Store canvas reference
2. Calculate button position (centered)
3. Setup mouse tracking
4. Load assets (async)

#### `enter(data?: SceneTransitionData): void`

**Called by**: SceneManager after init()

**Actions**:
1. Reset pulse animation time

#### `update(deltaTime: number): void`

**Called by**: SceneManager every frame (~60fps)

**Actions**:
1. Update pulse time for animation
2. Check button hover state from mouse position

#### `render(ctx: CanvasRenderingContext2D): void`

**Called by**: SceneManager every frame after update()

**Actions**:
1. Clear canvas
2. Draw title bitmap
3. Draw button with effects

#### `destroy(): void`

**Called by**: SceneManager before transitioning to new scene

**Actions**:
1. Unsubscribe keyboard handler
2. Remove mouse event listeners
3. Clear references

## Constants

### UI Constants

```typescript
const BUTTON = {
  WIDTH: 250,
  HEIGHT: 60,
  FONT_SIZE: 28,
  FONT: 'bold 28px monospace',
  BORDER_WIDTH: 3,
  PULSE_BORDER_WIDTH: 2
}
```

### Color Palette

```typescript
const COLORS = {
  BUTTON_DISABLED_BG: 'rgba(0, 0, 0, 0.6)',
  BUTTON_HOVER_BG: 'rgba(40, 40, 40, 0.8)',
  BUTTON_NORMAL_BG: 'rgba(0, 0, 0, 0.7)',
  BUTTON_BORDER_DISABLED: 'rgba(255, 255, 255, 0.3)',
  BUTTON_BORDER_READY: 'rgba(255, 255, 255, 0.9)',
  BUTTON_TEXT_DISABLED: 'rgba(255, 255, 255, 0.4)',
  BUTTON_TEXT_ENABLED: 'rgba(255, 255, 255, 1)'
}
```

### Animation Constants

```typescript
const PULSE = {
  BASE_ALPHA: 0.3,          // Minimum opacity
  ALPHA_VARIATION: 0.2,     // Opacity range
  BASE_SIZE: 5,             // Minimum border expansion
  SIZE_VARIATION: 10,       // Border expansion range
  PERIOD: 500               // Animation period (ms)
}
```

## Scene Flow Diagrams

### Load Flow

```
User opens game
      ↓
SceneManager.init()
      ↓
TitleScreenScene created
      ↓
TitleScreenScene.init()
      ├─→ Load title bitmap (Phase 1)
      │   └─→ Display title + "Loading..."
      └─→ Load game assets (Phase 2, background)
          └─→ When complete:
              - Button enabled
              - Text: "(S)TART"
              - Register keyboard handler
```

### Start Flow

```
User clicks button or presses 'S'
      ↓
handleStart() called
      ├─→ Guard: check assets loaded & not transitioning
      ↓
Set mode = TRANSITIONING
      ↓
StartGameCommand.execute()
      ├─→ Check save data exists
      │
      ├─ No save data
      │  └─→ Create new game
      │      └─→ Navigate to CASTLE_MENU
      │
      └─ Save data exists
         ├─ Party in maze
         │  └─→ Load game
         │      └─→ Navigate to CAMP
         └─ Party in castle
            └─→ Load game
                └─→ Navigate to CASTLE_MENU
```

## Testing

### Unit Tests (`tests/scenes/title-screen-scene/TitleScreenScene.test.ts`)

**22 tests covering**:
- Initialization in LOADING state
- Asset loading lifecycle
- State transitions (LOADING → READY)
- Button state management
- Input handling (keyboard + mouse)
- Hover detection
- Start command execution
- Double-click prevention
- Error handling
- Cleanup on destroy

**Example test**:
```typescript
it('should transition to READY state after assets load', async () => {
  await scene.init(canvas, ctx)

  await waitFor(() => (scene as any).mode === 'READY')

  expect((scene as any).mode).toBe('READY')
  expect((scene as any).assetsLoaded).toBe(true)
  expect((scene as any).button.disabled).toBe(false)
  expect((scene as any).button.text).toBe('(S)TART')
})
```

### Command Tests (`tests/scenes/title-screen-scene/commands/StartGameCommand.test.ts`)

**9 tests covering**:
- New game creation
- Save game loading
- Corrupted save handling
- Scene navigation (Castle vs Camp)
- Validation (assets not loaded)

### Integration Tests (`tests/integration/TitleScreenFlow.test.ts`)

**3 end-to-end tests**:
1. **New Game Flow**: Title → Castle Menu
2. **Load Game (In Maze)**: Title → Camp
3. **Corrupted Save**: Title → Castle Menu (new game)

**Example integration test**:
```typescript
it('should complete full flow from title screen to castle menu', async () => {
  sceneManager = new SceneManager(canvas, ctx)
  await sceneManager.init()

  // 1. Verify on title screen
  expect(SceneNavigationService.getCurrentScene()).toBe(SceneType.TITLE_SCREEN)

  // 2. Wait for assets
  await waitFor(() => AssetLoadingService.isAssetLoaded('title_bitmap'))

  // 3. Trigger start
  await titleScene.handleStart()

  // 4. Wait for transition
  await waitFor(() => SceneNavigationService.getCurrentScene() === SceneType.CASTLE_MENU)

  // 5. Verify navigation
  expect(SceneNavigationService.getCurrentScene()).toBe(SceneType.CASTLE_MENU)
})
```

**Test Coverage**: 75 tests passing across all test files

## Dependencies

**Services**:
- `AssetLoadingService` - Asset management (`src/services/AssetLoadingService.ts:1`)
- `InputService` - Input handling (`src/services/InputService.ts:1`)
- `SaveService` - Save game detection (`src/services/SaveService.ts:1`)
- `SceneNavigationService` - Scene transitions (via StartGameCommand)

**Commands**:
- `StartGameCommand` - Start game business logic (`src/scenes/title-screen-scene/commands/StartGameCommand.ts:1`)

**Types**:
- `Scene` interface (`src/scenes/Scene.ts:8`)
- `SceneType` enum (`src/types/SceneType.ts:1`)
- `SceneTransitionData` type (`src/services/SceneNavigationService.ts:1`)

## Performance Considerations

### Asset Loading
- Title bitmap: ~10ms load time (small, critical path)
- Game assets: Load in background, non-blocking

### Rendering
- 60fps target
- Minimal draw calls per frame (2-3)
- No alpha blending except button overlay
- Image smoothing disabled (faster)

### Memory
- Single bitmap cached (280x140)
- Event handlers properly cleaned up
- No memory leaks detected in tests

## Error Handling

### Asset Loading Errors
```typescript
try {
  const assets = await AssetLoadingService.loadTitleAssets()
} catch (error) {
  console.error('Failed to load assets:', error)
  this.button.text = 'Error Loading'
}
```

### Command Execution Errors
```typescript
const result = await StartGameCommand.execute(...)
if (!result.success) {
  console.error('Failed to start game:', result.error)
  this.mode = 'READY'        // Reset state
  this.button.disabled = false // Re-enable button
}
```

## Future Enhancements

**Planned improvements** (not yet implemented):
- Extract Button component to `/components/Button.ts`
- Add fade-in transition animation
- Add audio (title music, button click sound)
- Add "Continue" text if save detected
- Add version number display

## Related Documentation

- **[Scene Architecture](./README.md)** - Scene patterns and lifecycle
- **[StartGameCommand](./commands/StartGameCommand.md)** - Start game business logic
- **[SceneManager](../managers/SceneManager.md)** - Scene orchestration
- **[AssetLoadingService](../services/AssetLoadingService.md)** - Asset management
- **[InputService](../services/InputService.md)** - Input handling
- **[UI Specification](../ui/scenes/00-title-screen.md)** - Original design spec

## Last Updated

2025-10-26
