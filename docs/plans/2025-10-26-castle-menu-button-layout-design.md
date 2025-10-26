# Castle Menu Button Layout & Styling Design

**Date**: 2025-10-26
**Status**: Approved
**Replaces**: Current vertical menu list with text-based MenuRenderer

## Problem Statement

The castle menu currently displays 5 location options in a vertical list using MenuRenderer. This approach:
- Takes up significant vertical space with full location names
- Doesn't leverage the high-contrast button styling from the title screen
- Obscures the background image with a title overlay
- Lacks the visual polish and consistency of the title screen's button design

## Design Goals

1. **Visual Consistency**: Reuse the proven high-contrast button styling from title screen
2. **Background Showcase**: Maximize visibility of the castle background image
3. **Horizontal Layout**: Arrange all 5 location buttons in a single row at the bottom
4. **Abbreviated Labels**: Use short, clear location names to fit the horizontal layout
5. **Code Reuse**: Leverage existing ButtonRenderer without new components

## Visual Design

### Button Specifications

Each location button uses title screen's high-contrast styling:

- **Size**: BUTTON_SIZES.SMALL (150×40px)
- **Background**: `rgba(0, 0, 0, 0.7)` (semi-transparent black)
- **Border**: `rgba(255, 255, 255, 0.9)` (bright white, 2px)
- **Text**: Monospace, 20px, white
- **States**: normal, hover, disabled (same as title screen)

### Button Labels

Abbreviated to fit horizontal layout while maintaining clarity:

| Key | Full Name | Abbreviated Label |
|-----|-----------|------------------|
| G | Gilgamesh's Tavern | (G)TAVERN |
| T | Temple of Cant | (T)EMPLE |
| B | Boltac's Trading Post | (B)SHOP |
| A | Adventurer's Inn | (A)INN |
| E | Edge of Town | (E)DGE |

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [BACKGROUND IMAGE]                       │
│                 (aspect-ratio scaled, full)                 │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [TAVERN] [TEMPLE] [SHOP] [INN] [EDGE]  ← 20px spacing     │
│     ↑                                                       │
│  40px from bottom, centered horizontally                    │
└─────────────────────────────────────────────────────────────┘
```

**Dimensions**:
- Total button row width: (150 × 5) + (20 × 4) = 830px
- Vertical position: 40px margin from bottom edge
- Horizontal centering: `(canvas.width - 830) / 2`

## Code Architecture

### Data Structure Changes

**Remove**:
```typescript
private menuItems: MenuItem[]  // From MenuRenderer
```

**Add**:
```typescript
interface ButtonState {
  x: number
  y: number
  width: number
  height: number
  text: string
  key: string
  disabled: boolean
  hovered: boolean
}

private buttons: ButtonState[] = [
  { x: 0, y: 0, width: 150, height: 40, text: '(G)TAVERN', key: 'g', disabled: false, hovered: false },
  { x: 0, y: 0, width: 150, height: 40, text: '(T)EMPLE', key: 't', disabled: false, hovered: false },
  { x: 0, y: 0, width: 150, height: 40, text: '(B)SHOP', key: 'b', disabled: false, hovered: false },
  { x: 0, y: 0, width: 150, height: 40, text: '(A)INN', key: 'a', disabled: false, hovered: false },
  { x: 0, y: 0, width: 150, height: 40, text: '(E)DGE', key: 'e', disabled: false, hovered: false }
]
```

### Initialization (`init()`)

Calculate button positions based on canvas dimensions:

```typescript
async init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void> {
  this.canvas = canvas
  this.inputManager = new SceneInputManager()

  // Calculate button layout
  const BUTTON_SPACING = 20
  const BUTTON_WIDTH = BUTTON_SIZES.SMALL.width  // 150
  const BUTTON_HEIGHT = BUTTON_SIZES.SMALL.height // 40
  const BOTTOM_MARGIN = 40

  const totalWidth = (BUTTON_WIDTH * 5) + (BUTTON_SPACING * 4)
  const startX = (canvas.width - totalWidth) / 2
  const buttonY = canvas.height - BOTTOM_MARGIN - BUTTON_HEIGHT

  // Position each button
  this.buttons.forEach((button, index) => {
    button.x = startX + (index * (BUTTON_WIDTH + BUTTON_SPACING))
    button.y = buttonY
  })

  // Load background image
  this.backgroundImage = await AssetLoadingService.loadCastleMenuAssets()

  // Register keyboard and mouse handlers
  this.setupInputHandlers()
}
```

### Rendering (`render()`)

Replace MenuRenderer with ButtonRenderer loop:

```typescript
render(ctx: CanvasRenderingContext2D): void {
  // 1. Clear screen
  ctx.fillStyle = COLORS.BACKGROUND
  ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

  // 2. Draw background image
  if (this.backgroundImage) {
    this.drawBackground(ctx)
  }

  // 3. Draw buttons (NO title text)
  this.buttons.forEach(button => {
    const state = button.disabled ? 'disabled' : (button.hovered ? 'hover' : 'normal')

    ButtonRenderer.renderButton(ctx, {
      x: button.x,
      y: button.y,
      width: button.width,
      height: button.height,
      text: button.text,
      state,
      showPulse: false  // No pulse animation for menu buttons
    })
  })
}
```

### Update Loop (`update()`)

Update hover states for all buttons:

```typescript
update(deltaTime: number): void {
  // Update hover states based on mouse position
  this.buttons.forEach(button => {
    button.hovered = this.isPointInButton(this.mouseX, this.mouseY, button)
  })
}

