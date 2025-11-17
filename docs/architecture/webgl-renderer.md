# WebGL Quad Renderer Architecture

## Overview

The WebGL quad renderer is a GPU-accelerated 3D dungeon renderer that replaces the previous wireframe and raycasting renderers. It uses perspective-correct texture mapping with batched rendering for optimal performance.

## Architecture

### Core Components

1. **WebGLRenderingService** - Main renderer service
   - WebGL context management
   - Shader compilation and linking
   - Texture atlas management
   - Quad geometry generation
   - Batched rendering pipeline

2. **MatrixService** - 3D math utilities
   - Perspective projection matrix
   - View (lookAt) matrix
   - Column-major matrix format for WebGL

3. **VisibilityService** - Frustum culling
   - Determines visible wall segments
   - Provides world coordinates for walls

4. **TextureAtlasService** - Texture loading
   - Loads texture atlas metadata
   - Loads texture images
   - Provides texture coordinates

### Rendering Pipeline

```
1. Initialize WebGL context
2. Compile shaders (vertex + fragment)
3. Create shader program
4. Load texture atlas to GPU
5. For each frame:
   a. Start batch
   b. Get visible walls from VisibilityService
   c. For each wall: select texture, create quad, add to batch
   d. Calculate visible tiles
   e. For each tile: create floor quad, create ceiling quad, add to batch
   f. Flush batch (upload + single draw call)
```

### Texture Atlas

**Format**: Single 448×128 PNG with 7+ textures

**Textures**:
- `stone_wall_01` (0, 0, 64, 64) - Regular wall variation 1
- `stone_wall_02` (64, 0, 64, 64) - Regular wall variation 2
- `stairs_down` (128, 0, 64, 64) - Descending stairs texture (to next level)
- `door_closed` (192, 0, 64, 64) - Closed door
- `floor_stone` (256, 0, 64, 64) - Floor texture
- `ceiling_stone` (320, 0, 64, 64) - Ceiling texture
- `stairs_up` (384, 0, 64, 64) - Ascending stairs texture (to castle)
- `door_open` (448, 0, 64, 64) - Open door (if present)

**Note**: Texture coordinates are looked up dynamically via `getTextureById()` method, with hardcoded fallbacks for backwards compatibility.

### Coordinate Systems

**Game Grid**: (x, y) where x=EAST, y=NORTH
**WebGL World**: (x, y, z) where x=EAST, y=UP, z=NORTH
**Conversion**: Grid (gx, gy) → World (gx, 0, gy) for floors, (gx, 1, gy) for ceilings

### Shaders

**Vertex Shader**:
- Transforms vertices using projection and view matrices
- Calculates view-space distance for fog
- Passes texture coordinates to fragment shader

**Fragment Shader**:
- Samples texture atlas
- Applies linear distance fog (black fog from 1.0 to config.tileDepth units)
- Outputs final color with fog blending

### Performance Optimizations

**Batched Rendering**:
- Collects all quads into single vertex buffer
- Single buffer upload per frame
- Single draw call per frame (vs ~50-100 without batching)
- 50-100x reduction in CPU-GPU overhead

**Texture Atlas**:
- Single texture for all dungeon elements
- No texture switching between quads
- GPU-friendly memory access pattern

**NEAREST Filtering**:
- Pixel-perfect rendering for retro aesthetic
- No texture bleeding between atlas regions

## Texture Selection

### selectWallTexture Method

The `selectWallTexture` method determines which texture to use for each wall segment based on wall type, not tile type. This enables stairs to appear on specific walls while other walls on the same tile remain normal.

**Signature**:
```typescript
private selectWallTexture(
  level: LevelData,
  wall: WallSegment
): [number, number, number, number]
```

**Parameters**:
- `level`: Level data with tile grid
- `wall`: Wall segment with `gridX`, `gridY`, and `side` (north/south/east/west)

**Returns**: Texture atlas coordinates `[x, y, width, height]` in pixels

**Selection Priority** (highest to lowest):
1. **Stairs walls** - `stairs_up` or `stairs_down` (uses `getTextureById()`)
2. **Doors** - `door` or `locked_door` (door_closed texture)
3. **Regular walls** - `wall`, `secret`, `illusion` (checkerboard pattern)
4. **Open spaces** - `open` (should not render, uses default wall as fallback)

