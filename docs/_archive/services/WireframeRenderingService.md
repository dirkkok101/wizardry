# WireframeRenderingService

**Generates wireframe 3D maze rendering using flood-fill visibility and perspective projection.**

## Purpose

WireframeRenderingService is the main rendering service that orchestrates the complete 3D wireframe view generation pipeline. It replaces the older MazeRenderingService with a mathematically correct perspective projection system and flood-fill visibility algorithm.

## Responsibilities

- Generate complete set of canvas drawing commands for 3D maze view
- Coordinate visibility detection, projection, and rendering
- Apply distance-based visual effects (color, alpha, line width)
- Maintain wireframe aesthetic consistent with original Wizardry
- Ensure back-to-front rendering order for proper occlusion

## API

### generateWireframeCommands(level, position, config)

**Main entry point for rendering system.** Generates complete set of canvas commands for wireframe view.

**Parameters:**
- `level: LevelData` - Current dungeon level with tile data
- `position: Position` - Player position (x, y, facing)
- `config: ViewportConfig` - Canvas configuration:
  - `width: number` - Canvas width in pixels (typically 600)
  - `height: number` - Canvas height in pixels (typically 600)
  - `tileDepth: number` - Maximum visibility depth (typically 5)

**Returns:** `CanvasCommand[]` - Array of drawing commands sorted back-to-front

**Algorithm:**
1. Convert Position to PlayerState with pre-computed direction vectors
2. Use VisibilityService to find all visible walls via flood-fill
3. For each visible wall segment:
   - Project quad corners to screen space
   - Generate 4 line commands (quad outline)
   - Apply distance-based styling
4. Return commands in back-to-front order

**Example:**
```typescript
const level = DungeonService.loadLevel(1)
const position: Position = { x: 10, y: 10, facing: 'NORTH' }
const config: ViewportConfig = { width: 600, height: 600, tileDepth: 5 }

const commands = WireframeRenderingService.generateWireframeCommands(
  level,
  position,
  config
)

// commands = [
//   { type: 'line', x: 300, y: 200, x2: 350, y2: 200, color: '#0f0', lineWidth: 2, alpha: 0.9 },
//   { type: 'line', x: 350, y: 200, x2: 350, y2: 250, color: '#0f0', lineWidth: 2, alpha: 0.9 },
//   ...
// ]
```

### renderWallQuad(wall, playerState, config)

**Renders single wall segment as 4-line wireframe quad.**

**Parameters:**
- `wall: WallSegment` - Wall segment in world space with:
  - `x1, z1, x2, z2: number` - Bottom edge endpoints in world coordinates
  - `height: number` - Wall height (typically 1.0)
  - `distance: number` - Distance from player
  - `isVertical: boolean` - true for N/S walls, false for E/W walls
  - `wallType: WallType` - Wall type for styling
- `playerState: PlayerState` - Player state with direction vectors
- `config: ViewportConfig` - Canvas configuration

**Returns:** `CanvasCommand[]` - 0 or 4 line commands (empty if clipped)

**Behavior:**
- Projects 4 corners (bottom-left, bottom-right, top-right, top-left) to screen space
- Returns empty array if any corner is clipped (behind camera or outside frustum)
- Generates 4 line commands connecting corners in order
- Applies distance-based color, alpha, and line width

**Example:**
```typescript
const wall: WallSegment = {
  x1: 9.5, z1: 9.5, x2: 10.5, z2: 9.5,
  height: 1.0, distance: 1.2, isVertical: true, wallType: 'wall'
}
const playerState = PlayerStateService.fromPosition(position)
const config = { width: 600, height: 600, tileDepth: 5 }

const commands = WireframeRenderingService.renderWallQuad(wall, playerState, config)
// 4 line commands forming quad outline
```

### getWallColor(wallType, distance)

**Returns color string based on wall type and distance.**

**Parameters:**
- `wallType: WallType` - One of: `'wall'`, `'door'`, `'locked_door'`, `'secret'`, `'open'`
- `distance: number` - Distance from player in world units

**Returns:** `string` - Hex color code (e.g., `'#0f0'`)

**Color Scheme:**
- **Normal walls**: Distance-based green fade
  - Distance < 1.5: `'#0f0'` (bright green)
  - Distance < 2.5: `'#0c0'` (medium green)
  - Distance >= 2.5: `'#090'` (dim green)
