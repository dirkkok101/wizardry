# Edge Wrapping Visibility Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix VisibilityService to prevent rendering walls from wrapped tile coordinates (e.g., x=19 appearing when player is at x=0).

**Architecture:** Add bounds checking to VisibilityService.getVisibleWalls() to skip out-of-bounds tiles instead of wrapping them. Edge wrapping is for movement topology, not rendering visibility.

**Tech Stack:** TypeScript, Jest for testing

---

## Background

**Current Bug:**
- Player at (0,0) facing NORTH sees walls from tile (19,0) on the left side
- Column offset -1 wraps to x=19 due to edge wrapping
- Tile (19,0) has different wall configuration than expected for left side
- Creates incorrect wall geometry

**Root Cause:**
- VisibilityService wraps coordinates for visibility calculation
- Edge wrapping enables movement across boundaries, but shouldn't enable seeing across them
- Original Wizardry doesn't render across map boundaries

**Fix:**
- Add bounds check: `if (tileX < 0 || tileX >= level.size.width || tileY < 0 || tileY >= level.size.height) continue`
- Skip out-of-bounds tiles instead of wrapping them

---

## Task 1: Add Bounds Checking Test

**Files:**
- Test: `src/services/__tests__/VisibilityService.spec.ts`

**Step 1: Write the failing test**

Add to existing test file after line 288 (after the existing tests):

```typescript
describe('edge wrapping visibility', () => {
  it('does not include wrapped tiles when player is at map edge', () => {
    // Create test level with 20x20 size
    const level: LevelData = {
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      startPosition: { x: 0, y: 0, facing: 'NORTH' },
      edgeWrapping: true,
      tiles: [
        {
          x: 0,
          y: 0,
          walls: { north: 'open', east: 'open', south: 'wall', west: 'wall' }
        },
        {
          x: 1,
          y: 0,
          walls: { north: 'wall', east: 'open', south: 'wall', west: 'open' }
        },
        {
          x: 0,
          y: 1,
          walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' }
        },
        {
          x: 19,
          y: 0,
          walls: { north: 'open', east: 'wall', south: 'wall', west: 'open' }
        }
      ],
      encounterRate: 0.1,
      encounterTable: []
    }

    const position: Position = { x: 0, y: 0, facing: 'NORTH' }
    const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

    // Extract unique grid coordinates from walls
    const uniqueTiles = new Set<string>()
    walls.forEach(wall => {
      uniqueTiles.add(`${wall.gridX},${wall.gridY}`)
    })

    // Should NOT include tile (19, 0) even though edgeWrapping is true
    expect(uniqueTiles.has('19,0')).toBe(false)
    expect(uniqueTiles.has('19,1')).toBe(false)
    expect(uniqueTiles.has('19,2')).toBe(false)
    expect(uniqueTiles.has('19,3')).toBe(false)
    expect(uniqueTiles.has('19,4')).toBe(false)

    // Should only include tiles in bounds: (0,y) and (1,y)
    const tiles = Array.from(uniqueTiles)
    tiles.forEach(tile => {
      const [x] = tile.split(',').map(Number)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(level.size.width)
    })

    // Verify we do see expected tiles
    expect(uniqueTiles.has('0,0')).toBe(true)
    expect(uniqueTiles.has('1,0')).toBe(true)
    expect(uniqueTiles.has('0,1')).toBe(true)
  })

  it('does not include negative coordinates when facing west from edge', () => {
    const level: LevelData = {
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      startPosition: { x: 0, y: 0, facing: 'WEST' },
      edgeWrapping: true,
      tiles: [
        {
          x: 0,
          y: 0,
          walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' }
        }
      ],
      encounterRate: 0.1,
      encounterTable: []
    }

    const position: Position = { x: 0, y: 0, facing: 'WEST' }
    const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

    const uniqueTiles = new Set<string>()
    walls.forEach(wall => {
      uniqueTiles.add(`${wall.gridX},${wall.gridY}`)
    })

    // Should only see tile (0,0) - no wrapped tiles from x=19
    expect(uniqueTiles.size).toBe(1)
    expect(uniqueTiles.has('0,0')).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- VisibilityService`

Expected: FAIL with assertion error showing tiles like '19,0', '19,1' are present

**Step 3: Add bounds checking to VisibilityService**

**File:** `src/services/VisibilityService.ts`

Find the main visibility loop (around lines 89-107). Replace this section:

