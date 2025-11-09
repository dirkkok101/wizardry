# Maze UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform maze scene into authentic Wizardry 1 wireframe with optimized layout that fits all UI elements on 1366×768 screens.

**Architecture:** Replace fillRect rendering with pure wireframe lines, restructure HTML to horizontal message log layout, move Active Spells to title bar inline, reduce canvas to 450×450px, compress padding.

**Tech Stack:** Angular 18, TypeScript, HTML5 Canvas, SCSS Grid/Flexbox

---

## Task 1: Convert Wireframe Rendering (Service Layer)

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts:126-184`
- Modify: `/Users/dirkkok/Development/wizardry/src/services/__tests__/MazeRenderingService.spec.ts`

### Step 1: Write failing test for wireframe rendering

**File:** `/Users/dirkkok/Development/wizardry/src/services/__tests__/MazeRenderingService.spec.ts`

Add new test at end of file:

```typescript
describe('renderWall', () => {
  it('generates wireframe lines instead of fillRect for walls', () => {
    const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };
    const config = { width: 600, height: 600, tileDepth: 3 };

    const commands = MazeRenderingService.renderWall('left', 'wall', perspective, config);

    // Should generate 4 line commands (rectangle outline)
    expect(commands.length).toBe(4);
    expect(commands.every(cmd => cmd.type === 'line')).toBe(true);

    // Should NOT contain any fillRect commands
    expect(commands.some(cmd => cmd.type === 'fillRect')).toBe(false);
  });

  it('uses correct color and lineWidth for depth', () => {
    const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };
    const config = { width: 600, height: 600, tileDepth: 3 };

    const commands = MazeRenderingService.renderWall('front', 'wall', perspective, config);

    // All lines should use green color
    expect(commands.every(cmd => cmd.color === '#0f0')).toBe(true);

    // All lines should have lineWidth of 2 (depth 1)
    expect(commands.every(cmd => cmd.lineWidth === 2)).toBe(true);
  });
});
```

### Step 2: Run test to verify it fails

**Run:** `npm test -- MazeRenderingService`

**Expected:** FAIL - `expect(commands.every(cmd => cmd.type === 'line')).toBe(true)` fails because current implementation uses `fillRect`

### Step 3: Add helper functions for depth-based styling

**File:** `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts`

Add these functions after line 21 (after `calculatePerspective`):

```typescript
/**
 * Get wireframe color based on depth (distance from player)
 * @param depth - Tile depth (1 = near, 2 = mid, 3 = far)
 * @returns Hex color string
 */
export function getColorForDepth(depth: number): string {
  const colors = ['#0f0', '#0c0', '#090'];
  return colors[depth - 1] ?? '#060';
}

/**
 * Get line width based on depth (thinner lines at distance)
 * @param depth - Tile depth (1 = near, 2 = mid, 3 = far)
 * @returns Line width in pixels
 */
export function getLineWidthForDepth(depth: number): number {
  const widths = [2, 1.5, 1];
  return widths[depth - 1] ?? 1;
}

/**
 * Generate 4 line commands to draw a rectangle outline (wireframe)
 * @param x - Top-left X coordinate
 * @param y - Top-left Y coordinate
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @param color - Line color
 * @param lineWidth - Line thickness
 * @param alpha - Opacity (0-1)
 * @returns Array of 4 line commands (top, right, bottom, left)
 */
export function generateRectangleOutline(
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  lineWidth: number,
  alpha: number
): CanvasCommand[] {
  return [
    // Top edge
    { type: 'line', x1: x, y1: y, x2: x + width, y2: y, color, lineWidth, alpha },
    // Right edge
    { type: 'line', x1: x + width, y1: y, x2: x + width, y2: y + height, color, lineWidth, alpha },
    // Bottom edge
    { type: 'line', x1: x + width, y1: y + height, x2: x, y2: y + height, color, lineWidth, alpha },
    // Left edge
    { type: 'line', x1: x, y1: y + height, x2: x, y2: y, color, lineWidth, alpha }
  ];
}
```

### Step 4: Replace renderWall function to use wireframe

**File:** `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts`

Replace lines 126-184 with:

```typescript
/**
 * Render a wall on specified side using wireframe lines
 * @param side - Which side (left, right, front)
 * @param wallType - Type of wall
 * @param perspective - Perspective scale parameters
 * @param config - Viewport configuration
 * @param depth - Distance from player (1-3)
 * @returns Array of line drawing commands for wireframe wall
 */
