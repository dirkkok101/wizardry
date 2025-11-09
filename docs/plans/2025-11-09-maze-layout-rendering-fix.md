# Maze Scene Layout and Rendering Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix maze scene layout by moving message log to left panel and fix black canvas rendering issue.

**Architecture:** Restructure HTML to stack message log with canvas vertically using flexbox. Add debug logging to identify root cause of empty drawCommands array (likely position undefined or light radius 0).

**Tech Stack:** Angular 18, HTML5 Canvas, SCSS flexbox, TypeScript signals

---

## Task 1: Fix Layout - Move Message Log to Left Panel

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.html:35-36`
- Modify: `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.scss:111-124`

### Step 1: Restructure HTML to stack message log with canvas

**Current structure (lines 15-36):**
```html
<div class="maze-content">
  <!-- Left: 3D Canvas View -->
  <div class="maze-viewport">
    <app-maze-view [commands]="drawCommands()" />
  </div>

  <!-- Right: Party & Spells -->
  <div class="maze-panel">
    <!-- Active Spells -->
    <app-active-spells [spells]="activeSpells()" />

    <!-- Party Grid (2×3) -->
    <div class="party-grid">
      @for (char of partyCharacters(); track char.id) {
        <app-character-card [character]="char" />
      }
    </div>
  </div>
</div>

<!-- Message Log -->
<app-message-log [messages]="messages()" />
```

**New structure:**
```html
<div class="maze-content">
  <!-- Left: 3D Canvas View + Message Log -->
  <div class="maze-viewport">
    <app-maze-view [commands]="drawCommands()" />
    <app-message-log [messages]="messages()" />
  </div>

  <!-- Right: Party & Spells -->
  <div class="maze-panel">
    <!-- Active Spells -->
    <app-active-spells [spells]="activeSpells()" />

    <!-- Party Grid (2×3) -->
    <div class="party-grid">
      @for (char of partyCharacters(); track char.id) {
        <app-character-card [character]="char" />
      }
    </div>
  </div>
</div>
```

**Action:** In `maze.component.html`, move lines 35-36 (`<app-message-log [messages]="messages()" />`) inside `.maze-viewport` div (after line 18).

### Step 2: Update CSS to use flexbox column layout

**Current `.maze-viewport` styles (lines 111-124):**
```scss
.maze-viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--crt-black);
  border: var(--crt-border);
  border-radius: 4px;
  min-height: 400px;

  app-maze-view {
    width: 100%;
    height: 100%;
  }
}
```

**New `.maze-viewport` styles:**
```scss
.maze-viewport {
  display: flex;
  flex-direction: column;  // Stack vertically
  gap: 1rem;              // Spacing between canvas and log
  background: var(--crt-black);
  border: var(--crt-border);
  border-radius: 4px;
  min-height: 400px;

  app-maze-view {
    flex: 1;              // Canvas takes remaining space
    min-height: 300px;    // Ensure canvas doesn't collapse
    width: 100%;
  }

  app-message-log {
    flex-shrink: 0;       // Don't compress the log
    max-height: 150px;    // Keep scrollable at reasonable height
    overflow-y: auto;     // Scroll if messages overflow
  }
}
```

**Action:** Replace `.maze-viewport` block (lines 111-124) with new flexbox styles.

### Step 3: Test layout changes

**Run:** `npm start`

**Expected:**
- Navigate to `/maze` route
- Message log appears below canvas in left panel
- Character cards have more vertical space on right
- Both panels visible on laptop screen (1366x768 or 1920x1080)

### Step 4: Commit layout fix

```bash
git add src/app/maze/maze.component.html src/app/maze/maze.component.scss
git commit -m "fix: move message log to left panel with canvas

Restructured maze scene layout to stack message log vertically
with 3D canvas view in left panel. This frees vertical space for
character cards on laptop screens.