- **Doors**: `'#080'` (dark green, constant)
- **Locked doors**: `'#800'` (red, constant)
- **Secret doors**: `'#000'` (black, invisible)

**Example:**
```typescript
const nearWall = WireframeRenderingService.getWallColor('wall', 1.0)
// nearWall = '#0f0' (bright green)

const farWall = WireframeRenderingService.getWallColor('wall', 3.0)
// farWall = '#090' (dim green)

const door = WireframeRenderingService.getWallColor('door', 2.0)
// door = '#080' (dark green)
```

### calculateAlpha(distance)

**Returns transparency value (0-1) for distance-based fading.**

**Parameters:**
- `distance: number` - Distance from player in world units

**Returns:** `number` - Alpha value in range [0, 1]

**Formula:** `alpha = 1.0 / (1 + distance * 0.15)`

**Behavior:**
- Close walls (distance ~0): alpha ~1.0 (fully opaque)
- Mid walls (distance ~3): alpha ~0.69
- Far walls (distance ~6): alpha ~0.53

**Example:**
```typescript
const nearAlpha = WireframeRenderingService.calculateAlpha(0.5)
// nearAlpha ≈ 0.93

const farAlpha = WireframeRenderingService.calculateAlpha(5.0)
// farAlpha ≈ 0.57
```

### getLineWidth(distance)

**Returns line width (1-2px) based on distance.**

**Parameters:**
- `distance: number` - Distance from player in world units

**Returns:** `number` - Line width in pixels

**Width Tiers:**
- Distance < 1.5: `2` pixels (thick, close)
- Distance < 3.0: `1.5` pixels (medium)
- Distance >= 3.0: `1` pixel (thin, far)

**Example:**
```typescript
const nearWidth = WireframeRenderingService.getLineWidth(1.0)
// nearWidth = 2

const farWidth = WireframeRenderingService.getLineWidth(4.0)
// farWidth = 1
```

## Architecture

### Service Dependencies

WireframeRenderingService coordinates three specialized services:

```
WireframeRenderingService
├─> PlayerStateService    (Convert Position to PlayerState with direction vectors)
├─> VisibilityService     (Flood-fill to find visible walls)
└─> ProjectionService     (5-stage perspective projection: World → View → Screen)
```

**Flow:**
1. **Position → PlayerState**: `PlayerStateService.fromPosition(position)`
2. **Find Walls**: `VisibilityService.getVisibleWalls(level, position, maxDepth)`
3. **Project Points**: `ProjectionService.projectPoint(worldPoint, playerState, config)`
4. **Generate Commands**: Create line commands with styling

### Rendering Pipeline

**5-Stage Perspective Pipeline** (via ProjectionService):

1. **World Space**: Wall corners in dungeon coordinates (x, y, z)
2. **Translation**: Translate to camera origin (player at 0,0)
3. **Rotation**: Rotate to camera orientation (forward = -Z axis)
4. **Projection**: Apply perspective division (closer = larger)
5. **Screen Space**: Map to canvas pixel coordinates

**Example Transformation:**
```typescript
// Stage 1: World Space
const corner: Vector3 = { x: 10.5, y: 1.0, z: 8.5 }

// Stage 2-3: View Space (via worldToView)
const viewPoint = ProjectionService.worldToView(corner, playerState)
// viewPoint = { x: 0.5, y: 1.0, z: -2.0 }

// Stage 4-5: Screen Space (via viewToScreen)
const screenPoint = ProjectionService.viewToScreen(viewPoint, config)
// screenPoint = { x: 375, y: 200 }
```

### Visibility Algorithm

**Flood-Fill Approach** (via VisibilityService):

```
1. Start at player position
2. Add to queue, mark visited
3. While queue not empty:
   a. Pop next tile
   b. Check all 4 walls
   c. If wall exists: add to wall list
   d. If open: add adjacent tile to queue (if not visited)
4. Sort walls by distance (back-to-front)
```

**Advantages:**
- Handles complex room shapes automatically
- Correctly stops at walls (no X-ray vision)
- Efficient (only visits reachable tiles)
- Naturally limits view distance via maxDepth parameter

### Wireframe Quad Structure

Each wall segment is rendered as a quad (4 corners) with 4 line segments:

```
      top-left -------- top-right
         |                  |
         |                  |
         |                  |
   bottom-left ------ bottom-right
```

**Line Segments:**
1. Bottom edge: `bottom-left → bottom-right`
2. Right edge: `bottom-right → top-right`
3. Top edge: `top-right → top-left`
4. Left edge: `top-left → bottom-left`

