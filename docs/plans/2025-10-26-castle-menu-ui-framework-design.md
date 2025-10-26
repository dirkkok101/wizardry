# Castle Menu Scene & UI Framework Design

**Date:** 2025-10-26
**Status:** Approved Design
**Related Docs:** [Castle Menu Scene](../ui/scenes/01-castle-menu.md), [Title Screen Scene](../ui/scenes/00-title-screen.md)

## Overview

This design implements the Castle Menu scene while establishing a reusable UI framework for all 14 game scenes. The approach follows a "framework-first" strategy: build comprehensive UI utilities, migrate TitleScreenScene to validate the framework, then implement Castle Menu using the proven patterns.

## Goals

1. **Implement Castle Menu** - Functional navigation hub with 5 town service options
2. **Extract Shared UI Code** - Create reusable rendering and input management utilities
3. **Establish Patterns** - Define scene implementation patterns for remaining 12 scenes
4. **Maintain Quality** - Keep TitleScreenScene tests passing during refactoring

## Architecture

### Component Structure

```
src/ui/
├── theme.ts                    # Design system (colors, typography, spacing)
├── managers/
│   └── InputManager.ts         # Scene input subscription management
└── renderers/
    ├── MenuRenderer.ts         # Vertical/horizontal menu list rendering
    ├── TextRenderer.ts         # Text with alignment, wrapping, effects
    ├── ButtonRenderer.ts       # Button rendering with states
    └── AnimationHelpers.ts     # Pulse effects, fades, timing
```

### Framework Components

#### 1. Theme System (`src/ui/theme.ts`)

Centralized design tokens extracted from TitleScreenScene:

```typescript
export const COLORS = {
  // Backgrounds
  BACKGROUND: '#000',
  BUTTON_NORMAL_BG: 'rgba(0, 0, 0, 0.7)',
  BUTTON_HOVER_BG: 'rgba(40, 40, 40, 0.8)',
  BUTTON_DISABLED_BG: 'rgba(0, 0, 0, 0.6)',

  // Borders
  BUTTON_BORDER_READY: 'rgba(255, 255, 255, 0.9)',
  BUTTON_BORDER_DISABLED: 'rgba(255, 255, 255, 0.3)',

  // Text
  TEXT_PRIMARY: 'rgba(255, 255, 255, 1)',
  TEXT_SECONDARY: 'rgba(170, 170, 170, 1)',
  TEXT_DISABLED: 'rgba(255, 255, 255, 0.4)',
}

export const TYPOGRAPHY = {
  FAMILIES: {
    PRIMARY: 'monospace',
  },
  SIZES: {
    TITLE: 32,
    MENU: 24,
    BUTTON: 28,
    BODY: 16,
    SMALL: 14,
  },
  WEIGHTS: {
    NORMAL: 'normal',
    BOLD: 'bold',
  },
}

export const BUTTON_SIZES = {
  LARGE: { width: 250, height: 60 },
  MEDIUM: { width: 200, height: 50 },
  SMALL: { width: 150, height: 40 },
}

export const ANIMATION = {
  PULSE: {
    BASE_ALPHA: 0.3,
    ALPHA_VARIATION: 0.2,
    BASE_SIZE: 5,
    SIZE_VARIATION: 10,
    PERIOD: 500,
  },
  FADE_DURATION: 300,
}
```

**Usage:** Import constants instead of inline definitions. Ensures visual consistency across all scenes.

#### 2. MenuRenderer (`src/ui/renderers/MenuRenderer.ts`)

Renders vertical menu lists with keyboard shortcuts and hover states.

