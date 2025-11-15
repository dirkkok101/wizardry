# RaycastingRenderingService

**Rendering service that generates canvas commands using raycasting.**

## Responsibility

Generates canvas drawing commands by casting rays through the dungeon for each screen column. Calculates wall heights based on perpendicular distance, applies distance-based fog, and provides color differentiation for wall types and orientations. Implements the rendering pipeline for the mathematical raycasting renderer.

## API Reference

### Constructor

Create a new RaycastingRenderingService instance.

**Signature**:
```typescript
constructor()
```

**Example**:
```typescript
const renderer = new RaycastingRenderingService();
```

**Internal Configuration**:
- Uses RaycastingService with maxRaySteps = 20
- Pre-configured color scheme matching wireframe aesthetic
- 90-degree field of view

---

### generateRaycastCommands

Generate canvas commands for raycasting rendering of the current view.

**Signature**:
```typescript
function generateRaycastCommands(
  level: LevelData,
  position: Position,
  config: ViewportConfig
): CanvasCommand[]
```

**Parameters**:
- `level`: Level data with tile grid
- `position`: Player discrete position (x, y, facing)
- `config`: Viewport configuration (width, height, tileDepth, peripheralColumns)

**Returns**: Array of canvas fillRect commands ready for rendering

**Example**:
```typescript
const renderer = new RaycastingRenderingService();
const level = DungeonService.loadLevel(1);
const position = { x: 10, y: 10, facing: 'NORTH' };
const config = {
  width: 600,
  height: 600,
  tileDepth: 10,
  peripheralColumns: 5
};

const commands = renderer.generateRaycastCommands(level, position, config);

// Render commands to canvas
commands.forEach(cmd => {
  ctx.fillStyle = cmd.color;
  ctx.globalAlpha = cmd.alpha;
  ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
});
```

**CanvasCommand Structure**:
```typescript
interface CanvasCommand {
  type: 'fillRect';
  x: number;          // Screen X coordinate
  y: number;          // Screen Y coordinate (top of stripe)
  width: number;      // Width (always 1 for vertical stripe)
  height: number;     // Height of stripe
  color: string;      // RGB color string
  alpha: number;      // Alpha transparency (always 1.0)
}
```

---

## Rendering Pipeline

### Pipeline Stages

1. **Position Conversion**: Convert discrete Position to continuous PlayerState with direction vectors
2. **Ray Casting**: Cast one ray per screen column (600 rays for 600px width)
3. **Wall Column Rendering**: For each ray hit, generate fillRect command
4. **Color Selection**: Choose color based on wall type and orientation
5. **Distance Fog**: Apply brightness reduction based on distance
6. **Command Generation**: Create fillRect command with final color

### Detailed Pipeline Flow

```
Position {x, y, facing}
    ↓
PlayerStateService.fromPosition()
    ↓
PlayerState {gridX, gridY, dirX, dirY, planeX, planeY}
    ↓
FOR each screen column (x = 0 to width):
    ↓
  Calculate ray direction (cameraX * plane + direction)
    ↓
  RaycastingService.castRay(level, playerState, rayDirX, rayDirY)
    ↓
  RayHit {distance, mapX, mapY, side, wallState, wallDirection}
    ↓
  renderWallColumn(hit, screenX, config)
    ↓
  Calculate wall height = screenHeight / distance
  Calculate draw bounds (centered, clamped)
  Select base color (wall type + orientation)
  Apply distance fog (brightness 0.2-1.0)
  Shade color (RGB multiplication)
    ↓
  CanvasCommand {fillRect, x, y, width, height, color}
```

---

## Color Scheme

### Base Colors

Matching wireframe renderer aesthetic:

```typescript
const colors = {
  wallNS: '#666666',      // Vertical walls (lighter gray)
  wallEW: '#444444',      // Horizontal walls (darker gray)
  door: '#8B4513',        // Doors (saddle brown)
  lockedDoor: '#8B0000',  // Locked doors (dark red)
  secretDoor: '#000000'   // Secret doors (black/invisible)
};
```

### Color Selection Logic

```typescript
switch (hit.wallState) {
  case 'door':
    baseColor = '#8B4513'; // Brown
    break;
  case 'locked_door':
    baseColor = '#8B0000'; // Dark red
    break;
  case 'secret':
    baseColor = '#000000'; // Black
    break;
  default:
    // Regular wall - orientation determines color
    baseColor = hit.side === 'NS' ? '#666666' : '#444444';
}
```

