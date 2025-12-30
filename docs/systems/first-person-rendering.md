# First-Person Rendering System

**Comprehensive overview of first-person 3D-style dungeon view calculation and rendering.**

## Overview

Wizardry 1 uses a **pseudo-3D first-person perspective** rendered on 2D canvas, creating the illusion of depth without true 3D graphics using mathematically correct perspective projection.

**Key Concepts**:

- Wire-frame style dungeon view
- Visible depth: 5 tiles forward (extended from original 3)
- Mathematically correct perspective projection (5-stage pipeline)
- Flood-fill visibility algorithm
- Party facing determines view direction
- Walls, doors, and corridors rendered
- Canvas-based 2D rendering (not WebGL)

## Architecture

### Services Involved

- **WireframeRenderingService** - Main rendering orchestration, generates canvas commands
- **VisibilityService** - Flood-fill algorithm to find visible walls
- **ProjectionService** - 5-stage perspective projection (World → View → Screen)
- **PlayerStateService** - Direction vector management for camera transforms
- **DungeonService** - Get tile data for rendering
- **DoorService** - Door state (open/closed) for rendering

### Commands Involved

None directly - rendering is passive (state → view)

### Data Structures

```typescript
interface ViewState {
  position: Position; // Party position
  facing: Direction; // North, South, East, West
  visibleTiles: VisibleTile[]; // Tiles to render
  darkness: boolean; // MILWA spell active?
}

interface VisibleTile {
  relativeX: number; // -1, 0, +1 (left, center, right)
  relativeY: number; // 0, 1, 2, 3 (distance)
  tile: Tile; // Tile data
  perspective: PerspectiveData; // Scaling info
}

interface PerspectiveData {
  scale: number; // 1.0 (close) to 0.2 (far)
  screenX: number; // Canvas X position
  screenY: number; // Canvas Y position
  width: number; // Rendered width
  height: number; // Rendered height
}

interface Tile {
  type: 'floor' | 'wall' | 'door' | 'rock' | 'stairs' | 'teleporter';
  walls: WallState; // Which walls present
  door?: DoorState; // If door tile
}

interface WallState {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}
```

## View Calculation

### Flood-Fill Visibility Algorithm

**Modern Approach**: Instead of using a fixed 3-column grid, the system uses a flood-fill algorithm to discover all visible walls from the player's position.

**Algorithm Flow**:

```typescript
function getVisibleWalls(level: LevelData, position: Position, maxDepth: number): WallSegment[] {
  const walls: WallSegment[] = [];
  const visited = new Set<string>();
  const queue: { x: number; y: number; depth: number }[] = [];

  // Start from player position
  queue.push({ x: position.x, y: position.y, depth: 0 });
  visited.add(`${position.x},${position.y}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const tile = DungeonService.getTile(level, current.x, current.y);

    // Check all 4 walls
    if (tile.walls.north !== 'open') {
      walls.push(createWallSegment(current.x, current.y, 'north'));
    } else if (!visited.has(`${current.x},${current.y - 1}`)) {
      queue.push({ x: current.x, y: current.y - 1, depth: current.depth + 1 });
      visited.add(`${current.x},${current.y - 1}`);
    }
    // Repeat for south, east, west walls...
  }

  // Sort by distance (back-to-front for painter's algorithm)
  walls.sort((a, b) => b.distance - a.distance);
  return walls;
}
```

**Advantages**:

- Handles arbitrary room shapes automatically
- Correctly stops at walls (no X-ray vision through closed doors)
- Efficient - only visits reachable tiles
- Naturally limits view distance via maxDepth parameter
- Extended visibility: 5 tiles vs original 3 tiles

### World Space to Screen Space Transformation

**5-Stage Perspective Projection Pipeline**:

1. **World Space**: Wall corners in dungeon grid coordinates (x, y, z)
   - Each tile is 1.0 units square
   - Y axis represents height (0 = floor, 1 = ceiling)
   - Player at discrete grid position (e.g., x=10, y=10)

2. **Translation**: Translate to camera origin
   - Subtract player position from all points
   - Camera becomes origin (0, 0, 0)

3. **Rotation**: Rotate to camera orientation
   - Apply rotation based on facing direction (NORTH/EAST/SOUTH/WEST)
   - Camera looks down -Z axis (forward direction)
   - Uses pre-computed direction vectors from PlayerState

4. **Perspective Division**: Apply perspective projection
   - Project 3D points onto 2D view plane
   - Divide by distance (z-coordinate)
   - Closer objects appear larger (perspective foreshortening)
   - FOV: 90 degrees (π/2 radians)

5. **Screen Mapping**: Convert to canvas pixel coordinates
   - Map normalized device coordinates [-1, 1] to pixel space [0, width]
   - Flip Y axis (screen Y increases downward)
   - Apply viewport transform

**Example Transformation**:

```typescript
// Stage 1: Wall corner in world space
const worldPoint: Vector3 = { x: 12.5, y: 1.0, z: 8.5 };