```typescript
export interface MenuItem {
  key: string           // Keyboard shortcut (e.g., 'g', 't')
  label: string         // Display text (e.g., "(G)ILGAMESH'S TAVERN")
  disabled?: boolean    // Grayed out if true
  hovered?: boolean     // Highlighted if true
}

export interface MenuRenderOptions {
  x: number                           // Center X position
  y: number                           // Top Y position
  items: MenuItem[]                   // Menu items to render
  itemHeight: number                  // Height per item (spacing)
  fontSize: number                    // Text size
  alignment: 'left' | 'center' | 'right'
  showKeys: boolean                   // Display "(G)" prefix
}

export const MenuRenderer = {
  renderMenu(ctx: CanvasRenderingContext2D, options: MenuRenderOptions): void {
    // For each item:
    // 1. Calculate Y position (options.y + index * itemHeight)
    // 2. Set text color (disabled = TEXT_DISABLED, hovered = TEXT_PRIMARY, normal = TEXT_SECONDARY)
    // 3. Render text at calculated position with alignment
    // 4. Optional: Draw hover highlight box if hovered
  }
}
```

**Castle Menu usage:**
```typescript
MenuRenderer.renderMenu(ctx, {
  x: this.canvas.width / 2,
  y: 200,
  items: this.menuItems,
  itemHeight: 50,
  fontSize: TYPOGRAPHY.SIZES.MENU,
  alignment: 'center',
  showKeys: true
})
```

#### 3. ButtonRenderer (`src/ui/renderers/ButtonRenderer.ts`)

Renders buttons with states (normal, hover, disabled, active).

```typescript
export interface ButtonRenderOptions {
  x: number
  y: number
  width: number
  height: number
  text: string
  state: 'normal' | 'hover' | 'disabled' | 'active'
  showPulse?: boolean           // Animate pulse effect
  pulseTime?: number            // Current animation time (ms)
}

export const ButtonRenderer = {
  renderButton(ctx: CanvasRenderingContext2D, options: ButtonRenderOptions): void {
    // 1. Draw background (color based on state)
    // 2. Draw border (color based on state)
    // 3. Draw pulse effect if showPulse && state === 'normal'
    // 4. Draw centered text
  }
}
```

**TitleScreenScene usage (after refactor):**
```typescript
ButtonRenderer.renderButton(ctx, {
  x: this.button.x,
  y: this.button.y,
  width: BUTTON_SIZES.LARGE.width,
  height: BUTTON_SIZES.LARGE.height,
  text: this.button.text,
  state: this.button.disabled ? 'disabled' : this.button.hovered ? 'hover' : 'normal',
  showPulse: this.mode === 'READY',
  pulseTime: this.pulseTime
})
```

#### 4. TextRenderer (`src/ui/renderers/TextRenderer.ts`)

Simple text rendering with alignment and styling.

```typescript
export interface TextRenderOptions {
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  align: 'left' | 'center' | 'right'
  baseline?: 'top' | 'middle' | 'bottom'
  font?: string                 // Default: 'monospace'
  weight?: 'normal' | 'bold'    // Default: 'normal'
}

export const TextRenderer = {
  renderText(ctx: CanvasRenderingContext2D, options: TextRenderOptions): void {
    // 1. Set font properties
    // 2. Set text alignment
    // 3. Set fill color
    // 4. Draw text at position
  }
}
```

#### 5. InputManager (`src/ui/managers/InputManager.ts`)

Manages scene input subscriptions with automatic cleanup.