**NS vs EW Differentiation**:
- Vertical walls (NS): Lighter gray (#666666) - More visible
- Horizontal walls (EW): Darker gray (#444444) - Creates depth perception

---

## Mathematical Formulas

### Wall Height Projection

**Inverse perspective projection**:

```typescript
lineHeight = screenHeight / perpDistance;
```

- Close walls (small distance) → Large lineHeight
- Far walls (large distance) → Small lineHeight
- Linear relationship ensures correct perspective

**Example**:
```
screenHeight = 600px
distance = 1.0 → lineHeight = 600px (fills screen)
distance = 2.0 → lineHeight = 300px (half screen)
distance = 10.0 → lineHeight = 60px (small)
```

### Vertical Centering

```typescript
centerY = screenHeight / 2;
drawStart = max(0, centerY - lineHeight / 2);
drawEnd = min(screenHeight, centerY + lineHeight / 2);
```

Walls extend equally above and below the horizon line, clamped to screen bounds.

### Distance Fog Formula

**Linear interpolation**:

```typescript
function calculateBrightness(distance: number, maxDistance: number): number {
  const minBrightness = 0.2;    // Darkest (20% of original)
  const maxBrightness = 1.0;    // Brightest (100% of original)
  const fogStart = 1.0;          // Distance where fog begins
  const fogEnd = maxDistance;    // Distance where fully fogged

  if (distance <= fogStart) return maxBrightness;
  if (distance >= fogEnd) return minBrightness;

  const factor = (distance - fogStart) / (fogEnd - fogStart);
  return maxBrightness - (factor * (maxBrightness - minBrightness));
}
```

**Brightness Curve**:
```
1.0 ┤▓▓▓▓▓▓▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
    │              ▀▀▀▀▀▀▀▀▀▀
0.8 ┤                    ▀▀▀▀
    │
0.6 ┤                        ▀
    │                         ▀
0.4 ┤                          ▀
    │                           ▀
0.2 ┤───────────────────────────▀▀
    └─────────────────────────────
    0   1   2   3   4   5   6   7   8   9   10
                 Distance (tiles)
```

### Color Shading

**RGB brightness multiplication**:

```typescript
function shadeColor(hexColor: string, brightness: number): string {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const shadedR = Math.floor(r * brightness);
  const shadedG = Math.floor(g * brightness);
  const shadedB = Math.floor(b * brightness);

  return `rgb(${shadedR}, ${shadedG}, ${shadedB})`;
}
```

**Example**:
```
baseColor = #666666 (RGB: 102, 102, 102)
brightness = 0.5

shadedR = floor(102 * 0.5) = 51
shadedG = floor(102 * 0.5) = 51
shadedB = floor(102 * 0.5) = 51

result = rgb(51, 51, 51) = #333333
```

---

## Usage Examples

### Example 1: Basic Rendering

```typescript
const renderer = new RaycastingRenderingService();
const level = DungeonService.loadLevel(1);
const position = { x: 10, y: 10, facing: 'NORTH' };
const config = {
  width: 600,
  height: 600,
  tileDepth: 10,
  peripheralColumns: 5
};

const commands = renderer.generateRaycastCommands(level, position, config);

console.log(`Generated ${commands.length} rendering commands`);
// Typical output: 350-450 commands (one per visible wall column)
```

### Example 2: Rendering to Canvas

```typescript
const renderer = new RaycastingRenderingService();
const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function renderFrame(level: LevelData, position: Position) {
  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 600, 600);

  // Draw ceiling
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 600, 300);

  // Draw floor
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 300, 600, 300);

  // Generate and render wall commands
  const config = { width: 600, height: 600, tileDepth: 10, peripheralColumns: 5 };
  const commands = renderer.generateRaycastCommands(level, position, config);

  commands.forEach(cmd => {
    ctx.fillStyle = cmd.color;
    ctx.globalAlpha = cmd.alpha;
    ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
  });
}
```

### Example 3: Performance Monitoring

```typescript
const renderer = new RaycastingRenderingService();

function benchmarkRendering(level: LevelData, position: Position, frames: number) {
  const config = { width: 600, height: 600, tileDepth: 10, peripheralColumns: 5 };
  const times: number[] = [];

  for (let i = 0; i < frames; i++) {
    const start = performance.now();
    const commands = renderer.generateRaycastCommands(level, position, config);
    const end = performance.now();
    times.push(end - start);
  }

  const avg = times.reduce((a, b) => a + b) / times.length;
  const max = Math.max(...times);
  const fps = 1000 / avg;

  console.log(`Average: ${avg.toFixed(2)}ms`);
  console.log(`Max: ${max.toFixed(2)}ms`);
  console.log(`Theoretical FPS: ${fps.toFixed(0)}`);
}

// Typical output:
// Average: 1.78ms
// Max: 3.21ms
// Theoretical FPS: 562
```

---

## Integration Points

### RaycastingService

RaycastingRenderingService depends on RaycastingService for DDA raycasting:

```typescript
class RaycastingRenderingService {
  private readonly raycaster: RaycastingService;

  constructor() {
    this.raycaster = new RaycastingService(20);
  }
}
```

### PlayerStateService

Uses PlayerStateService to convert discrete Position to continuous PlayerState:

```typescript
const playerState = PlayerStateService.fromPosition(position);
```

This provides pre-computed direction vectors (dirX, dirY) and camera plane (planeX, planeY) for efficient rendering.

### MazeComponent

MazeComponent uses RaycastingRenderingService to render the dungeon view:

```typescript
class MazeComponent {
  private raycastRenderer: RaycastingRenderingService;

  renderMaze() {
    const commands = this.raycastRenderer.generateRaycastCommands(
      this.level,
      this.position,
      this.config
    );
    this.executeCommands(commands);
  }
}
```

---

## Performance Characteristics

### Time Complexity

**O(w × n)** where:
- w = screen width (number of rays)
- n = average distance to wall

**Typical Values**:
- w = 600 rays
- n = 5-10 grid steps per ray
- Total: 3,000-6,000 grid traversals per frame

### Performance Metrics

From performance benchmarks:

**Single Frame Rendering** (600×600 resolution):
- Average time: ~2ms
- Maximum time: ~4ms
- Commands generated: 350-450 (varies by view)

**Multi-Frame Performance** (60 frames):
- Average frame time: 1.78ms
- Maximum frame time: 3.21ms
- Theoretical max FPS: 562 (far exceeds 60 FPS target)

**Comparison to Wireframe Renderer**:
```
Raycasting:  ~2ms per frame   (faster)
Wireframe:   ~8ms per frame

Performance gain: 4x faster
```

### Optimization Strategies

**Efficient Ray Casting**:
- One ray per screen column (600 rays for 600px width)
- Early distance culling (rays beyond tileDepth ignored)
- No intermediate object allocations

**Direct Command Generation**:
- Single fillRect per wall column
- No pixel-by-pixel drawing
- Colors pre-calculated and cached

**Minimal Floating-Point Math**:
- Integer coordinates for screen positions
- Float math only for distance and brightness
- Color shading uses integer RGB values

---

## Testing Strategy

### Test Files

- [RaycastingRenderingService.spec.ts](../../src/services/__tests__/RaycastingRenderingService.spec.ts) - Core rendering tests (5 tests)
- [RaycastingRenderingService.perf.spec.ts](../../src/services/__tests__/RaycastingRenderingService.perf.spec.ts) - Performance benchmarks (2 tests)

### Key Test Cases

**Command Generation**:
- Generates fillRect commands for each screen column
- All commands have valid screen coordinates (0 ≤ x < width, 0 ≤ y < height)
- Commands contain valid RGB color strings

**Color Differentiation**:
- NS walls use different color than EW walls
- Doors use different color than regular walls
- Distance fog darkens colors correctly

**Performance Verification**:
- Single frame renders in <15ms (exceeds 60 FPS requirement)
- Multi-frame average <15ms over 60 frames
- Maximum frame time <20ms

### Running Tests

```bash
# Run all rendering tests
npm test -- RaycastingRenderingService

# Run performance benchmarks
npm test -- RaycastingRenderingService.perf

# Run with coverage
npm test -- RaycastingRenderingService --coverage
```

### Performance Test Output

```
PASS  src/services/__tests__/RaycastingRenderingService.perf.spec.ts
  RaycastingRenderingService - Performance
    ✓ should render full screen in <15ms (45 ms)
      Raycasting render time: 1.78ms
      Commands generated: 423
    ✓ should maintain performance over multiple frames (167 ms)
      Average frame time: 1.78ms
      Max frame time: 3.21ms
```

---

## Dependencies

Uses:
- `RaycastingService` - DDA raycasting algorithm
- `PlayerStateService` - Position to PlayerState conversion
- `LevelData` type - Dungeon level structure
- `Position` type - Discrete player position
- `ViewportConfig` type - Rendering configuration
- `CanvasCommand` type - Canvas drawing command
- `RayHit` type - Ray intersection result

---

## Related

**Services that use RaycastingRenderingService:**
- [MazeComponent](../../src/app/scenes/maze/maze.component.ts) - Dungeon view rendering

**Services used by RaycastingRenderingService:**
- [RaycastingService](./RaycastingService.md) - DDA raycasting algorithm
- [PlayerStateService](./PlayerStateService.md) - Position conversion
- [DungeonService](./DungeonService.md) - Level data loading

**See also:**
- [Raycasting Algorithm Pseudocode](../research/renderer/raycasting-algorithms-pseudocode.md) - Mathematical details
- [Implementation Guide](../research/renderer/implementation-guide.md) - Step-by-step guide
- [Architecture - Rendering](../architecture.md#raycasting-renderer) - System architecture
