# Castle Menu Button Layout - Implementation Plan

**Date**: 2025-10-26
**Design Document**: [2025-10-26-castle-menu-button-layout-design.md](./2025-10-26-castle-menu-button-layout-design.md)
**Estimated Time**: 60-90 minutes
**Approach**: Test-Driven Development (TDD)

## Overview

This plan implements the horizontal button layout for the castle menu scene, replacing the vertical MenuRenderer with ButtonRenderer-based floating buttons. Each task is designed to take 2-5 minutes and follows RED-GREEN-REFACTOR cycle.

## Prerequisites

Before starting:
- [ ] Read the design document: `docs/plans/2025-10-26-castle-menu-button-layout-design.md`
- [ ] Verify tests are running fast: `killall -9 node 2>/dev/null || true && npm test -- --run`
- [ ] Ensure you're on a clean branch: `git status`

---

## Task 1: Add `key` field to ButtonState interface (5 min)

**Goal**: Extend ButtonState to support keyboard shortcuts

**File**: `src/ui/theme.ts` (or create `src/types/ButtonState.ts` if ButtonState doesn't exist in theme.ts)

**Current State**: ButtonState may exist in title screen implementation or needs to be created

**Steps**:

1. **RED**: Write test first
   - File: `tests/ui/ButtonState.test.ts` (create if needed)
   ```typescript
   import { describe, it, expect } from 'vitest'
   import { ButtonState } from '../../src/types/ButtonState'

   describe('ButtonState', () => {
     it('should have all required fields including key', () => {
       const button: ButtonState = {
         x: 100,
         y: 200,
         width: 150,
         height: 40,
         text: 'TEST',
         key: 't',
         disabled: false,
         hovered: false
       }

       expect(button.key).toBe('t')
       expect(button.text).toBe('TEST')
     })
   })
   ```

2. **GREEN**: Add `key` field to ButtonState
   - File: `src/types/ButtonState.ts` (create this file)
   ```typescript
   /**
    * Button state for interactive UI buttons
    */
   export interface ButtonState {
     x: number
     y: number
     width: number
     height: number
     text: string
     key: string          // ← NEW: keyboard shortcut key
     disabled: boolean
     hovered: boolean
   }
   ```

3. **VERIFY**:
   ```bash
   npm test -- ButtonState
   ```

**Success Criteria**: Test passes, ButtonState has `key` field

---

## Task 2: Update CastleMenuScene tests to expect buttons array (10 min)

**Goal**: Update existing tests to work with new button-based architecture

**File**: `tests/scenes/CastleMenuScene.test.ts`

**Current State**: Tests expect `menuItems` array with MenuItem objects

**Steps**:

1. **RED**: Update tests to fail with new expectations
   ```typescript
   // Replace lines 48-61 in CastleMenuScene.test.ts
   it('should have 5 buttons', async () => {
     await scene.init(canvas, ctx)
     expect(scene['buttons'].length).toBe(5)
   })

   it('should have all required navigation keys', async () => {
     await scene.init(canvas, ctx)
     const keys = scene['buttons'].map(btn => btn.key)
     expect(keys).toContain('g')
     expect(keys).toContain('t')
     expect(keys).toContain('b')
     expect(keys).toContain('a')
     expect(keys).toContain('e')
   })

   it('should use abbreviated button labels', async () => {
     await scene.init(canvas, ctx)
     const labels = scene['buttons'].map(btn => btn.text)
     expect(labels).toEqual(['(G)TAVERN', '(T)EMPLE', '(B)SHOP', '(A)INN', '(E)DGE'])
   })

   it('should position buttons horizontally at bottom', async () => {
     await scene.init(canvas, ctx)
     const buttons = scene['buttons']

     // All buttons at same Y position
     const buttonY = buttons[0].y
     buttons.forEach(btn => expect(btn.y).toBe(buttonY))

     // Buttons should be near bottom (within 100px of canvas height)
     expect(buttonY).toBeGreaterThan(canvas.height - 100)

     // Buttons spaced 20px apart
     for (let i = 0; i < buttons.length - 1; i++) {
       const spacing = buttons[i + 1].x - (buttons[i].x + buttons[i].width)
       expect(spacing).toBe(20)
     }
   })
   ```

2. **VERIFY**: Tests should fail
   ```bash
   npm test -- CastleMenuScene
   # Expected: Tests fail because buttons array doesn't exist yet
   ```

**Success Criteria**: Tests fail with clear error about missing `buttons` property

---

## Task 3: Replace menuItems with buttons array in CastleMenuScene (8 min)

**Goal**: Replace the MenuRenderer data structure with ButtonRenderer data structure

**File**: `src/scenes/castle-menu-scene/CastleMenuScene.ts`

**Steps**:

1. **GREEN**: Replace data structure
   ```typescript
   // At top of file, add import
   import { ButtonState } from '../../types/ButtonState'
   import { BUTTON_SIZES } from '../../ui/theme'

   // Replace lines 31-37 (menuItems array) with:
   private buttons: ButtonState[] = [
     { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(G)TAVERN', key: 'g', disabled: false, hovered: false },
     { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(T)EMPLE', key: 't', disabled: false, hovered: false },
     { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(B)SHOP', key: 'b', disabled: false, hovered: false },
     { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(A)INN', key: 'a', disabled: false, hovered: false },
     { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(E)DGE', key: 'e', disabled: false, hovered: false }
   ]
   ```

2. **VERIFY**: Some tests may now pass
   ```bash
   npm test -- CastleMenuScene
   ```

**Success Criteria**: "should have 5 buttons" and "should have all required navigation keys" tests pass

---

## Task 4: Update init() to calculate button positions (10 min)

**Goal**: Position buttons horizontally at bottom of canvas

**File**: `src/scenes/castle-menu-scene/CastleMenuScene.ts`

**Steps**:

1. **GREEN**: Update init() method (lines 39-61)
   ```typescript
   async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
     this.canvas = canvas
     this.inputManager = new SceneInputManager()

     // Calculate button layout
     const BUTTON_SPACING = 20
     const BUTTON_WIDTH = BUTTON_SIZES.SMALL.width   // 150
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
     try {
       this.backgroundImage = await AssetLoadingService.loadCastleMenuAssets()
     } catch (error) {
       console.error('Failed to load castle menu background:', error)
     }

     // Register keyboard shortcuts
     this.buttons.forEach(button => {
       this.inputManager.onKeyPress(button.key, () => this.handleNavigation(button.key))
     })

     // Register mouse handlers
     this.inputManager.onMouseMove(canvas, (x, y) => {
       this.mouseX = x
       this.mouseY = y
     })
     this.inputManager.onMouseClick(canvas, (x, y) => this.handleMouseClick(x, y))
   }
   ```

2. **VERIFY**: Position tests should now pass
   ```bash
   npm test -- CastleMenuScene
   ```

**Success Criteria**: "should position buttons horizontally at bottom" test passes

---

## Task 5: Update render() to use ButtonRenderer (8 min)

**Goal**: Replace MenuRenderer with ButtonRenderer in render loop

**File**: `src/scenes/castle-menu-scene/CastleMenuScene.ts`

**Steps**:

1. **GREEN**: Update render() method (lines 71-102)
   ```typescript
   // Add import at top
   import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'

   // Replace render() method
   render(ctx: CanvasRenderingContext2D): void {
     // Clear screen with background color
     ctx.fillStyle = COLORS.BACKGROUND
     ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

     // Draw background image if loaded
     if (this.backgroundImage) {
       this.drawBackground(ctx)
     }

     // Draw buttons (NO title text)
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

2. **Remove unused imports**:
   ```typescript
   // Remove these lines from top of file:
   // import { MenuRenderer, MenuItem } from '../../ui/renderers/MenuRenderer'
   // import { TextRenderer } from '../../ui/renderers/TextRenderer'
   ```

3. **VERIFY**: Run tests
   ```bash
   npm test -- CastleMenuScene
   ```

4. **Update test for removed title**:
   - File: `tests/scenes/CastleMenuScene.test.ts`
   - Remove or update lines 95-102 (the "should render title text" test)
   ```typescript
   // Replace test with:
   it('should render buttons using ButtonRenderer', async () => {
     await scene.init(canvas, ctx)
     const fillRectSpy = vi.spyOn(ctx, 'fillRect')

     scene.render(ctx)

     // Should clear screen and render buttons (multiple fillRect calls)
     expect(fillRectSpy).toHaveBeenCalled()
   })
   ```

**Success Criteria**: Tests pass, no title text rendered, buttons render correctly

---

## Task 6: Update update() for button hover tracking (5 min)

**Goal**: Update hover states for all buttons based on mouse position

**File**: `src/scenes/castle-menu-scene/CastleMenuScene.ts`

**Steps**:

1. **GREEN**: Update update() method (lines 67-69)
   ```typescript
   update(_deltaTime: number): void {
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

2. **Remove old hover method**: Delete `updateHoverStates()` method (lines 178-186) since it's replaced

3. **VERIFY**: Hover test should still pass
   ```bash
   npm test -- CastleMenuScene
   ```

**Success Criteria**: Hover detection works correctly with button boundaries

---

## Task 7: Update handleMouseClick() for button detection (5 min)

**Goal**: Simplify mouse click handling to use button boundaries

**File**: `src/scenes/castle-menu-scene/CastleMenuScene.ts`

**Steps**:

1. **GREEN**: Update handleMouseClick() method (lines 171-176)
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

2. **Remove old method**: Delete `getMenuItemAtPosition()` method (lines 188-206) - no longer needed

3. **VERIFY**: Tests should pass
   ```bash
   npm test -- CastleMenuScene
   ```

**Success Criteria**: Mouse clicks correctly trigger navigation for clicked buttons

---

## Task 8: Add button hover test (5 min)

**Goal**: Verify hover states update correctly on mouse movement

**File**: `tests/scenes/CastleMenuScene.test.ts`

**Steps**:

1. **RED**: Add new test
   ```typescript
   it('should update button hover states on mouse movement', async () => {
     await scene.init(canvas, ctx)
     const buttons = scene['buttons']

     // Initially no buttons hovered
     expect(buttons.every(btn => !btn.hovered)).toBe(true)

     // Move mouse over first button
     scene['mouseX'] = buttons[0].x + 10
     scene['mouseY'] = buttons[0].y + 10
     scene.update(16)

     // First button should be hovered
     expect(buttons[0].hovered).toBe(true)
     expect(buttons.slice(1).every(btn => !btn.hovered)).toBe(true)

     // Move mouse to second button
     scene['mouseX'] = buttons[1].x + 10
     scene['mouseY'] = buttons[1].y + 10
     scene.update(16)

     // Second button should be hovered, first should not
     expect(buttons[0].hovered).toBe(false)
     expect(buttons[1].hovered).toBe(true)
   })
   ```

2. **VERIFY**: Test should pass (implementation already complete)
   ```bash
   npm test -- CastleMenuScene
   ```

**Success Criteria**: Hover test passes

---

## Task 9: Add button click test (5 min)

**Goal**: Verify mouse clicks on buttons trigger navigation

**File**: `tests/scenes/CastleMenuScene.test.ts`

**Steps**:

1. **RED**: Add new test
   ```typescript
   it('should handle button clicks', async () => {
     await scene.init(canvas, ctx)
     const buttons = scene['buttons']

     // Mock the navigation command
     const navigateSpy = vi.spyOn(scene as any, 'handleNavigation')

     // Click on second button (TEMPLE)
     await scene['handleMouseClick'](buttons[1].x + 10, buttons[1].y + 10)

     // Should have called handleNavigation with 't' key
     expect(navigateSpy).toHaveBeenCalledWith('t')
   })
   ```

2. **VERIFY**: Test should pass
   ```bash
   npm test -- CastleMenuScene
   ```

**Success Criteria**: Click handling test passes

---

## Task 10: Visual verification in browser (10 min)

**Goal**: Manually verify the UI looks correct

**Steps**:

1. **Run dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to castle menu**:
   - Open browser to `http://localhost:5173`
   - Click "START" button on title screen
   - Should see castle menu

3. **Visual checklist**:
   - [ ] 5 buttons appear in horizontal row at bottom
   - [ ] Buttons show abbreviated labels: (G)TAVERN, (T)EMPLE, (B)SHOP, (A)INN, (E)DGE
   - [ ] Buttons are evenly spaced (20px gaps)
   - [ ] Buttons are centered horizontally
   - [ ] Buttons are 40px from bottom edge
   - [ ] No "CASTLE" title text appears
   - [ ] Background image is fully visible
   - [ ] Buttons have high-contrast styling (black bg, white border)

4. **Interaction checklist**:
   - [ ] Hover over each button - should see hover state (brighter border)
   - [ ] Click each button - should navigate to correct scene
   - [ ] Press keyboard shortcuts (g, t, b, a, e) - should navigate
   - [ ] Buttons should not have pulse animation

5. **Take screenshot** (optional):
   - Save screenshot to `docs/screenshots/castle-menu-buttons.png` for documentation

**Success Criteria**: All visual and interaction checks pass

---

## Task 11: Run full test suite (2 min)

**Goal**: Ensure no regressions in other tests

**Steps**:

1. **Clean up processes and run tests**:
   ```bash
   killall -9 node 2>/dev/null || true && npm test -- --run
   ```

2. **Verify**:
   - All CastleMenuScene tests pass
   - All other tests still pass
   - Test suite runs in < 2.5 seconds

**Success Criteria**: All 131+ tests pass, no regressions

---

## Task 12: Update SceneManager integration tests (5 min)

**Goal**: Ensure scene transitions still work correctly

**File**: `tests/managers/SceneManager.test.ts`

**Steps**:

1. **VERIFY**: Run SceneManager tests
   ```bash
   npm test -- SceneManager
   ```

2. **Check**: Should all pass without changes (castle menu scene changes are internal)

3. **If needed**: Update any tests that specifically check castle menu internals

**Success Criteria**: All SceneManager tests pass

---

## Task 13: Commit changes (5 min)

**Goal**: Commit the implementation with clear message

**Steps**:

1. **Check status**:
   ```bash
   git status
   ```

2. **Review changes**:
   ```bash
   git diff src/scenes/castle-menu-scene/CastleMenuScene.ts
   git diff tests/scenes/CastleMenuScene.test.ts
   ```

3. **Stage changes**:
   ```bash
   git add src/types/ButtonState.ts
   git add src/scenes/castle-menu-scene/CastleMenuScene.ts
   git add tests/scenes/CastleMenuScene.test.ts
   git add tests/ui/ButtonState.test.ts
   ```

4. **Commit**:
   ```bash
   git commit -m "feat: implement horizontal button layout for castle menu

- Replace MenuRenderer with ButtonRenderer
- Use abbreviated button labels: (G)TAVERN, (T)EMPLE, etc.
- Position 5 buttons in horizontal row at bottom (40px margin)
- Remove 'CASTLE' title text to showcase background image
- Update hover and click handling for button-based UI
- Add ButtonState interface with keyboard shortcut support
- Update tests to verify button positioning and interactions"
   ```

5. **Verify commit**:
   ```bash
   git log -1 --stat
   ```

**Success Criteria**: Changes committed with descriptive message

---

## Task 14: Push changes (optional, 2 min)

**Goal**: Push to remote repository

**Steps**:

1. **Push**:
   ```bash
   git push
   ```

2. **Verify**: Check GitHub/remote to see changes

**Success Criteria**: Changes visible on remote

---

## Completion Checklist

After finishing all tasks, verify:

- [ ] All tests pass: `killall -9 node 2>/dev/null || true && npm test -- --run`
- [ ] Test suite runs in < 2.5 seconds
- [ ] Castle menu displays 5 horizontal buttons at bottom
- [ ] Buttons use abbreviated labels with hotkeys
- [ ] No title text appears
- [ ] Background image is fully visible
- [ ] Hover states work correctly
- [ ] Mouse clicks navigate correctly
- [ ] Keyboard shortcuts (g, t, b, a, e) still work
- [ ] Changes committed with clear message
- [ ] No console errors in browser

## Rollback Plan

If issues occur:

```bash
# Revert to previous commit
git log --oneline -5  # Find the commit before changes
git reset --hard <commit-hash>

# Or revert specific commit
git revert HEAD
```

## Notes for Implementation

- **TDD Workflow**: Write tests first (RED), implement minimal code (GREEN), clean up (REFACTOR)
- **Test Fast**: Always use `npm test -- --run` to avoid background processes
- **Visual Verification**: Don't skip the browser testing - UI bugs aren't always caught by unit tests
- **Immutability**: Button state mutations are acceptable for UI-local state (not GameState)
- **Type Safety**: Use ButtonState interface consistently, let TypeScript catch issues

## Estimated Time Breakdown

| Task | Time | Type |
|------|------|------|
| 1. Add key field | 5 min | Code |
| 2. Update tests | 10 min | Test |
| 3. Replace menuItems | 8 min | Code |
| 4. Calculate positions | 10 min | Code |
| 5. Update render | 8 min | Code |
| 6. Update hover | 5 min | Code |
| 7. Update click | 5 min | Code |
| 8. Hover test | 5 min | Test |
| 9. Click test | 5 min | Test |
| 10. Visual verify | 10 min | Manual |
| 11. Full test suite | 2 min | Verify |
| 12. Integration tests | 5 min | Verify |
| 13. Commit | 5 min | Git |
| 14. Push | 2 min | Git |
| **Total** | **85 min** | |

**Buffer**: Add 15-20 minutes for unexpected issues = **~105 minutes total**