```typescript
// BEFORE (lines ~89-107)
for (let depth = 0; depth < maxDepth; depth++) {
  const forwardPos = {
    x: position.x + forwardX * depth,
    y: position.y + forwardY * depth
  }

  for (const colOffset of columnOffsets) {
    const tileX = forwardPos.x + perpX * colOffset
    const tileY = forwardPos.y + perpY * colOffset
    const key = `${tileX},${tileY}`

    if (!visited.has(key)) {
      addTileWalls(tileX, tileY)
      visited.add(key)
    }
  }

  // Check if center column is blocked (stops forward traversal)
  const centerTile = DungeonService.getTile(level, forwardPos.x, forwardPos.y)
  // ... rest of blocking logic
}
```

WITH:

```typescript
// AFTER (with bounds checking)
for (let depth = 0; depth < maxDepth; depth++) {
  const forwardPos = {
    x: position.x + forwardX * depth,
    y: position.y + forwardY * depth
  }

  for (const colOffset of columnOffsets) {
    const tileX = forwardPos.x + perpX * colOffset
    const tileY = forwardPos.y + perpY * colOffset

    // Skip out-of-bounds tiles (edge wrapping is for movement, not visibility)
    if (tileX < 0 || tileX >= level.size.width ||
        tileY < 0 || tileY >= level.size.height) {
      continue
    }

    const key = `${tileX},${tileY}`

    if (!visited.has(key)) {
      addTileWalls(tileX, tileY)
      visited.add(key)
    }
  }

  // Check if center column is blocked (stops forward traversal)
  const centerTile = DungeonService.getTile(level, forwardPos.x, forwardPos.y)
  // ... rest of blocking logic (unchanged)
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- VisibilityService`

Expected: All tests PASS including the new edge wrapping tests

**Step 5: Verify in browser**

Run: `npm start`

Navigate to maze scene at position (0,0) facing NORTH

Expected console logs:
```
[Visibility] Found ~29 walls from ~10 tiles using 3-column grid
[WebGL] Visible tiles: (0,0), (1,0), (0,1), (1,1), (0,2), (1,2), (0,3), (1,3), (0,4), (1,4)
```

NO tiles at x=19 should appear.

Visual check:
- Left side: west wall of (0,0)
- Right side: east wall of (1,0)
- Corridor continues north
- NO walls from opposite side of map

**Step 6: Commit**

```bash
git add src/services/VisibilityService.ts src/services/__tests__/VisibilityService.spec.ts
git commit -m "fix: prevent edge-wrapped tiles from appearing in visibility calculation

Add bounds checking to skip out-of-bounds tiles instead of wrapping them.
Edge wrapping is for movement topology, not rendering visibility.

- Add test: edge wrapping visibility does not include wrapped tiles
- Add bounds check: tileX/tileY must be within [0, size-1]
- Fixes bug where tiles from x=19 appeared when player at x=0

Fixes walls rendering from opposite side of map."
```

---

## Task 2: Update Documentation

**Files:**
- Modify: `src/services/VisibilityService.ts:1-20` (add JSDoc comment)

**Step 1: Add documentation comment**

Add at the top of the getVisibleWalls function (around line 13):

```typescript
/**
 * Get visible wall segments from player's perspective.
 *
 * Uses hybrid grid-based traversal with early stopping for Wizardry-style
 * peripheral vision rendering. Only returns walls within map bounds - edge
 * wrapping is for movement topology, not rendering visibility.
 *
 * @param level - Level data including tiles and size
 * @param position - Player position and facing direction
 * @param maxDepth - Maximum viewing distance (typically 5 tiles)
 * @param peripheralColumns - Number of columns in peripheral vision (3 = left, center, right)
 * @returns Array of wall segments sorted back-to-front for painter's algorithm
 */
getVisibleWalls(
  level: LevelData,
  position: Position,
  maxDepth: number,
  peripheralColumns: number
): WallSegment[]
```

**Step 2: Commit documentation**

```bash
git add src/services/VisibilityService.ts
git commit -m "docs: clarify edge wrapping behavior in VisibilityService

Add JSDoc explaining that bounds checking prevents wrapped tile rendering."
```

---

## Task 3: Add Edge Case Tests

**Files:**
- Test: `src/services/__tests__/VisibilityService.spec.ts`

**Step 1: Write edge case tests**

Add after the previous edge wrapping tests:

