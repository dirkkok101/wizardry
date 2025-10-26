# InputService

**Pure function service for handling keyboard, mouse, and touch input across all game scenes.**

## Responsibility

Provides centralized input handling for keyboard shortcuts, mouse clicks, and touch events. Manages input state, handles key bindings, and ensures consistent input behavior across all game scenes.

## Overview

The InputService abstracts away platform-specific input handling (keyboard vs mouse vs touch) and provides a unified API for responding to user input. It handles common scenarios like:

- Single keystroke prompts ("Press S to START")
- Keyboard shortcuts (Q for quit, I for inventory)
- Button click handlers
- Touch/tap support for mobile
- Input enabling/disabling (during transitions, loading)

**Key Features:**
- Cross-platform input (keyboard, mouse, touch)
- Key binding management
- Input state tracking
- Event delegation
- Case-insensitive key matching
- Input enable/disable for scenes

## API Reference

### waitForSingleKeystroke

Wait for user to press a single key, optionally from a specific set.

**Signature:**
```typescript
function waitForSingleKeystroke(
  validKeys?: string[]
): Promise<string>
```

**Parameters:**
- `validKeys`: Optional array of acceptable keys (case-insensitive)

**Returns:** Promise resolving to the pressed key (lowercase)

**Example:**
```typescript
// Wait for any key
const key = await InputService.waitForSingleKeystroke()
console.log('User pressed:', key)

// Wait for specific keys only
const choice = await InputService.waitForSingleKeystroke(['Y', 'N'])
if (choice === 'y') {
  console.log('User confirmed')
}

// Wait for menu options
const menuChoice = await InputService.waitForSingleKeystroke([
  'T', 'M', 'I', 'S', 'E', 'L'
])
// menuChoice = 't', 'm', 'i', 's', 'e', or 'l'
```

### onKeyPress

Register a handler for specific key press.

**Signature:**
```typescript
function onKeyPress(
  key: string,
  handler: KeyHandler,
  options?: KeyOptions
): UnsubscribeFn
```

**Parameters:**
- `key`: Key to listen for (e.g., 'S', 'Enter', 'Escape')
- `handler`: Callback function when key is pressed
- `options`: Optional configuration

**Returns:** Function to unsubscribe/remove handler

**Example:**
```typescript
// Simple key handler
const unsubscribe = InputService.onKeyPress('S', () => {
  console.log('S key pressed')
  handleStartGame()
})

// Case-sensitive handler
InputService.onKeyPress('Q', () => {
  confirmQuit()
}, { caseSensitive: true })

// Handler with event details
InputService.onKeyPress('I', (event) => {
  console.log('Opening inventory')
  event.preventDefault()
  openInventory()
})

// Later: remove handler
unsubscribe()
```

### onButtonClick

Register click handler for a button element.

**Signature:**
```typescript
function onButtonClick(
  elementId: string,
  handler: ClickHandler
): UnsubscribeFn
```

**Parameters:**
- `elementId`: DOM element ID to attach handler to
- `handler`: Callback function when button is clicked

**Returns:** Function to unsubscribe/remove handler

**Example:**
```typescript
// Button click handler
const unsubscribe = InputService.onButtonClick('start-button', () => {
  console.log('Start button clicked')
  handleStartGame()
})

// With event details
InputService.onButtonClick('save-button', (event) => {
  event.preventDefault()
  saveGame()
})

// Cleanup
unsubscribe()
```

### offKeyPress

Remove a key press handler.

**Signature:**
```typescript
function offKeyPress(key: string): void
```

**Parameters:**
- `key`: Key to remove handler for

**Example:**
```typescript
// Register handler
InputService.onKeyPress('S', startGameHandler)

// Later: remove handler
InputService.offKeyPress('S')
```

### isKeyPressed

Check if a specific key is currently pressed.

**Signature:**
```typescript
function isKeyPressed(key: string): boolean
```

**Parameters:**
- `key`: Key to check

**Returns:** True if key is currently pressed, false otherwise

**Example:**
```typescript
// Check if Shift is held
if (InputService.isKeyPressed('Shift')) {
  console.log('Shift is being held down')
}

// Check for key combinations
if (
  InputService.isKeyPressed('Control') &&
  InputService.isKeyPressed('S')
) {
  quickSave()
}
```

### setInputEnabled

Enable or disable all input handling.

**Signature:**
```typescript
function setInputEnabled(enabled: boolean): void
```

**Parameters:**
- `enabled`: True to enable input, false to disable

**Example:**
```typescript
// Disable input during scene transition
InputService.setInputEnabled(false)
await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)
InputService.setInputEnabled(true)

// Disable input during loading
InputService.setInputEnabled(false)
await AssetLoadingService.loadGameAssets()
InputService.setInputEnabled(true)
```

