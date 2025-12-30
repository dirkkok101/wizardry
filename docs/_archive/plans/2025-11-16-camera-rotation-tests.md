# Camera Rotation Tests at Position (0,0) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive tests to verify camera position remains constant and orientation updates correctly when the player rotates at position (0,0) for all 4 cardinal directions.

**Architecture:** Add unit tests to PlayerStateService.spec.ts to verify direction vector transformations during rotation, and add integration test to WebGLRenderingService.spec.ts to verify the full rendering pipeline handles rotations correctly.

**Tech Stack:** Jest, TypeScript, Angular testing utilities

---

## Background Context

### Current Test Coverage
- ✅ Static direction tests exist (NORTH, EAST, SOUTH, WEST at various positions)
- ✅ Visibility tests exist for all 4 directions at (0,0)
- ✅ Rendering tests exist for all 4 directions at (0,0)
- ❌ **Missing**: Explicit rotation tests verifying camera state transformation when turning at (0,0)

### Camera Position Calculation
Grid position (0,0) → Camera position (0.5, 0.5, 0.5) in world space
- Camera X = gridX + 0.5
- Camera Y = 0.5 (eye level, constant)
- Camera Z = gridY + 0.5

### Direction Values Reference

| Direction | Angle (rad) | Angle (deg) | dirX | dirY | planeX | planeY |
|-----------|-------------|-------------|------|------|--------|--------|
| NORTH     | 0           | 0°          | 0    | 1    | 1      | 0      |
| EAST      | π/2         | 90°         | 1    | 0    | 0      | 1      |
| SOUTH     | π           | 180°        | 0    | -1   | -1     | 0      |
| WEST      | 3π/2        | 270°        | -1   | 0    | 0      | -1     |

---

## Task 1: Add Rotation Tests Starting from NORTH

**Files:**
- Modify: `src/services/__tests__/PlayerStateService.spec.ts` (after line 85)

**Step 1: Read existing test file to understand structure**

```bash
# Review existing tests
cat src/services/__tests__/PlayerStateService.spec.ts
```

Expected: See tests for `fromPosition()` and `updateDirectionVectors()` around lines 6-85

**Step 2: Add new test suite for rotations from NORTH**

Add after line 85:

```typescript
  describe('rotation at position (0,0)', () => {
    describe('starting from NORTH', () => {
      const startPos = { x: 0, y: 0, facing: 'NORTH' as const }

      it('maintains camera position when turning right to EAST', () => {
        const north = PlayerStateService.fromPosition(startPos)
        const east = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'EAST' })

        // Grid position unchanged
        expect(east.gridX).toBe(0)
        expect(east.gridY).toBe(0)

        // Camera position (gridX+0.5, gridY+0.5) unchanged
        expect(east.gridX + 0.5).toBe(0.5)
        expect(east.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to EAST
        expect(east.dirX).toBeCloseTo(1)
        expect(east.dirY).toBeCloseTo(0)
        expect(east.planeX).toBeCloseTo(0)
        expect(east.planeY).toBeCloseTo(1)
        expect(east.angle).toBeCloseTo(Math.PI / 2)
      })

      it('maintains camera position when turning left to WEST', () => {
        const north = PlayerStateService.fromPosition(startPos)
        const west = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'WEST' })

        // Grid position unchanged
        expect(west.gridX).toBe(0)
        expect(west.gridY).toBe(0)

        // Camera position unchanged
        expect(west.gridX + 0.5).toBe(0.5)
        expect(west.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to WEST
        expect(west.dirX).toBeCloseTo(-1)
        expect(west.dirY).toBeCloseTo(0)
        expect(west.planeX).toBeCloseTo(0)
        expect(west.planeY).toBeCloseTo(-1)
        expect(west.angle).toBeCloseTo((3 * Math.PI) / 2)
      })

      it('maintains camera position when turning around to SOUTH', () => {
        const north = PlayerStateService.fromPosition(startPos)
        const south = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'SOUTH' })

        // Grid position unchanged
        expect(south.gridX).toBe(0)
        expect(south.gridY).toBe(0)

        // Camera position unchanged
        expect(south.gridX + 0.5).toBe(0.5)
        expect(south.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to SOUTH
        expect(south.dirX).toBeCloseTo(0)
        expect(south.dirY).toBeCloseTo(-1)
        expect(south.planeX).toBeCloseTo(-1)
        expect(south.planeY).toBeCloseTo(0)
        expect(south.angle).toBeCloseTo(Math.PI)
      })
    })
```

**Step 3: Run tests to verify they pass**

```bash
npm test -- PlayerStateService
```

Expected: 3 new tests pass, total test count increases

**Step 4: Commit NORTH rotation tests**