```typescript
it('handles player at northeast corner (19, 19)', () => {
  const level: LevelData = {
    level: 1,
    name: 'Test Level',
    size: { width: 20, height: 20 },
    startPosition: { x: 19, y: 19, facing: 'NORTH' },
    edgeWrapping: true,
    tiles: [
      {
        x: 19,
        y: 19,
        walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' }
      }
    ],
    encounterRate: 0.1,
    encounterTable: []
  }

  const position: Position = { x: 19, y: 19, facing: 'NORTH' }
  const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

  const uniqueTiles = new Set<string>()
  walls.forEach(wall => {
    uniqueTiles.add(`${wall.gridX},${wall.gridY}`)
  })

  // Should not wrap to x=0 or y=0
  expect(uniqueTiles.has('0,0')).toBe(false)
  expect(uniqueTiles.has('0,19')).toBe(false)
  expect(uniqueTiles.has('19,0')).toBe(false)

  // All visible tiles should be near (19,19)
  uniqueTiles.forEach(tile => {
    const [x, y] = tile.split(',').map(Number)
    expect(x).toBeGreaterThanOrEqual(17)
    expect(x).toBeLessThan(20)
    expect(y).toBeGreaterThanOrEqual(17)
    expect(y).toBeLessThan(20)
  })
})

it('handles player at center of map with no wrapping needed', () => {
  const level: LevelData = {
    level: 1,
    name: 'Test Level',
    size: { width: 20, height: 20 },
    startPosition: { x: 10, y: 10, facing: 'NORTH' },
    edgeWrapping: true,
    tiles: [
      { x: 9, y: 10, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
      { x: 10, y: 10, walls: { north: 'open', east: 'open', south: 'wall', west: 'open' } },
      { x: 11, y: 10, walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' } },
      { x: 10, y: 11, walls: { north: 'open', east: 'wall', south: 'open', west: 'wall' } }
    ],
    encounterRate: 0.1,
    encounterTable: []
  }

  const position: Position = { x: 10, y: 10, facing: 'NORTH' }
  const walls = VisibilityService.getVisibleWalls(level, position, 5, 3)

  const uniqueTiles = new Set<string>()
  walls.forEach(wall => {
    uniqueTiles.add(`${wall.gridX},${wall.gridY}`)
  })

  // Should see tiles around (10,10) normally
  expect(uniqueTiles.has('10,10')).toBe(true)
  expect(uniqueTiles.has('9,10')).toBe(true)
  expect(uniqueTiles.has('11,10')).toBe(true)
  expect(uniqueTiles.has('10,11')).toBe(true)

  // No edge tiles should appear
  expect(uniqueTiles.has('0,10')).toBe(false)
  expect(uniqueTiles.has('19,10')).toBe(false)
})
```

**Step 2: Run tests**

Run: `npm test -- VisibilityService`

Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/services/__tests__/VisibilityService.spec.ts
git commit -m "test: add edge case tests for visibility bounds checking

Cover corner positions and center map positions."
```

---

## Task 4: Disable Debug Logging (Production Ready)

**Files:**
- Modify: `src/services/WebGLRenderingService.ts:19`

**Step 1: Change debugMode to false**

```typescript
// Line 19
private debugMode = false;  // Changed from true
```

**Step 2: Verify build still works**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 3: Test in browser**

Navigate to maze, check console - should see minimal logging

**Step 4: Commit**

```bash
git add src/services/WebGLRenderingService.ts
git commit -m "chore: disable debug logging for production

Turn off verbose WebGL debug logs now that visibility bug is fixed."
```

---

## Verification Checklist

After completing all tasks:

- [ ] Tests pass: `npm test -- VisibilityService`
- [ ] Build succeeds: `npm run build`
- [ ] Browser test at (0,0) facing NORTH: no tiles at x=19 visible
- [ ] Browser test: walls render correctly on left and right sides
- [ ] Logs show correct tile coordinates (0,y) and (1,y) only
- [ ] Can still move across map boundaries (edge wrapping still works for movement)
- [ ] No visual glitches at map edges
- [ ] Console shows no errors

---

## Files Modified Summary

1. `src/services/VisibilityService.ts` - Add bounds checking, update JSDoc
2. `src/services/__tests__/VisibilityService.spec.ts` - Add edge wrapping tests
3. `src/services/WebGLRenderingService.ts` - Disable debug mode

Total: 3 files, ~80 lines added (mostly tests), ~5 lines modified

---

## Rollback Plan

If issues arise:

```bash
git revert HEAD~4  # Revert last 4 commits
npm test          # Verify tests still pass
npm start         # Verify app still runs
```

Known risk: Movement across boundaries might need separate testing to ensure it still works.
