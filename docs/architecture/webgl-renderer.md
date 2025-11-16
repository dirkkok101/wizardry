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

**Format**: Single 448×128 PNG with 7 textures
**Textures**:
- stone_wall_01 (0, 0, 64, 64) - Regular wall variation 1
- stone_wall_02 (64, 0, 64, 64) - Regular wall variation 2
- stairs_down (128, 0, 64, 64) - Stairs texture
- door_closed (192, 0, 64, 64) - Closed door
- floor_stone (256, 0, 64, 64) - Floor texture
- ceiling_stone (320, 0, 64, 64) - Ceiling texture
- door_open (384, 0, 64, 64) - Open door

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

## API

### WebGLRenderingService

```typescript
class WebGLRenderingService {
  // Initialization
  initialize(canvas: HTMLCanvasElement): boolean

  // Texture management
  uploadTexture(image: HTMLImageElement): WebGLTexture | null

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