**Implementation**:
```typescript
private selectWallTexture(level: LevelData, wall: WallSegment): [number, number, number, number] {
  const tile = DungeonService.getTile(level, wall.gridX, wall.gridY);

  // Get wall type for the specific wall side being rendered
  const wallType = tile.walls[wall.side];

  // Priority 1: Stairs walls (highest priority)
  if (wallType === 'stairs_up') {
    const texture = this.getTextureById('stairs_up');
    return texture ? [texture.x, texture.y, texture.width, texture.height] : [384, 0, 64, 64];
  }

  if (wallType === 'stairs_down') {
    const texture = this.getTextureById('stairs_down');
    return texture ? [texture.x, texture.y, texture.width, texture.height] : [320, 0, 64, 64];
  }

  // Priority 2: Doors
  if (wallType === 'door' || wallType === 'locked_door') {
    return [192, 0, 64, 64];  // door_closed
  }

  // Priority 3: Regular walls (checkerboard pattern)
  const useVariation2 = (wall.gridX + wall.gridY) % 2 === 1;
  return useVariation2 ? [64, 0, 64, 64] : [0, 0, 64, 64];
}
```

**Key Features**:
- **Wall-side specificity**: Checks `tile.walls[wall.side]` to render correct texture per wall
- **Dynamic lookup**: Uses `getTextureById()` for stairs textures (falls back to hardcoded if not found)
- **Checkerboard pattern**: Alternates wall variations based on grid position for visual variety
- **Ignores tile.type**: Texture selection based solely on wall type, not tile type

**Example Scenarios**:

**Scenario 1: Tile with stairs on one wall**
```json
{
  "x": 0,
  "y": 0,
  "walls": {
    "north": "wall",
    "south": "wall",
    "east": "open",
    "west": "stairs_up"
  }
}
```
- West wall: Renders `stairs_up` texture (384, 0)
- North/South walls: Render regular wall textures (checkerboard)
- East wall: Not rendered (open)

**Scenario 2: Multiple stairs on same tile**
```json
{
  "x": 5,
  "y": 5,
  "walls": {
    "north": "stairs_up",
    "south": "stairs_down",
    "east": "door",
    "west": "wall"
  }
}
```
- North wall: `stairs_up` texture
- South wall: `stairs_down` texture
- East wall: `door_closed` texture
- West wall: Regular wall texture

**Comparison to Old System**:

| Old System (Tile-based) | New System (Wall-based) |
|------------------------|-------------------------|
| Checked `tile.type` | Checks `tile.walls[wall.side]` |
| Single texture per tile | Different texture per wall side |
| Stairs on entire tile | Stairs on specific walls |
| Limited flexibility | Full wall-level control |

**Related**:
- See [DungeonService.validateStairsWalls](../services/DungeonService.md#validatestairswalls) for map validation
- See [NavigationService.handleStairsTransition](../services/NavigationService.md#handlestairstransition) for stairs behavior
- See [Dungeon Navigation System](../systems/dungeon-navigation.md#stairs-wall-interactions) for complete stairs documentation

## API

### WebGLRenderingService

```typescript
class WebGLRenderingService {
  // Initialization
  initialize(canvas: HTMLCanvasElement): boolean

  // Texture management
  uploadTexture(image: HTMLImageElement): WebGLTexture | null
  getTextureById(id: string): TextureMetadata | null

  // Rendering
  render(
    level: LevelData,
    position: Position,
    config: ViewportConfig,
    dungeonState?: DungeonState
  ): void

  // Cleanup
  dispose(): void
}
```

### ViewportConfig

```typescript
interface ViewportConfig {
  width: number;           // Canvas width in pixels
  height: number;          // Canvas height in pixels
  tileDepth: number;       // View distance in tiles (default 5)
  peripheralColumns: number; // Peripheral vision width (default 3)
}
```

## File Structure

```
src/
├── services/
│   ├── WebGLRenderingService.ts  - Main renderer
│   ├── MatrixService.ts          - 3D math utilities
│   ├── VisibilityService.ts      - Frustum culling
│   └── TextureAtlasService.ts    - Texture loading
├── shaders/
│   ├── dungeon.vert.ts           - Vertex shader
│   └── dungeon.frag.ts           - Fragment shader
├── types/
│   ├── webgl.types.ts            - WebGL type definitions
│   └── rendering.types.ts        - ViewportConfig
└── app/maze/
    └── maze.component.ts         - Integration point

data/textures/
├── eob-dungeon-level-01.json     - Atlas metadata
└── eob-dungeon-level-01.png      - Atlas image
```

## Browser Compatibility

- Requires WebGL 1.0 support
- GLSL ES 1.0 shaders
- Tested on Chrome, Firefox, Safari, Edge
- Fallback to error message if WebGL unavailable

## Future Enhancements

- [ ] Implement door open/closed state rendering
- [ ] Add ambient occlusion for depth perception
- [ ] Support multiple texture atlases (different dungeon tilesets)
- [ ] Implement dynamic lighting (torches, spells)
- [ ] Add particle effects (sparks, dust)
- [ ] Optimize with instanced rendering for repeated geometry
- [ ] Add debug visualization mode
