# Maze Scene UI Redesign - Authentic Wizardry Wireframe

**Date:** 2025-11-09
**Status:** Design Complete, Ready for Implementation
**Target Resolution:** 1366×768 (no scrolling required)

## Problem Statement

Current maze scene has three critical issues:
1. **Rendering**: 3D view shows filled green rectangles instead of authentic Wizardry wireframe lines
2. **Layout**: Message log missing/cut off, character cards truncated (only 4 of 6 visible)
3. **Space efficiency**: Excessive horizontal padding, vertical space wasted on Active Spells panel

## Design Goals

1. **Authentic Wizardry 1 visual fidelity**: Pure wireframe rendering (thin green lines, no fills, 1981 Apple II style)
2. **Complete UI visibility**: All 6 character cards, message log, and controls visible without scrolling on 1366×768
3. **Space efficiency**: Reduce padding, maximize information density while maintaining readability

## Design Overview

### Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ MAZE - LEVEL 1        [MILWA: Light (Radius: 3)]      │ 60px
├──────────────────┬──────────────────────────────────────────┤
│                  │  ┌──────┬──────┬──────┐                  │
│   3D WIREFRAME   │  │ Dirk │Michael│ Fred │                 │
│                  │  │  OK  │  OK   │  OK  │                 │
│     CANVAS       │  ├──────┼──────┼──────┤                  │ 450px
│                  │  │William│ Sarah│ Tom  │                 │
│     450×450px    │  │  OK  │  OK   │  OK  │                 │
│                  │  └──────┴──────┴──────┘                  │
├──────────────────┴──────────────────────────────────────────┤
│ RECENT EVENTS:                                               │ 100px
│ > You walk into a wall. Ouch!                                │
│ > You turn left.                                             │
├──────────────────────────────────────────────────────────────┤
│ [W] Forward  [A] Turn Left  [D] Turn Right  [ESC] Camp │ 100px
└──────────────────────────────────────────────────────────────┘

Total vertical: 60 + 450 + 100 + 100 = 710px (fits in 768px with margins)
```

### Key Changes

1. **Active Spells moved to title bar** - Saves 100px vertical space, inline with title
2. **Canvas reduced to 450×450px** - Down from ~600px, still shows 3 tiles deep
3. **Message log spans full width at bottom** - Authentic Wizardry layout, 100px height
4. **Character grid 3×2** - All 6 cards visible in compact grid
5. **Padding reduced** - From 2rem to 0.5rem (saves ~50px horizontal)

## Wireframe Rendering Implementation

### Current Problem

MazeRenderingService generates `fillRect` commands, producing solid green rectangles instead of wireframe outlines.

### Solution: Pure Line-Based Rendering

Replace all `fillRect` commands with `line` commands for authentic wireframe:

```typescript
// BEFORE (wrong):
commands.push({
  type: 'fillRect',
  x: 100, y: 100, width: 200, height: 300,
  color: '#0f0'
});

// AFTER (correct):
const color = getColorForDepth(depth);
const lineWidth = getLineWidthForDepth(depth);

// Draw rectangle as 4 lines
commands.push(
  { type: 'line', x1: 100, y1: 100, x2: 300, y2: 100, color, lineWidth },        // Top
  { type: 'line', x1: 300, y1: 100, x2: 300, y2: 400, color, lineWidth },        // Right
  { type: 'line', x1: 300, y1: 400, x2: 100, y2: 400, color, lineWidth },        // Bottom
  { type: 'line', x1: 100, y1: 400, x2: 100, y2: 100, color, lineWidth }         // Left
);
```

### Depth Perception

Wireframe lines fade and thin with distance:

| Depth | Color | Line Width | Effect |
|-------|-------|------------|--------|
| 1 (closest) | `#0f0` (full green) | 2px | Bright, thick lines |
| 2 (medium) | `#0c0` (dim green) | 1.5px | Slightly faded |
| 3 (farthest) | `#090` (dark green) | 1px | Thin, dark lines |

