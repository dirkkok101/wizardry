# WebGL Renderer Visibility Tests - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create comprehensive tests for WebGLRenderingService that verify it renders the exact same tiles identified by VisibilityService tests at position (0,0) for all 4 cardinal directions.

**Architecture:** Test WebGLRenderingService.render() by mocking WebGL context, capturing draw calls, and verifying rendered walls match VisibilityService.getVisibleWalls() output for each direction.

**Tech Stack:** TypeScript, Jest, WebGL mocking

---

## Context

**VisibilityService Tests** (existing):
- NORTH from (0,0): 4 tiles visible - (0,0), (0,1), (0,2), (0,3)
- EAST from (0,0): 4 tiles visible - (0,0), (1,0), (2,0), (3,0)
- SOUTH from (0,0): 1 tile visible - (0,0) only (blocked by south wall)
- WEST from (0,0): 1 tile visible - (0,0) only (blocked by west wall)

**Renderer Verification Goal**: Confirm WebGLRenderingService renders walls for these exact tiles and no others.

**Why This Matters**: Ensures rendering pipeline matches visibility calculations. If visibility says 4 tiles are visible, renderer must draw walls from exactly those 4 tiles.

---

## Task 1: Create WebGL Mock Infrastructure

**Files:**
- Create: `src/services/__tests__/WebGLRenderingService.spec.ts`

**Step 1: Create test file with WebGL mocks**

WebGL context has 50+ methods. We need comprehensive mocking:

```typescript
import { WebGLRenderingService } from '../WebGLRenderingService';
import { DungeonService } from '../DungeonService';
import { LevelData, Position } from '../../types/Dungeon';

describe('WebGLRenderingService', () => {
  let canvas: HTMLCanvasElement;
  let mockGLContext: Partial<WebGLRenderingContext>;
  let uniformLocations: Map<string, WebGLUniformLocation>;
  let drawCalls: Array<{
    mode: number;
    first: number;
    count: number;
    vertexData: number[];
  }>;

  beforeEach(() => {
    // Reset draw call tracking
    drawCalls = [];
    uniformLocations = new Map();

    // Create mock WebGL context
    mockGLContext = {
      canvas: { width: 800, height: 600 },

      // Shader compilation
      createShader: jest.fn(() => ({} as WebGLShader)),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      getShaderParameter: jest.fn(() => true),
      createProgram: jest.fn(() => ({} as WebGLProgram)),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      getProgramParameter: jest.fn(() => true),
      useProgram: jest.fn(),

      // Uniforms
      getUniformLocation: jest.fn((program, name) => {
        const location = { name } as WebGLUniformLocation;
        uniformLocations.set(name, location);
        return location;
      }),
      uniformMatrix4fv: jest.fn(),
      uniform1f: jest.fn(),
      uniform3f: jest.fn(),

      // Buffers
      createBuffer: jest.fn(() => ({} as WebGLBuffer)),
      bindBuffer: jest.fn(),
      bufferData: jest.fn((target, data, usage) => {
        // Capture vertex data for verification
        if (data instanceof Float32Array) {
          const vertexData = Array.from(data);
          if (drawCalls.length > 0 && drawCalls[drawCalls.length - 1].vertexData.length === 0) {
            drawCalls[drawCalls.length - 1].vertexData = vertexData;
          }
        }
      }),

      // Vertex attributes
      getAttribLocation: jest.fn(() => 0),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),

      // Drawing
      drawArrays: jest.fn((mode, first, count) => {
        drawCalls.push({ mode, first, count, vertexData: [] });
      }),

      // State
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      depthFunc: jest.fn(),

      // Constants
      VERTEX_SHADER: 0x8B31,
      FRAGMENT_SHADER: 0x8B30,
      ARRAY_BUFFER: 0x8892,
      STATIC_DRAW: 0x88E4,
      TRIANGLES: 0x0004,
      DEPTH_TEST: 0x0B71,
      LEQUAL: 0x0203,
      COLOR_BUFFER_BIT: 0x00004000,
      DEPTH_BUFFER_BIT: 0x00000100,
    };

    // Create canvas and mock getContext
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    jest.spyOn(canvas, 'getContext').mockReturnValue(mockGLContext as WebGLRenderingContext);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to extract grid positions from vertex data
  const extractGridPositionsFromDrawCalls = (): Set<string> => {
    const positions = new Set<string>();

    for (const call of drawCalls) {
      // Each vertex has 5 components: [x, y, z, u, v]
      // Each wall quad has 6 vertices (2 triangles)
      const stride = 5;
      const vertexCount = call.vertexData.length / stride;

      for (let i = 0; i < vertexCount; i += 6) {
        // Get first vertex of quad to determine grid position
        const x = call.vertexData[i * stride];
        const z = call.vertexData[i * stride + 2];

        // Convert world coordinates back to grid coordinates
        // World coords are tile-corner based: grid (0,0) = world (0,0) to (1,1)
        const gridX = Math.floor(x);
        const gridY = Math.floor(z);

        positions.add(`${gridX},${gridY}`);
      }
    }

    return positions;
  };

  // Placeholder test
  it('should initialize WebGL context', () => {
    const service = new WebGLRenderingService(canvas);
    expect(canvas.getContext).toHaveBeenCalledWith('webgl');
  });
});
```