```typescript
export class SceneInputManager {
  private subscriptions: Array<() => void> = []

  /**
   * Register keyboard shortcut handler
   */
  onKeyPress(key: string, handler: () => void): void {
    const unsub = InputService.onKeyPress(key, handler)
    this.subscriptions.push(unsub)
  }

  /**
   * Register mouse move handler (with coordinate conversion)
   */
  onMouseMove(
    canvas: HTMLCanvasElement,
    handler: (x: number, y: number) => void
  ): void {
    const mouseHandler = (e: MouseEvent) => {
      const coords = this.screenToCanvasCoordinates(canvas, e)
      handler(coords.x, coords.y)
    }
    canvas.addEventListener('mousemove', mouseHandler)
    this.subscriptions.push(() => {
      canvas.removeEventListener('mousemove', mouseHandler)
    })
  }

  /**
   * Register mouse click handler (with coordinate conversion)
   */
  onMouseClick(
    canvas: HTMLCanvasElement,
    handler: (x: number, y: number) => void
  ): void {
    const clickHandler = (e: MouseEvent) => {
      const coords = this.screenToCanvasCoordinates(canvas, e)
      handler(coords.x, coords.y)
    }
    canvas.addEventListener('click', clickHandler)
    this.subscriptions.push(() => {
      canvas.removeEventListener('click', clickHandler)
    })
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  private screenToCanvasCoordinates(
    canvas: HTMLCanvasElement,
    e: MouseEvent
  ): { x: number, y: number } {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  /**
   * Unsubscribe all handlers at once
   */
  destroy(): void {
    this.subscriptions.forEach(unsub => unsub())
    this.subscriptions = []
  }
}
```

**Scene usage pattern:**
```typescript
class SomeScene implements Scene {
  private inputManager!: SceneInputManager

  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.inputManager = new SceneInputManager()

    // Register handlers (tracked automatically)
    this.inputManager.onKeyPress('g', () => this.handleG())
    this.inputManager.onMouseMove(canvas, (x, y) => this.updateHover(x, y))
  }

  destroy(): void {
    this.inputManager.destroy() // Cleans up everything
  }
}
```

### Implementation Phases

#### Phase 1: Build UI Framework

1. Create `src/ui/theme.ts` with all constants
2. Implement `MenuRenderer` with tests
3. Implement `ButtonRenderer` with tests
4. Implement `TextRenderer` with tests
5. Implement `InputManager` with tests

**Tests first:** Write tests for each renderer/manager before implementation (TDD).

**Success criteria:** All framework tests passing.

#### Phase 2: Refactor TitleScreenScene

1. Import theme constants
2. Replace button rendering with `ButtonRenderer`
3. Replace text rendering with `TextRenderer`
4. Replace manual event handling with `SceneInputManager`
5. Remove inline constants and manual event listeners

**Validation:** Run `npm test tests/scenes/TitleScreenScene.test.ts` after each change.

**Success criteria:** All TitleScreenScene tests still passing, no visual regressions.

#### Phase 3: Implement Castle Menu Scene

File structure:
```
src/scenes/castle-menu-scene/
├── CastleMenuScene.ts
└── commands/
    ├── NavigateToTavernCommand.ts
    ├── NavigateToTempleCommand.ts
    ├── NavigateToShopCommand.ts
    ├── NavigateToInnCommand.ts
    └── NavigateToEdgeOfTownCommand.ts
```

**CastleMenuScene implementation:**