**Helper functions:**

```typescript
function getColorForDepth(depth: number): string {
  return ['#0f0', '#0c0', '#090'][depth - 1] || '#060';
}

function getLineWidthForDepth(depth: number): number {
  return [2, 1.5, 1][depth - 1] || 1;
}
```

## HTML Structure

```html
<div class="maze-scene">
  <!-- Title bar with Active Spells inline -->
  <app-scene-title [title]="sceneTitle()">
    <div class="active-spells-inline">
      @if (activeSpells().length > 0) {
        @for (spell of activeSpells(); track spell.name) {
          <span class="spell-icon">{{ spell.icon }}</span>
          <span class="spell-text">{{ spell.name }}: {{ spell.description }}</span>
        }
      }
    </div>
  </app-scene-title>

  <!-- Two-column content -->
  <div class="maze-content">
    <!-- Left: Canvas (450×450px) -->
    <div class="maze-viewport">
      <app-maze-view [commands]="drawCommands()" />
    </div>

    <!-- Right: Character grid (3×2) -->
    <div class="party-grid">
      @for (char of partyCharacters(); track char.id) {
        <app-character-card [character]="char" />
      }
    </div>
  </div>

  <!-- Full-width message log -->
  <div class="message-log-section">
    <div class="message-log-header">RECENT EVENTS:</div>
    <app-message-log [messages]="messages()" />
  </div>

  <!-- Footer controls -->
  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)"
  />
</div>
```

## CSS Implementation

```scss
.maze-scene {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--crt-black);
  color: var(--crt-green);
  padding: 0.5rem;  // Reduced from 1rem
}

.maze-content {
  display: grid;
  grid-template-columns: 450px 1fr;  // Fixed canvas, flexible cards
  gap: 0.75rem;  // Reduced from 1rem
  height: 450px;
  margin-bottom: 0.5rem;
}

.maze-viewport {
  width: 450px;
  height: 450px;
  border: var(--crt-border);
  background: var(--crt-black);

  app-maze-view {
    width: 100%;
    height: 100%;
  }
}

.party-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 0.5rem;

  app-character-card {
    min-height: 0;  // Allow cards to shrink to fit
  }
}

.message-log-section {
  height: 100px;
  border: var(--crt-border);
  padding: 0.5rem;
  margin-bottom: 0.5rem;

  .message-log-header {
    font-weight: bold;
    margin-bottom: 0.25rem;
    color: var(--crt-green);
  }

  app-message-log {
    height: calc(100% - 1.5rem);  // Subtract header height
    max-height: calc(100% - 1.5rem);
    overflow-y: auto;
  }
}

// Active spells in title bar
.active-spells-inline {
  display: inline-flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.9rem;
  margin-left: 2rem;

  .spell-icon {
    margin-right: 0.25rem;
  }

  .spell-text {
    color: var(--crt-green-dim);
  }
}
```

## Component Changes

### MazeRenderingService

**File:** `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts`

**Changes:**
1. Replace all `fillRect` command generation with line-based rectangle outlines
2. Add `getColorForDepth()` helper function
3. Add `getLineWidthForDepth()` helper function
4. Update tests to verify `line` commands instead of `fillRect`

**Critical:** Every wall face must generate 4 `line` commands (top, right, bottom, left) instead of 1 `fillRect`.

### SceneTitleComponent

**File:** `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.ts`

**Changes:**
1. Add `<ng-content></ng-content>` to template for content projection
2. Style container to allow inline elements (flexbox with space-between)

**Template:**
```html
<div class="scene-title">
  <h1>{{ title }}</h1>
  <ng-content></ng-content>
</div>
```

### MazeComponent

**File:** `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.html`