### getInputState

Get current input state.

**Signature:**
```typescript
function getInputState(): InputState
```

**Returns:** Current input state object

**Example:**
```typescript
const state = InputService.getInputState()
console.log('Input enabled:', state.enabled)
console.log('Active handlers:', state.keyHandlers.size)
console.log('Pressed keys:', state.pressedKeys)
```

### clearAllHandlers

Remove all registered input handlers.

**Signature:**
```typescript
function clearAllHandlers(): void
```

**Example:**
```typescript
// Clean up when leaving a scene
SceneNavigationService.onSceneExit(SceneType.CASTLE_MENU, () => {
  InputService.clearAllHandlers()
})
```

### registerKeyBinding

Register a named key binding for reuse.

**Signature:**
```typescript
function registerKeyBinding(
  name: string,
  key: string,
  handler: KeyHandler,
  options?: KeyOptions
): void
```

**Parameters:**
- `name`: Binding name for later reference
- `key`: Key to bind
- `handler`: Handler function
- `options`: Optional configuration

**Example:**
```typescript
// Register common bindings
InputService.registerKeyBinding('quit', 'Q', () => {
  confirmQuit()
})

InputService.registerKeyBinding('inventory', 'I', () => {
  openInventory()
})

InputService.registerKeyBinding('save', 'F5', () => {
  quickSave()
}, { preventDefault: true })
```

### unregisterKeyBinding

Remove a named key binding.

**Signature:**
```typescript
function unregisterKeyBinding(name: string): void
```

**Parameters:**
- `name`: Binding name to remove

**Example:**
```typescript
// Remove binding
InputService.unregisterKeyBinding('quit')
```

### enableKeyBinding

Enable a registered key binding.

**Signature:**
```typescript
function enableKeyBinding(name: string): void
```

**Parameters:**
- `name`: Binding name to enable

**Example:**
```typescript
// Enable inventory key when entering castle
InputService.enableKeyBinding('inventory')
```

### disableKeyBinding

Disable a registered key binding without removing it.

**Signature:**
```typescript
function disableKeyBinding(name: string): void
```

**Parameters:**
- `name`: Binding name to disable

**Example:**
```typescript
// Disable save key during combat
InputService.disableKeyBinding('save')
```

## Data Structures

### KeyHandler

Callback function for key press events.

```typescript
type KeyHandler = (event?: KeyboardEvent) => void
```

### ClickHandler

Callback function for click events.

```typescript
type ClickHandler = (event?: MouseEvent) => void
```

### KeyOptions

Configuration options for key handlers.

```typescript
interface KeyOptions {
  // Case-sensitive key matching
  caseSensitive?: boolean // Default: false

  // Call preventDefault on event
  preventDefault?: boolean // Default: true

  // Require element to have focus
  requireFocus?: boolean // Default: true

  // Allow when input is disabled
  alwaysActive?: boolean // Default: false
}
```

### InputState

Current state of input system.

```typescript
interface InputState {
  // Is input currently enabled?
  enabled: boolean

  // Currently pressed keys (Set of lowercase keys)
  pressedKeys: Set<string>

  // Registered key handlers
  keyHandlers: Map<string, KeyHandler[]>

  // Registered click handlers
  clickHandlers: Map<string, ClickHandler>

  // Named key bindings
  bindings: Map<string, KeyBinding>
}
```

### KeyBinding

Named key binding configuration.

```typescript
interface KeyBinding {
  name: string
  key: string
  handler: KeyHandler
  options: KeyOptions
  enabled: boolean
}
```

### UnsubscribeFn

Function to remove an event handler.

```typescript
type UnsubscribeFn = () => void
```

## Input Handling Patterns

### Single Keystroke Pattern

Used for menus and simple prompts:

```typescript
// Title screen: wait for S key
async function titleScreenLoop() {
  displayTitleScreen()

  const key = await InputService.waitForSingleKeystroke(['S'])
  if (key === 's') {
    await startGame()
  }
}
```

### Multi-Key Handler Pattern

Used for complex scenes with multiple shortcuts:

```typescript
// Castle menu with multiple options
function setupCastleMenuInput() {
  InputService.onKeyPress('T', () => gotoTrainingGrounds())
  InputService.onKeyPress('M', () => gotoTavern())
  InputService.onKeyPress('I', () => gotoInn())
  InputService.onKeyPress('S', () => gotoShop())
  InputService.onKeyPress('E', () => gotoEdgeOfTown())
  InputService.onKeyPress('L', () => confirmLeave())
}

// Cleanup when leaving scene
function cleanupCastleMenuInput() {
  InputService.clearAllHandlers()
}
```

### Button + Keyboard Pattern