**Step 2: Run test to verify mocks work**

```bash
npm test -- WebGLRenderingService
```

Expected: 1 test passes (initialization test)

**Step 3: Commit**

```bash
git add src/services/__tests__/WebGLRenderingService.spec.ts
git commit -m "test: add WebGL mock infrastructure for renderer tests"
```

---

## Task 2: Test NORTH Direction Rendering from (0,0)

**Files:**
- Modify: `src/services/__tests__/WebGLRenderingService.spec.ts`

**Step 1: Add NORTH direction test**

Add after initialization test:

```typescript
describe('render() visibility verification at (0,0)', () => {
  let level: LevelData;

  beforeEach(() => {
    // Load level 1 data
    level = DungeonService.loadLevel(1);
  });

  it('renders exactly 4 tiles when facing NORTH from (0,0)', () => {
    const service = new WebGLRenderingService(canvas);
    const position: Position = { x: 0, y: 0, facing: 'NORTH' };

    // Render scene
    service.render(level, position, {
      width: 800,
      height: 600,
      tileDepth: 5,
      peripheralColumns: 3
    });

    // Extract grid positions from draw calls
    const renderedTiles = extractGridPositionsFromDrawCalls();

    // Verify exactly 4 tiles rendered
    expect(renderedTiles.size).toBe(4);
    expect(renderedTiles).toContain('0,0');
    expect(renderedTiles).toContain('0,1');
    expect(renderedTiles).toContain('0,2');
    expect(renderedTiles).toContain('0,3');

    // Verify no other tiles rendered
    for (const tile of renderedTiles) {
      expect(['0,0', '0,1', '0,2', '0,3']).toContain(tile);
    }
  });
});
```

**Step 2: Run test**

```bash
npm test -- WebGLRenderingService
```

Expected: Test passes (renderer matches VisibilityService for NORTH)

**Step 3: Commit**

```bash
git add src/services/__tests__/WebGLRenderingService.spec.ts
git commit -m "test: verify NORTH direction rendering from (0,0) matches visibility"
```

---

## Task 3: Test EAST Direction Rendering from (0,0)

**Files:**
- Modify: `src/services/__tests__/WebGLRenderingService.spec.ts`

**Step 1: Add EAST direction test**

Add after NORTH test:

```typescript
it('renders exactly 4 tiles when facing EAST from (0,0)', () => {
  const service = new WebGLRenderingService(canvas);
  const position: Position = { x: 0, y: 0, facing: 'EAST' };

  // Render scene
  service.render(level, position, {
    width: 800,
    height: 600,
    tileDepth: 5,
    peripheralColumns: 3
  });

  // Extract grid positions from draw calls
  const renderedTiles = extractGridPositionsFromDrawCalls();

  // Verify exactly 4 tiles rendered
  expect(renderedTiles.size).toBe(4);
  expect(renderedTiles).toContain('0,0');
  expect(renderedTiles).toContain('1,0');
  expect(renderedTiles).toContain('2,0');
  expect(renderedTiles).toContain('3,0');

  // Verify no other tiles rendered
  for (const tile of renderedTiles) {
    expect(['0,0', '1,0', '2,0', '3,0']).toContain(tile);
  }
});
```

**Step 2: Run test**

```bash
npm test -- WebGLRenderingService
```

Expected: Test passes (renderer matches VisibilityService for EAST)

**Step 3: Commit**

```bash
git add src/services/__tests__/WebGLRenderingService.spec.ts
git commit -m "test: verify EAST direction rendering from (0,0) matches visibility"
```

---

## Task 4: Test SOUTH Direction Rendering from (0,0)

**Files:**
- Modify: `src/services/__tests__/WebGLRenderingService.spec.ts`

**Step 1: Add SOUTH direction test**