// Stage 2-3: Transform to view space (camera at origin, looking -Z)
const viewPoint = ProjectionService.worldToView(worldPoint, playerState);
// Result: { x: 0.5, y: 1.0, z: -2.0 }

// Stage 4-5: Project to screen space
const screenPoint = ProjectionService.viewToScreen(viewPoint, { width: 600, height: 600 });
// Result: { x: 375, y: 200 } (pixel coordinates)
```

## Perspective Scaling

### Mathematical Perspective

**Automatic Perspective via Projection**: The 5-stage projection pipeline automatically handles perspective scaling through perspective division (stage 4).

**Perspective Division Formula**:

```typescript
// In ProjectionService.viewToScreen()
const S = 1.0 / Math.tan(FOV / 2); // FOV scaling factor (90° FOV)
const ndcX = (viewPoint.x * S) / -viewPoint.z; // Divide by distance
const ndcY = (viewPoint.y * S) / -viewPoint.z; // Divide by distance
```

**Key Properties**:

- Objects farther away (larger z) appear smaller (smaller ndcX/ndcY)
- Objects closer (smaller z) appear larger (larger ndcX/ndcY)
- Mathematically correct perspective (matches real-world vision)
- No pre-defined scaling tiers - continuous smooth scaling

**Comparison to Old System**:

```
Old System (Fixed Tiers):
  Distance 0: scale 1.0
  Distance 1: scale 0.7
  Distance 2: scale 0.4
  Distance 3: scale 0.2

New System (Continuous):
  Distance 0.5: scale ≈ 1.0 / 0.5 = 2.0 (relative)
  Distance 1.0: scale ≈ 1.0 / 1.0 = 1.0
  Distance 2.0: scale ≈ 1.0 / 2.0 = 0.5
  Distance 5.0: scale ≈ 1.0 / 5.0 = 0.2
```

### Screen Position Calculation

**Canvas Layout**:

```
Canvas: 600×600 pixels

Center X = 300
Center Y = 300

FOV: 90 degrees (matches original Wizardry)
```

**NDC to Screen Mapping**:

```typescript
function ndcToScreen(ndcX: number, ndcY: number, config: ViewportConfig): Vector2 {
  // NDC space: [-1, 1] (left to right, bottom to top)
  // Screen space: [0, width] × [0, height] (left to right, top to bottom)

  const screenX = (ndcX + 1) * (config.width / 2); // Map [-1,1] to [0,width]
  const screenY = (1 - ndcY) * (config.height / 2); // Map [-1,1] to [0,height], flip Y

  return { x: screenX, y: screenY };
}
```

**Viewport Transform Example**:

```
NDC Point: (-0.5, 0.5) (left half, upper half)
Canvas: 600×600

screenX = (-0.5 + 1) * (600 / 2) = 0.5 * 300 = 150
screenY = (1 - 0.5) * (600 / 2) = 0.5 * 300 = 150