Support both mouse and keyboard:

```typescript
// Start button (both S key and click)
function setupStartButton() {
  // Keyboard handler
  InputService.onKeyPress('S', () => {
    if (assetsLoaded) {
      handleStartGame()
    }
  })

  // Mouse/touch handler
  InputService.onButtonClick('start-button', () => {
    if (assetsLoaded) {
      handleStartGame()
    }
  })
}
```

### Named Binding Pattern

Reusable bindings across scenes:

```typescript
// Register global bindings once
function registerGlobalBindings() {
  InputService.registerKeyBinding('help', 'F1', showHelp)
  InputService.registerKeyBinding('quicksave', 'F5', quickSave)
  InputService.registerKeyBinding('quickload', 'F9', quickLoad)
}

// Enable/disable in specific scenes
function enterCombat() {
  // Can't save during combat
  InputService.disableKeyBinding('quicksave')
}

function exitCombat() {
  // Re-enable saving
  InputService.enableKeyBinding('quicksave')
}
```

## Platform Considerations

### Keyboard

Standard keyboard key names:

```typescript
// Letters
'A', 'B', 'C', ..., 'Z'

// Numbers
'0', '1', '2', ..., '9'

// Special keys
'Enter', 'Escape', 'Space', 'Tab'
'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
'F1', 'F2', ..., 'F12'
'Control', 'Shift', 'Alt'
'Backspace', 'Delete'
```

**Case Insensitivity (default):**
```typescript
// Both 'S' and 's' trigger handler
InputService.onKeyPress('S', handler)
// User can press either Shift+S or just s
```

**Case Sensitivity (optional):**
```typescript
// Only exact key match
InputService.onKeyPress('S', handler, { caseSensitive: true })
// User must press Shift+S
```

### Mouse

Click handling for buttons and interactive elements:

```typescript
// Left click on button
InputService.onButtonClick('my-button', (event) => {
  console.log('Clicked at', event.clientX, event.clientY)
})
```

**Click vs Double-Click:**
- Service handles single clicks only
- Double-click detection can be added if needed

### Touch

Touch events mapped to click events:

```typescript
// Works for both mouse click and touch tap
InputService.onButtonClick('start-button', handleStart)
// Mobile users can tap, desktop users can click
```

**Touch Considerations:**
- Minimum touch target: 44x44 CSS pixels
- No hover state (use active/pressed state)
- Touch delay: ~300ms on some devices (can disable)

## Input State Management

### Enable/Disable Input

Disable input during transitions or loading:

```typescript
// Scene transition
async function transitionToNextScene() {
  InputService.setInputEnabled(false) // Block input
  await SceneNavigationService.transitionTo(SceneType.CAMP)
  InputService.setInputEnabled(true)  // Re-enable input
}

// Loading state
async function loadAssets() {
  InputService.setInputEnabled(false) // Block input
  await AssetLoadingService.loadGameAssets()
  InputService.setInputEnabled(true)  // Re-enable input
}
```

### Key State Tracking

Track which keys are currently pressed:

```typescript
// Check for key combinations
document.addEventListener('keydown', (event) => {
  if (
    InputService.isKeyPressed('Control') &&
    event.key === 'Z'
  ) {
    undo()
  }
})
```

### Input Modes

Different input handling for different scenes:

```typescript
// Dungeon navigation: directional keys
function enterDungeon() {
  InputService.onKeyPress('ArrowUp', moveForward)
  InputService.onKeyPress('ArrowLeft', turnLeft)
  InputService.onKeyPress('ArrowRight', turnRight)
}

// Combat: action keys
function enterCombat() {
  InputService.clearAllHandlers()
  InputService.onKeyPress('A', attack)
  InputService.onKeyPress('C', castSpell)
  InputService.onKeyPress('F', flee)
}
```

## Error Handling

### Invalid Keys

Service handles invalid key names gracefully:

```typescript
// Invalid key name
InputService.onKeyPress('InvalidKey', handler)
// Handler will never fire, but no error thrown
// Warning logged to console
```

### Missing Elements

Button handlers for non-existent elements:

```typescript
// Element doesn't exist
InputService.onButtonClick('nonexistent-button', handler)
// Error logged, handler not registered
```

### Duplicate Handlers

Multiple handlers for same key:

```typescript
// First handler
InputService.onKeyPress('S', handler1)

// Second handler (both will fire)
InputService.onKeyPress('S', handler2)

// Both handler1 and handler2 called when S pressed
```

## Performance Considerations

### Event Delegation

Service uses event delegation for efficiency:

```typescript
// Single global listener instead of per-element
document.addEventListener('keydown', handleKeyDown)

// Dispatch to registered handlers
function handleKeyDown(event) {
  const key = event.key.toLowerCase()
  const handlers = keyHandlers.get(key) || []
  handlers.forEach(handler => handler(event))
}
```

