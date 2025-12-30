# RaycastingService

**Pure function service for DDA raycasting algorithm.**

## Responsibility

Implements the Digital Differential Analyzer (DDA) algorithm to cast rays through a grid-based dungeon map and determine wall intersections. Provides perpendicular distance calculations to prevent fisheye distortion and supports toroidal map wrapping.

## API Reference

### Constructor

Create a new RaycastingService instance.

**Signature**:
```typescript
constructor(maxRaySteps: number = 20)
```

**Parameters**:
- `maxRaySteps`: Maximum number of grid steps before ray terminates (default: 20)

**Example**:
```typescript
const raycaster = new RaycastingService(20);
// Rays will traverse up to 20 grid cells before stopping
```

---

### castRay

Cast a single ray through the dungeon and return the first wall hit.

**Signature**:
```typescript
function castRay(
  level: LevelData,
  playerState: PlayerState,
  rayDirX: number,
  rayDirY: number
): RayHit | null
```

**Parameters**:
- `level`: Level data containing tile grid and configuration
- `playerState`: Player position and direction vectors
- `rayDirX`: Ray X direction component (normalized)
- `rayDirY`: Ray Y direction component (normalized)

**Returns**: RayHit object if wall found, null if ray doesn't hit anything within maxRaySteps

**Example**:
```typescript
const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' });

// Cast center ray (straight forward)
const hit = raycaster.castRay(level, playerState, 0, 1);

if (hit) {
  console.log(`Hit wall at distance ${hit.distance}`);
  console.log(`Wall coordinates: (${hit.mapX}, ${hit.mapY})`);
  console.log(`Wall direction: ${hit.wallDirection}`);
  console.log(`Wall type: ${hit.wallState}`);
}
```

**RayHit Structure**:
```typescript
interface RayHit {
  distance: number;           // Perpendicular distance (prevents fisheye)
  mapX: number;               // Grid X coordinate of wall
  mapY: number;               // Grid Y coordinate of wall
  side: 'NS' | 'EW';         // Wall orientation (vertical or horizontal)
  wallX: number;              // Hit position on wall (0-1) for texture mapping
  wallState: WallType;        // 'wall' | 'door' | 'locked_door' | 'secret' | 'open'
  wallDirection: WallDirection; // 'north' | 'east' | 'south' | 'west'
}
```

---

## Mathematical Concepts

### DDA Algorithm Overview

The Digital Differential Analyzer algorithm efficiently traverses a grid by always stepping to the nearest grid line intersection:

1. **Initialize**: Start at player's grid cell
2. **Calculate Delta Distances**: How far the ray must travel to cross one grid unit
3. **Step Through Grid**: Always move to the nearest grid line (either vertical or horizontal)
4. **Check for Walls**: At each grid crossing, check if a wall exists
5. **Calculate Distance**: Use perpendicular distance to prevent fisheye distortion

### Delta Distance Formula

```typescript
deltaDistX = Math.abs(1 / rayDirX);
deltaDistY = Math.abs(1 / rayDirY);
```

This represents: "How far must the ray travel to cross one grid unit in X or Y?"

### Perpendicular Distance Calculation

**Critical for fisheye correction:**

```typescript
// For vertical walls (NS orientation)
perpWallDist = sideDistX - deltaDistX;

// For horizontal walls (EW orientation)
perpWallDist = sideDistY - deltaDistY;
```

**Why Perpendicular Distance?**
- Direct ray distance creates fisheye distortion (edge rays appear longer than center rays)
- Perpendicular distance projects all rays onto the camera plane
- Result: Straight walls appear straight on screen

**Visual Explanation**:
```
Player view (camera plane):
    |-----------|  <- Perpendicular distances are equal
    |           |
    |     P     |  <- Player position
    |    /|\    |
    |   / | \   |  <- Rays cast at different angles
    |  /  |  \  |
    | /   |   \ |
    |/____|____\|
   Wall  Wall  Wall

Without correction: Center wall closer than edge walls (fisheye)
With perpendicular distance: All walls at same distance appear same size
```

### Wall Direction Mapping

Determines which wall face was hit based on ray step direction:

**Wizardry Coordinate System**: +Y = NORTH, +X = EAST

**Logic**:
```typescript
if (side === 'NS') {
  // Vertical wall - stepped in X direction
  return stepX > 0 ? 'west' : 'east';
} else {
  // Horizontal wall - stepped in Y direction
  return stepY > 0 ? 'south' : 'north';
}
```

**Explanation**:
- Stepping +X (moving EAST) → Enters tile from WEST side
- Stepping -X (moving WEST) → Enters tile from EAST side
- Stepping +Y (moving NORTH) → Enters tile from SOUTH side
- Stepping -Y (moving SOUTH) → Enters tile from NORTH side

### Toroidal Map Wrapping

For maps with `edgeWrapping: true`:

```typescript
x = ((x % mapWidth) + mapWidth) % mapWidth;
y = ((y % mapHeight) + mapHeight) % mapHeight;
```

This handles both positive and negative coordinates, wrapping the map like a torus.

---

## Usage Examples

### Example 1: Casting a Single Ray

```typescript
const raycaster = new RaycastingService(20);
const level = DungeonService.loadLevel(1);
const playerState = PlayerStateService.fromPosition({
  x: 10,
  y: 10,
  facing: 'NORTH'
});

// Cast ray straight forward
const hit = raycaster.castRay(level, playerState, 0, 1);

if (hit) {
  console.log(`Wall found at perpendicular distance: ${hit.distance}`);
  console.log(`Grid coordinates: (${hit.mapX}, ${hit.mapY})`);
  console.log(`Wall orientation: ${hit.side === 'NS' ? 'Vertical' : 'Horizontal'}`);
  console.log(`Wall type: ${hit.wallState}`);
}
```