```bash
git add src/services/__tests__/PlayerStateService.spec.ts
git commit -m "test: add rotation tests from NORTH at (0,0)

Add 3 tests verifying camera position stays at (0.5, 0.5) and direction
vectors update correctly when rotating from NORTH to EAST, WEST, SOUTH.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Add Rotation Tests Starting from EAST

**Files:**
- Modify: `src/services/__tests__/PlayerStateService.spec.ts`

**Step 1: Add test suite for rotations from EAST**

Add after the NORTH tests:

```typescript
    describe('starting from EAST', () => {
      const startPos = { x: 0, y: 0, facing: 'EAST' as const }

      it('maintains camera position when turning right to SOUTH', () => {
        const east = PlayerStateService.fromPosition(startPos)
        const south = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'SOUTH' })

        // Grid position unchanged
        expect(south.gridX).toBe(0)
        expect(south.gridY).toBe(0)

        // Camera position unchanged
        expect(south.gridX + 0.5).toBe(0.5)
        expect(south.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to SOUTH
        expect(south.dirX).toBeCloseTo(0)
        expect(south.dirY).toBeCloseTo(-1)
        expect(south.planeX).toBeCloseTo(-1)
        expect(south.planeY).toBeCloseTo(0)
        expect(south.angle).toBeCloseTo(Math.PI)
      })

      it('maintains camera position when turning left to NORTH', () => {
        const east = PlayerStateService.fromPosition(startPos)
        const north = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })

        // Grid position unchanged
        expect(north.gridX).toBe(0)
        expect(north.gridY).toBe(0)

        // Camera position unchanged
        expect(north.gridX + 0.5).toBe(0.5)
        expect(north.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to NORTH
        expect(north.dirX).toBeCloseTo(0)
        expect(north.dirY).toBeCloseTo(1)
        expect(north.planeX).toBeCloseTo(1)
        expect(north.planeY).toBeCloseTo(0)
        expect(north.angle).toBeCloseTo(0)
      })

      it('maintains camera position when turning around to WEST', () => {
        const east = PlayerStateService.fromPosition(startPos)
        const west = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'WEST' })

        // Grid position unchanged
        expect(west.gridX).toBe(0)
        expect(west.gridY).toBe(0)

        // Camera position unchanged
        expect(west.gridX + 0.5).toBe(0.5)
        expect(west.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to WEST
        expect(west.dirX).toBeCloseTo(-1)
        expect(west.dirY).toBeCloseTo(0)
        expect(west.planeX).toBeCloseTo(0)
        expect(west.planeY).toBeCloseTo(-1)
        expect(west.angle).toBeCloseTo((3 * Math.PI) / 2)
      })
    })
```

**Step 2: Run tests to verify they pass**

```bash
npm test -- PlayerStateService
```

Expected: 6 rotation tests pass (3 NORTH + 3 EAST)

**Step 3: Commit EAST rotation tests**

```bash
git add src/services/__tests__/PlayerStateService.spec.ts
git commit -m "test: add rotation tests from EAST at (0,0)

Add 3 tests verifying camera position and direction vectors when
rotating from EAST to SOUTH, NORTH, WEST.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Add Rotation Tests Starting from SOUTH

**Files:**
- Modify: `src/services/__tests__/PlayerStateService.spec.ts`

**Step 1: Add test suite for rotations from SOUTH**

Add after the EAST tests:

```typescript
    describe('starting from SOUTH', () => {
      const startPos = { x: 0, y: 0, facing: 'SOUTH' as const }

      it('maintains camera position when turning right to WEST', () => {
        const south = PlayerStateService.fromPosition(startPos)
        const west = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'WEST' })

        // Grid position unchanged
        expect(west.gridX).toBe(0)
        expect(west.gridY).toBe(0)

        // Camera position unchanged
        expect(west.gridX + 0.5).toBe(0.5)
        expect(west.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to WEST
        expect(west.dirX).toBeCloseTo(-1)
        expect(west.dirY).toBeCloseTo(0)
        expect(west.planeX).toBeCloseTo(0)
        expect(west.planeY).toBeCloseTo(-1)
        expect(west.angle).toBeCloseTo((3 * Math.PI) / 2)
      })

      it('maintains camera position when turning left to EAST', () => {
        const south = PlayerStateService.fromPosition(startPos)
        const east = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'EAST' })

        // Grid position unchanged
        expect(east.gridX).toBe(0)
        expect(east.gridY).toBe(0)

        // Camera position unchanged
        expect(east.gridX + 0.5).toBe(0.5)
        expect(east.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to EAST
        expect(east.dirX).toBeCloseTo(1)
        expect(east.dirY).toBeCloseTo(0)
        expect(east.planeX).toBeCloseTo(0)
        expect(east.planeY).toBeCloseTo(1)
        expect(east.angle).toBeCloseTo(Math.PI / 2)
      })

      it('maintains camera position when turning around to NORTH', () => {
        const south = PlayerStateService.fromPosition(startPos)
        const north = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })

        // Grid position unchanged
        expect(north.gridX).toBe(0)
        expect(north.gridY).toBe(0)

        // Camera position unchanged
        expect(north.gridX + 0.5).toBe(0.5)
        expect(north.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to NORTH
        expect(north.dirX).toBeCloseTo(0)
        expect(north.dirY).toBeCloseTo(1)
        expect(north.planeX).toBeCloseTo(1)
        expect(north.planeY).toBeCloseTo(0)
        expect(north.angle).toBeCloseTo(0)
      })
    })
```