- Changed .maze-viewport to use flex-direction: column
- Added gap and flex sizing for proper space distribution
- Message log now has max-height with overflow scroll

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Add Debug Logging to Identify Rendering Issue

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.ts:93-103`
- Modify: `/Users/dirkkok/Development/wizardry/src/components/maze-view/maze-view.component.ts:43-57`

### Step 1: Add debug logging to drawCommands computed signal

**Current code (lines 93-103):**
```typescript
readonly drawCommands = computed(() => {
  const tiles = this.visibleTiles();
  const pos = this.position();
  if (!pos || tiles.length === 0) return [];

  return MazeRenderingService.generateView(
    tiles,
    pos.facing,
    { width: 600, height: 600, tileDepth: 3 }
  );
});
```

**New code with logging:**
```typescript
readonly drawCommands = computed(() => {
  const tiles = this.visibleTiles();
  const pos = this.position();
  const dungeon = this.dungeonState();

  console.log('[MAZE DEBUG] drawCommands executing:');
  console.log('  - Position:', pos);
  console.log('  - Visible tiles count:', tiles.length);
  console.log('  - Light radius:', dungeon?.lightRadius);
  console.log('  - Dungeon state:', dungeon);

  if (!pos || tiles.length === 0) {
    console.warn('[MAZE DEBUG] No commands generated - missing position or tiles');
    return [];
  }

  const commands = MazeRenderingService.generateView(
    tiles,
    pos.facing,
    { width: 600, height: 600, tileDepth: 3 }
  );

  console.log('[MAZE DEBUG] Generated', commands.length, 'drawing commands');
  return commands;
});
```

**Action:** Replace lines 93-103 with new logging code.

### Step 2: Add debug logging to Canvas render method

**Current render method (lines 43-57 in maze-view.component.ts):**
```typescript
private render(): void {
  if (!this.ctx) return;

  const canvas = this.canvasRef.nativeElement;
  const commands = this.commands();

  // Clear canvas with black background
  this.ctx.fillStyle = '#000';
  this.ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Execute drawing commands
  for (const cmd of commands) {
    this.executeCommand(cmd);
  }
}
```

**New render method with logging:**
```typescript
private render(): void {
  if (!this.ctx) {
    console.warn('[CANVAS DEBUG] render() called but ctx is null');
    return;
  }

  const canvas = this.canvasRef.nativeElement;
  const commands = this.commands();

  console.log('[CANVAS DEBUG] render() executing:');
  console.log('  - Canvas dimensions:', canvas.width, 'x', canvas.height);
  console.log('  - Commands count:', commands.length);
  console.log('  - Context available:', !!this.ctx);

  // Clear canvas with black background
  this.ctx.fillStyle = '#000';
  this.ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw test rectangle to verify canvas works
  this.ctx.strokeStyle = '#0f0';
  this.ctx.lineWidth = 3;
  this.ctx.strokeRect(50, 50, 100, 100);
  console.log('[CANVAS DEBUG] Drew test rectangle at (50,50,100,100)');

  // Execute drawing commands
  for (const cmd of commands) {
    this.executeCommand(cmd);
  }

  console.log('[CANVAS DEBUG] render() complete');
}
```

**Action:** Replace lines 43-57 with new logging code.

### Step 3: Test and check console output

**Run:** `npm start`

**Expected console output scenarios:**

**Scenario A - Position undefined:**
```
[MAZE DEBUG] drawCommands executing:
  - Position: undefined
  - Visible tiles count: 0
  - Light radius: undefined
[MAZE DEBUG] No commands generated - missing position or tiles
[CANVAS DEBUG] render() executing:
  - Canvas dimensions: 600 x 600
  - Commands count: 0
[CANVAS DEBUG] Drew test rectangle at (50,50,100,100)
[CANVAS DEBUG] render() complete
```
**Fix needed:** Initialize dungeon position in navigation flow.

**Scenario B - Light radius 0:**
```
[MAZE DEBUG] drawCommands executing:
  - Position: {x: 10, y: 10, facing: "NORTH"}
  - Visible tiles count: 0
  - Light radius: 0
[MAZE DEBUG] No commands generated - missing position or tiles
[CANVAS DEBUG] render() executing:
  - Canvas dimensions: 600 x 600
  - Commands count: 0
[CANVAS DEBUG] Drew test rectangle at (50,50,100,100)
[CANVAS DEBUG] render() complete
```
**Fix needed:** Set default light radius to 3 or activate LIGHT spell.

**Scenario C - Commands generating but not rendering:**
```
[MAZE DEBUG] drawCommands executing:
  - Position: {x: 10, y: 10, facing: "NORTH"}
  - Visible tiles count: 15
  - Light radius: 3
