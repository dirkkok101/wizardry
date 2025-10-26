# Castle Menu & UI Framework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Castle Menu scene with reusable UI framework (theme system, renderers, input manager) while refactoring TitleScreenScene to validate the framework.

**Architecture:** Framework-first approach - build UI utilities with TDD, migrate TitleScreenScene to prove patterns work, then implement Castle Menu using validated framework. All 5 navigation commands with explicit auto-save.

**Tech Stack:** TypeScript, Vitest, HTML5 Canvas, Vite

---

## Task 1: Create Theme Constants

**Files:**
- Create: `src/ui/theme.ts`
- Test: None (constants don't need tests)

**Step 1: Create theme constants file**

Create `src/ui/theme.ts` with complete design system:

```typescript
/**
 * UI Theme System
 * Centralized design tokens for consistent styling across all scenes
 */

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
} as const

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
    NORMAL: 'normal' as const,
    BOLD: 'bold' as const,
  },
} as const

export const BUTTON_SIZES = {
  LARGE: { width: 250, height: 60 },
  MEDIUM: { width: 200, height: 50 },
  SMALL: { width: 150, height: 40 },
} as const

export const ANIMATION = {
  PULSE: {
    BASE_ALPHA: 0.3,
    ALPHA_VARIATION: 0.2,
    BASE_SIZE: 5,
    SIZE_VARIATION: 10,
    PERIOD: 500,
  },
  FADE_DURATION: 300,
} as const
```

**Step 2: Commit**

```bash
git add src/ui/theme.ts
git commit -m "feat(ui): add theme constants for design system"
```

---

## Task 2: Create TextRenderer with Tests

**Files:**
- Create: `src/ui/renderers/TextRenderer.ts`
- Create: `tests/ui/renderers/TextRenderer.test.ts`

**Step 1: Write the failing test**

Create `tests/ui/renderers/TextRenderer.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { TextRenderer } from '../../../src/ui/renderers/TextRenderer'

describe('TextRenderer', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('renderText', () => {
    it('should render text with basic options', () => {
      const spy = vi.spyOn(ctx, 'fillText')

      TextRenderer.renderText(ctx, {
        text: 'Hello World',
        x: 400,
        y: 300,
        fontSize: 24,
        color: '#fff',
        align: 'center'
      })

      expect(spy).toHaveBeenCalledWith('Hello World', 400, 300)
      expect(ctx.font).toContain('24px')
      expect(ctx.fillStyle).toBe('#fff')
      expect(ctx.textAlign).toBe('center')
    })

    it('should use default font family when not specified', () => {
      TextRenderer.renderText(ctx, {
        text: 'Test',
        x: 0,
        y: 0,
        fontSize: 16,
        color: '#000',
        align: 'left'
      })

      expect(ctx.font).toContain('monospace')
    })

    it('should apply bold weight when specified', () => {
      TextRenderer.renderText(ctx, {
        text: 'Bold Text',
        x: 0,
        y: 0,
        fontSize: 20,
        color: '#fff',
        align: 'center',
        weight: 'bold'
      })

      expect(ctx.font).toContain('bold')
    })

    it('should set baseline when specified', () => {
      TextRenderer.renderText(ctx, {
        text: 'Test',
        x: 0,
        y: 0,
        fontSize: 16,
        color: '#000',
        align: 'left',
        baseline: 'middle'
      })

      expect(ctx.textBaseline).toBe('middle')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/ui/renderers/TextRenderer.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `src/ui/renderers/TextRenderer.ts`:

```typescript
/**
 * TextRenderer - Simple text rendering with alignment and styling
 */

export interface TextRenderOptions {
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  align: 'left' | 'center' | 'right'
  baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic'
  font?: string
  weight?: 'normal' | 'bold'
}

export const TextRenderer = {
  renderText(ctx: CanvasRenderingContext2D, options: TextRenderOptions): void {
    const {
      text,
      x,
      y,
      fontSize,
      color,
      align,
      baseline = 'alphabetic',
      font = 'monospace',
      weight = 'normal'
    } = options

    // Set font properties
    ctx.font = `${weight} ${fontSize}px ${font}`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = baseline

    // Draw text
    ctx.fillText(text, x, y)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/ui/renderers/TextRenderer.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/ui/renderers/TextRenderer.ts tests/ui/renderers/TextRenderer.test.ts
git commit -m "feat(ui): add TextRenderer with tests"
```

---

## Task 3: Create ButtonRenderer with Tests

**Files:**
- Create: `src/ui/renderers/ButtonRenderer.ts`
- Create: `tests/ui/renderers/ButtonRenderer.test.ts`

**Step 1: Write the failing test**

Create `tests/ui/renderers/ButtonRenderer.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ButtonRenderer } from '../../../src/ui/renderers/ButtonRenderer'
import { COLORS, BUTTON_SIZES } from '../../../src/ui/theme'

describe('ButtonRenderer', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('renderButton', () => {
    it('should render button in normal state', () => {
      const fillRectSpy = vi.spyOn(ctx, 'fillRect')
      const strokeRectSpy = vi.spyOn(ctx, 'strokeRect')

      ButtonRenderer.renderButton(ctx, {
        x: 100,
        y: 100,
        width: BUTTON_SIZES.LARGE.width,
        height: BUTTON_SIZES.LARGE.height,
        text: 'Click Me',
        state: 'normal'
      })

      expect(fillRectSpy).toHaveBeenCalledWith(100, 100, 250, 60)
      expect(strokeRectSpy).toHaveBeenCalled()
    })

    it('should use hover background for hover state', () => {
      ButtonRenderer.renderButton(ctx, {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: 'Hover',
        state: 'hover'
      })

      expect(ctx.fillStyle).toBe(COLORS.BUTTON_HOVER_BG)
    })

    it('should use disabled background for disabled state', () => {
      ButtonRenderer.renderButton(ctx, {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: 'Disabled',
        state: 'disabled'
      })

      expect(ctx.fillStyle).toBe(COLORS.BUTTON_DISABLED_BG)
    })

    it('should render pulse effect when showPulse is true', () => {
      const strokeRectSpy = vi.spyOn(ctx, 'strokeRect')

      ButtonRenderer.renderButton(ctx, {
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        text: 'Pulse',
        state: 'normal',
        showPulse: true,
        pulseTime: 0
      })

      // Should call strokeRect twice: once for border, once for pulse
      expect(strokeRectSpy).toHaveBeenCalledTimes(2)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/ui/renderers/ButtonRenderer.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `src/ui/renderers/ButtonRenderer.ts`:

```typescript
/**
 * ButtonRenderer - Button rendering with states (normal, hover, disabled)
 */

import { COLORS, ANIMATION, TYPOGRAPHY, BUTTON_SIZES } from '../theme'

export interface ButtonRenderOptions {
  x: number
  y: number
  width: number
  height: number
  text: string
  state: 'normal' | 'hover' | 'disabled' | 'active'
  showPulse?: boolean
  pulseTime?: number
}

export const ButtonRenderer = {
  renderButton(ctx: CanvasRenderingContext2D, options: ButtonRenderOptions): void {
    const { x, y, width, height, text, state, showPulse = false, pulseTime = 0 } = options

    // Draw background
    switch (state) {
      case 'disabled':
        ctx.fillStyle = COLORS.BUTTON_DISABLED_BG
        break
      case 'hover':
      case 'active':
        ctx.fillStyle = COLORS.BUTTON_HOVER_BG
        break
      default:
        ctx.fillStyle = COLORS.BUTTON_NORMAL_BG
    }
    ctx.fillRect(x, y, width, height)

    // Draw border
    ctx.strokeStyle = state === 'disabled' ? COLORS.BUTTON_BORDER_DISABLED : COLORS.BUTTON_BORDER_READY
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, width, height)

    // Draw pulse effect if enabled
    if (showPulse && state === 'normal') {
      const pulseAlpha = ANIMATION.PULSE.BASE_ALPHA +
                         ANIMATION.PULSE.ALPHA_VARIATION * Math.sin(pulseTime / ANIMATION.PULSE.PERIOD)
      const pulseSize = ANIMATION.PULSE.BASE_SIZE +
                        ANIMATION.PULSE.SIZE_VARIATION * Math.sin(pulseTime / ANIMATION.PULSE.PERIOD)

      ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`
      ctx.lineWidth = 2
      ctx.strokeRect(x - pulseSize/2, y - pulseSize/2, width + pulseSize, height + pulseSize)
    }

    // Draw text
    ctx.fillStyle = state === 'disabled' ? COLORS.TEXT_DISABLED : COLORS.TEXT_PRIMARY
    ctx.font = `bold ${TYPOGRAPHY.SIZES.BUTTON}px ${TYPOGRAPHY.FAMILIES.PRIMARY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + width / 2, y + height / 2)
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/ui/renderers/ButtonRenderer.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/ui/renderers/ButtonRenderer.ts tests/ui/renderers/ButtonRenderer.test.ts
git commit -m "feat(ui): add ButtonRenderer with tests"
```

---

## Task 4: Create MenuRenderer with Tests

**Files:**
- Create: `src/ui/renderers/MenuRenderer.ts`
- Create: `tests/ui/renderers/MenuRenderer.test.ts`

**Step 1: Write the failing test**

Create `tests/ui/renderers/MenuRenderer.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MenuRenderer, MenuItem } from '../../../src/ui/renderers/MenuRenderer'
import { COLORS, TYPOGRAPHY } from '../../../src/ui/theme'

describe('MenuRenderer', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('renderMenu', () => {
    it('should render all menu items', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText')

      const items: MenuItem[] = [
        { key: 'a', label: '(A) First Option' },
        { key: 'b', label: '(B) Second Option' },
        { key: 'c', label: '(C) Third Option' }
      ]

      MenuRenderer.renderMenu(ctx, {
        x: 400,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: TYPOGRAPHY.SIZES.MENU,
        alignment: 'center',
        showKeys: true
      })

      expect(fillTextSpy).toHaveBeenCalledTimes(3)
      expect(fillTextSpy).toHaveBeenCalledWith('(A) First Option', 400, 200)
      expect(fillTextSpy).toHaveBeenCalledWith('(B) Second Option', 400, 250)
      expect(fillTextSpy).toHaveBeenCalledWith('(C) Third Option', 400, 300)
    })

    it('should use TEXT_DISABLED color for disabled items', () => {
      const items: MenuItem[] = [
        { key: 'a', label: 'Enabled', disabled: false },
        { key: 'b', label: 'Disabled', disabled: true }
      ]

      MenuRenderer.renderMenu(ctx, {
        x: 400,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: 24,
        alignment: 'center',
        showKeys: true
      })

      // Check that fillStyle changes for disabled item
      expect(ctx.fillStyle).toContain('0.4') // TEXT_DISABLED has alpha 0.4
    })

    it('should use TEXT_PRIMARY color for hovered items', () => {
      const items: MenuItem[] = [
        { key: 'a', label: 'Normal' },
        { key: 'b', label: 'Hovered', hovered: true }
      ]

      MenuRenderer.renderMenu(ctx, {
        x: 400,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: 24,
        alignment: 'center',
        showKeys: true
      })

      expect(ctx.fillStyle).toBe(COLORS.TEXT_PRIMARY)
    })

    it('should apply left alignment', () => {
      const items: MenuItem[] = [{ key: 'a', label: 'Left' }]

      MenuRenderer.renderMenu(ctx, {
        x: 100,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: 24,
        alignment: 'left',
        showKeys: true
      })

      expect(ctx.textAlign).toBe('left')
    })

    it('should apply right alignment', () => {
      const items: MenuItem[] = [{ key: 'a', label: 'Right' }]

      MenuRenderer.renderMenu(ctx, {
        x: 700,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: 24,
        alignment: 'right',
        showKeys: true
      })

      expect(ctx.textAlign).toBe('right')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/ui/renderers/MenuRenderer.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `src/ui/renderers/MenuRenderer.ts`:

```typescript
/**
 * MenuRenderer - Renders vertical menu lists with keyboard shortcuts and hover states
 */

import { COLORS, TYPOGRAPHY } from '../theme'

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
    const { x, y, items, itemHeight, fontSize, alignment, showKeys } = options

    items.forEach((item, index) => {
      const itemY = y + index * itemHeight

      // Set color based on item state
      if (item.disabled) {
        ctx.fillStyle = COLORS.TEXT_DISABLED
      } else if (item.hovered) {
        ctx.fillStyle = COLORS.TEXT_PRIMARY
      } else {
        ctx.fillStyle = COLORS.TEXT_SECONDARY
      }

      // Set font and alignment
      ctx.font = `${fontSize}px ${TYPOGRAPHY.FAMILIES.PRIMARY}`
      ctx.textAlign = alignment
      ctx.textBaseline = 'middle'

      // Draw text
      ctx.fillText(item.label, x, itemY)
    })
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test tests/ui/renderers/MenuRenderer.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/ui/renderers/MenuRenderer.ts tests/ui/renderers/MenuRenderer.test.ts
git commit -m "feat(ui): add MenuRenderer with tests"
```

---

## Task 5: Create InputManager with Tests

**Files:**
- Create: `src/ui/managers/InputManager.ts`
- Create: `tests/ui/managers/InputManager.test.ts`

**Step 1: Write the failing test**

Create `tests/ui/managers/InputManager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SceneInputManager } from '../../../src/ui/managers/InputManager'
import { InputService } from '../../../src/services/InputService'

describe('SceneInputManager', () => {
  let canvas: HTMLCanvasElement
  let manager: SceneInputManager

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)
    manager = new SceneInputManager()
  })

  afterEach(() => {
    manager.destroy()
    document.body.removeChild(canvas)
  })

  describe('onKeyPress', () => {
    it('should register keyboard handler', () => {
      const handler = vi.fn()
      const spy = vi.spyOn(InputService, 'onKeyPress')

      manager.onKeyPress('a', handler)

      expect(spy).toHaveBeenCalledWith('a', handler)
    })

    it('should store unsubscribe function', () => {
      manager.onKeyPress('a', () => {})

      // Check that subscriptions array has one entry
      expect(manager['subscriptions'].length).toBe(1)
    })
  })

  describe('onMouseMove', () => {
    it('should register mouse move handler', () => {
      const handler = vi.fn()

      manager.onMouseMove(canvas, handler)

      // Trigger mouse move event
      const event = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 300
      })
      canvas.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })

    it('should convert screen coordinates to canvas coordinates', () => {
      const handler = vi.fn()

      manager.onMouseMove(canvas, handler)

      const event = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 300
      })
      canvas.dispatchEvent(event)

      // Handler should be called with canvas coordinates
      expect(handler).toHaveBeenCalledWith(expect.any(Number), expect.any(Number))
    })
  })

  describe('onMouseClick', () => {
    it('should register mouse click handler', () => {
      const handler = vi.fn()

      manager.onMouseClick(canvas, handler)

      const event = new MouseEvent('click', {
        clientX: 400,
        clientY: 300
      })
      canvas.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should unsubscribe all handlers', () => {
      const unsub1 = vi.fn()
      const unsub2 = vi.fn()

      // Mock subscriptions
      manager['subscriptions'] = [unsub1, unsub2]

      manager.destroy()

      expect(unsub1).toHaveBeenCalled()
      expect(unsub2).toHaveBeenCalled()
      expect(manager['subscriptions'].length).toBe(0)
    })

    it('should remove mouse event listeners', () => {
      const handler = vi.fn()
      const removeEventListenerSpy = vi.spyOn(canvas, 'removeEventListener')

      manager.onMouseMove(canvas, handler)
      manager.destroy()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/ui/managers/InputManager.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `src/ui/managers/InputManager.ts`:

```typescript
/**
 * SceneInputManager - Manages scene input subscriptions with automatic cleanup
 */

import { InputService } from '../../services/InputService'

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

**Step 4: Run test to verify it passes**

Run: `npm test tests/ui/managers/InputManager.test.ts`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add src/ui/managers/InputManager.ts tests/ui/managers/InputManager.test.ts
git commit -m "feat(ui): add InputManager with tests"
```

---

## Task 6: Refactor TitleScreenScene - Extract Constants

**Files:**
- Modify: `src/scenes/title-screen-scene/TitleScreenScene.ts:26-52`

**Step 1: Update imports and remove inline constants**

In `src/scenes/title-screen-scene/TitleScreenScene.ts`, replace lines 26-52 with theme imports:

Remove this:
```typescript
// UI Constants
const BUTTON = {
  WIDTH: 250,
  HEIGHT: 60,
  FONT_SIZE: 28,
  FONT: 'bold 28px monospace',
  BORDER_WIDTH: 3,
  PULSE_BORDER_WIDTH: 2
} as const

const COLORS = {
  BUTTON_DISABLED_BG: 'rgba(0, 0, 0, 0.6)',
  BUTTON_HOVER_BG: 'rgba(40, 40, 40, 0.8)',
  BUTTON_NORMAL_BG: 'rgba(0, 0, 0, 0.7)',
  BUTTON_BORDER_DISABLED: 'rgba(255, 255, 255, 0.3)',
  BUTTON_BORDER_READY: 'rgba(255, 255, 255, 0.9)',
  BUTTON_TEXT_DISABLED: 'rgba(255, 255, 255, 0.4)',
  BUTTON_TEXT_ENABLED: 'rgba(255, 255, 255, 1)'
} as const

const PULSE = {
  BASE_ALPHA: 0.3,
  ALPHA_VARIATION: 0.2,
  BASE_SIZE: 5,
  SIZE_VARIATION: 10,
  PERIOD: 500
} as const
```

Add after other imports:
```typescript
import { COLORS, BUTTON_SIZES, ANIMATION } from '../../ui/theme'
```

**Step 2: Run tests to verify still passing**

Run: `npm test tests/scenes/TitleScreenScene.test.ts`
Expected: PASS (13 tests)

**Step 3: Commit**

```bash
git add src/scenes/title-screen-scene/TitleScreenScene.ts
git commit -m "refactor(title): extract constants to theme"
```

---

## Task 7: Refactor TitleScreenScene - Use ButtonRenderer

**Files:**
- Modify: `src/scenes/title-screen-scene/TitleScreenScene.ts:293-329`

**Step 1: Add ButtonRenderer import**

Add to imports:
```typescript
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
```

**Step 2: Replace drawButton method**

Replace the entire `drawButton` method (lines 293-329) with:

```typescript
/**
 * Draw the start button
 */
private drawButton(ctx: CanvasRenderingContext2D): void {
  const { x, y, width, height, text, disabled, hovered } = this.button

  // Determine button state
  let state: 'normal' | 'hover' | 'disabled'
  if (disabled) {
    state = 'disabled'
  } else if (hovered) {
    state = 'hover'
  } else {
    state = 'normal'
  }

  // Render using ButtonRenderer
  ButtonRenderer.renderButton(ctx, {
    x,
    y,
    width,
    height,
    text,
    state,
    showPulse: this.mode === 'READY' && !disabled,
    pulseTime: this.pulseTime
  })
}
```

**Step 3: Update button initialization**

In `init()` method, update button dimensions to use theme:

```typescript
this.button = {
  x: 0,
  y: 0,
  width: BUTTON_SIZES.LARGE.width,
  height: BUTTON_SIZES.LARGE.height,
  text: 'Loading...',
  disabled: true,
  hovered: false
}
```

**Step 4: Run tests to verify still passing**

Run: `npm test tests/scenes/TitleScreenScene.test.ts`
Expected: PASS (13 tests)

**Step 5: Commit**

```bash
git add src/scenes/title-screen-scene/TitleScreenScene.ts
git commit -m "refactor(title): use ButtonRenderer"
```

---

## Task 8: Refactor TitleScreenScene - Use InputManager

**Files:**
- Modify: `src/scenes/title-screen-scene/TitleScreenScene.ts:71-79,146-165,357-369`

**Step 1: Add InputManager import and update class properties**

Add to imports:
```typescript
import { SceneInputManager } from '../../ui/managers/InputManager'
```

Replace lines 71-79:
```typescript
private unsubscribeKeyPress?: () => void
private mouseX = 0
private mouseY = 0
private pulseTime = 0

// Event handlers stored as class properties for proper cleanup
private mouseMoveHandler?: (e: MouseEvent) => void
private mouseClickHandler?: (e: MouseEvent) => void
```

With:
```typescript
private inputManager!: SceneInputManager
private mouseX = 0
private mouseY = 0
private pulseTime = 0
```

**Step 2: Replace setupMouseTracking method**

Replace `setupMouseTracking()` method (lines 146-165) with:

```typescript
/**
 * Set up input handlers
 */
private setupInputHandlers(): void {
  this.inputManager = new SceneInputManager()

  // Keyboard handler
  this.inputManager.onKeyPress('s', () => {
    this.handleStart()
  })

  // Mouse handlers
  this.inputManager.onMouseMove(this.canvas, (x, y) => {
    this.mouseX = x
    this.mouseY = y
  })

  this.inputManager.onMouseClick(this.canvas, (x, y) => {
    if (this.isPointInButton(x, y) && !this.button.disabled) {
      this.handleStart()
    }
  })
}
```

**Step 3: Update init() to use new method**

In `init()`, replace the call to `setupMouseTracking()` with:

```typescript
// Set up input handlers
this.setupInputHandlers()
```

**Step 4: Remove screenToCanvasCoordinates method**

Delete lines 130-141 (screenToCanvasCoordinates method - now in InputManager).

**Step 5: Update destroy() method**

Replace lines 357-369 with:

```typescript
/**
 * Clean up resources
 */
destroy(): void {
  this.inputManager.destroy()
}
```

**Step 6: Update loadAssets() to remove keyboard registration**

In `loadAssets()` method, remove lines 117-119:

```typescript
// Register keyboard handler
this.unsubscribeKeyPress = InputService.onKeyPress('s', () => {
  this.handleStart()
})
```

(Keyboard handler is now in setupInputHandlers)

**Step 7: Run tests to verify still passing**

Run: `npm test tests/scenes/TitleScreenScene.test.ts`
Expected: PASS (13 tests)

**Step 8: Commit**

```bash
git add src/scenes/title-screen-scene/TitleScreenScene.ts
git commit -m "refactor(title): use InputManager for event handling"
```

---

## Task 9: Implement CastleMenuScene - Write Tests First

**Files:**
- Create: `tests/scenes/CastleMenuScene.test.ts`

**Step 1: Write comprehensive test suite**

Create `tests/scenes/CastleMenuScene.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CastleMenuScene } from '../../src/scenes/castle-menu-scene/CastleMenuScene'
import { SceneType } from '../../src/types/SceneType'

describe('CastleMenuScene', () => {
  let scene: CastleMenuScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new CastleMenuScene()
  })

  afterEach(() => {
    scene.destroy?.()
  })

  it('should have correct scene type', () => {
    expect(scene.type).toBe(SceneType.CASTLE_MENU)
  })

  describe('init', () => {
    it('should initialize canvas reference', async () => {
      await scene.init(canvas, ctx)
      expect(scene['canvas']).toBe(canvas)
    })

    it('should create input manager', async () => {
      await scene.init(canvas, ctx)
      expect(scene['inputManager']).toBeDefined()
    })

    it('should have 5 menu items', async () => {
      await scene.init(canvas, ctx)
      expect(scene['menuItems'].length).toBe(5)
    })

    it('should have all required menu options', async () => {
      await scene.init(canvas, ctx)
      const keys = scene['menuItems'].map(item => item.key)
      expect(keys).toContain('g')
      expect(keys).toContain('t')
      expect(keys).toContain('b')
      expect(keys).toContain('a')
      expect(keys).toContain('e')
    })
  })

  describe('enter', () => {
    it('should set mode to READY', async () => {
      await scene.init(canvas, ctx)
      scene.enter()
      expect(scene['mode']).toBe('READY')
    })
  })

  describe('update', () => {
    it('should update hover states', async () => {
      await scene.init(canvas, ctx)
      scene['mouseX'] = 400
      scene['mouseY'] = 250

      scene.update(16)

      // Should have updated hover states based on mouse position
      expect(scene['menuItems'].some(item => item.hovered !== undefined)).toBe(true)
    })
  })

  describe('render', () => {
    it('should clear screen with background color', async () => {
      await scene.init(canvas, ctx)
      const fillRectSpy = vi.spyOn(ctx, 'fillRect')

      scene.render(ctx)

      expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 800, 600)
    })

    it('should render title text', async () => {
      await scene.init(canvas, ctx)
      const fillTextSpy = vi.spyOn(ctx, 'fillText')

      scene.render(ctx)

      expect(fillTextSpy).toHaveBeenCalledWith('CASTLE', expect.any(Number), expect.any(Number))
    })
  })

  describe('destroy', () => {
    it('should destroy input manager', async () => {
      await scene.init(canvas, ctx)
      const destroySpy = vi.spyOn(scene['inputManager'], 'destroy')

      scene.destroy?.()

      expect(destroySpy).toHaveBeenCalled()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/scenes/CastleMenuScene.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Commit test file**

```bash
git add tests/scenes/CastleMenuScene.test.ts
git commit -m "test(castle): add CastleMenuScene tests (failing)"
```

---

## Task 10: Implement CastleMenuScene - Basic Structure

**Files:**
- Create: `src/scenes/castle-menu-scene/CastleMenuScene.ts`

**Step 1: Create basic CastleMenuScene class**

Create `src/scenes/castle-menu-scene/CastleMenuScene.ts`:

```typescript
/**
 * CastleMenuScene - Central hub for all town services and dungeon access
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { MenuRenderer, MenuItem } from '../../ui/renderers/MenuRenderer'
import { TextRenderer } from '../../ui/renderers/TextRenderer'
import { COLORS, TYPOGRAPHY } from '../../ui/theme'

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
    this.menuItems.forEach(item => {
      this.inputManager.onKeyPress(item.key, () => this.handleNavigation(item.key))
    })

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

  private async handleNavigation(_key: string): Promise<void> {
    // TODO: Implement navigation commands
  }

  private handleMouseClick(_x: number, _y: number): void {
    // TODO: Implement mouse click handling
  }

  private updateHoverStates(): void {
    // TODO: Implement hover state updates
  }

  destroy(): void {
    this.inputManager.destroy()
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `npm test tests/scenes/CastleMenuScene.test.ts`
Expected: PASS (11 tests)

**Step 3: Commit**

```bash
git add src/scenes/castle-menu-scene/CastleMenuScene.ts
git commit -m "feat(castle): implement CastleMenuScene basic structure"
```

---

## Task 11: Implement CastleMenuScene - Mouse Interaction

**Files:**
- Modify: `src/scenes/castle-menu-scene/CastleMenuScene.ts:96-103`

**Step 1: Implement hover state updates**

Replace the `updateHoverStates` method:

```typescript
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
```

**Step 2: Implement mouse click handling**

Replace the `handleMouseClick` method:

```typescript
private handleMouseClick(x: number, y: number): void {
  const clickedItem = this.getMenuItemAtPosition(x, y)
  if (clickedItem) {
    this.handleNavigation(clickedItem.key)
  }
}
```

**Step 3: Run tests to verify still passing**

Run: `npm test tests/scenes/CastleMenuScene.test.ts`
Expected: PASS (11 tests)

**Step 4: Commit**

```bash
git add src/scenes/castle-menu-scene/CastleMenuScene.ts
git commit -m "feat(castle): implement mouse hover and click handling"
```

---

## Task 12: Register CastleMenuScene in SceneManager

**Files:**
- Modify: `src/managers/SceneManager.ts:106-116`

**Step 1: Verify SceneManager already has CastleMenuScene registered**

Check `src/managers/SceneManager.ts` line 111 - it should already import and use CastleMenuScene.

If it does, skip to step 3.

**Step 2: If not registered, add it now**

This should not be necessary based on existing code, but if needed:

```typescript
case SceneType.CASTLE_MENU:
  return new CastleMenuScene()
```

**Step 3: Run SceneManager tests**

Run: `npm test tests/managers/SceneManager.test.ts`
Expected: PASS (all tests)

**Step 4: Commit if changes were made**

```bash
# Only if you had to add registration
git add src/managers/SceneManager.ts
git commit -m "chore(scene): register CastleMenuScene in SceneManager"
```

---

## Task 13: Create NavigateToTavernCommand - Tests First

**Files:**
- Create: `tests/scenes/castle-menu-scene/commands/NavigateToTavernCommand.test.ts`

**Step 1: Write test suite**

Create directory and test file:

```bash
mkdir -p tests/scenes/castle-menu-scene/commands
```

Create `tests/scenes/castle-menu-scene/commands/NavigateToTavernCommand.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NavigateToTavernCommand } from '../../../../src/scenes/castle-menu-scene/commands/NavigateToTavernCommand'
import { SceneType } from '../../../../src/types/SceneType'
import { SaveService } from '../../../../src/services/SaveService'
import { SceneNavigationService } from '../../../../src/services/SceneNavigationService'

describe('NavigateToTavernCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('should fail if already transitioning', async () => {
      const result = await NavigateToTavernCommand.execute({ mode: 'TRANSITIONING' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Transition already in progress')
      expect(result.nextScene).toBe(SceneType.CASTLE_MENU)
    })

    it('should save game before navigation', async () => {
      const saveGameSpy = vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo').mockResolvedValue()

      await NavigateToTavernCommand.execute({ mode: 'READY' })

      expect(saveGameSpy).toHaveBeenCalled()
      expect(transitionSpy).toHaveBeenCalledWith(
        SceneType.TAVERN,
        expect.objectContaining({
          fadeTime: 300,
          data: { fromCastle: true }
        })
      )
    })

    it('should transition to TAVERN scene', async () => {
      vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo').mockResolvedValue()

      const result = await NavigateToTavernCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(true)
      expect(result.nextScene).toBe(SceneType.TAVERN)
      expect(transitionSpy).toHaveBeenCalledWith(SceneType.TAVERN, expect.any(Object))
    })

    it('should return error if save fails', async () => {
      vi.spyOn(SaveService, 'saveGame').mockRejectedValue(new Error('Save failed'))

      const result = await NavigateToTavernCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Save failed')
      expect(result.nextScene).toBe(SceneType.CASTLE_MENU)
    })

    it('should return error if navigation fails', async () => {
      vi.spyOn(SaveService, 'saveGame').mockResolvedValue()
      vi.spyOn(SceneNavigationService, 'transitionTo').mockRejectedValue(new Error('Navigation failed'))

      const result = await NavigateToTavernCommand.execute({ mode: 'READY' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Navigation failed')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/scenes/castle-menu-scene/commands/NavigateToTavernCommand.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Commit test file**

```bash
git add tests/scenes/castle-menu-scene/commands/NavigateToTavernCommand.test.ts
git commit -m "test(castle): add NavigateToTavernCommand tests (failing)"
```

---

## Task 14: Implement NavigateToTavernCommand

**Files:**
- Create: `src/scenes/castle-menu-scene/commands/NavigateToTavernCommand.ts`

**Step 1: Create command implementation**

Create directory:

```bash
mkdir -p src/scenes/castle-menu-scene/commands
```

Create `src/scenes/castle-menu-scene/commands/NavigateToTavernCommand.ts`:

```typescript
/**
 * NavigateToTavernCommand - Navigate from Castle Menu to Tavern
 */

import { SceneType } from '../../../types/SceneType'
import { SaveService } from '../../../services/SaveService'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

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

**Step 2: Run test to verify it passes**

Run: `npm test tests/scenes/castle-menu-scene/commands/NavigateToTavernCommand.test.ts`
Expected: PASS (5 tests)

**Step 3: Commit**

```bash
git add src/scenes/castle-menu-scene/commands/NavigateToTavernCommand.ts
git commit -m "feat(castle): implement NavigateToTavernCommand"
```

---

## Task 15: Create Remaining Navigation Commands

**Note:** These are identical to NavigateToTavernCommand except for the destination scene type. Create them in sequence.

### NavigateToTempleCommand

**Files:**
- Create: `src/scenes/castle-menu-scene/commands/NavigateToTempleCommand.ts`
- Create: `tests/scenes/castle-menu-scene/commands/NavigateToTempleCommand.test.ts`

Copy NavigateToTavernCommand files and replace:
- `NavigateToTavernCommand` → `NavigateToTempleCommand`
- `SceneType.TAVERN` → `SceneType.TEMPLE`

**Commit:**
```bash
git add src/scenes/castle-menu-scene/commands/NavigateToTempleCommand.ts tests/scenes/castle-menu-scene/commands/NavigateToTempleCommand.test.ts
git commit -m "feat(castle): implement NavigateToTempleCommand"
```

### NavigateToShopCommand

**Files:**
- Create: `src/scenes/castle-menu-scene/commands/NavigateToShopCommand.ts`
- Create: `tests/scenes/castle-menu-scene/commands/NavigateToShopCommand.test.ts`

Copy and replace:
- `NavigateToTavernCommand` → `NavigateToShopCommand`
- `SceneType.TAVERN` → `SceneType.SHOP`

**Commit:**
```bash
git add src/scenes/castle-menu-scene/commands/NavigateToShopCommand.ts tests/scenes/castle-menu-scene/commands/NavigateToShopCommand.test.ts
git commit -m "feat(castle): implement NavigateToShopCommand"
```

### NavigateToInnCommand

**Files:**
- Create: `src/scenes/castle-menu-scene/commands/NavigateToInnCommand.ts`
- Create: `tests/scenes/castle-menu-scene/commands/NavigateToInnCommand.test.ts`

Copy and replace:
- `NavigateToTavernCommand` → `NavigateToInnCommand`
- `SceneType.TAVERN` → `SceneType.INN`

**Commit:**
```bash
git add src/scenes/castle-menu-scene/commands/NavigateToInnCommand.ts tests/scenes/castle-menu-scene/commands/NavigateToInnCommand.test.ts
git commit -m "feat(castle): implement NavigateToInnCommand"
```

### NavigateToEdgeOfTownCommand

**Files:**
- Create: `src/scenes/castle-menu-scene/commands/NavigateToEdgeOfTownCommand.ts`
- Create: `tests/scenes/castle-menu-scene/commands/NavigateToEdgeOfTownCommand.test.ts`

Copy and replace:
- `NavigateToTavernCommand` → `NavigateToEdgeOfTownCommand`
- `SceneType.TAVERN` → `SceneType.EDGE_OF_TOWN`

**Commit:**
```bash
git add src/scenes/castle-menu-scene/commands/NavigateToEdgeOfTownCommand.ts tests/scenes/castle-menu-scene/commands/NavigateToEdgeOfTownCommand.test.ts
git commit -m "feat(castle): implement NavigateToEdgeOfTownCommand"
```

---

## Task 16: Wire Commands to CastleMenuScene

**Files:**
- Modify: `src/scenes/castle-menu-scene/CastleMenuScene.ts:10-15,90-98`

**Step 1: Add command imports**

Add after other imports:

```typescript
import { NavigateToTavernCommand } from './commands/NavigateToTavernCommand'
import { NavigateToTempleCommand } from './commands/NavigateToTempleCommand'
import { NavigateToShopCommand } from './commands/NavigateToShopCommand'
import { NavigateToInnCommand } from './commands/NavigateToInnCommand'
import { NavigateToEdgeOfTownCommand } from './commands/NavigateToEdgeOfTownCommand'
```

**Step 2: Implement handleNavigation method**

Replace the `handleNavigation` method:

```typescript
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
```

**Step 3: Run Castle Menu tests**

Run: `npm test tests/scenes/CastleMenuScene.test.ts`
Expected: PASS (11 tests)

**Step 4: Run all tests**

Run: `npm test`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/scenes/castle-menu-scene/CastleMenuScene.ts
git commit -m "feat(castle): wire navigation commands to scene"
```

---

## Task 17: Final Verification and Integration Test

**Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests passing

**Step 2: Verify test coverage**

Run: `npm test -- --coverage`
Check that new files have good coverage (>80%)

**Step 3: Manual verification checklist**

- [ ] Theme constants exported from `src/ui/theme.ts`
- [ ] TextRenderer, ButtonRenderer, MenuRenderer in `src/ui/renderers/`
- [ ] InputManager in `src/ui/managers/`
- [ ] TitleScreenScene refactored to use framework
- [ ] CastleMenuScene implemented in `src/scenes/castle-menu-scene/`
- [ ] All 5 navigation commands in `src/scenes/castle-menu-scene/commands/`
- [ ] Tests for all new components
- [ ] All tests passing

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```

---

## Success Criteria

- ✅ UI framework in place (theme, renderers, input manager)
- ✅ All framework components have tests (80%+ coverage)
- ✅ TitleScreenScene refactored to use framework (tests still passing)
- ✅ CastleMenuScene implemented and functional
- ✅ All 5 navigation commands working
- ✅ Auto-save occurs before each town service transition
- ✅ All unit tests passing
- ✅ No regressions in existing tests
- ✅ Clean commit history with descriptive messages

## Next Steps

After this plan is complete:
1. Use @superpowers:finishing-a-development-branch to handle PR creation
2. Implement placeholder scenes for the 5 town services (Tavern, Temple, Shop, Inn, Edge of Town)
3. Add navigation back to Castle Menu from each service
4. Implement actual functionality for each town service

---

**Implementation Note:** This plan follows TDD rigorously - write tests first, watch them fail, implement minimal code to pass, then commit. Each task is bite-sized (2-5 minutes) and has clear success criteria.