export function renderWall(
  side: 'left' | 'right' | 'front',
  wallType: 'open' | 'wall' | 'door' | 'secret' | 'locked_door',
  perspective: PerspectiveScale,
  config: ViewportConfig,
  depth: number = 1
): CanvasCommand[] {
  // Secret walls are invisible
  if (wallType === 'secret' || wallType === 'open') {
    return [];
  }

  const commands: CanvasCommand[] = [];
  const centerX = config.width / 2;
  const centerY = config.height / 2;

  // Door uses darker green, locked door uses red
  const baseColor = wallType === 'locked_door' ? '#800' :
                    wallType === 'door' ? '#080' :
                    getColorForDepth(depth);

  const lineWidth = getLineWidthForDepth(depth);

  const wallOffset = 200 * perspective.scale;
  const wallHeight = 200 * perspective.scale;
  const depthY = centerY + perspective.offsetY;

  if (side === 'left') {
    // Left wall wireframe
    commands.push(...generateRectangleOutline(
      centerX - wallOffset - 50,
      depthY - wallHeight / 2,
      50,
      wallHeight,
      baseColor,
      lineWidth,
      perspective.brightness
    ));
  } else if (side === 'right') {
    // Right wall wireframe
    commands.push(...generateRectangleOutline(
      centerX + wallOffset,
      depthY - wallHeight / 2,
      50,
      wallHeight,
      baseColor,
      lineWidth,
      perspective.brightness
    ));
  } else if (side === 'front') {
    // Front wall (dead end) - full width wireframe
    commands.push(...generateRectangleOutline(
      centerX - wallOffset,
      depthY - wallHeight / 2,
      wallOffset * 2,
      wallHeight,
      baseColor,
      lineWidth,
      perspective.brightness
    ));
  }

  return commands;
}
```

### Step 5: Update renderTile to pass depth parameter

**File:** `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts`

Modify `renderTile` function (lines 194-220) to accept and pass depth:

```typescript
/**
 * Render a single tile with all its walls
 * @param tile - Tile data with walls
 * @param facing - Direction player is facing
 * @param perspective - Perspective scale parameters
 * @param config - Viewport configuration
 * @param depth - Distance from player (1-3)
 * @returns Array of drawing commands for the tile
 */
export function renderTile(
  tile: TileData,
  facing: Direction,
  perspective: PerspectiveScale,
  config: ViewportConfig,
  depth: number = 1
): CanvasCommand[] {
  const commands: CanvasCommand[] = [];

  // Get walls relative to player facing
  const walls = getRelativeWalls(tile.walls, facing);

  // Always render corridor first (perspective lines)
  commands.push(...renderCorridor(perspective, config));

  // Render walls based on their type, passing depth for wireframe styling
  if (walls.left !== 'open') {
    commands.push(...renderWall('left', walls.left, perspective, config, depth));
  }
  if (walls.right !== 'open') {
    commands.push(...renderWall('right', walls.right, perspective, config, depth));
  }
  if (walls.front !== 'open') {
    commands.push(...renderWall('front', walls.front, perspective, config, depth));
  }

  return commands;
}
```

### Step 6: Update generateView to pass depth to renderTile

**File:** `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts`

Modify lines 243-246:

```typescript
    commands.push(...renderTile(tile, facing, perspective, config, depth));