[MAZE DEBUG] Generated 42 drawing commands
[CANVAS DEBUG] render() executing:
  - Canvas dimensions: 600 x 600
  - Commands count: 42
[CANVAS DEBUG] Drew test rectangle at (50,50,100,100)
[CANVAS DEBUG] render() complete
```
**Fix needed:** Check executeCommand() logic or command coordinates.

### Step 4: Document findings

**Action:** Note which scenario matches console output. This determines Task 3 approach.

### Step 5: Commit debug logging

```bash
git add src/app/maze/maze.component.ts src/components/maze-view/maze-view.component.ts
git commit -m "debug: add logging to diagnose maze rendering issue

Added comprehensive console logging to identify why canvas shows
only black rectangle:
- Log position, tiles, light radius in drawCommands computed
- Log canvas dimensions and command count in render()
- Added test green rectangle to verify canvas context works

This will reveal whether issue is:
- Position undefined (dungeon not initialized)
- Light radius 0 (darkness)
- Commands not executing (rendering pipeline broken)

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Fix Rendering Based on Debug Output

**Note:** This task branches based on findings from Task 2. Implement the appropriate fix.

### Fix 3A: Position Undefined - Initialize Dungeon Properly

**If console shows `Position: undefined`**

**Files:**
- Read: `/Users/dirkkok/Development/wizardry/src/services/NavigationService.ts`
- Investigate: How dungeon state is initialized when entering maze

**Likely issue:** Navigating to `/maze` without calling service to initialize dungeon state.

**Expected fix pattern:**
```typescript
// In NavigationService or GameInitializationService
export function enterDungeon(state: GameState, level: number): GameState {
  return {
    ...state,
    dungeon: {
      currentLevel: level,
      position: { x: 0, y: 0, facing: 'NORTH' },  // Default start position
      lightRadius: 3,  // Default torch light
      lightActive: true,
      mapRevealed: new Set<string>()
    }
  };
}
```

**Action:**
1. Read NavigationService to find dungeon initialization function
2. Verify it sets `position` field
3. Check if maze.component.ts calls it in ngOnInit()
4. Add initialization call if missing
5. Test that position is defined in console

### Fix 3B: Light Radius Zero - Set Default Light

**If console shows `Light radius: 0`**

**Files:**
- Modify: Dungeon initialization in GameInitializationService or NavigationService

**Expected fix:**
```typescript
// When creating dungeon state
dungeon: {
  currentLevel: 1,
  position: { x: 0, y: 0, facing: 'NORTH' },
  lightRadius: 3,        // ← Change from 0 to 3 (torch range)
  lightActive: true,     // ← Ensure light is active
  mapRevealed: new Set<string>()
}
```

**Action:**
1. Find where dungeon state is initialized
2. Change `lightRadius: 0` to `lightRadius: 3`
3. Set `lightActive: true`
4. Test that visibleTiles array has elements

### Fix 3C: Commands Not Executing - Fix Rendering Pipeline

**If console shows commands generated but not visible**

**Possible issues:**
1. Coordinates out of canvas bounds
2. Color not visible (black on black)
3. executeCommand() has bug

**Action:**
1. Read `MazeRenderingService.generateView()` to check coordinate calculations
2. Add logging in `executeCommand()` to see actual drawing operations
3. Verify colors are not black (`#000`)
4. Check lineWidth is sufficient (>= 2)

### Step: Commit the fix

```bash
git add [modified files]
git commit -m "fix: [specific fix description]

[Explain what was wrong and how it was fixed]

Root cause: [Position undefined | Light radius 0 | Command execution]
Solution: [Specific change made]

Verified with console logging showing:
- Position: defined
- Tiles: >0
- Commands: >0
- Canvas: rendering wireframe geometry

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Remove Debug Logging

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.ts:93-117`
- Modify: `/Users/dirkkok/Development/wizardry/src/components/maze-view/maze-view.component.ts:43-70`

### Step 1: Remove logging from drawCommands

**Remove all console.log/console.warn statements, keeping only the core logic:**

```typescript
readonly drawCommands = computed(() => {
  const tiles = this.visibleTiles();
  const pos = this.position();
  if (!pos || tiles.length === 0) return [];

  return MazeRenderingService.generateView(
    tiles,
    pos.facing,
    { width: 600, height: 600, tileDepth: 3 }
  );
});
```

### Step 2: Remove logging and test rectangle from render()

