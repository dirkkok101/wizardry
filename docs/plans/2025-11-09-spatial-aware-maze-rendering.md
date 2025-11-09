# Spatial-Aware 3D Wireframe Maze Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix maze rendering to display the actual dungeon layout based on player position and orientation by implementing a 3-column visibility grid instead of center-only tile lookup.

**Architecture:** Convert from 1D (center-only) to 2D (3×N grid) tile visibility calculation. Add coordinate transformation to map relative positions (left/center/right at depths 1-3) to world coordinates based on facing direction. Update rendering to position walls correctly for each column.

**Tech Stack:** TypeScript, Jest, Angular Signals, HTML5 Canvas

---

## Current Problem

`DungeonService.getVisibleTiles()` only returns tiles directly ahead (center column), so the maze rendering shows generic wireframe tunnels instead of the actual dungeon layout. We need left/right peripheral vision to properly render corridor walls, openings, and intersections.

**Example Issue:**
- Player at (5,5) facing North with left corridor at (4,5)
- Current: Only sees tiles at (5,4), (5,3), (5,2) - center line
- Needed: Should also see (4,4), (4,3), (4,2) - left column
- Result: Left opening doesn't render (looks like solid wall)

---

## Task 1: Add Coordinate Transformation Helper (DungeonService)

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/services/DungeonService.ts`
- Test: `/Users/dirkkok/Development/wizardry/src/services/__tests__/DungeonService.spec.ts`

**Step 1: Write the failing test for transformToWorldCoords()**

Add to DungeonService.spec.ts:

```typescript
describe('transformToWorldCoords', () => {
  it('transforms relative coords when facing NORTH', () => {
    const position: Position = { x: 10, y: 10, level: 1, facing: 'NORTH' };

    // Center ahead (0, 1)
    expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 10, y: 9 });

    // Left ahead (-1, 1)
    expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 9, y: 9 });

    // Right ahead (1, 1)
    expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 11, y: 9 });
  });

  it('transforms relative coords when facing EAST', () => {
    const position: Position = { x: 10, y: 10, level: 1, facing: 'EAST' };

    // Center ahead (0, 1)
    expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 11, y: 10 });

    // Left ahead (-1, 1)
    expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 11, y: 9 });

    // Right ahead (1, 1)
    expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 11, y: 11 });
  });

  it('transforms relative coords when facing SOUTH', () => {
    const position: Position = { x: 10, y: 10, level: 1, facing: 'SOUTH' };

    // Center ahead (0, 1)
    expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 10, y: 11 });

    // Left ahead (-1, 1)
    expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 11, y: 11 });

    // Right ahead (1, 1)
    expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 9, y: 11 });
  });

  it('transforms relative coords when facing WEST', () => {
    const position: Position = { x: 10, y: 10, level: 1, facing: 'WEST' };

    // Center ahead (0, 1)
    expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 9, y: 10 });

    // Left ahead (-1, 1)
    expect(DungeonService.transformToWorldCoords(position, -1, 1)).toEqual({ x: 9, y: 11 });

    // Right ahead (1, 1)
    expect(DungeonService.transformToWorldCoords(position, 1, 1)).toEqual({ x: 9, y: 9 });
  });

  it('handles edge wrapping at boundaries', () => {
    const position: Position = { x: 0, y: 0, level: 1, facing: 'NORTH' };

    // Left edge wraps to 19
    expect(DungeonService.transformToWorldCoords(position, -1, 0)).toEqual({ x: 19, y: 0 });

    // Up edge wraps to 19
    expect(DungeonService.transformToWorldCoords(position, 0, 1)).toEqual({ x: 0, y: 19 });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- DungeonService.spec.ts
```

Expected: FAIL with "transformToWorldCoords is not a function"

**Step 3: Implement transformToWorldCoords()**

Add to DungeonService.ts before getVisibleTiles():

```typescript
/**
 * Transform relative coordinates (from player perspective) to world coordinates
 * @param position - Player position with facing direction
 * @param relativeX - Horizontal offset (-1 = left, 0 = center, 1 = right)
 * @param relativeY - Forward offset (1 = one tile ahead, 2 = two tiles ahead, etc.)
 * @returns World coordinates with edge wrapping
 */
export function transformToWorldCoords(
  position: Position,
  relativeX: number,
  relativeY: number
): { x: number; y: number } {
  let worldX = position.x;
  let worldY = position.y;

  switch (position.facing) {
    case 'NORTH':
      // North: forward = -Y, left = -X
      worldX = position.x + relativeX;
      worldY = position.y - relativeY;
      break;
    case 'EAST':
      // East: forward = +X, left = -Y
      worldX = position.x + relativeY;
      worldY = position.y - relativeX;
      break;
    case 'SOUTH':
      // South: forward = +Y, left = +X
      worldX = position.x - relativeX;
      worldY = position.y + relativeY;
      break;
    case 'WEST':
      // West: forward = -X, left = +Y
      worldX = position.x - relativeY;
      worldY = position.y + relativeX;
      break;
  }

  // Handle edge wrapping (maps are 20×20 with wrapping enabled)
  worldX = ((worldX % 20) + 20) % 20;
  worldY = ((worldY % 20) + 20) % 20;

  return { x: worldX, y: worldY };
}
```

**Step 4: Export the function**

Add to DungeonService exports at bottom of file:

```typescript
export const DungeonService = {
  loadLevel,
  getTile,
  getVisibleTiles,
  getPositionAhead,
  transformToWorldCoords  // Add this
};
```

**Step 5: Run test to verify it passes**

```bash
npm test -- DungeonService.spec.ts
```

Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/services/DungeonService.ts src/services/__tests__/DungeonService.spec.ts
git commit -m "feat: add coordinate transformation for relative-to-world conversion

Implements transformToWorldCoords() to convert player-relative coordinates
(left/center/right at depth N) to world coordinates based on facing direction.

- Handles all 4 facing directions (NORTH, EAST, SOUTH, WEST)
- Supports edge wrapping for 20×20 maps
- Adds 15 tests covering all directions and edge cases"
```

---

## Task 2: Expand getVisibleTiles() to Return 3-Column Grid

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/services/DungeonService.ts:128-143`
- Modify: `/Users/dirkkok/Development/wizardry/src/types/Dungeon.ts`
- Test: `/Users/dirkkok/Development/wizardry/src/services/__tests__/DungeonService.spec.ts`

**Step 1: Add relativeX and relativeDepth to TileData type**

Modify `/Users/dirkkok/Development/wizardry/src/types/Dungeon.ts`:

```typescript
export interface TileData {
  x: number;
  y: number;
  walls: {
    north: WallType;
    east: WallType;
    south: WallType;
    west: WallType;
  };
  // Add spatial positioning for rendering
  relativeX?: number;      // -1 (left), 0 (center), 1 (right)
  relativeDepth?: number;  // 1, 2, 3 (tiles ahead)
}
```

**Step 2: Write failing test for 3-column grid visibility**

Add to DungeonService.spec.ts:

```typescript
describe('getVisibleTiles (3-column grid)', () => {
  it('returns 3 columns × 3 depths = 9 tiles with light radius 3', () => {
    const level = DungeonService.loadLevel(1);
    const position: Position = { x: 10, y: 10, level: 1, facing: 'NORTH' };

    const tiles = DungeonService.getVisibleTiles(level, position, 3);

    expect(tiles).toHaveLength(9);

    // Verify structure: 3 depths × 3 columns
    const depth1 = tiles.filter(t => t.relativeDepth === 1);
    const depth2 = tiles.filter(t => t.relativeDepth === 2);
    const depth3 = tiles.filter(t => t.relativeDepth === 3);

    expect(depth1).toHaveLength(3);
    expect(depth2).toHaveLength(3);
    expect(depth3).toHaveLength(3);
  });

  it('returns tiles with correct relativeX values', () => {
    const level = DungeonService.loadLevel(1);
    const position: Position = { x: 10, y: 10, level: 1, facing: 'NORTH' };

    const tiles = DungeonService.getVisibleTiles(level, position, 3);

    // Each depth should have left (-1), center (0), right (1)
    for (let depth = 1; depth <= 3; depth++) {
      const depthTiles = tiles.filter(t => t.relativeDepth === depth);
      const relativeXValues = depthTiles.map(t => t.relativeX).sort();

      expect(relativeXValues).toEqual([-1, 0, 1]);
    }
  });

  it('returns correct world coordinates for each column', () => {
    const level = DungeonService.loadLevel(1);
    const position: Position = { x: 10, y: 10, level: 1, facing: 'NORTH' };

    const tiles = DungeonService.getVisibleTiles(level, position, 3);

    // Check depth 1 tiles
    const leftTile = tiles.find(t => t.relativeX === -1 && t.relativeDepth === 1);
    const centerTile = tiles.find(t => t.relativeX === 0 && t.relativeDepth === 1);
    const rightTile = tiles.find(t => t.relativeX === 1 && t.relativeDepth === 1);

    expect(leftTile).toEqual(expect.objectContaining({ x: 9, y: 9 }));
    expect(centerTile).toEqual(expect.objectContaining({ x: 10, y: 9 }));
    expect(rightTile).toEqual(expect.objectContaining({ x: 11, y: 9 }));
  });

  it('respects light radius limit', () => {
    const level = DungeonService.loadLevel(1);
    const position: Position = { x: 10, y: 10, level: 1, facing: 'NORTH' };

    const tiles2 = DungeonService.getVisibleTiles(level, position, 2);
    const tiles1 = DungeonService.getVisibleTiles(level, position, 1);

    expect(tiles2).toHaveLength(6); // 3 columns × 2 depths
    expect(tiles1).toHaveLength(3); // 3 columns × 1 depth
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npm test -- DungeonService.spec.ts -t "3-column grid"
```

Expected: FAIL - wrong array length, missing relativeX/relativeDepth

**Step 4: Rewrite getVisibleTiles() for 3-column grid**

Replace getVisibleTiles() in DungeonService.ts:

```typescript
/**
 * Get all visible tiles in front of party (3-column grid)
 * @param level - Current dungeon level
 * @param position - Party position and facing direction
 * @param lightRadius - How far party can see (1-3 tiles)
 * @returns Array of visible tiles with relative positioning
 */
export function getVisibleTiles(
  level: LevelData,
  position: Position,
  lightRadius: number
): TileData[] {
  const tiles: TileData[] = [];
  const maxDepth = Math.min(lightRadius, 3);

  // Iterate through each depth (distance ahead)
  for (let depth = 1; depth <= maxDepth; depth++) {
    // Iterate through each column (left, center, right)
    for (let column = -1; column <= 1; column++) {
      // Transform relative position to world coordinates
      const worldCoords = transformToWorldCoords(position, column, depth);

      // Get tile data from map
      const tile = getTile(level, worldCoords.x, worldCoords.y);

      // Add relative positioning for rendering
      tiles.push({
        ...tile,
        relativeX: column,
        relativeDepth: depth
      });
    }
  }

  return tiles;
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- DungeonService.spec.ts
```

Expected: All tests PASS (including old tests that still work)

**Step 6: Commit**

```bash
git add src/services/DungeonService.ts src/types/Dungeon.ts src/services/__tests__/DungeonService.spec.ts
git commit -m "feat: expand getVisibleTiles to return 3-column spatial grid

Changes tile visibility from 1D (center-only) to 2D (3×N grid).

- Returns 9 tiles for light radius 3 (3 columns × 3 depths)
- Adds relativeX (-1/0/1) and relativeDepth (1/2/3) to TileData
- Uses transformToWorldCoords for proper spatial positioning
- Handles all facing directions and edge wrapping
- Adds 12 tests for grid structure and coordinates"
```

---

## Task 3: Update MazeRenderingService to Use Spatial Data

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/services/MazeRenderingService.ts:246-270`
- Test: `/Users/dirkkok/Development/wizardry/src/services/__tests__/MazeRenderingService.spec.ts`

**Step 1: Write failing test for column-based rendering**

Add to MazeRenderingService.spec.ts:

```typescript
describe('renderTile (with spatial positioning)', () => {
  const perspective = { scale: 1.0, offsetY: 0, brightness: 1.0 };
  const config = { width: 600, height: 600, tileDepth: 3 };

  it('renders center column tile with all visible walls', () => {
    const tile: TileData & { relativeX: number; relativeDepth: number } = {
      x: 10, y: 9,
      walls: { north: 'wall', east: 'open', south: 'open', west: 'wall' },
      relativeX: 0,
      relativeDepth: 1
    };

    const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, config);

    // Center column: should render front and left walls (east is open)
    expect(commands.length).toBeGreaterThan(0);

    // Should have wall commands (4 lines per wall)
    const wallCount = commands.length / 4;
    expect(wallCount).toBeGreaterThanOrEqual(2); // front + left walls
  });

  it('renders left column tile with only right-facing wall visible', () => {
    const tile: TileData & { relativeX: number; relativeDepth: number } = {
      x: 9, y: 9,
      walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' },
      relativeX: -1,
      relativeDepth: 1
    };

    const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, config);

    // Left column: only render east wall (right side from player perspective)
    // This forms the left corridor wall seen from center
    expect(commands.length).toBeGreaterThan(0);
  });

  it('renders right column tile with only left-facing wall visible', () => {
    const tile: TileData & { relativeX: number; relativeDepth: number } = {
      x: 11, y: 9,
      walls: { north: 'wall', east: 'wall', south: 'open', west: 'wall' },
      relativeX: 1,
      relativeDepth: 1
    };

    const commands = MazeRenderingService.renderTile(tile, 'NORTH', perspective, config);

    // Right column: only render west wall (left side from player perspective)
    // This forms the right corridor wall seen from center
    expect(commands.length).toBeGreaterThan(0);
  });

  it('positions walls with correct horizontal offset', () => {
    const leftTile: TileData & { relativeX: number; relativeDepth: number } = {
      x: 9, y: 9,
      walls: { north: 'open', east: 'wall', south: 'open', west: 'open' },
      relativeX: -1,
      relativeDepth: 1
    };

    const rightTile: TileData & { relativeX: number; relativeDepth: number } = {
      x: 11, y: 9,
      walls: { north: 'open', east: 'open', south: 'open', west: 'wall' },
      relativeX: 1,
      relativeDepth: 1
    };

    const leftCommands = MazeRenderingService.renderTile(leftTile, 'NORTH', perspective, config);
    const rightCommands = MazeRenderingService.renderTile(rightTile, 'NORTH', perspective, config);

    // Left and right walls should have different X positions
    expect(leftCommands[0].x).not.toEqual(rightCommands[0].x);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- MazeRenderingService.spec.ts -t "spatial positioning"
```

Expected: FAIL - tiles don't have relativeX, wrong walls rendered

**Step 3: Update renderTile() signature and logic**

Replace renderTile() in MazeRenderingService.ts:

```typescript
/**
 * Render a single tile with all its walls
 * @param tile - Tile data with walls and relative positioning
 * @param facing - Direction player is facing
 * @param perspective - Perspective scale parameters
 * @param config - Viewport configuration
 * @returns Array of drawing commands for the tile
 */
export function renderTile(
  tile: TileData & { relativeX: number; relativeDepth: number },
  facing: Direction,
  perspective: PerspectiveScale,
  config: ViewportConfig
): CanvasCommand[] {
  const commands: CanvasCommand[] = [];

  // Get walls relative to player facing
  const walls = getRelativeWalls(tile.walls, facing);

  // Determine which walls to render based on column position
  const relativeX = tile.relativeX;
  const depth = tile.relativeDepth;

  if (relativeX === -1) {
    // Left column: only render right wall (forms left corridor edge)
    if (walls.right !== 'open') {
      commands.push(...renderWall('left', walls.right, perspective, config, depth, relativeX));
    }
  } else if (relativeX === 0) {
    // Center column: render all visible walls
    if (walls.front !== 'open') {
      commands.push(...renderWall('front', walls.front, perspective, config, depth, relativeX));
    }
    if (walls.left !== 'open') {
      commands.push(...renderWall('left', walls.left, perspective, config, depth, relativeX));
    }
    if (walls.right !== 'open') {
      commands.push(...renderWall('right', walls.right, perspective, config, depth, relativeX));
    }
  } else if (relativeX === 1) {
    // Right column: only render left wall (forms right corridor edge)
    if (walls.left !== 'open') {
      commands.push(...renderWall('right', walls.left, perspective, config, depth, relativeX));
    }
  }

  return commands;
}
```

**Step 4: Update renderWall() to accept column offset**

Modify renderWall() signature and add column offset logic:

```typescript
/**
 * Render a wall on specified side using wireframe lines
 * @param side - Which side (left, right, front)
 * @param wallType - Type of wall
 * @param perspective - Perspective scale parameters
 * @param config - Viewport configuration
 * @param depth - Distance from player (1-3)
 * @param relativeX - Column offset (-1, 0, 1)
 * @returns Array of line drawing commands for wireframe wall
 */
export function renderWall(
  side: 'left' | 'right' | 'front',
  wallType: 'open' | 'wall' | 'door' | 'secret' | 'locked_door',
  perspective: PerspectiveScale,
  config: ViewportConfig,
  depth: number = 1,
  relativeX: number = 0
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

  // Calculate horizontal offset based on column position
  const columnOffset = relativeX * wallOffset;

  if (side === 'left') {
    // Left wall wireframe
    commands.push(...generateRectangleOutline(
      centerX - wallOffset - 50 + columnOffset,
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
      centerX + wallOffset + columnOffset,
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
      centerX - wallOffset + columnOffset,
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

**Step 5: Update generateView() to use new renderTile signature**

Modify generateView() in MazeRenderingService.ts:

```typescript
/**
 * Generate complete view of maze from player perspective
 * @param tiles - Array of visible tiles (near to far) with spatial positioning
 * @param facing - Direction player is facing
 * @param config - Viewport configuration
 * @returns Complete array of drawing commands
 */
export function generateView(
  tiles: (TileData & { relativeX: number; relativeDepth: number })[],
  facing: Direction,
  config: ViewportConfig
): CanvasCommand[] {
  if (tiles.length === 0) {
    return [];
  }

  const commands: CanvasCommand[] = [];

  // Draw horizontal tunnel frames first (creates the 3D tunnel cross-sections)
  const maxDepth = Math.max(...tiles.map(t => t.relativeDepth));
  commands.push(...renderTunnelFrames(config, maxDepth));

  // Sort tiles by depth (far to near for correct z-ordering)
  const sortedTiles = [...tiles].sort((a, b) => b.relativeDepth - a.relativeDepth);

  // Render tiles from far to near for correct z-ordering
  for (const tile of sortedTiles) {
    const depth = tile.relativeDepth;
    const perspective = calculatePerspective(depth);

    commands.push(...renderTile(tile, facing, perspective, config));
  }

  return commands;
}
```

**Step 6: Update MazeRenderingService exports**

```typescript
export const MazeRenderingService = {
  calculatePerspective,
  getRelativeWalls,
  getColorForDepth,
  getLineWidthForDepth,
  generateRectangleOutline,
  renderTunnelFrames,
  renderWall,
  renderTile,
  generateView
};
```

**Step 7: Run tests to verify they pass**

```bash
npm test -- MazeRenderingService.spec.ts
```

Expected: All tests PASS

**Step 8: Commit**

```bash
git add src/services/MazeRenderingService.ts src/services/__tests__/MazeRenderingService.spec.ts
git commit -m "feat: add spatial awareness to maze rendering

Updates rendering to handle 3-column grid visibility.

- renderTile() now accepts relativeX and relativeDepth
- Left column renders only right-facing walls (left corridor edge)
- Center column renders all visible walls (front/left/right)
- Right column renders only left-facing walls (right corridor edge)
- renderWall() accepts column offset for horizontal positioning
- generateView() sorts tiles by depth for proper z-ordering
- Adds 12 tests for spatial positioning and column rendering"
```

---

## Task 4: Update MazeComponent to Use New Tile Data

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/app/maze/maze.component.ts`
- Test: Manual testing in browser

**Step 1: Update drawCommands() signal to pass spatial tiles**

Locate drawCommands() computed signal and verify it passes the tiles correctly:

```typescript
// In maze.component.ts
readonly drawCommands = computed(() => {
  const tiles = this.visibleTiles();  // Already has relativeX/relativeDepth from DungeonService
  const facing = this.partyPosition()?.facing || 'NORTH';

  return MazeRenderingService.generateView(
    tiles as (TileData & { relativeX: number; relativeDepth: number })[],
    facing,
    { width: 600, height: 600, tileDepth: 3 }
  );
});
```

**Step 2: Verify TypeScript compilation**

```bash
npm run build
```

Expected: No type errors

**Step 3: Manual browser testing**

1. Start dev server: `npm start`
2. Navigate to maze scene
3. Test movements:
   - Walk forward - corridor should extend ahead
   - Turn left - view should rotate 90°
   - Walk into wall - should see front wall blocking
   - Turn at intersection - should see side corridor opening

**Step 4: Commit if changes needed**

```bash
git add src/app/maze/maze.component.ts
git commit -m "fix: update maze component to use spatial tile data

Ensures drawCommands() passes tiles with relativeX/relativeDepth to
MazeRenderingService.generateView() for proper spatial rendering."
```

---

## Task 5: Fix Existing Tests for New Tile Structure

**Files:**
- Modify: `/Users/dirkkok/Development/wizardry/src/services/__tests__/MazeRenderingService.spec.ts`

**Step 1: Update test helper to include relativeX/relativeDepth**

Modify createTestTile helper:

```typescript
// Helper to create test tile
function createTestTile(
  x: number,
  y: number,
  walls: {
    north: 'open' | 'wall' | 'door' | 'secret';
    east: 'open' | 'wall' | 'door' | 'secret';
    south: 'open' | 'wall' | 'door' | 'secret';
    west: 'open' | 'wall' | 'door' | 'secret';
  },
  relativeX: number = 0,
  relativeDepth: number = 1
): TileData & { relativeX: number; relativeDepth: number } {
  return {
    x,
    y,
    walls,
    relativeX,
    relativeDepth
  };
}
```

**Step 2: Update all generateView test cases**

Find and update generateView tests:

```typescript
describe('generateView', () => {
  it('returns empty array for no tiles', () => {
    const commands = MazeRenderingService.generateView([], 'NORTH', testConfig);

    expect(commands).toHaveLength(0);
  });

  it('renders 3 tiles with correct perspective', () => {
    const tiles = [
      createTestTile(10, 9, { north: 'open', east: 'open', south: 'open', west: 'open' }, 0, 1),
      createTestTile(10, 8, { north: 'open', east: 'open', south: 'open', west: 'open' }, 0, 2),
      createTestTile(10, 7, { north: 'open', east: 'open', south: 'open', west: 'open' }, 0, 3)
    ];

    const commands = MazeRenderingService.generateView(tiles, 'NORTH', testConfig);

    // Should have commands (3 tiles × corridor lines)
    expect(commands.length).toBeGreaterThan(0);
  });

  it('renders 3×3 grid of tiles with walls', () => {
    const tiles = [
      // Depth 1
      createTestTile(9, 9, { north: 'open', east: 'wall', south: 'open', west: 'open' }, -1, 1),
      createTestTile(10, 9, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 1),
      createTestTile(11, 9, { north: 'open', east: 'open', south: 'open', west: 'wall' }, 1, 1),
      // Depth 2
      createTestTile(9, 8, { north: 'open', east: 'wall', south: 'open', west: 'open' }, -1, 2),
      createTestTile(10, 8, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 2),
      createTestTile(11, 8, { north: 'open', east: 'open', south: 'open', west: 'wall' }, 1, 2),
      // Depth 3
      createTestTile(9, 7, { north: 'open', east: 'wall', south: 'open', west: 'open' }, -1, 3),
      createTestTile(10, 7, { north: 'wall', east: 'open', south: 'open', west: 'open' }, 0, 3),
      createTestTile(11, 7, { north: 'open', east: 'open', south: 'open', west: 'wall' }, 1, 3)
    ];

    const commands = MazeRenderingService.generateView(tiles, 'NORTH', testConfig);

    // Should render tunnel frames + walls from 9 tiles
    expect(commands.length).toBeGreaterThan(16); // 16 tunnel frame lines + wall lines
  });
});
```

**Step 3: Run all tests**

```bash
npm test
```

Expected: All 800+ tests PASS

**Step 4: Commit**

```bash
git add src/services/__tests__/MazeRenderingService.spec.ts
git commit -m "test: update maze rendering tests for spatial tile structure

Updates all test cases to include relativeX and relativeDepth in tile data.

- Updates createTestTile helper with spatial parameters
- Adds test for 3×3 grid rendering
- Verifies all existing tests pass with new structure"
```

---

## Task 6: Integration Testing and Validation

**Files:**
- None (manual testing)

**Step 1: Visual testing in browser**

1. Start dev server: `npm start`
2. Navigate to maze (create party if needed)
3. Test scenarios:

**Scenario A: Straight Corridor**
- Walk forward several steps
- Verify: Walls on left/right, open path ahead
- Expected: Side walls visible at all depths

**Scenario B: T-Intersection**
- Walk to intersection with left/right exits
- Verify: No walls on sides, openings visible
- Turn left, then turn around
- Verify: View rotates correctly

**Scenario C: Dead End**
- Walk to dead end
- Verify: Front wall blocks view, no tiles behind wall
- Expected: Clear "you can't go further" visual

**Scenario D: L-Shaped Corridor**
- Walk through L-shaped turn
- Verify: One wall closes, other opens during turn
- Expected: Smooth transition, walls appear/disappear correctly

**Scenario E: All Four Directions**
- From same position, face NORTH, EAST, SOUTH, WEST
- Verify: Each direction shows correct layout
- Expected: 90° rotation each time, consistent rendering

**Step 2: Performance validation**

```bash
npm test
```

Expected: Test suite completes in <2.5 seconds

**Step 3: Check browser console for errors**

Open DevTools console while navigating maze.
Expected: No errors or warnings

**Step 4: Document any issues found**

If issues found, create GitHub issue or add TODO comment in code.

**Step 5: Final commit (if fixes needed)**

```bash
git add .
git commit -m "fix: resolve [specific issue] in maze rendering

[Description of fix]"
```

---

## Verification Checklist

Before considering this complete, verify:

- [ ] All tests pass (`npm test`)
- [ ] Test suite runs in <2.5 seconds
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Maze renders actual dungeon layout (not generic wireframes)
- [ ] Left/right corridor openings visible when present
- [ ] Dead ends show front wall blocking view
- [ ] All 4 facing directions render correctly
- [ ] Turning 90° rotates view as expected
- [ ] No console errors in browser
- [ ] Performance acceptable (60fps rendering)

---

## Success Criteria

**Functional Requirements:**
✅ Maze view reflects actual dungeon layout based on player position/orientation
✅ 3-column visibility grid (left/center/right at depths 1-3)
✅ Coordinate transformation handles all 4 facing directions
✅ Wall rendering positioned correctly for each column
✅ Proper z-ordering (far to near rendering)

**Technical Requirements:**
✅ All tests pass (aim for 100% coverage of new code)
✅ Test suite <2.5s total runtime
✅ TypeScript strict mode compliance
✅ No breaking changes to existing API
✅ Frequent commits with clear messages

**Visual Requirements:**
✅ Authentic Wizardry wireframe aesthetic maintained
✅ Smooth visual transitions when turning/moving
✅ Clear indication of dead ends vs. openings
✅ Proper depth perception (size/brightness scaling)

---

## Troubleshooting Guide

**Issue: Tests fail with "relativeX is undefined"**
- Check: Did you update TileData interface in Dungeon.ts?
- Check: Is getVisibleTiles() adding relativeX to returned tiles?

**Issue: Walls render in wrong positions**
- Check: transformToWorldCoords() logic for your facing direction
- Debug: Log world coordinates and verify against expected
- Test: Use edge cases (coordinates 0, 19) to verify wrapping

**Issue: Left column doesn't show anything**
- Check: Is relativeX === -1 case in renderTile()?
- Check: Are you rendering walls.right for left column?
- Debug: Log tiles array to verify left column tiles exist

**Issue: View doesn't update when turning**
- Check: Is facing direction passed correctly to generateView()?
- Check: Is drawCommands() computed signal recalculating?
- Test: Log facing direction and tiles on each turn

**Issue: Performance degraded**
- Profile: Use browser DevTools Performance tab
- Check: Are you rendering >9 tiles per frame?
- Optimize: Consider culling tiles behind front walls

---

## References

**Documentation:**
- `/Users/dirkkok/Development/wizardry/docs/systems/first-person-rendering.md` - Overall rendering system
- `/Users/dirkkok/Development/wizardry/docs/services/DungeonService.md` - Tile management
- `/Users/dirkkok/Development/wizardry/docs/services/VisibilityService.md` - Visibility algorithms

**Related Code:**
- `src/services/DungeonService.ts` - Tile data and visibility
- `src/services/MazeRenderingService.ts` - Wireframe rendering
- `src/app/maze/maze.component.ts` - UI integration
- `src/types/Dungeon.ts` - Type definitions

**Testing:**
- Jest framework: https://jestjs.io/
- Testing best practices: `docs/testing-strategy.md`