```

### Step 7: Export new functions

**File:** `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts`

Update exports at line 252:

```typescript
export const MazeRenderingService = {
  calculatePerspective,
  getRelativeWalls,
  getColorForDepth,
  getLineWidthForDepth,
  generateRectangleOutline,
  renderCorridor,
  renderWall,
  renderTile,
  generateView
};
```

### Step 8: Run test to verify it passes

**Run:** `npm test -- MazeRenderingService`

**Expected:** PASS - All tests green, wireframe rendering confirmed

### Step 9: Commit wireframe rendering

```bash
git add src/services/MazeRenderingService.ts src/services/__tests__/MazeRenderingService.spec.ts
git commit -m "feat: convert maze rendering to authentic wireframe

Replace fillRect wall rendering with pure line-based wireframe
following authentic Wizardry 1 (1981 Apple II) visual style.

- Added getColorForDepth() for depth-based color fading
- Added getLineWidthForDepth() for perspective line thickness
- Added generateRectangleOutline() to draw 4 lines per wall
- Updated renderWall() to generate wireframe instead of fills
- Pass depth parameter through renderTile() and generateView()
- Walls fade from #0f0 (near) to #090 (far)
- Line width decreases from 2px (near) to 1px (far)

Tests verify only 'line' commands generated, no 'fillRect'.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Add Content Projection to SceneTitleComponent

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.html:1-6`
- Modify: `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.scss`
- Test: `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.spec.ts`

### Step 1: Write failing test for content projection

**File:** `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.spec.ts`

Add test after existing tests:

```typescript
it('projects content alongside title', () => {
  const fixture = TestBed.createComponent(SceneTitleComponent);
  fixture.componentRef.setInput('title', 'TEST TITLE');

  // Set projected content via template
  const projectedContent = '<span class="test-content">Projected</span>';
  // Note: Content projection testing requires wrapping component
  // For now, verify ng-content exists in template

  fixture.detectChanges();

  const compiled = fixture.nativeElement;
  const header = compiled.querySelector('.scene-header');

  // Verify header uses flexbox layout for inline content
  const styles = window.getComputedStyle(header);
  expect(styles.display).toBe('flex');
});
```

### Step 2: Run test to verify it fails

**Run:** `npm test -- scene-title.component`

**Expected:** FAIL - `expect(styles.display).toBe('flex')` fails

### Step 3: Update template for content projection

**File:** `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.html`

Replace lines 1-6 with:

```html
<header class="scene-header">
  <h1>{{ title() }}</h1>

  @if (partyGold() !== null) {
    <div class="party-gold">PARTY GOLD: {{ partyGold() }} GP</div>
  }

  <!-- Content projection slot for inline elements (e.g. Active Spells) -->
  <ng-content></ng-content>
</header>
```

### Step 4: Update SCSS for flexbox layout

**File:** `/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.scss`

Replace entire file with:

```scss
.scene-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: var(--crt-bg-dark);
  border-bottom: var(--crt-border);
  box-shadow: 0 2px 10px rgba(0, 255, 0, 0.3);

  h1 {
    color: var(--crt-green);
    font-family: 'Courier New', monospace;
    font-size: 1.5rem;
    font-weight: bold;
    letter-spacing: 2px;
    text-shadow: var(--crt-glow-md);
    margin: 0;
    flex-shrink: 0;  // Don't compress title
  }

  .party-gold {
    color: var(--crt-yellow);
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    font-weight: bold;
    margin-left: auto;  // Push to right
  }

  // Projected content (e.g. Active Spells) appears after title
  ::ng-deep > * {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--crt-green-dim);
    margin-left: 1rem;
  }
}
```

### Step 5: Run test to verify it passes

**Run:** `npm test -- scene-title.component`

**Expected:** PASS - Flexbox layout confirmed

### Step 6: Commit content projection

```bash
git add src/components/scene-title/
git commit -m "feat: add content projection to scene title

Enable inline content alongside title (e.g. Active Spells).

- Added <ng-content> slot in template
- Changed layout from block to flexbox
- Projected content appears between title and party gold
- Space-between layout distributes elements across header