```typescript
import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { MenuRenderer, MenuItem } from '../../ui/renderers/MenuRenderer'
import { TextRenderer } from '../../ui/renderers/TextRenderer'
import { COLORS, TYPOGRAPHY } from '../../ui/theme'
import { NavigateToTavernCommand } from './commands/NavigateToTavernCommand'
import { NavigateToTempleCommand } from './commands/NavigateToTempleCommand'
import { NavigateToShopCommand } from './commands/NavigateToShopCommand'
import { NavigateToInnCommand } from './commands/NavigateToInnCommand'
import { NavigateToEdgeOfTownCommand } from './commands/NavigateToEdgeOfTownCommand'

type CastleMenuMode = 'READY' | 'TRANSITIONING'

export class CastleMenuScene implements Scene {
  readonly type = SceneType.CASTLE_MENU

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: CastleMenuMode = 'READY'
  private mouseX = 0
  private mouseY = 0

  private menuItems: MenuItem[] = [
    { key: 'g', label: "(G)ILGAMESH'S TAVERN" },
    { key: 't', label: "(T)EMPLE OF CANT" },
    { key: 'b', label: "(B)OLTAC'S TRADING POST" },
    { key: 'a', label: "(A)DVENTURER'S INN" },
    { key: 'e', label: "(E)DGE OF TOWN" }
  ]

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Register keyboard shortcuts
    this.inputManager.onKeyPress('g', () => this.handleNavigation('g'))
    this.inputManager.onKeyPress('t', () => this.handleNavigation('t'))
    this.inputManager.onKeyPress('b', () => this.handleNavigation('b'))
    this.inputManager.onKeyPress('a', () => this.handleNavigation('a'))
    this.inputManager.onKeyPress('e', () => this.handleNavigation('e'))

    // Register mouse handlers
    this.inputManager.onMouseMove(canvas, (x, y) => {
      this.mouseX = x
      this.mouseY = y
    })
    this.inputManager.onMouseClick(canvas, (x, y) => this.handleMouseClick(x, y))
  }

  enter(_data?: SceneTransitionData): void {
    this.mode = 'READY'
  }

  update(_deltaTime: number): void {
    // Update hover states based on mouse position
    this.updateHoverStates()
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw title
    TextRenderer.renderText(ctx, {
      text: 'CASTLE',
      x: this.canvas.width / 2,
      y: 80,
      fontSize: TYPOGRAPHY.SIZES.TITLE,
      color: COLORS.TEXT_PRIMARY,
      align: 'center',
      baseline: 'middle'
    })

    // Draw menu
    MenuRenderer.renderMenu(ctx, {
      x: this.canvas.width / 2,
      y: 200,
      items: this.menuItems,
      itemHeight: 50,
      fontSize: TYPOGRAPHY.SIZES.MENU,
      alignment: 'center',
      showKeys: true
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

  private async executeNavigationCommand(key: string) {
    const context = { mode: this.mode }

    switch (key) {
      case 'g': return NavigateToTavernCommand.execute(context)
      case 't': return NavigateToTempleCommand.execute(context)
      case 'b': return NavigateToShopCommand.execute(context)
      case 'a': return NavigateToInnCommand.execute(context)
      case 'e': return NavigateToEdgeOfTownCommand.execute(context)
      default: return { success: false, nextScene: SceneType.CASTLE_MENU, error: 'Unknown key' }
    }
  }

  private handleMouseClick(x: number, y: number): void {
    // Find clicked menu item
    const clickedItem = this.getMenuItemAtPosition(x, y)
    if (clickedItem) {
      this.handleNavigation(clickedItem.key)
    }
  }

  private updateHoverStates(): void {
    const hoveredItem = this.getMenuItemAtPosition(this.mouseX, this.mouseY)

    this.menuItems.forEach(item => {
      item.hovered = item === hoveredItem
    })
  }

  private getMenuItemAtPosition(x: number, y: number): MenuItem | null {
    const menuX = this.canvas.width / 2
    const menuY = 200
    const itemHeight = 50

    for (let i = 0; i < this.menuItems.length; i++) {
      const itemY = menuY + i * itemHeight

      // Check if point is within item bounds (approximate based on text width)
      if (y >= itemY - itemHeight/2 && y <= itemY + itemHeight/2) {
        // Simple horizontal check (could be refined with text measurement)
        if (Math.abs(x - menuX) < 200) {
          return this.menuItems[i]
        }
      }
    }

    return null
  }

  destroy(): void {
    this.inputManager.destroy()
  }
}
```

#### Phase 4: Implement Navigation Commands

**Command pattern** (example: NavigateToTavernCommand):

```typescript
import { SceneType } from '../../../../types/SceneType'
import { SaveService } from '../../../../services/SaveService'
import { SceneNavigationService } from '../../../../services/SceneNavigationService'

export interface NavigateToTavernContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: NavigateToTavernContext): Promise<NavigateCommandResult> {
  // 1. Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.CASTLE_MENU,
      error: 'Transition already in progress'
    }
  }

  try {
    // 2. Auto-save before transition
    await SaveService.saveGame()

    // 3. Navigate to destination
    await SceneNavigationService.transitionTo(SceneType.TAVERN, {
      fadeTime: 300,
      data: { fromCastle: true }
    })

    return { success: true, nextScene: SceneType.TAVERN }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.CASTLE_MENU,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToTavernCommand = { execute }
```