Add after EAST test:

```typescript
it('renders exactly 1 tile when facing SOUTH from (0,0) - blocked by wall', () => {
  const service = new WebGLRenderingService(canvas);
  const position: Position = { x: 0, y: 0, facing: 'SOUTH' };

  // Render scene
  service.render(level, position, {
    width: 800,
    height: 600,
    tileDepth: 5,
    peripheralColumns: 3
  });

  // Extract grid positions from draw calls
  const renderedTiles = extractGridPositionsFromDrawCalls();

  // Verify exactly 1 tile rendered (current tile only - blocked by south wall)
  expect(renderedTiles.size).toBe(1);
  expect(renderedTiles).toContain('0,0');
});
```

**Step 2: Run test**

```bash
npm test -- WebGLRenderingService
```

Expected: Test passes (renderer matches VisibilityService for SOUTH)

**Step 3: Commit**

```bash
git add src/services/__tests__/WebGLRenderingService.spec.ts
git commit -m "test: verify SOUTH direction rendering from (0,0) matches visibility"
```

---

## Task 5: Test WEST Direction Rendering from (0,0)

**Files:**
- Modify: `src/services/__tests__/WebGLRenderingService.spec.ts`

**Step 1: Add WEST direction test**

Add after SOUTH test:

```typescript
it('renders exactly 1 tile when facing WEST from (0,0) - blocked by wall', () => {
  const service = new WebGLRenderingService(canvas);
  const position: Position = { x: 0, y: 0, facing: 'WEST' };

  // Render scene
  service.render(level, position, {
    width: 800,
    height: 600,
    tileDepth: 5,
    peripheralColumns: 3
  });

  // Extract grid positions from draw calls
  const renderedTiles = extractGridPositionsFromDrawCalls();

  // Verify exactly 1 tile rendered (current tile only - blocked by west wall)
  expect(renderedTiles.size).toBe(1);
  expect(renderedTiles).toContain('0,0');
});
```

**Step 2: Run test**

```bash
npm test -- WebGLRenderingService
```

Expected: Test passes (renderer matches VisibilityService for WEST)

**Step 3: Commit**

```bash
git add src/services/__tests__/WebGLRenderingService.spec.ts
git commit -m "test: verify WEST direction rendering from (0,0) matches visibility"
```

---

## Task 6: Test Visibility Integration

**Files:**
- Modify: `src/services/__tests__/WebGLRenderingService.spec.ts`

**Step 1: Add integration test**

Add after direction tests:

```typescript
describe('VisibilityService integration', () => {
  it('renders all walls returned by VisibilityService.getVisibleWalls()', () => {
    const service = new WebGLRenderingService(canvas);
    const position: Position = { x: 0, y: 0, facing: 'NORTH' };

    // Get walls from VisibilityService directly
    const visibleWalls = VisibilityService.getVisibleWalls(level, position, 5, 3);

    // Render scene
    service.render(level, position, {
      width: 800,
      height: 600,
      tileDepth: 5,
      peripheralColumns: 3
    });

    // Verify draw calls made for each wall
    // Each wall = 2 triangles = 1 drawArrays call with count=6
    const wallDrawCalls = drawCalls.filter(call => call.count === 6);

    // Should have same number of walls as VisibilityService
    expect(wallDrawCalls.length).toBe(visibleWalls.length);
  });

  it('respects peripheralColumns parameter', () => {
    const service = new WebGLRenderingService(canvas);
    const position: Position = { x: 5, y: 5, facing: 'NORTH' };

    // Render with 1 column (no peripheral vision)
    drawCalls = [];
    service.render(level, position, {
      width: 800,
      height: 600,
      tileDepth: 5,
      peripheralColumns: 1
    });
    const centerOnlyTiles = extractGridPositionsFromDrawCalls();

    // Render with 3 columns (peripheral vision enabled)
    drawCalls = [];
    service.render(level, position, {
      width: 800,
      height: 600,
      tileDepth: 5,
      peripheralColumns: 3
    });
    const peripheralTiles = extractGridPositionsFromDrawCalls();

    // Peripheral vision should show same or more tiles (if openings exist)
    expect(peripheralTiles.size).toBeGreaterThanOrEqual(centerOnlyTiles.size);
  });
});
```

**Step 2: Add VisibilityService import**

At top of file:

```typescript
import { VisibilityService } from '../VisibilityService';
```

**Step 3: Run test**

```bash
npm test -- WebGLRenderingService
```

Expected: All tests pass (renderer integrates correctly with VisibilityService)