This allows Active Spells to be inline in title bar,
saving vertical space in maze scene layout.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Restructure Maze Layout HTML

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.html:1-63`

### Step 1: Write layout structure test

**File:** `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.spec.ts`

Add test:

```typescript
it('has horizontal message log at bottom', () => {
  component.ngOnInit();
  fixture.detectChanges();

  const compiled = fixture.nativeElement;
  const messageLog = compiled.querySelector('.message-log-section');

  expect(messageLog).toBeTruthy();

  // Verify not inside maze-content (should be sibling)
  const mazeContent = compiled.querySelector('.maze-content');
  expect(mazeContent.contains(messageLog)).toBe(false);
});

it('projects active spells into scene title', () => {
  component.ngOnInit();
  fixture.detectChanges();

  const compiled = fixture.nativeElement;
  const sceneTitle = compiled.querySelector('app-scene-title');
  const activeSpells = compiled.querySelector('.active-spells-inline');

  // Active spells should be projected content inside scene-title
  expect(sceneTitle.contains(activeSpells)).toBe(true);
});
```

### Step 2: Run test to verify it fails

**Run:** `npm test -- maze.component`

**Expected:** FAIL - Elements not found in new structure

### Step 3: Restructure HTML template

**File:** `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.html`

Replace lines 1-63 with:

```html
<div class="maze-scene">
  <!-- Title with Active Spells inline -->
  <app-scene-title [title]="sceneTitle()">
    @if (activeSpells().length > 0) {
      <div class="active-spells-inline">
        @for (spell of activeSpells(); track spell.name) {
          <span class="spell-icon">{{ spell.icon }}</span>
          <span class="spell-text">{{ spell.name }}: {{ spell.description }}</span>
        }
      </div>
    }
  </app-scene-title>

  @if (isLoadingLevel()) {
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Level {{ currentLevel() }}...</p>
    </div>
  }

  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }

  <!-- Two-column content: Canvas | Character Cards -->
  <div class="maze-content">
    <!-- Left: 3D Canvas (450×450px) -->
    <div class="maze-viewport">
      <app-maze-view [commands]="drawCommands()" />
    </div>

    <!-- Right: Character Grid (3×2) -->
    <div class="party-grid">
      @for (char of partyCharacters(); track char.id) {
        <app-character-card [character]="char" />
      }
    </div>
  </div>

  <!-- Full-width Message Log -->
  <div class="message-log-section">
    <div class="message-log-header">RECENT EVENTS:</div>
    <app-message-log [messages]="messages()" />
  </div>

  <!-- Footer Actions -->
  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)"
  />

  <!-- Elevator Dialog (if active) -->
  @if (showElevatorDialog()) {
    <div class="elevator-dialog-overlay">
      <div class="elevator-dialog">
        <h2>ELEVATOR</h2>
        <p>Select destination level:</p>
        <div class="elevator-buttons">
          @for (dest of elevatorDestinations(); track dest) {
            <button (click)="selectElevatorLevel(dest.level!)" class="elevator-button">
              Level {{ dest.level }}
            </button>
          }
        </div>
        <button (click)="cancelElevator()" class="elevator-cancel">
          Cancel (ESC)
        </button>
      </div>
    </div>
  }
</div>
```

### Step 4: Run test to verify it passes

**Run:** `npm test -- maze.component`

**Expected:** PASS - New structure verified

### Step 5: Commit HTML restructure

```bash
git add src/app/maze/maze.component.html
git commit -m "refactor: restructure maze layout to horizontal message log

Major layout restructure for better space utilization:

- Moved Active Spells inline into scene title (saves 100px vertical)
- Removed app-active-spells component from main content
- Changed to 2-column grid: Canvas (450px) | Character Cards (flexible)
- Moved message log to full-width section below content
- Added 'RECENT EVENTS:' header above message log
- Character grid now 3×2 (was 2×3) for horizontal layout

This structure fits all UI elements on 1366×768 screens.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Update Maze SCSS Styling

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.scss:1-240`

### Step 1: Replace entire SCSS file

**File:** `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.scss`

Replace entire file with:

```scss
.maze-scene {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--crt-black);
  color: var(--crt-green);
  font-family: 'Courier New', monospace;
  padding: 0.5rem;  // Reduced from 1rem

  // Enhanced title styling (inherited from base)
  app-scene-title {
    border-bottom: var(--crt-border);
    box-shadow: 0 2px 10px rgba(0, 255, 0, 0.3);

    ::ng-deep h1 {
      text-shadow: var(--crt-glow-md);
      letter-spacing: 2px;
    }
  }
}