**Replicate for all 5 destinations:**
- `NavigateToTempleCommand.ts` → SceneType.TEMPLE
- `NavigateToShopCommand.ts` → SceneType.SHOP
- `NavigateToInnCommand.ts` → SceneType.INN
- `NavigateToEdgeOfTownCommand.ts` → SceneType.EDGE_OF_TOWN

**Key pattern:** Each command handles auto-save before transition, ensuring explicit and testable save behavior.

### Testing Strategy

#### Framework Tests

**tests/ui/renderers/MenuRenderer.test.ts:**
- Renders menu items at correct positions
- Applies hover state styling
- Applies disabled state styling
- Handles different alignments (left, center, right)
- Shows/hides keyboard shortcuts

**tests/ui/renderers/ButtonRenderer.test.ts:**
- Renders button with normal state
- Renders button with hover state
- Renders button with disabled state
- Renders pulse animation
- Uses correct colors from theme

**tests/ui/managers/InputManager.test.ts:**
- Registers keyboard handlers
- Registers mouse handlers
- Converts screen coordinates correctly
- Unsubscribes all handlers on destroy
- Prevents memory leaks (no lingering handlers)

#### Scene Tests

**tests/scenes/TitleScreenScene.test.ts (updated):**
- Existing tests still pass after refactoring
- Button renders correctly
- Keyboard input works
- Mouse hover/click works
- Scene cleanup prevents leaks

**tests/scenes/CastleMenuScene.test.ts (new):**
- Renders 5 menu items
- Each keyboard shortcut triggers correct command
- Mouse hover updates menu item states
- Mouse click on item triggers navigation
- Transitioning mode prevents double-navigation
- Scene cleanup prevents leaks

#### Command Tests

**tests/scenes/castle-menu-scene/commands/NavigateToTavernCommand.test.ts:**
- Executes successfully when mode is READY
- Fails when mode is TRANSITIONING
- Calls SaveService.saveGame() before transition
- Calls SceneNavigationService.transitionTo() with correct parameters
- Returns error if save fails
- Returns error if navigation fails

**Replicate for all 5 commands.**

#### Integration Tests

**tests/integration/castle-menu-flow.test.ts:**
- Title → Castle Menu transition works
- Castle Menu → Tavern transition works (with auto-save)
- Castle Menu → Temple transition works (with auto-save)
- All 5 navigation paths functional
- Scene cleanup throughout flow

### File Structure (Complete)

```
src/
├── ui/
│   ├── theme.ts
│   ├── managers/
│   │   └── InputManager.ts
│   └── renderers/
│       ├── MenuRenderer.ts
│       ├── ButtonRenderer.ts
│       ├── TextRenderer.ts
│       └── AnimationHelpers.ts
├── scenes/
│   ├── title-screen-scene/
│   │   ├── TitleScreenScene.ts (REFACTORED)
│   │   └── commands/
│   │       └── StartGameCommand.ts
│   └── castle-menu-scene/
│       ├── CastleMenuScene.ts (NEW)
│       └── commands/
│           ├── NavigateToTavernCommand.ts (NEW)
│           ├── NavigateToTempleCommand.ts (NEW)
│           ├── NavigateToShopCommand.ts (NEW)
│           ├── NavigateToInnCommand.ts (NEW)
│           └── NavigateToEdgeOfTownCommand.ts (NEW)

tests/
├── ui/
│   ├── renderers/
│   │   ├── MenuRenderer.test.ts (NEW)
│   │   ├── ButtonRenderer.test.ts (NEW)
│   │   └── TextRenderer.test.ts (NEW)
│   └── managers/
│       └── InputManager.test.ts (NEW)
├── scenes/
│   ├── TitleScreenScene.test.ts (UPDATED)
│   └── CastleMenuScene.test.ts (NEW)
├── scenes/castle-menu-scene/commands/
│   ├── NavigateToTavernCommand.test.ts (NEW)
│   ├── NavigateToTempleCommand.test.ts (NEW)
│   ├── NavigateToShopCommand.test.ts (NEW)
│   ├── NavigateToInnCommand.test.ts (NEW)
│   └── NavigateToEdgeOfTownCommand.test.ts (NEW)
└── integration/
    └── castle-menu-flow.test.ts (NEW)
```