**Step 2: Run tests to verify they pass**

```bash
npm test -- PlayerStateService
```

Expected: 9 rotation tests pass (3 NORTH + 3 EAST + 3 SOUTH)

**Step 3: Commit SOUTH rotation tests**

```bash
git add src/services/__tests__/PlayerStateService.spec.ts
git commit -m "test: add rotation tests from SOUTH at (0,0)

Add 3 tests verifying camera position and direction vectors when
rotating from SOUTH to WEST, EAST, NORTH.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Add Rotation Tests Starting from WEST

**Files:**
- Modify: `src/services/__tests__/PlayerStateService.spec.ts`

**Step 1: Add test suite for rotations from WEST**

Add after the SOUTH tests:

```typescript
    describe('starting from WEST', () => {
      const startPos = { x: 0, y: 0, facing: 'WEST' as const }

      it('maintains camera position when turning right to NORTH', () => {
        const west = PlayerStateService.fromPosition(startPos)
        const north = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })

        // Grid position unchanged
        expect(north.gridX).toBe(0)
        expect(north.gridY).toBe(0)

        // Camera position unchanged
        expect(north.gridX + 0.5).toBe(0.5)
        expect(north.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to NORTH
        expect(north.dirX).toBeCloseTo(0)
        expect(north.dirY).toBeCloseTo(1)
        expect(north.planeX).toBeCloseTo(1)
        expect(north.planeY).toBeCloseTo(0)
        expect(north.angle).toBeCloseTo(0)
      })

      it('maintains camera position when turning left to SOUTH', () => {
        const west = PlayerStateService.fromPosition(startPos)
        const south = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'SOUTH' })

        // Grid position unchanged
        expect(south.gridX).toBe(0)
        expect(south.gridY).toBe(0)

        // Camera position unchanged
        expect(south.gridX + 0.5).toBe(0.5)
        expect(south.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to SOUTH
        expect(south.dirX).toBeCloseTo(0)
        expect(south.dirY).toBeCloseTo(-1)
        expect(south.planeX).toBeCloseTo(-1)
        expect(south.planeY).toBeCloseTo(0)
        expect(south.angle).toBeCloseTo(Math.PI)
      })

      it('maintains camera position when turning around to EAST', () => {
        const west = PlayerStateService.fromPosition(startPos)
        const east = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'EAST' })

        // Grid position unchanged
        expect(east.gridX).toBe(0)
        expect(east.gridY).toBe(0)

        // Camera position unchanged
        expect(east.gridX + 0.5).toBe(0.5)
        expect(east.gridY + 0.5).toBe(0.5)

        // Direction vectors updated to EAST
        expect(east.dirX).toBeCloseTo(1)
        expect(east.dirY).toBeCloseTo(0)
        expect(east.planeX).toBeCloseTo(0)
        expect(east.planeY).toBeCloseTo(1)
        expect(east.angle).toBeCloseTo(Math.PI / 2)
      })
    })
  })
```

**Step 2: Run tests to verify they pass**

```bash
npm test -- PlayerStateService
```

Expected: 12 rotation tests pass (3 per direction × 4 directions)

**Step 3: Commit WEST rotation tests**

```bash
git add src/services/__tests__/PlayerStateService.spec.ts
git commit -m "test: add rotation tests from WEST at (0,0)

Add 3 tests verifying camera position and direction vectors when
rotating from WEST to NORTH, SOUTH, EAST.

Completes rotation test coverage for all 4 cardinal directions.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Add Integration Test to WebGLRenderingService

**Files:**
- Modify: `src/services/__tests__/WebGLRenderingService.spec.ts` (after line 342)

**Step 1: Read existing test structure**

```bash
# Review existing rendering tests
cat src/services/__tests__/WebGLRenderingService.spec.ts | grep -A 20 "render() visibility"
```

Expected: See visibility tests for all 4 directions

**Step 2: Add integration test for rotation**

Add after line 342 (after the last floor/ceiling test):