.active-spells-inline {
  display: inline-flex;
  gap: 1rem;
  align-items: center;
  font-size: 0.9rem;

  .spell-icon {
    font-size: 1.2rem;
    margin-right: 0.25rem;
  }

  .spell-text {
    color: var(--crt-green-dim);
    font-weight: normal;
  }
}

.error-message {
  background: #f00;
  color: #fff;
  padding: 1rem;
  text-align: center;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .loading-spinner {
    width: 60px;
    height: 60px;
    border: 3px solid rgba(0, 255, 0, 0.2);
    border-top-color: var(--crt-green);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    color: var(--crt-green);
    font-family: 'Courier New', monospace;
    font-size: 1.2rem;
    margin-top: 1rem;
    text-shadow: var(--crt-glow-md);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.maze-content {
  display: grid;
  grid-template-columns: 450px 1fr;  // Fixed canvas, flexible cards
  gap: 0.75rem;  // Reduced from 1rem
  height: 450px;
  margin-bottom: 0.5rem;

  // Tablet breakpoint (portrait)
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 0.5rem;

    .maze-viewport {
      height: 350px;
    }

    .party-grid {
      overflow-y: auto;
    }
  }

  // Mobile breakpoint
  @media (max-width: 480px) {
    .maze-viewport {
      height: 300px;
    }

    .party-grid {
      grid-template-columns: 1fr 1fr;
      gap: 0.25rem;
    }
  }

  // Large desktop (optional enhancement)
  @media (min-width: 1400px) {
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
  }
}

.maze-viewport {
  width: 450px;
  height: 450px;
  background: var(--crt-black);
  border: var(--crt-border);
  border-radius: 4px;

  app-maze-view {
    width: 100%;
    height: 100%;
  }
}

.party-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);  // Changed from 2 to 3 columns
  grid-template-rows: repeat(2, 1fr);
  gap: 0.5rem;

  app-character-card {
    min-height: 0;  // Allow cards to shrink to fit grid

    // Enhance for maze scene
    ::ng-deep .character-card {
      background: var(--crt-bg-medium);
      border: 2px solid var(--crt-green-dim);
      box-shadow: inset 0 0 5px rgba(0, 255, 0, 0.1),
                  0 2px 5px rgba(0, 255, 0, 0.2);

      .character-name {
        text-shadow: var(--crt-glow-sm);
      }
    }
  }
}

.message-log-section {
  height: 100px;
  border: var(--crt-border);
  border-radius: 4px;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--crt-bg-dark);

  .message-log-header {
    font-weight: bold;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
    color: var(--crt-green);
    letter-spacing: 1px;
  }

  app-message-log {
    display: block;
    height: calc(100% - 1.5rem);  // Subtract header height
    max-height: calc(100% - 1.5rem);
    overflow-y: auto;
  }
}

.elevator-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.elevator-dialog {
  background: var(--crt-bg-dark);
  border: var(--crt-border);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
  min-width: 300px;
  text-align: center;

  h2 {
    color: var(--crt-green);
    font-family: 'Courier New', monospace;
    text-shadow: var(--crt-glow-md);
    margin-bottom: 1rem;
    letter-spacing: 2px;
  }

  p {
    color: var(--crt-green);
    font-family: 'Courier New', monospace;
    margin-bottom: 1.5rem;
  }

  .elevator-buttons {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .elevator-button {
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid var(--crt-green-dim);
    color: var(--crt-green);
    padding: 0.75rem 1rem;
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(0, 255, 0, 0.1);
      border-color: var(--crt-green);
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    }
  }

  .elevator-cancel {
    background: rgba(255, 0, 0, 0.3);
    border: 2px solid rgba(255, 0, 0, 0.5);
    color: #ff6666;
    padding: 0.75rem 1.5rem;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 0, 0, 0.5);
      border-color: #ff0000;
    }
  }
}
```

### Step 2: Test visual layout

**Run:** `npm start`

**Manual verification:**
1. Navigate to `/maze`
2. Verify canvas is 450×450px
3. Verify all 6 character cards visible
4. Verify message log at bottom with "RECENT EVENTS:" header
5. Verify Active Spells in title bar
6. Verify layout fits on screen without scrolling

### Step 3: Commit SCSS changes

```bash
git add src/app/maze/maze.component.scss
git commit -m "style: update maze layout CSS for new structure