**Clipping:**
- If ANY corner is clipped (behind camera or outside frustum), entire quad is skipped
- Ensures clean rendering without partial quads

## Data Flow

### Input → Output Flow

```typescript
// Input
const level: LevelData = DungeonService.loadLevel(1)
const position: Position = { x: 10, y: 10, facing: 'NORTH' }
const config: ViewportConfig = { width: 600, height: 600, tileDepth: 5 }

// Processing
PlayerStateService.fromPosition(position)
  → playerState: PlayerState (gridX=10, gridY=10, angle=0, dirX=0, dirY=-1, ...)

VisibilityService.getVisibleWalls(level, position, 5)
  → walls: WallSegment[] (sorted back-to-front)

for each wall:
  renderWallQuad(wall, playerState, config)
    → 4 CanvasCommand (line type)

// Output
commands: CanvasCommand[] = [
  { type: 'line', x: 300, y: 200, x2: 350, y2: 200, color: '#090', lineWidth: 1, alpha: 0.6 },
  { type: 'line', x: 350, y: 200, x2: 350, y2: 250, color: '#090', lineWidth: 1, alpha: 0.6 },
  ...
]
```

### Component Integration

**MazeComponent Usage:**

```typescript
// In MazeComponent (maze.component.ts)
readonly drawCommands = computed(() => {
  const pos = this.position()
  if (!pos) return []

  const level = DungeonService.loadLevel(this.currentLevel())

  return WireframeRenderingService.generateWireframeCommands(
    level,
    pos,
    { width: 600, height: 600, tileDepth: 5 }
  )
})
```

**CanvasRendererComponent consumes commands:**

```typescript
// In CanvasRendererComponent
for (const cmd of drawCommands()) {
  if (cmd.type === 'line') {
    ctx.globalAlpha = cmd.alpha ?? 1.0
    ctx.strokeStyle = cmd.color
    ctx.lineWidth = cmd.lineWidth ?? 1
    ctx.beginPath()
    ctx.moveTo(cmd.x, cmd.y)
    ctx.lineTo(cmd.x2!, cmd.y2!)
    ctx.stroke()
  }
}
```

## Performance Characteristics

### Time Complexity

- **Visibility Detection**: O(tiles visited) ≈ O(maxDepth²) for open areas
- **Projection**: O(walls found) × O(4 corners) = O(4w) where w = wall count
- **Total**: O(maxDepth² + 4w) - Linear in visible geometry

**Typical Performance** (maxDepth = 5):
- Open corridor: ~20-40 walls, ~100 commands
- Complex room: ~50-80 walls, ~250 commands
- Dense maze: ~80-120 walls, ~400 commands

### Optimization Techniques

1. **Early Clipping**: Skip entire quad if any corner clipped
2. **Back-to-Front Sorting**: Done once by VisibilityService
3. **Pre-computed Direction Vectors**: Cached in PlayerState
4. **Immutable Services**: Enables Angular change detection optimization

### Memory Usage

- **PlayerState**: ~96 bytes (7 numbers)
- **WallSegment**: ~96 bytes each (8 numbers + flags)
- **CanvasCommand**: ~128 bytes each (8 numbers + strings)
- **Total**: ~50KB for typical scene (400 commands)

## Testing Strategy

### Unit Tests

**Coverage: 10 tests, 100% coverage**

Located: `src/services/__tests__/WireframeRenderingService.spec.ts`

**Test Categories:**
1. **Command Generation**
   - Generates line commands for wall segments
   - Returns multiple of 4 commands (4 edges per quad)
   - Skips walls with clipped vertices
2. **Color Selection**
   - Green for normal walls
   - Dark green for doors
   - Red for locked doors
   - Distance-based dimming
3. **Alpha Calculation**
   - Full opacity at close range
   - Reduced opacity at distance
4. **Integration**
   - Coordinates with other services correctly
   - Handles edge cases (no walls, all clipped)

### Integration Tests

**Location:** `src/app/maze/__tests__/maze-rendering.integration.spec.ts`

**Scenarios:**
- Commands update when player moves
- Commands update when player turns
- Correct number of walls rendered for known map sections
- No rendering artifacts or glitches

### Test Data Factories

```typescript
// Use existing test utilities
const level = createTestLevel()
const position: Position = { x: 5, y: 5, facing: 'NORTH' }
const config: ViewportConfig = { width: 600, height: 600, tileDepth: 3 }

const commands = WireframeRenderingService.generateWireframeCommands(
  level,
  position,
  config
)
```