```typescript
  describe('camera orientation when rotating at (0,0)', () => {
    it('changes visible tiles when rotating from NORTH to EAST', () => {
      const service = new WebGLRenderingService()
      service.initialize(canvas)
      loadMockAtlas(service)

      const level = DungeonService.loadLevel(1)

      // Render facing NORTH
      const northPos: Position = { x: 0, y: 0, facing: 'NORTH' }
      service.render(level, northPos, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      })

      const northWalls = VisibilityService.getVisibleWalls(level, northPos, 5, 3)
      const northTiles = new Set<string>()
      northWalls.forEach(wall => northTiles.add(`${wall.gridX},${wall.gridY}`))

      // Render facing EAST (after "turning right")
      const eastPos: Position = { x: 0, y: 0, facing: 'EAST' }
      service.render(level, eastPos, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      })

      const eastWalls = VisibilityService.getVisibleWalls(level, eastPos, 5, 3)
      const eastTiles = new Set<string>()
      eastWalls.forEach(wall => eastTiles.add(`${wall.gridX},${wall.gridY}`))

      // Verify different tiles visible after rotation
      expect(northTiles.size).toBe(6)  // (0,0), (0,1), (0,2), (0,3), (0,4), (1,0)
      expect(eastTiles.size).toBe(6)   // (0,0), (1,0), (2,0), (3,0), (4,0), (0,1)

      // Verify tiles are actually different (rotation changed view)
      const uniqueToNorth = Array.from(northTiles).filter(t => !eastTiles.has(t))
      const uniqueToEast = Array.from(eastTiles).filter(t => !northTiles.has(t))

      expect(uniqueToNorth.length).toBeGreaterThan(0)
      expect(uniqueToEast.length).toBeGreaterThan(0)

      // Both should see (0,0) and (1,0) or (0,1) in common
      expect(northTiles.has('0,0')).toBe(true)
      expect(eastTiles.has('0,0')).toBe(true)
    })
  })
```

**Step 3: Run tests to verify they pass**

```bash
npm test -- WebGLRenderingService
```

Expected: New integration test passes, verifies visibility changes with rotation

**Step 4: Commit integration test**

```bash
git add src/services/__tests__/WebGLRenderingService.spec.ts
git commit -m "test: add integration test for rotation visibility changes

Add test verifying that rotating from NORTH to EAST at (0,0) changes
the set of visible tiles, confirming the full rendering pipeline
handles rotations correctly.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Verify All Tests Pass

**Files:**
- None (verification only)

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass, including 12 new rotation tests + 1 integration test

**Step 2: Check test count**

Verify total test count increased by 13:
- 12 rotation tests in PlayerStateService.spec.ts
- 1 integration test in WebGLRenderingService.spec.ts

**Step 3: Verify performance**

Ensure test suite still completes in <2.5 seconds per CLAUDE.md requirement

Expected: Total time < 2.5s

---

## Task 7: Final Commit and Summary

**Files:**
- None (documentation only)

**Step 1: Create summary of changes**

Summary:
- Added 12 unit tests to PlayerStateService.spec.ts
- Added 1 integration test to WebGLRenderingService.spec.ts
- All tests verify camera position stays at (0.5, 0.5) when rotating at grid (0,0)
- All tests verify direction vectors update correctly for all rotations
- Integration test verifies visibility changes correctly with rotation

**Step 2: Verify git log**

```bash
git log --oneline -5
```

Expected: See 5 commits for NORTH, EAST, SOUTH, WEST, and integration test

---

## Success Criteria

- ✅ 12 rotation tests added to PlayerStateService.spec.ts
- ✅ 1 integration test added to WebGLRenderingService.spec.ts
- ✅ All 13 tests pass
- ✅ Camera position (0.5, 0.5, 0.5) verified for all rotations at (0,0)
- ✅ Direction vectors verified for all 12 rotation combinations
- ✅ Angle values verified for all 4 cardinal directions
- ✅ Plane vectors verified for all 4 cardinal directions
- ✅ Integration test confirms visibility changes with rotation
- ✅ Test suite completes in <2.5 seconds
- ✅ 5 commits created (one per task: NORTH, EAST, SOUTH, WEST, integration)

---

## Notes for Engineer

**Floating Point Comparisons:**
Always use `toBeCloseTo()` for comparing angles and direction vectors (not `toBe()`).

**Camera Position Formula:**
```typescript
cameraX = gridX + 0.5
cameraY = 0.5 (constant eye level)
cameraZ = gridY + 0.5
```

**Direction Vector Calculation:**
```typescript
dirX = Math.sin(angle)
dirY = Math.cos(angle)
planeX = dirY * 1.0  // Perpendicular to direction
planeY = dirX * 1.0
```

**Test Pattern:**
Each test creates two PlayerState objects (before and after rotation) and verifies:
1. Grid position unchanged (still at 0,0)
2. Camera position unchanged (still at 0.5, 0.5)
3. Direction vectors updated correctly
4. Angle updated correctly
5. Plane vectors updated correctly