### Example 2: Casting Rays for Full Screen

```typescript
const raycaster = new RaycastingService(20);
const screenWidth = 600;
const playerState = PlayerStateService.fromPosition(position);

for (let x = 0; x < screenWidth; x++) {
  // Calculate ray direction for this screen column
  const cameraX = (2 * x / screenWidth) - 1; // Range: -1 to +1
  const rayDirX = playerState.dirX + playerState.planeX * cameraX;
  const rayDirY = playerState.dirY + playerState.planeY * cameraX;

  // Cast ray
  const hit = raycaster.castRay(level, playerState, rayDirX, rayDirY);

  if (hit) {
    // Render wall column at screen position x
    renderWallColumn(x, hit);
  }
}
```

### Example 3: Handling Different Wall Types

```typescript
const hit = raycaster.castRay(level, playerState, rayDirX, rayDirY);

if (hit) {
  switch (hit.wallState) {
    case 'wall':
      console.log('Solid wall');
      break;
    case 'door':
      console.log('Door (can be opened)');
      break;
    case 'locked_door':
      console.log('Locked door (requires key)');
      break;
    case 'secret':
      console.log('Secret door (invisible until found)');
      break;
    case 'open':
      console.log('Open space (ray passes through)');
      break;
  }
}
```

---

## Integration Points

### PlayerStateService

RaycastingService uses PlayerState generated by PlayerStateService:

```typescript
const playerState = PlayerStateService.fromPosition(position);
const hit = raycaster.castRay(level, playerState, rayDirX, rayDirY);
```

PlayerState provides pre-computed direction vectors and camera plane for efficient rendering.

### RaycastingRenderingService

RaycastingRenderingService uses RaycastingService to generate canvas commands:

```typescript
class RaycastingRenderingService {
  private raycaster: RaycastingService;

  generateRaycastCommands(level: LevelData, position: Position): CanvasCommand[] {
    const playerState = PlayerStateService.fromPosition(position);

    for (let x = 0; x < screenWidth; x++) {
      const hit = this.raycaster.castRay(level, playerState, rayDirX, rayDirY);
      // Generate rendering commands from hit data
    }
  }
}
```

### DungeonService

DungeonService provides the LevelData structure that RaycastingService operates on:

```typescript
const level = DungeonService.loadLevel(1);
const hit = raycaster.castRay(level, playerState, rayDirX, rayDirY);
```

---

## Performance Characteristics

### Time Complexity

**O(n)** where n = distance to wall in grid cells

- Best case: O(1) - Wall immediately adjacent to player
- Worst case: O(maxRaySteps) - Ray travels maximum distance
- Average case: O(5-10) - Most walls within 5-10 tiles

### Space Complexity

**O(1)** - No additional memory allocation per ray

### Performance Metrics

From performance tests (600 rays per frame):
- **Average ray cast time**: ~0.003ms per ray
- **600 rays**: ~2ms total
- **Theoretical max FPS**: 500+ FPS (2ms per frame at 600x600 resolution)

### Optimization Characteristics

**Efficient Grid Traversal**:
- DDA algorithm steps only through occupied grid cells
- No unnecessary coordinate checks
- Early termination when wall found

**No Allocations in Hot Path**:
- Returns existing RayHit object or null
- No intermediate objects created during traversal

**Integer Math Where Possible**:
- Grid coordinates use integer arithmetic
- Floating-point only for distance calculations

---

## Testing Strategy

### Test Files

- [RaycastingService.spec.ts](../../src/services/__tests__/RaycastingService.spec.ts) - Core algorithm tests (12 tests)

### Key Test Cases

**Basic Raycasting**:
- Ray hits wall in each cardinal direction
- Ray returns null when no wall found within maxRaySteps
- Out-of-bounds treated as walls

**Wall Direction Detection**:
- Stepping +X on NS wall returns 'west'
- Stepping -X on NS wall returns 'east'
- Stepping +Y on EW wall returns 'south'
- Stepping -Y on EW wall returns 'north'

**Special Features**:
- Edge wrapping for toroidal maps
- Door detection (doors block rays)
- Perpendicular distance calculation (prevents fisheye)

**Mathematical Correctness**:
- Perpendicular distance < Euclidean distance for angled rays
- Distance calculation matches expected values
- Wall hit position (wallX) in range [0, 1]

### Running Tests

```bash
# Run all raycasting tests
npm test -- RaycastingService

# Run with coverage
npm test -- RaycastingService --coverage

# Run in watch mode
npm test -- RaycastingService --watch
```

---

## Dependencies

Uses:
- `LevelData` type - Dungeon level structure with tile grid
- `TileData` type - Individual tile with wall configuration
- `PlayerState` type - Player position and direction vectors
- `RayHit` type - Ray intersection result
- `WallType` type - Wall state enumeration
- `WallDirection` type - Cardinal direction enumeration

**Note**: RaycastingService has no service dependencies. It operates purely on data structures passed as parameters.

---

## Related

**Services that use RaycastingService:**
- [RaycastingRenderingService](./RaycastingRenderingService.md) - Generates canvas commands from ray hits

**Services used by RaycastingService:**
- [PlayerStateService](./PlayerStateService.md) - Converts Position to PlayerState with direction vectors
- [DungeonService](./DungeonService.md) - Loads level data

**See also:**
- [Raycasting Algorithm Pseudocode](../research/renderer/raycasting-algorithms-pseudocode.md) - Detailed algorithm explanation
- [Raycasting Quick Reference](../research/renderer/raycasting-quick-reference.md) - Mathematical formulas
- [Architecture - Rendering](../architecture.md#raycasting-renderer) - System overview