Screen Point: (150, 150) (upper-left quadrant)
```

## Rendering Order

### Layer-Based Rendering

**Rendering Sequence** (back to front):

1. **Background** - Black void
2. **Far walls** (distance 3)
3. **Mid walls** (distance 2)
4. **Near walls** (distance 1)
5. **Current tile walls** (distance 0)
6. **Doors** - Overlaid on walls
7. **Stairs** - Special floor markers
8. **Overlays** - Darkness, effects

**Painter's Algorithm**: Render far objects first, near objects last (occlusion)

### Wall Rendering

**Wall Types**:

- **Corridor walls**: Vertical lines (left/right edges)
- **End walls**: Horizontal lines (ahead)
- **Corners**: L-shaped intersections

**Drawing Walls**:

```typescript
function renderWall(
  ctx: CanvasRenderingContext2D,
  wall: 'north' | 'south' | 'east' | 'west',
  perspective: PerspectiveData,
): void {
  ctx.strokeStyle = '#888888'; // Gray wire-frame
  ctx.lineWidth = 2;

  switch (wall) {
    case 'north':
      // Top wall (distance ahead)
      ctx.beginPath();
      ctx.moveTo(perspective.x, perspective.y);
      ctx.lineTo(perspective.x + perspective.width, perspective.y);
      ctx.stroke();
      break;

    case 'east':
      // Right wall
      ctx.beginPath();
      ctx.moveTo(perspective.x + perspective.width, perspective.y);
      ctx.lineTo(perspective.x + perspective.width, perspective.y + perspective.height);
      ctx.stroke();
      break;

    case 'west':
      // Left wall
      ctx.beginPath();
      ctx.moveTo(perspective.x, perspective.y);
      ctx.lineTo(perspective.x, perspective.y + perspective.height);
      ctx.stroke();
      break;
  }
}
```

### Door Rendering

**Door States**:

- **Closed**: Rendered as solid wall with door icon
- **Open**: Rendered as recessed opening
- **Locked**: Rendered with lock icon

**Drawing Doors**:

```typescript
function renderDoor(
  ctx: CanvasRenderingContext2D,
  door: DoorState,
  perspective: PerspectiveData,
): void {
  if (door.open) {
    // Draw recessed opening
    ctx.fillStyle = '#444444';
    ctx.fillRect(
      perspective.x + perspective.width * 0.3,
      perspective.y,
      perspective.width * 0.4,
      perspective.height,
    );
  } else {
    // Draw closed door
    ctx.fillStyle = '#664400';
    ctx.fillRect(
      perspective.x + perspective.width * 0.3,
      perspective.y,
      perspective.width * 0.4,
      perspective.height,
    );

    // Draw door frame
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      perspective.x + perspective.width * 0.3,
      perspective.y,
      perspective.width * 0.4,
      perspective.height,
    );
  }
}
```

## Darkness Zones

### MILWA Spell Effect

**Without MILWA**:

- Darkness zones render black (no walls visible)
- Party can still move
- Bumps into walls blind

**With MILWA**:

- Normal rendering
- Walls and doors visible
- Duration: Until leaving darkness zone

**Rendering Darkness**:

```typescript
function renderView(viewState: ViewState): void {
  if (viewState.darkness && !hasMILWA(viewState.party)) {
    // Render all black (no walls)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 800, 600);

    // Show "It's too dark to see" message
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px monospace';
    ctx.fillText("It's too dark to see!", 250, 300);
  } else {
    // Normal rendering
    renderWalls(viewState);
    renderDoors(viewState);
  }
}
```

## Special Tile Rendering

### Stairs

**Descending Stairs**:

- Render floor with down arrow
- Arrow icon: ↓ or stair graphic

**Ascending Stairs**:

- Render floor with up arrow
- Arrow icon: ↑ or stair graphic

### Teleporters

**Visual Indicator**:

- Shimmering effect on floor
- Pulsating color (optional)
- Warning: "Teleporter ahead!"

### Spinners

**Visual Indicator**:

- Rotating spiral on floor
- Disorienting animation
- No visual indicator (implementation choice)

## Canvas Implementation

### Canvas Setup

**HTML**:

```html
<canvas id="dungeon-view" width="800" height="600"></canvas>
```

**TypeScript**:

```typescript
const canvas = document.getElementById('dungeon-view') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Set rendering properties
ctx.imageSmoothingEnabled = false; // Crisp pixels
ctx.lineCap = 'square';
ctx.lineJoin = 'miter';
```

### Rendering Loop

```typescript
function render(gameState: GameState): void {
  const viewState = calculateViewState(gameState.party);

  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 800, 600);

  // Render visible tiles (back to front)
  for (const tile of viewState.visibleTiles.reverse()) {
    renderTile(ctx, tile);
  }

  // Render party stats overlay (HP, spell points)
  renderStatsOverlay(ctx, gameState.party);
}
```

### Performance Optimization

**Dirty Rectangle**:

- Only redraw changed regions
- Track previous frame state
- Compare and skip unchanged areas

**Offscreen Canvas**:

- Pre-render walls to offscreen canvas
- Composite to main canvas
- Faster for complex scenes

**Sprite Caching**:

- Cache common wall segments
- Reuse cached sprites
- Scale/position as needed

## View Distance

### Visibility Limits

**Standard View**: 3 tiles ahead

**Extended View** (rare spells):

- Some spells may extend view to 5 tiles
- Implementation detail (not in original)

**Reduced View**:

- Darkness: 0 tiles (black screen)
- Fog: 1 tile (limited visibility)

### Occlusion

**Wall Occlusion**:

- Walls block view of tiles behind
- Cannot see through walls
- Doors block view when closed

**Corridor Visibility**:

```
Party facing North:

X X X   (3 ahead - visible if corridor)
X . X   (2 ahead - visible)
X . X   (1 ahead - visible)
X P X   (current - always visible)

X = wall, P = party, . = floor
```

## Related Documentation

**Architecture**:

- [WebGL Renderer](../architecture/webgl-renderer.md) - WebGL implementation details

**Systems**:

- [Dungeon Navigation](./dungeon-navigation.md) - Player movement
- [Dungeon System](./dungeon-system.md) - Map structure

**Code**:

- `src/app/services/WireframeRenderingService.ts` - Main rendering orchestration
- `src/app/services/VisibilityService.ts` - Flood-fill wall detection
- `src/app/types/Dungeon.ts` - Vector3, Vector2, WallSegment
- `src/app/rendering/` - WebGL shaders and rendering code

**Implementation Notes**:

- Wire-frame aesthetic maintains original Wizardry feel
- Canvas 2D rendering sufficient (no WebGL needed)
- Mathematically correct perspective projection (5-stage pipeline)
- Flood-fill visibility algorithm handles arbitrary room shapes
- Extended view distance (5 tiles vs original 3)
- Performance excellent on modern browsers

**Architecture Improvements (Nov 2025)**:

- Replaced 3-column grid with flood-fill visibility algorithm
- Replaced fixed perspective tiers with continuous mathematical projection
- Separated concerns: visibility (VisibilityService), projection (ProjectionService), rendering (WireframeRenderingService)
- Added PlayerStateService for efficient direction vector caching
- Extended view distance from 3 to 5 tiles
- Maintained backward compatibility with original Wizardry aesthetic