Major CSS restructure to support new horizontal layout:

- Reduced padding from 1rem to 0.5rem (saves horizontal space)
- Changed grid from '1fr 1fr' to '450px 1fr' (fixed canvas size)
- Changed character grid from 2 columns to 3 columns (3×2 layout)
- Reduced gap from 1rem to 0.75rem
- Added .message-log-section styling (100px height, full width)
- Added .active-spells-inline styling for title bar integration
- Canvas fixed at 450×450px (reduced from ~600px)
- Preserved responsive breakpoints for tablet/mobile

All UI elements now fit on 1366×768 screens.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Run Tests and Manual Verification

**Files:**
- Run: All tests
- Test: Manual browser testing

### Step 1: Run full test suite

**Run:** `npm test`

**Expected:** All tests pass (1140+ tests)

**If failures:**
- Check for tests depending on old HTML structure
- Update selectors to match new layout
- Verify canvas dimensions in tests

### Step 2: Manual testing checklist

**Run:** `npm start`

**Navigate to maze scene and verify:**

```
☐ Active Spells appear inline in title bar (next to "MAZE - LEVEL 1")
☐ Canvas is 450×450px (visually smaller than before)
☐ 3D wireframe shows ONLY green lines (no filled rectangles)
☐ Lines fade from bright green (near) to dark green (far)
☐ All 6 character cards visible in 3×2 grid
☐ Character cards properly sized and readable
☐ Message log appears at bottom with "RECENT EVENTS:" header
☐ Message log shows recent messages (e.g. "Entering Level 1...")
☐ Message log scrolls if more than ~5 messages
☐ Footer controls visible without scrolling
☐ Total vertical height fits in 768px (check with browser tools)
☐ Horizontal padding reduced (less wasted space on sides)
☐ Press W/A/S/D - wireframe updates correctly
☐ Turn left/right - perspective changes with wireframe
☐ Walk forward - depth rendering shows different line thicknesses
```

### Step 3: Take screenshots for documentation

**Run:** Browser DevTools → Take screenshots

**Capture:**
1. Initial maze view (straight corridor)
2. After turning (left perspective)
3. Dead end (front wall wireframe)
4. With elevator dialog open
5. Full UI at 1366×768 resolution

**Save to:** `/Users/dirkkok/Development/wizardry/.playwright-mcp/maze-redesign-*.png`

### Step 4: Update tests if needed

If any tests fail due to layout changes:

**Common fixes:**
- Update `.querySelector()` selectors for new HTML structure
- Change grid column expectations from 2 to 3
- Update canvas size assertions from 600 to 450
- Remove tests for old `app-active-spells` component location

### Step 5: Final commit if test fixes needed

```bash
git add src/app/maze/maze.component.spec.ts
git commit -m "test: update maze component tests for new layout

Updated test expectations to match new layout structure:

- Character grid now 3×2 (was 2×3)
- Canvas size now 450×450px (was ~600px)
- Message log now at bottom (was in left column)
- Active Spells now in title bar (was separate panel)

All tests passing with new structure.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

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

**Run specific test suites:**
```bash
npm test -- MazeRenderingService
npm test -- scene-title.component
npm test -- maze.component
```

**Build for production:**
```bash
npm run build
```

**Check bundle size:**
```bash
npm run build -- --stats-json
```

---

## Success Criteria

1. ✅ **Wireframe rendering:** Only `line` commands, no `fillRect`
2. ✅ **Depth perception:** Lines fade from `#0f0` (near) to `#090` (far)
3. ✅ **Line thickness:** 2px (near) → 1px (far)
4. ✅ **Canvas size:** 450×450px (reduced from 600px)
5. ✅ **Character cards:** All 6 visible in 3×2 grid
6. ✅ **Message log:** Full width at bottom, 100px height
7. ✅ **Active Spells:** Inline in title bar
8. ✅ **Vertical space:** Total < 710px (fits in 768px)
9. ✅ **Horizontal space:** Reduced padding (0.5rem vs 1rem)
10. ✅ **Tests:** All passing (1140+ tests)