private isPointInButton(x: number, y: number, button: ButtonState): boolean {
  return x >= button.x &&
         x <= button.x + button.width &&
         y >= button.y &&
         y <= button.y + button.height
}
```

### Mouse Click Handling

Find and trigger clicked button:

```typescript
private handleMouseClick(x: number, y: number): void {
  const clickedButton = this.buttons.find(btn =>
    this.isPointInButton(x, y, btn) && !btn.disabled
  )

  if (clickedButton) {
    this.handleNavigation(clickedButton.key)
  }
}
```

## Implementation Checklist

- [ ] Update `ButtonState` interface (add `key` field)
- [ ] Replace `menuItems` with `buttons` array in CastleMenuScene
- [ ] Update `init()` to calculate button positions
- [ ] Update `render()` to use ButtonRenderer instead of MenuRenderer
- [ ] Update `update()` to track hover for all buttons
- [ ] Update `handleMouseClick()` to find clicked button
- [ ] Remove `getMenuItemAtPosition()` method (replaced by button click detection)
- [ ] Remove TextRenderer call for 'CASTLE' title
- [ ] Update tests to expect buttons instead of menu items
- [ ] Verify keyboard shortcuts still work (g, t, b, a, e)
- [ ] Test hover states on all 5 buttons
- [ ] Verify background image remains visible

## Testing Approach

### Unit Tests (CastleMenuScene.test.ts)

Update existing tests:

```typescript
it('should have 5 buttons', async () => {
  await scene.init(canvas, ctx)
  expect(scene['buttons'].length).toBe(5)
})

it('should position buttons horizontally at bottom', async () => {
  await scene.init(canvas, ctx)
  const buttons = scene['buttons']

  // All buttons at same Y position
  const buttonY = buttons[0].y
  buttons.forEach(btn => expect(btn.y).toBe(buttonY))

  // Buttons spaced 20px apart
  for (let i = 0; i < buttons.length - 1; i++) {
    const spacing = buttons[i + 1].x - (buttons[i].x + buttons[i].width)
    expect(spacing).toBe(20)
  }
})

it('should use abbreviated button labels', async () => {
  await scene.init(canvas, ctx)
  const labels = scene['buttons'].map(btn => btn.text)
  expect(labels).toEqual(['(G)TAVERN', '(T)EMPLE', '(B)SHOP', '(A)INN', '(E)DGE'])
})
```

### Visual Verification

1. Run dev server and navigate to castle menu
2. Verify 5 buttons appear at bottom in horizontal row
3. Check hover states change on mouse movement
4. Click each button and verify navigation works
5. Press keyboard shortcuts (g, t, b, a, e) and verify navigation
6. Confirm background image is clearly visible
7. Verify no 'CASTLE' title text appears

## Design Rationale

### Why Floating Buttons Over Menu List?

**Consistency**: Title screen proves the high-contrast button pattern works well. Reusing it creates visual continuity.

**Simplicity**: ButtonRenderer already exists and is well-tested. No new components needed.

**Clarity**: Individual buttons with clear boundaries are easier to click than text-based menu items.

### Why Abbreviated Labels?

**Space Efficiency**: Full names like "GILGAMESH'S TAVERN" wouldn't fit 5 buttons in one row without tiny text or massive buttons.

**Recognizability**: Core location type (TAVERN, TEMPLE, SHOP, etc.) is what players need to identify quickly.

**Hotkey Emphasis**: Keeping (G), (T), etc. visible maintains keyboard shortcut discoverability.

### Why No Title Text?

**Background Showcase**: The background image is the visual identity of this scene. Overlaying text diminishes it.

**Context Clear**: Players know they're in the castle from the background image and available locations.

**Cleaner Design**: Less visual clutter = more focus on the navigation options.

### Why No Pulse Animation?

**Different Context**: Title screen's pulse says "press this to start." Menu buttons are navigation options, not calls-to-action.

**Visual Calm**: Five pulsing buttons would be distracting. Static buttons feel more menu-like.

**Performance**: Fewer animations = simpler update loop.

## Migration Notes

### Breaking Changes

- `menuItems: MenuItem[]` removed - use `buttons: ButtonState[]`
- MenuRenderer no longer used in CastleMenuScene
- Button labels are now abbreviated
- Title text rendering removed

### Backwards Compatibility

- Keyboard shortcuts unchanged (g, t, b, a, e)
- Navigation commands unchanged
- Scene lifecycle unchanged
- Background image rendering unchanged

### Rollback Plan

If needed, revert to previous version:
1. Restore `menuItems` array with full names
2. Replace ButtonRenderer calls with MenuRenderer
3. Re-add title text rendering
4. Revert tests to check menu items instead of buttons

## Future Enhancements

Not in this design, but possible later:

- **Button Animations**: Subtle scale on hover (1.05x)
- **Sound Effects**: Click/hover sounds
- **Tooltips**: Show full location names on hover
- **Keyboard Hints**: Visual indicator for currently-focused button
- **Responsive Sizing**: Adjust button count/size based on canvas width