**Remove console.log statements and test rectangle:**

```typescript
private render(): void {
  if (!this.ctx) return;

  const canvas = this.canvasRef.nativeElement;
  const commands = this.commands();

  // Clear canvas with black background
  this.ctx.fillStyle = '#000';
  this.ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Execute drawing commands
  for (const cmd of commands) {
    this.executeCommand(cmd);
  }
}
```

### Step 3: Test clean code

**Run:** `npm start`

**Expected:**
- No console logging spam
- 3D wireframe renders in viewport
- Movement (W/A/S/D) updates view correctly
- Message log appears in left panel

### Step 4: Commit cleanup

```bash
git add src/app/maze/maze.component.ts src/components/maze-view/maze-view.component.ts
git commit -m "refactor: remove debug logging from maze rendering

Removed temporary console.log statements and test rectangle used
to diagnose rendering issue. Code is now clean and production-ready.

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Run Tests and Verify

### Step 1: Run test suite

**Run:** `npm test`

**Expected:** All tests pass (791 tests or similar)

**If tests fail:**
- Check if any tests depend on old HTML structure
- Update selectors or test expectations
- Ensure test uses instant transitions: `{ direction: 'instant' }`

### Step 2: Manual testing checklist

**Run:** `npm start`

**Test each item:**
```
☐ Navigate to /maze route
☐ Verify message log appears below canvas in left panel
☐ Verify 3D wireframe geometry renders (not black)
☐ Press W - move forward, view updates
☐ Press A - turn left, view updates
☐ Press D - turn right, view updates
☐ Press S - move backward, view updates
☐ Press Q - strafe left, view updates
☐ Press E - strafe right, view updates
☐ Verify messages appear in log as you move
☐ Verify character cards visible on right
☐ Test on laptop resolution (1366x768 or 1920x1080)
```

### Step 3: Take screenshot of working maze scene

**Action:** Take screenshot showing:
- 3D wireframe rendering in viewport
- Message log below canvas
- Character cards on right
- All UI elements properly sized

### Step 4: Final commit if any test fixes needed

```bash
git add [test files if modified]
git commit -m "test: update maze component tests for new layout

Updated test selectors and expectations to match new HTML
structure with message log inside maze-viewport.

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Commands

**Development server:**
```bash
npm start
```

**Run all tests:**
```bash
npm test
```

**Run specific test:**
```bash
npm test -- maze.component
```

**Build for production:**
```bash
npm run build
```

---

## Expected Final State

**Visual Result:**
- Maze scene on laptop shows both panels clearly
- Message log stacked with canvas in left column (50% width)
- Character cards in right column (50% width)
- 3D wireframe geometry renders with white/green lines
- View updates smoothly when moving with W/A/S/D keys

**Code Quality:**
- No debug logging in production code
- All tests passing (791+)
- Clean commits with descriptive messages
- Layout responsive for tablet/mobile (existing breakpoints preserved)

**Performance:**
- No performance degradation
- Canvas renders at 60fps
- Test suite completes in <10 seconds

---

## Common Issues and Solutions

**Issue: Canvas still black after fix**
- Check browser console for errors
- Verify Canvas dimensions are non-zero
- Check if effect() in maze-view.component is triggering
- Verify commands array has elements

**Issue: Message log overlaps canvas**
- Check flexbox properties (flex-direction: column)
- Verify gap property is set
- Check min-height on app-maze-view

**Issue: Layout breaks on mobile**
- Existing media queries should handle this
- Verify @media blocks at lines 74-102 still apply

**Issue: Tests fail with "cannot find element"**
- Update test selectors for new HTML structure
- app-message-log is now child of .maze-viewport
- Use `.querySelector('.maze-viewport app-message-log')`

---

## References

**Relevant Documentation:**
- `docs/ui/scenes/10-maze.md` - Maze scene UI specification
- `docs/systems/rendering.md` - Canvas rendering pipeline
- `docs/services/DungeonService.md` - Dungeon state management
- `docs/services/MazeRenderingService.md` - 3D view generation

**Related Files:**
- `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.ts`
- `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.html`
- `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.scss`
- `/Users/dirkkok/Development/wizardry/src/components/maze-view/maze-view.component.ts`
- `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts`
- `/Users/dirkkok/Development/wizardry/src/services/DungeonService.ts`