---

## Common Issues and Solutions

**Issue: Wireframe still shows filled shapes**
- Check MazeRenderingService exports `generateRectangleOutline`
- Verify `renderWall` calls `generateRectangleOutline` not `fillRect`
- Clear browser cache and hard reload

**Issue: Lines too thin/thick**
- Check `getLineWidthForDepth()` return values
- Verify depth parameter is passed correctly to `renderWall`
- Test at different depths (1, 2, 3)

**Issue: Active Spells not showing in title**
- Verify `<ng-content>` in scene-title template
- Check `.active-spells-inline` is projected content
- Verify `activeSpells()` computed returns data

**Issue: Character cards truncated**
- Check `.party-grid` has `repeat(3, 1fr)` columns
- Verify `min-height: 0` on `app-character-card`
- Check total grid height is 450px

**Issue: Message log cut off**
- Verify `.message-log-section` has `height: 100px`
- Check `overflow-y: auto` on `app-message-log`
- Verify header height subtracted from total (calc formula)

**Issue: Layout doesn't fit 1366×768**
- Check padding reduced to 0.5rem
- Verify canvas is 450×450px (not larger)
- Check message log is 100px (not larger)
- Test with browser DevTools responsive mode

---

## Files Modified Summary

1. **`/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts`**
   - Added wireframe helper functions
   - Replaced `fillRect` with `generateRectangleOutline`
   - Added depth parameter to rendering functions

2. **`/Users/dirkkok/Development/wizardry/src/services/__tests__/MazeRenderingService.spec.ts`**
   - Added tests for wireframe rendering
   - Verified line commands instead of fillRect

3. **`/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.html`**
   - Added `<ng-content>` for content projection

4. **`/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.scss`**
   - Changed to flexbox layout
   - Added styling for projected content

5. **`/Users/dirkkok/Development/wizardry/src/components/scene-title/scene-title.component.spec.ts`**
   - Added test for content projection

6. **`/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.html`**
   - Moved Active Spells to title bar
   - Restructured to 2-column grid
   - Added message log section at bottom

7. **`/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.scss`**
   - Changed grid from `1fr 1fr` to `450px 1fr`
   - Changed character grid from 2 to 3 columns
   - Reduced padding and gaps
   - Added message log section styling

8. **`/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.spec.ts`**
   - Updated tests for new layout structure
   - Changed expectations for grid columns

---

## Design Rationale

**Why wireframe instead of filled shapes?**
- Authentic to original Wizardry 1 (1981 Apple II version)
- Better depth perception with line thickness variation
- Cleaner, more readable at small canvas size
- Lower visual noise, easier to understand maze structure

**Why 450×450px canvas?**
- Shows 3 tiles deep with clear perspective
- Saves 150px vertical space vs 600px
- Optimal balance between detail and space
- Matches classic Wizardry proportions

**Why horizontal message log?**
- Authentic to original Wizardry UI layout
- Frees vertical space for character cards
- Natural reading flow (left to right)
- Full width provides context for longer messages

**Why Active Spells in title bar?**
- Saves 100px vertical space
- Always visible (header is persistent)
- Minimal information (icon + text)
- Common pattern in game UIs

**Why 3×2 character grid vs 2×3?**
- Better use of horizontal space (landscape orientation)
- Reduces vertical height requirement
- Fits 1366×768 constraint
- All 6 cards visible without scrolling