**Changes:**
1. Remove `<app-active-spells>` component from main content
2. Add active spells inline in `<app-scene-title>`
3. Restructure layout to 2-column grid (canvas | cards)
4. Move message log to full-width section below content
5. Add "RECENT EVENTS:" header above message log

**File:** `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.scss`

**Changes:**
1. Reduce padding from `1rem` to `0.5rem`
2. Change grid from `1fr 1fr` to `450px 1fr`
3. Reduce gap from `1rem` to `0.75rem`
4. Set fixed canvas size: 450×450px
5. Change party grid to `repeat(3, 1fr)` columns (was 2)
6. Add message log section styling

## Testing Strategy

### Visual Regression Testing
- Compare rendered wireframe to reference Wizardry 1 screenshot
- Verify no filled shapes (only lines)
- Verify depth-based color/width fading

### Layout Testing
- Test at 1366×768: Verify all 6 cards visible
- Test at 1920×1080: Verify layout scales appropriately
- Test with long character names (15 chars)
- Test with 10+ messages in log (verify scrolling)

### Rendering Testing
- Verify `generateView()` produces only `line` commands
- Verify no `fillRect` commands in output
- Verify line count: 4 lines per wall face
- Verify color values match depth table
- Verify line widths match depth table

### Integration Testing
- Navigate maze, verify wireframe updates on movement
- Turn left/right, verify perspective changes
- Move forward, verify depth rendering
- Walk into wall, verify collision message appears in log

## Responsive Design

### 1366×768 (Primary Target)
- Canvas: 450×450px
- Character cards: 3×2 grid, ~140px each
- Message log: 100px height, scrollable
- All elements visible without scrolling

### 1920×1080 (Enhanced)
- Same layout proportions
- Extra horizontal space distributed to character cards
- Canvas remains 450×450px (optimal for wireframe detail)

### Tablet/Mobile (Future)
- Stack canvas above character grid
- Reduce canvas to 350×350px
- Message log remains full-width
- Not critical for v1 (desktop-first game)

## Success Criteria

1. ✅ Pure wireframe rendering (no filled shapes)
2. ✅ All 6 character cards visible at 1366×768
3. ✅ Message log visible and scrollable
4. ✅ Active spells in title bar (saves vertical space)
5. ✅ Authentic Wizardry 1 visual style
6. ✅ Total vertical height < 710px (fits in 768px)

## Implementation Notes

### Phase 1: Wireframe Rendering
- Update MazeRenderingService first (isolated change)
- Add tests for line-based rendering
- Visual verification with test screenshots

### Phase 2: Layout Restructure
- Move Active Spells to title bar
- Restructure HTML/CSS for new grid
- Move message log to bottom

### Phase 3: Polish & Testing
- Fine-tune spacing and sizing
- Responsive testing at target resolutions
- Visual regression comparison

## Files to Modify

1. `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts` - Wireframe generation
2. `/Users/dirkkok/Development/wizardry/src/services/__tests__/MazeRenderingService.spec.ts` - Update tests
3. `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.ts` - Content projection
4. `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.html` - Add ng-content
5. `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.scss` - Flexbox layout
6. `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.html` - Layout restructure
7. `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.scss` - Grid/sizing changes
8. `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.ts` - Remove activeSpells panel (move to title)

## Design Rationale

**Why horizontal message log?**
- Authentic to original Wizardry UI
- Frees vertical space for character cards
- Natural reading flow (left to right)
- Allows full-width context for messages

**Why 450×450px canvas?**
- Large enough for clear wireframe details
- Shows 3 tiles deep with good perspective
- Saves 150px vertical vs current 600px
- Matches classic Wizardry proportions

**Why Active Spells in title bar?**
- Saves 100px vertical space
- Always visible (header is persistent)
- Minimal information (icon + text)
- Follows common game UI pattern

**Why 3×2 character grid vs 2×3?**
- Better use of horizontal space
- Matches landscape orientation
- Reduces vertical height per card
- More compact, still readable