## Implementation Order

### Step 1: Framework Foundation (TDD)
1. Write tests for `MenuRenderer`
2. Implement `MenuRenderer`
3. Write tests for `ButtonRenderer`
4. Implement `ButtonRenderer`
5. Write tests for `TextRenderer`
6. Implement `TextRenderer`
7. Write tests for `InputManager`
8. Implement `InputManager`

**Deliverable:** All framework tests passing.

### Step 2: TitleScreenScene Refactoring
1. Create `theme.ts` with constants extracted from TitleScreenScene
2. Refactor TitleScreenScene to use `ButtonRenderer`
3. Refactor TitleScreenScene to use `TextRenderer`
4. Refactor TitleScreenScene to use `InputManager`
5. Run existing TitleScreenScene tests to verify no regressions

**Deliverable:** TitleScreenScene refactored, all tests passing.

### Step 3: Castle Menu Scene (TDD)
1. Write tests for CastleMenuScene
2. Implement CastleMenuScene using framework
3. Run scene tests
4. Register scene in SceneManager

**Deliverable:** CastleMenuScene rendering and handling input.

### Step 4: Navigation Commands (TDD)
1. Write tests for NavigateToTavernCommand
2. Implement NavigateToTavernCommand
3. Repeat for remaining 4 commands
4. Test all navigation paths from Castle Menu

**Deliverable:** All 5 navigation commands working with auto-save.

### Step 5: Integration Testing
1. Write integration tests for Title → Castle → Town flow
2. Verify auto-save behavior
3. Verify scene cleanup (no memory leaks)
4. Test full user journey

**Deliverable:** Complete Castle Menu feature with integration tests passing.

## Success Criteria

1. ✅ UI framework in place (theme, renderers, input manager)
2. ✅ TitleScreenScene refactored to use framework (tests passing)
3. ✅ CastleMenuScene implemented and functional
4. ✅ All 5 navigation commands working
5. ✅ Auto-save occurs before each town service transition
6. ✅ All unit tests passing (80%+ coverage)
7. ✅ Integration tests passing
8. ✅ No memory leaks (input handlers cleaned up)
9. ✅ Visual consistency with original Wizardry design

## Future Considerations

### Framework Extensions
- **Animation system:** Smooth transitions, particle effects
- **Layout helpers:** Grid systems, responsive positioning
- **Asset management:** Sprite caching, texture atlases
- **Accessibility:** Keyboard navigation hints, screen reader support

### Scene Patterns
This framework establishes patterns for:
- Town scenes (Tavern, Temple, Shop, Inn, Edge of Town)
- Dungeon scenes (Camp, Maze, Combat, Chest)
- Character scenes (Creation, Inspection, Party Formation)

All future scenes should follow the pattern:
1. Import framework utilities
2. Use `SceneInputManager` for input
3. Use renderers for drawing
4. Use theme constants for styling
5. Keep scenes declarative and clean

## Related Documentation
- [Castle Menu Scene](../ui/scenes/01-castle-menu.md)
- [Title Screen Scene](../ui/scenes/00-title-screen.md)
- [Scene Navigation Service](../services/SceneNavigationService.md)
- [Architecture Overview](../architecture.md)