## Configuration

### Default Settings

```typescript
const DEFAULT_CONFIG: ViewportConfig = {
  width: 600,      // Canvas width in pixels
  height: 600,     // Canvas height in pixels
  tileDepth: 5     // Maximum visibility distance in tiles
}
```

### Tunable Parameters

**Visibility Depth** (`config.tileDepth`):
- Range: 1-10 tiles
- Default: 5 tiles
- Performance: Higher = more walls, slower rendering
- Visual: Higher = can see farther ahead

**FOV** (in ProjectionService.FOV):
- Fixed: 90 degrees (π/2 radians)
- Matches original Wizardry perspective

**Alpha Fade Rate** (`calculateAlpha` formula):
- Formula: `1.0 / (1 + distance * 0.15)`
- Constant `0.15` controls fade speed
- Higher = faster fade, lower = slower fade

**Line Width Thresholds** (`getLineWidth`):
- Near: distance < 1.5 → 2px
- Mid: distance < 3.0 → 1.5px
- Far: distance >= 3.0 → 1px

## Edge Cases

### No Visible Walls

**Scenario:** Player in large open area beyond maxDepth

**Behavior:** Returns empty command array `[]`

**Handling:** Canvas component renders blank (black) screen

### All Walls Clipped

**Scenario:** Player facing wall at close range

**Behavior:** Walls behind camera are clipped, returns empty or minimal commands

**Handling:** Normal - only forward-facing walls render

### Maximum Wall Count

**Scenario:** Complex room with many visible walls

**Behavior:** All walls rendered (no arbitrary limit)

**Performance:** May degrade with 200+ walls, but unlikely in Wizardry maps

### Special Wall Types

**Secret Doors:**
- Color: `'#000'` (black)
- Alpha: Normal
- Visual Result: Invisible (blends with black background)

**Open Passages:**
- WallType: `'open'`
- Not added to wall list (VisibilityService skips)
- Visual Result: No wall rendered

## Related Documentation

### Services

- [PlayerStateService](./PlayerStateService.md) - Direction vector management
- [VisibilityService](./VisibilityService.md) - Flood-fill wall detection
- [ProjectionService](./ProjectionService.md) - Perspective transformation pipeline
- [DungeonService](./DungeonService.md) - Level data and tile lookup

### Systems

- [First-Person Rendering](../systems/first-person-rendering.md) - Overall rendering architecture
- [Dungeon Navigation](../game-design/06-dungeon.md) - Player movement and facing

### Types

- `src/types/Dungeon.ts` - PlayerState, WallSegment, Vector3, Vector2
- `src/types/rendering.types.ts` - CanvasCommand, ViewportConfig

## Migration Notes

### Replaced: MazeRenderingService

**Old Approach (MazeRenderingService):**
- Used 3-column grid (-1, 0, +1 relative X)
- Pre-defined perspective scaling (distance 0-3)
- Tile-based rendering (rendered entire tiles)
- Limited to 3 tiles depth

**New Approach (WireframeRenderingService):**
- Uses flood-fill visibility (arbitrary room shapes)
- Mathematically correct perspective projection (5-stage pipeline)
- Wall-based rendering (renders individual wall segments)
- Extended to 5 tiles depth

**Benefits:**
- More accurate perspective (no visual distortion)
- Better performance (only renders visible walls)
- Cleaner architecture (separation of concerns)
- Extended view distance (5 vs 3 tiles)

**Migration Path:**
1. Replace import: `MazeRenderingService` → `WireframeRenderingService`
2. Replace method: `generateRenderCommands` → `generateWireframeCommands`
3. Remove `visibleTiles` computed signal (now internal to service)
4. Update tests to expect line commands instead of tile-based commands

## Implementation Notes

### Pure Functions

All methods are pure functions:
- No side effects
- No mutable state
- Deterministic output
- Easy to test (no mocking needed)

### Immutable Data

All inputs and outputs are immutable:
- Services never mutate parameters
- Return new objects/arrays
- Enables Angular change detection optimization

### TypeScript Strictness

Fully type-safe:
- All parameters typed
- All return values typed
- No `any` types
- Strict null checks enabled

### Angular Integration

Designed for Angular signals:
- Pure functions work perfectly with `computed()`
- Automatic change detection
- Efficient re-rendering (only when inputs change)