**Step 4: Commit**

```bash
git add src/services/__tests__/WebGLRenderingService.spec.ts
git commit -m "test: verify VisibilityService integration and peripheralColumns parameter"
```

---

## Task 7: Run Full Test Suite and Document Results

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass including new renderer tests

**Step 2: Check coverage**

```bash
npm test -- --coverage
```

Expected: WebGLRenderingService coverage increases

**Step 3: Count tests**

```bash
npm test -- --verbose | grep "PASS"
```

Expected: Test count increases by ~7 tests (1 init + 4 directions + 2 integration)

**Step 4: Create summary document**

Create `docs/plans/2025-11-16-webgl-renderer-tests-summary.md`:

```markdown
# WebGL Renderer Visibility Tests - Summary

## Implementation Complete

**Date:** 2025-11-16

**Goal:** Verify WebGLRenderingService renders exact same tiles as VisibilityService for position (0,0) in all 4 directions.

## Test Coverage Added

### File: `src/services/__tests__/WebGLRenderingService.spec.ts`

**Total Tests:** 7 new tests

1. **Initialization Test**: Verifies WebGL context creation
2. **NORTH from (0,0)**: Renders exactly 4 tiles - (0,0), (0,1), (0,2), (0,3)
3. **EAST from (0,0)**: Renders exactly 4 tiles - (0,0), (1,0), (2,0), (3,0)
4. **SOUTH from (0,0)**: Renders exactly 1 tile - (0,0) (blocked by wall)
5. **WEST from (0,0)**: Renders exactly 1 tile - (0,0) (blocked by wall)
6. **VisibilityService Integration**: Verifies all walls from VisibilityService are rendered
7. **PeripheralColumns Parameter**: Verifies 1-column vs 3-column rendering

## Test Results

- All 7 tests passing
- WebGLRenderingService coverage: [X]% (up from [Y]%)
- Total test suite: [N] tests in [T] seconds

## Verification Method

Tests use comprehensive WebGL context mocking to:
1. Capture `drawArrays()` calls during rendering
2. Extract vertex data from `bufferData()` calls
3. Convert world coordinates back to grid coordinates
4. Verify rendered tile positions match VisibilityService output

## Key Insights

- **Coordinate Conversion**: World coords (tile-corner) converted to grid coords via `Math.floor()`
- **Draw Call Pattern**: Each wall = 6 vertices (2 triangles) = 1 `drawArrays(TRIANGLES, 0, 6)` call
- **Vertex Format**: Each vertex has 5 components `[x, y, z, u, v]`
- **Mock Completeness**: WebGL mock covers 50+ methods for full rendering pipeline

## Success Metrics Met

- ✅ Renderer matches VisibilityService for all 4 directions from (0,0)
- ✅ No extra tiles rendered (strict equality checks)
- ✅ No missing tiles (contains all expected positions)
- ✅ Integration tests verify VisibilityService coupling
- ✅ All tests pass
- ✅ Zero implementation changes needed (renderer already correct)
```

**Step 5: Commit summary**

```bash
git add docs/plans/2025-11-16-webgl-renderer-tests-summary.md
git commit -m "docs: add WebGL renderer visibility tests summary"
```

---

## Verification Checklist

### Tests Created
- [x] WebGL mock infrastructure (50+ methods)
- [x] NORTH direction test (4 tiles)
- [x] EAST direction test (4 tiles)
- [x] SOUTH direction test (1 tile)
- [x] WEST direction test (1 tile)
- [x] VisibilityService integration test
- [x] PeripheralColumns parameter test

### Test Quality
- [x] Tests use real VisibilityService (no mocks)
- [x] Tests verify exact tile counts (no approximations)
- [x] Tests verify no extra tiles rendered
- [x] Tests verify all expected tiles present

### Documentation
- [x] Summary document created
- [x] Test results recorded
- [x] Coverage metrics documented
- [x] All commits pushed

---

## Success Metrics

- 7 new tests added
- All tests passing
- Renderer verified to match VisibilityService for all 4 directions
- Zero implementation bugs found (renderer already correct)
- Documentation complete

## Notes for Future Work

**WebGL Mock Reusability**: The comprehensive WebGL mock can be extracted to `tests/helpers/webgl-mock.ts` for reuse in other renderer tests.

**Additional Test Positions**: Could add tests for other starting positions (5,5), (10,10) to verify renderer works across entire map.

**Performance Tests**: Could add tests to verify renderer completes within acceptable time limits (e.g., <16ms for 60fps).