### Handler Cleanup

Always clean up handlers when leaving scenes:

```typescript
// Register cleanup
SceneNavigationService.onSceneExit(SceneType.CASTLE_MENU, () => {
  InputService.clearAllHandlers()
})

// Or use unsubscribe functions
const unsubscribe = InputService.onKeyPress('S', handler)
// Later:
unsubscribe()
```

### Memory Leaks

Prevent memory leaks by removing handlers:

```typescript
// ❌ Bad: handlers never removed
function myComponent() {
  InputService.onKeyPress('S', handler)
  // Component destroyed, handler still registered
}

// ✅ Good: handlers cleaned up
function myComponent() {
  const cleanup = InputService.onKeyPress('S', handler)

  // On component unmount
  return () => cleanup()
}
```

## Dependencies

Uses:
- Browser DOM Events API (keyboard, mouse, touch)

Used by:
- Title Screen (S key handler)
- All scene components (keyboard shortcuts)
- StartGameCommand (triggered by input)
- All command implementations (user input)

## Testing

See [InputService.test.ts](../../tests/services/InputService.test.ts)

**Key test cases:**
- onKeyPress registers handler correctly
- onKeyPress fires on key press
- Case-insensitive matching works
- Case-sensitive matching works
- onButtonClick registers handler correctly
- onButtonClick fires on click
- isKeyPressed returns correct state
- setInputEnabled disables input
- setInputEnabled re-enables input
- clearAllHandlers removes all handlers
- waitForSingleKeystroke resolves on key press
- waitForSingleKeystroke filters valid keys
- Named bindings can be enabled/disabled
- Touch events trigger click handlers

## Usage Examples

### Title Screen

```typescript
// Title screen with S key and click
function TitleScreen() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Wait for assets
    AssetLoadingService.onLoadComplete(() => {
      setReady(true)

      // Enable input when ready
      InputService.onKeyPress('S', handleStart)
      InputService.onButtonClick('start-button', handleStart)
    })

    return () => {
      // Cleanup
      InputService.clearAllHandlers()
    }
  }, [])

  const handleStart = () => {
    if (ready) {
      startGame()
    }
  }

  return (
    <div>
      <img src="title.png" />
      <button
        id="start-button"
        disabled={!ready}
      >
        {ready ? '(S)TART' : 'Loading...'}
      </button>
    </div>
  )
}
```

### Castle Menu

```typescript
// Castle menu with multiple options
function CastleMenu() {
  useEffect(() => {
    // Register all menu shortcuts
    const handlers = [
      InputService.onKeyPress('T', gotoTrainingGrounds),
      InputService.onKeyPress('M', gotoTavern),
      InputService.onKeyPress('I', gotoInn),
      InputService.onKeyPress('S', gotoShop),
      InputService.onKeyPress('E', gotoEdgeOfTown)
    ]

    // Cleanup all handlers
    return () => handlers.forEach(unsub => unsub())
  }, [])

  return (
    <div>
      <h1>Castle Menu</h1>
      <button onClick={gotoTrainingGrounds}>(T)raining Grounds</button>
      <button onClick={gotoTavern}>Taver(n)</button>
      <button onClick={gotoInn}>(I)nn</button>
      <button onClick={gotoShop}>(S)hop</button>
      <button onClick={gotoEdgeOfTown}>(E)dge of Town</button>
    </div>
  )
}
```

### Combat Input

```typescript
// Combat scene with action keys
function CombatScene() {
  useEffect(() => {
    // Combat-specific input
    const handlers = [
      InputService.onKeyPress('A', attack),
      InputService.onKeyPress('C', castSpell),
      InputService.onKeyPress('D', defend),
      InputService.onKeyPress('F', flee)
    ]

    // Disable global bindings during combat
    InputService.disableKeyBinding('quicksave')

    return () => {
      handlers.forEach(unsub => unsub())
      InputService.enableKeyBinding('quicksave')
    }
  }, [])

  return (
    <div>
      <h1>Combat!</h1>
      <button onClick={attack}>(A)ttack</button>
      <button onClick={castSpell}>(C)ast Spell</button>
      <button onClick={defend}>(D)efend</button>
      <button onClick={flee}>(F)lee</button>
    </div>
  )
}
```

## Related

- [SceneNavigationService](./SceneNavigationService.md) - Disables input during transitions
- [AssetLoadingService](./AssetLoadingService.md) - Disables input during loading
- [Title Screen](../ui/scenes/00-title-screen.md) - Uses S key and button click
- [StartGameCommand](../commands/meta/StartGameCommand.md) - Triggered by input

---

**Last Updated:** 2025-10-26
