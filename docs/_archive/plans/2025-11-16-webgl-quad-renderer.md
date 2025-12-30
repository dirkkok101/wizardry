# WebGL Quad Renderer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build WebGL-based renderer with perspective-correct textured quad rendering to replace existing WireframeRenderingService and RaycastingRenderingService.

**Architecture:** GPU-accelerated quad-based renderer using existing VisibilityService for wall detection. Vertex shader handles perspective projection (porting ProjectionService math to GLSL). Fragment shader performs perspective-correct texture sampling with distance fog. Reuses existing TextureAtlasService for asset management.

**Tech Stack:** WebGL 1.0, GLSL ES 1.0, TypeScript, existing VisibilityService, TextureAtlasService

---

## Task 1: WebGL Context and Shader Infrastructure

**Files:**
- Create: `src/services/WebGLRenderingService.ts`
- Create: `src/shaders/dungeon.vert.ts` (vertex shader as string constant)
- Create: `src/shaders/dungeon.frag.ts` (fragment shader as string constant)
- Create: `src/types/webgl.types.ts`

**Step 1: Define WebGL type definitions**

Create `src/types/webgl.types.ts`:

```typescript
/**
 * WebGL uniform locations for dungeon renderer
 */
export interface UniformLocations {
  uProjectionMatrix: WebGLUniformLocation | null;
  uViewMatrix: WebGLUniformLocation | null;
  uTexture: WebGLUniformLocation | null;
  uFogStart: WebGLUniformLocation | null;
  uFogEnd: WebGLUniformLocation | null;
  uFogColor: WebGLUniformLocation | null;
}

/**
 * WebGL attribute locations for dungeon renderer
 */
export interface AttributeLocations {
  aPosition: number;
  aTexCoord: number;
}

/**
 * Vertex data for a textured quad
 */
export interface QuadVertex {
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
}

/**
 * Renderable quad with texture and geometry
 */
export interface RenderableQuad {
  vertices: QuadVertex[];  // 4 vertices (bottom-left, bottom-right, top-right, top-left)
  textureId: string;
  distance: number;  // For sorting
}
```

**Step 2: Create vertex shader**

Create `src/shaders/dungeon.vert.ts`:

```typescript
export const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;

  uniform mat4 uProjectionMatrix;
  uniform mat4 uViewMatrix;

  varying vec2 vTexCoord;
  varying float vDistance;

  void main() {
    // Transform position to view space
    vec4 viewPos = uViewMatrix * vec4(aPosition, 1.0);

    // Apply projection
    gl_Position = uProjectionMatrix * viewPos;

    // Pass texture coordinates to fragment shader
    vTexCoord = aTexCoord;

    // Pass distance for fog calculation
    vDistance = length(viewPos.xyz);
  }
`;
```

**Step 3: Create fragment shader**

Create `src/shaders/dungeon.frag.ts`:

```typescript
export const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform float uFogStart;
  uniform float uFogEnd;
  uniform vec3 uFogColor;

  varying vec2 vTexCoord;
  varying float vDistance;

  void main() {
    // Sample texture
    vec4 texColor = texture2D(uTexture, vTexCoord);

    // Calculate fog factor (linear fog)
    float fogFactor = clamp((uFogEnd - vDistance) / (uFogEnd - uFogStart), 0.0, 1.0);

    // Mix texture color with fog color
    vec3 finalColor = mix(uFogColor, texColor.rgb, fogFactor);

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;
```

**Step 4: Create WebGLRenderingService skeleton**

Create `src/services/WebGLRenderingService.ts`:

```typescript
import { LevelData, Position } from '../types/Dungeon';
import { ViewportConfig } from '../types/rendering.types';
import { UniformLocations, AttributeLocations, RenderableQuad } from '../types/webgl.types';
import { VERTEX_SHADER } from '../shaders/dungeon.vert';
import { FRAGMENT_SHADER } from '../shaders/dungeon.frag';

/**
 * WebGL-based dungeon renderer with perspective-correct texture mapping.
 *
 * Replaces WireframeRenderingService and RaycastingRenderingService with
 * GPU-accelerated quad rendering.
 */
export class WebGLRenderingService {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private uniforms: UniformLocations | null = null;
  private attributes: AttributeLocations | null = null;

  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;

  private currentTexture: WebGLTexture | null = null;

  /**
   * Initialize WebGL context and shader program.
   *
   * @param canvas - Canvas element for WebGL rendering
   * @returns True if initialization succeeded
   */
  initialize(canvas: HTMLCanvasElement): boolean {
    // Get WebGL context
    this.gl = canvas.getContext('webgl');
    if (!this.gl) {
      console.error('[WebGL] WebGL not supported');
      return false;
    }

    // Compile shaders and create program
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      return false;
    }

    this.program = this.createProgram(vertexShader, fragmentShader);
    if (!this.program) {
      return false;
    }

    // Get uniform and attribute locations
    this.uniforms = {
      uProjectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
      uViewMatrix: this.gl.getUniformLocation(this.program, 'uViewMatrix'),
      uTexture: this.gl.getUniformLocation(this.program, 'uTexture'),
      uFogStart: this.gl.getUniformLocation(this.program, 'uFogStart'),
      uFogEnd: this.gl.getUniformLocation(this.program, 'uFogEnd'),
      uFogColor: this.gl.getUniformLocation(this.program, 'uFogColor')
    };

    this.attributes = {
      aPosition: this.gl.getAttribLocation(this.program, 'aPosition'),
      aTexCoord: this.gl.getAttribLocation(this.program, 'aTexCoord')
    };

    // Create buffers
    this.vertexBuffer = this.gl.createBuffer();
    this.indexBuffer = this.gl.createBuffer();

    // Enable depth testing
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);

    console.log('[WebGL] Initialization successful');
    return true;
  }

  /**
   * Compile a shader from source.
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('[WebGL] Shader compilation failed:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Create shader program from vertex and fragment shaders.
   */
  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    if (!this.gl) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('[WebGL] Program linking failed:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  /**
   * Render the dungeon scene.
   *
   * @param level - Level data
   * @param position - Player position
   * @param config - Viewport configuration
   */
  render(
    level: LevelData,
    position: Position,
    config: ViewportConfig
  ): void {
    if (!this.gl || !this.program) {
      console.error('[WebGL] Not initialized');
      return;
    }

    // Clear buffers
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // TODO: Implement rendering pipeline
    console.log('[WebGL] Render called - implementation pending');
  }

  /**
   * Clean up WebGL resources.
   */
  dispose(): void {
    if (!this.gl) return;

    if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer);
    if (this.currentTexture) this.gl.deleteTexture(this.currentTexture);
    if (this.program) this.gl.deleteProgram(this.program);

    this.gl = null;
  }
}
```

**Step 5: Commit infrastructure**

```bash
git add src/types/webgl.types.ts src/shaders/dungeon.vert.ts src/shaders/dungeon.frag.ts src/services/WebGLRenderingService.ts
git commit -m "feat: add WebGL infrastructure with shaders and types

- Create WebGL type definitions for uniforms, attributes, quads
- Implement vertex shader with perspective projection
- Implement fragment shader with texture sampling and fog
- Create WebGLRenderingService skeleton with initialization

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Matrix Math and Projection

**Files:**
- Modify: `src/services/WebGLRenderingService.ts`
- Create: `src/services/MatrixService.ts`

**Step 1: Create matrix math utility**

Create `src/services/MatrixService.ts`:

```typescript
/**
 * Matrix math utilities for WebGL rendering.
 *
 * All matrices are column-major Float32Array (WebGL convention).
 */
export class MatrixService {
  /**
   * Create 4x4 perspective projection matrix.
   *
   * @param fovY - Vertical field of view in radians
   * @param aspect - Aspect ratio (width / height)
   * @param near - Near clipping plane
   * @param far - Far clipping plane
   * @returns Column-major 4x4 matrix
   */
  static perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1.0 / Math.tan(fovY / 2);
    const rangeInv = 1.0 / (near - far);

    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  /**
   * Create 4x4 view matrix from position and direction.
   *
   * @param posX - Camera X position (world space)
   * @param posY - Camera Y position (world space, up axis)
   * @param posZ - Camera Z position (world space)
   * @param dirX - Direction X component
   * @param dirY - Direction Y component (typically 0 for horizontal view)
   * @param dirZ - Direction Z component
   * @returns Column-major 4x4 view matrix
   */
  static lookAt(
    posX: number, posY: number, posZ: number,
    dirX: number, dirY: number, dirZ: number
  ): Float32Array {
    // Calculate forward vector (normalized direction)
    const fwdLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const fwdX = dirX / fwdLen;
    const fwdY = dirY / fwdLen;
    const fwdZ = dirZ / fwdLen;

    // Up vector (always Y-up in dungeon)
    const upX = 0, upY = 1, upZ = 0;

    // Right = forward × up
    const rightX = fwdY * upZ - fwdZ * upY;
    const rightY = fwdZ * upX - fwdX * upZ;
    const rightZ = fwdX * upY - fwdY * upX;
    const rightLen = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);
    const normRightX = rightX / rightLen;
    const normRightY = rightY / rightLen;
    const normRightZ = rightZ / rightLen;

    // Recalculate up = right × forward
    const newUpX = normRightY * fwdZ - normRightZ * fwdY;
    const newUpY = normRightZ * fwdX - normRightX * fwdZ;
    const newUpZ = normRightX * fwdY - normRightY * fwdX;

    // Create view matrix (inverse of camera transform)
    return new Float32Array([
      normRightX, newUpX, -fwdX, 0,
      normRightY, newUpY, -fwdY, 0,
      normRightZ, newUpZ, -fwdZ, 0,
      -(normRightX * posX + normRightY * posY + normRightZ * posZ),
      -(newUpX * posX + newUpY * posY + newUpZ * posZ),
      -(-fwdX * posX + -fwdY * posY + -fwdZ * posZ),
      1
    ]);
  }

  /**
   * Create identity matrix.
   */
  static identity(): Float32Array {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }
}
```

**Step 2: Add matrix setup to WebGLRenderingService**

Modify `src/services/WebGLRenderingService.ts` - add to imports:

```typescript
import { MatrixService } from './MatrixService';
import { PlayerStateService } from './PlayerStateService';
```

Modify `render()` method in `WebGLRenderingService.ts` (replace TODO section):

```typescript
render(
  level: LevelData,
  position: Position,
  config: ViewportConfig
): void {
  if (!this.gl || !this.program || !this.uniforms) {
    console.error('[WebGL] Not initialized');
    return;
  }

  // Clear buffers
  this.gl.clearColor(0, 0, 0, 1);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

  // Use shader program
  this.gl.useProgram(this.program);

  // Create projection matrix (90° FOV)
  const aspect = config.width / config.height;
  const projMatrix = MatrixService.perspective(Math.PI / 2, aspect, 0.1, config.tileDepth);

  // Create view matrix from player state
  const playerState = PlayerStateService.fromPosition(position);
  const camPosX = playerState.gridX + 0.5;
  const camPosY = 0.5;  // Camera height (eye level)
  const camPosZ = playerState.gridY + 0.5;

  // Convert direction to view direction (game coords use +Y = NORTH)
  // WebGL uses +Z = forward, so we map: gameX → glX, gameY → glZ
  const viewMatrix = MatrixService.lookAt(
    camPosX, camPosY, camPosZ,
    playerState.dirX, 0, playerState.dirY
  );

  // Set uniforms
  this.gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, projMatrix);
  this.gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, viewMatrix);
  this.gl.uniform1f(this.uniforms.uFogStart, 1.0);
  this.gl.uniform1f(this.uniforms.uFogEnd, config.tileDepth);
  this.gl.uniform3f(this.uniforms.uFogColor, 0.0, 0.0, 0.0);  // Black fog

  console.log('[WebGL] Projection and view matrices configured');

  // TODO: Render quads
}
```

**Step 3: Commit matrix math**

```bash
git add src/services/MatrixService.ts src/services/WebGLRenderingService.ts
git commit -m "feat: add matrix math for WebGL projection

- Implement perspective and lookAt matrix functions
- Configure projection matrix (90° FOV)
- Configure view matrix from player position/direction
- Setup fog uniforms

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Texture Loading to GPU

**Files:**
- Modify: `src/services/WebGLRenderingService.ts`

**Step 1: Add texture upload method**

Add to `WebGLRenderingService` class:

```typescript
/**
 * Upload texture atlas to GPU.
 *
 * @param image - Loaded HTMLImageElement from texture atlas
 * @returns WebGL texture handle
 */
uploadTexture(image: HTMLImageElement): WebGLTexture | null {
  if (!this.gl) {
    console.error('[WebGL] Cannot upload texture - not initialized');
    return null;
  }

  const texture = this.gl.createTexture();
  if (!texture) {
    console.error('[WebGL] Failed to create texture');
    return null;
  }

  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

  // Upload image data
  this.gl.texImage2D(
    this.gl.TEXTURE_2D,
    0,                    // Mipmap level
    this.gl.RGBA,         // Internal format
    this.gl.RGBA,         // Source format
    this.gl.UNSIGNED_BYTE,
    image
  );

  // Set texture parameters
  // Use NEAREST filtering for pixel-art textures
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

  // Clamp to edge (no wrapping)
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

  this.currentTexture = texture;
  console.log('[WebGL] Texture uploaded:', image.width, 'x', image.height);

  return texture;
}
```

**Step 2: Add texture binding in render**

Modify `render()` method - add before "TODO: Render quads":

```typescript
// Bind texture
if (this.currentTexture && this.uniforms.uTexture) {
  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
  this.gl.uniform1i(this.uniforms.uTexture, 0);
}
```

**Step 3: Commit texture loading**

```bash
git add src/services/WebGLRenderingService.ts
git commit -m "feat: add texture upload to GPU

- Implement uploadTexture method for sprite sheet
- Configure NEAREST filtering for pixel art
- Bind texture in render loop

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Quad Geometry and Buffer Management

**Files:**
- Modify: `src/services/WebGLRenderingService.ts`
- Modify: `src/types/webgl.types.ts`

**Step 1: Add quad builder helper**

Add to `WebGLRenderingService` class:

```typescript
/**
 * Create vertex data for a textured quad.
 *
 * @param x1 - Bottom-left X (world space)
 * @param y1 - Bottom Y (world space)
 * @param z1 - Bottom-left Z (world space)
 * @param x2 - Bottom-right X (world space)
 * @param z2 - Bottom-right Z (world space)
 * @param height - Quad height (wall height)
 * @param u1 - Texture U coordinate (left)
 * @param u2 - Texture U coordinate (right)
 * @param v1 - Texture V coordinate (bottom)
 * @param v2 - Texture V coordinate (top)
 * @returns Float32Array with interleaved vertex data (x,y,z,u,v per vertex)
 */
private createQuadVertices(
  x1: number, y1: number, z1: number,
  x2: number, z2: number,
  height: number,
  u1: number, u2: number, v1: number, v2: number
): Float32Array {
  const y2 = y1 + height;

  // 4 vertices: bottom-left, bottom-right, top-right, top-left
  // Format: x, y, z, u, v
  return new Float32Array([
    // Bottom-left
    x1, y1, z1, u1, v1,
    // Bottom-right
    x2, y1, z2, u2, v1,
    // Top-right
    x2, y2, z2, u2, v2,
    // Top-left
    x1, y2, z1, u1, v2
  ]);
}

/**
 * Upload quad vertex data to GPU.
 *
 * @param vertices - Interleaved vertex data
 */
private uploadQuadVertices(vertices: Float32Array): void {
  if (!this.gl || !this.vertexBuffer || !this.attributes) return;

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);

  const stride = 5 * Float32Array.BYTES_PER_ELEMENT;  // 5 floats per vertex

  // Position attribute (x, y, z)
  this.gl.enableVertexAttribArray(this.attributes.aPosition);
  this.gl.vertexAttribPointer(
    this.attributes.aPosition,
    3,                          // 3 components
    this.gl.FLOAT,
    false,
    stride,
    0                           // Offset 0
  );

  // TexCoord attribute (u, v)
  this.gl.enableVertexAttribArray(this.attributes.aTexCoord);
  this.gl.vertexAttribPointer(
    this.attributes.aTexCoord,
    2,                          // 2 components
    this.gl.FLOAT,
    false,
    stride,
    3 * Float32Array.BYTES_PER_ELEMENT  // Offset after x,y,z
  );
}

/**
 * Draw a quad using indexed triangles.
 */
private drawQuad(): void {
  if (!this.gl || !this.indexBuffer) return;

  // Create index buffer for two triangles (0-1-2, 0-2-3)
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

  // Draw using indexed triangles
  this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
}
```

**Step 2: Test quad rendering with dummy data**

Modify `render()` method - replace "TODO: Render quads" with:

```typescript
// TEST: Render single quad at (0, 0) facing north
const testVertices = this.createQuadVertices(
  -0.5, 0, 1.0,  // Bottom-left (x, y, z)
  0.5, 1.0,      // Bottom-right (x, z)
  1.0,           // Height
  0.0, 1.0,      // Texture U (full width)
  1.0, 0.0       // Texture V (flipped, 0=top)
);

this.uploadQuadVertices(testVertices);
this.drawQuad();

console.log('[WebGL] Drew test quad');
```

**Step 3: Commit quad rendering**

```bash
git add src/services/WebGLRenderingService.ts
git commit -m "feat: add quad geometry and rendering

- Implement createQuadVertices for world-space quads
- Implement uploadQuadVertices with attribute setup
- Implement drawQuad using indexed triangles
- Add test quad rendering

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Integration with VisibilityService

**Files:**
- Modify: `src/services/WebGLRenderingService.ts`
- Read: `src/services/VisibilityService.ts` (for WallSegment structure)

**Step 1: Add visibility integration**

Modify `render()` method - replace test quad with visibility-based rendering:

```typescript
render(
  level: LevelData,
  position: Position,
  config: ViewportConfig
): void {
  if (!this.gl || !this.program || !this.uniforms) {
    console.error('[WebGL] Not initialized');
    return;
  }

  // Clear buffers
  this.gl.clearColor(0, 0, 0, 1);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  this.gl.useProgram(this.program);

  // Setup matrices (same as before)
  const aspect = config.width / config.height;
  const projMatrix = MatrixService.perspective(Math.PI / 2, aspect, 0.1, config.tileDepth);

  const playerState = PlayerStateService.fromPosition(position);
  const camPosX = playerState.gridX + 0.5;
  const camPosY = 0.5;
  const camPosZ = playerState.gridY + 0.5;

  const viewMatrix = MatrixService.lookAt(
    camPosX, camPosY, camPosZ,
    playerState.dirX, 0, playerState.dirY
  );

  this.gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, projMatrix);
  this.gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, viewMatrix);
  this.gl.uniform1f(this.uniforms.uFogStart, 1.0);
  this.gl.uniform1f(this.uniforms.uFogEnd, config.tileDepth);
  this.gl.uniform3f(this.uniforms.uFogColor, 0.0, 0.0, 0.0);

  // Bind texture
  if (this.currentTexture && this.uniforms.uTexture) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
    this.gl.uniform1i(this.uniforms.uTexture, 0);
  }

  // Get visible walls from VisibilityService
  const walls = VisibilityService.getVisibleWalls(level, position, {
    tileDepth: config.tileDepth,
    peripheralColumns: 5
  });

  console.log(`[WebGL] Rendering ${walls.length} visible walls`);

  // Render each wall
  for (const wall of walls) {
    this.renderWall(wall);
  }
}

/**
 * Render a single wall segment.
 *
 * @param wall - Wall segment from VisibilityService
 */
private renderWall(wall: WallSegment): void {
  if (!this.gl) return;

  // Wall coordinates are in game space (X-right, Y-north)
  // Convert to WebGL space (X-right, Z-depth)
  const x1 = wall.x1;
  const z1 = wall.z1;
  const x2 = wall.x2;
  const z2 = wall.z2;

  // Use full texture for now (TODO: select based on wall type)
  const vertices = this.createQuadVertices(
    x1, 0, z1,
    x2, z2,
    wall.height,
    0.0, 1.0,  // Full texture width
    1.0, 0.0   // Full texture height (V flipped)
  );

  this.uploadQuadVertices(vertices);
  this.drawQuad();
}
```

**Step 2: Add VisibilityService import**

Add to imports in `src/services/WebGLRenderingService.ts`:

```typescript
import { VisibilityService, WallSegment } from './VisibilityService';
```

**Step 3: Commit visibility integration**

```bash
git add src/services/WebGLRenderingService.ts
git commit -m "feat: integrate VisibilityService for wall detection

- Use getVisibleWalls to get renderable walls
- Render each wall as textured quad
- Convert game coordinates to WebGL space

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Texture Atlas UV Mapping

**Files:**
- Modify: `src/services/WebGLRenderingService.ts`
- Read: `src/services/TextureAtlasService.ts` (for texture selection)
- Modify: `src/types/webgl.types.ts`

**Step 1: Add texture atlas state**

Add to `WebGLRenderingService` class fields:

```typescript
private textureAtlasWidth: number = 448;
private textureAtlasHeight: number = 128;
```

Add to `uploadTexture()` method (after texture creation):

```typescript
uploadTexture(image: HTMLImageElement): WebGLTexture | null {
  // ... existing code ...

  this.textureAtlasWidth = image.width;
  this.textureAtlasHeight = image.height;

  console.log('[WebGL] Texture uploaded:', image.width, 'x', image.height);
  return texture;
}
```

**Step 2: Add UV calculation helper**

Add to `WebGLRenderingService` class:

```typescript
/**
 * Calculate UV coordinates for a texture in the atlas.
 *
 * @param textureX - Texture X position in atlas (pixels)
 * @param textureY - Texture Y position in atlas (pixels)
 * @param textureWidth - Texture width (pixels)
 * @param textureHeight - Texture height (pixels)
 * @returns UV coordinates [u1, u2, v1, v2]
 */
private calculateUVs(
  textureX: number,
  textureY: number,
  textureWidth: number,
  textureHeight: number
): [number, number, number, number] {
  const u1 = textureX / this.textureAtlasWidth;
  const u2 = (textureX + textureWidth) / this.textureAtlasWidth;
  const v1 = textureY / this.textureAtlasHeight;
  const v2 = (textureY + textureHeight) / this.textureAtlasHeight;

  return [u1, u2, v1, v2];
}
```

**Step 3: Update renderWall to use texture atlas**

Modify `renderWall()` method:

```typescript
private renderWall(wall: WallSegment): void {
  if (!this.gl) return;

  const x1 = wall.x1;
  const z1 = wall.z1;
  const x2 = wall.x2;
  const z2 = wall.z2;

  // Calculate UV coordinates for stone_wall_01 texture
  // Position in atlas: x=0, y=0, size=64x64
  const [u1, u2, v1, v2] = this.calculateUVs(0, 0, 64, 64);

  const vertices = this.createQuadVertices(
    x1, 0, z1,
    x2, z2,
    wall.height,
    u1, u2,
    v2, v1  // V coordinates flipped (OpenGL convention)
  );

  this.uploadQuadVertices(vertices);
  this.drawQuad();
}
```

**Step 4: Commit UV mapping**

```bash
git add src/services/WebGLRenderingService.ts
git commit -m "feat: add texture atlas UV mapping

- Track atlas dimensions on texture upload
- Implement calculateUVs for atlas sub-rectangles
- Update renderWall to use atlas UVs (stone_wall_01)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Wall Texture Selection (Doors, Stairs, Variations)

**Files:**
- Modify: `src/services/WebGLRenderingService.ts`
- Read: `src/services/TextureAtlasService.ts`
- Modify: `src/types/Dungeon.ts` (add dungeonState parameter)

**Step 1: Add texture selection method**

Add to imports:

```typescript
import { DungeonState } from '../types/Dungeon';
import * as TextureAtlasService from './TextureAtlasService';
import { TextureSet } from '../types/texture.types';
```

Add to `WebGLRenderingService` class fields:

```typescript
private textureSet: TextureSet | null = null;
```

Add setter method:

```typescript
/**
 * Set texture set for rendering.
 *
 * @param textureSet - Texture set with organized textures
 */
setTextureSet(textureSet: TextureSet): void {
  this.textureSet = textureSet;
  console.log('[WebGL] Texture set configured:', textureSet.id);
}
```

**Step 2: Add texture selection logic**

Add method to select appropriate texture:

```typescript
/**
 * Select texture for wall based on tile type and wall state.
 *
 * @param wall - Wall segment
 * @param level - Level data
 * @param dungeonState - Dungeon state (for door tracking)
 * @returns Texture metadata or null
 */
private selectWallTexture(
  wall: WallSegment,
  level: LevelData,
  dungeonState?: DungeonState
): { x: number; y: number; width: number; height: number } | null {
  if (!this.textureSet) return null;

  // Get tile data
  const tile = level.tiles[wall.gridY]?.[wall.gridX];
  if (!tile) return null;

  // Priority 1: Stairs
  if (tile.type === 'stairs_up' || tile.type === 'stairs_down') {
    const stairsTexture = TextureAtlasService.selectStairsTexture(this.textureSet, tile.type);
    if (stairsTexture) {
      return {
        x: stairsTexture.canvas?.width ? 128 : 0,  // stairs_down at x=128
        y: 0,
        width: 64,
        height: 64
      };
    }
  }

  // Priority 2: Doors
  if (wall.wallState === 'door' || wall.wallState === 'locked_door') {
    const doorKey = `${level.level}_${wall.gridY}_${wall.gridX}`;
    const isOpen = dungeonState?.openDoors?.has(doorKey) || false;

    const doorTexture = TextureAtlasService.selectDoorTexture(this.textureSet, isOpen);
    if (doorTexture) {
      const x = isOpen ? 384 : 192;  // door_open at 384, door_closed at 192
      return { x, y: 0, width: 64, height: 64 };
    }
  }

  // Priority 3: Wall variation
  const wallTexture = TextureAtlasService.selectWallTextureVariation(
    this.textureSet,
    wall.gridX,
    wall.gridY
  );

  if (wallTexture) {
    // Variation based on (gridX + gridY) % 2
    const variation = (wall.gridX + wall.gridY) % 2;
    const x = variation === 0 ? 0 : 64;  // stone_wall_01 or stone_wall_02
    return { x, y: 0, width: 64, height: 64 };
  }

  return null;
}
```

**Step 3: Update render signature and renderWall**

Modify `render()` signature:

```typescript
render(
  level: LevelData,
  position: Position,
  config: ViewportConfig,
  dungeonState?: DungeonState
): void {
```

Update wall rendering loop:

```typescript
// Render each wall
for (const wall of walls) {
  this.renderWall(wall, level, dungeonState);
}
```

Modify `renderWall()` signature and implementation:

```typescript
private renderWall(
  wall: WallSegment,
  level: LevelData,
  dungeonState?: DungeonState
): void {
  if (!this.gl) return;

  const x1 = wall.x1;
  const z1 = wall.z1;
  const x2 = wall.x2;
  const z2 = wall.z2;

  // Select appropriate texture
  const texInfo = this.selectWallTexture(wall, level, dungeonState);
  if (!texInfo) {
    // Fallback to first texture
    texInfo = { x: 0, y: 0, width: 64, height: 64 };
  }

  const [u1, u2, v1, v2] = this.calculateUVs(
    texInfo.x,
    texInfo.y,
    texInfo.width,
    texInfo.height
  );

  const vertices = this.createQuadVertices(
    x1, 0, z1,
    x2, z2,
    wall.height,
    u1, u2,
    v2, v1
  );

  this.uploadQuadVertices(vertices);
  this.drawQuad();
}
```

**Step 4: Commit texture selection**

```bash
git add src/services/WebGLRenderingService.ts
git commit -m "feat: add wall texture selection (doors, stairs, variations)

- Implement selectWallTexture with priority logic
- Support door states (open/closed)
- Support stairs textures (up/down)
- Support wall variations (alternating)
- Add setTextureSet method for configuration

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Floor and Ceiling Rendering

**Files:**
- Modify: `src/services/WebGLRenderingService.ts`

**Step 1: Add floor/ceiling quad generation**

Add method to `WebGLRenderingService`:

```typescript
/**
 * Render floor and ceiling quads for visible tiles.
 *
 * @param level - Level data
 * @param position - Player position
 * @param config - Viewport configuration
 */
private renderFloorsAndCeilings(
  level: LevelData,
  position: Position,
  config: ViewportConfig
): void {
  if (!this.gl || !this.textureSet) return;

  // Get visible tiles from VisibilityService
  const visibleTiles = VisibilityService.getVisibleTiles(level, position, {
    tileDepth: config.tileDepth,
    peripheralColumns: 5
  });

  console.log(`[WebGL] Rendering ${visibleTiles.length} floor/ceiling quads`);

  // Render floor and ceiling for each visible tile
  for (const tile of visibleTiles) {
    // Floor quad (y=0)
    this.renderFloorQuad(tile.x, tile.y);

    // Ceiling quad (y=1)
    this.renderCeilingQuad(tile.x, tile.y);
  }
}

/**
 * Render floor quad for a single tile.
 */
private renderFloorQuad(gridX: number, gridZ: number): void {
  if (!this.gl || !this.textureSet) return;

  // Floor texture UV coordinates (x=256, y=0, 64x64)
  const [u1, u2, v1, v2] = this.calculateUVs(256, 0, 64, 64);

  // Horizontal quad at y=0
  const vertices = new Float32Array([
    // Bottom-left
    gridX, 0, gridZ, u1, v1,
    // Bottom-right
    gridX + 1, 0, gridZ, u2, v1,
    // Top-right
    gridX + 1, 0, gridZ + 1, u2, v2,
    // Top-left
    gridX, 0, gridZ + 1, u1, v2
  ]);

  this.uploadQuadVertices(vertices);
  this.drawQuad();
}

/**
 * Render ceiling quad for a single tile.
 */
private renderCeilingQuad(gridX: number, gridZ: number): void {
  if (!this.gl || !this.textureSet) return;

  // Ceiling texture UV coordinates (x=320, y=0, 64x64)
  const [u1, u2, v1, v2] = this.calculateUVs(320, 0, 64, 64);

  // Horizontal quad at y=1
  const vertices = new Float32Array([
    // Bottom-left (reverse winding for downward-facing)
    gridX, 1, gridZ + 1, u1, v2,
    // Bottom-right
    gridX + 1, 1, gridZ + 1, u2, v2,
    // Top-right
    gridX + 1, 1, gridZ, u2, v1,
    // Top-left
    gridX, 1, gridZ, u1, v1
  ]);

  this.uploadQuadVertices(vertices);
  this.drawQuad();
}
```

**Step 2: Call floor/ceiling rendering in render()**

Modify `render()` method - add before wall rendering:

```typescript
// Render floors and ceilings first (furthest back)
this.renderFloorsAndCeilings(level, position, config);

// Render walls on top
console.log(`[WebGL] Rendering ${walls.length} visible walls`);
for (const wall of walls) {
  this.renderWall(wall, level, dungeonState);
}
```

**Step 3: Add getVisibleTiles stub (if not in VisibilityService)**

Check if `VisibilityService.getVisibleTiles` exists. If not, add this temporary implementation to `WebGLRenderingService`:

```typescript
/**
 * Get visible tiles for floor/ceiling rendering.
 * Simplified version using same flood-fill as getVisibleWalls.
 */
private getVisibleTilesSimplified(
  level: LevelData,
  position: Position,
  config: { tileDepth: number; peripheralColumns: number }
): Array<{ x: number; y: number }> {
  const tiles: Array<{ x: number; y: number }> = [];

  const startX = position.x;
  const startY = position.y;

  // Simple grid-based visibility (within tileDepth radius)
  for (let dy = -config.tileDepth; dy <= config.tileDepth; dy++) {
    for (let dx = -config.peripheralColumns; dx <= config.peripheralColumns; dx++) {
      const tileX = startX + dx;
      const tileY = startY + dy;

      // Check bounds and distance
      if (tileX < 0 || tileY < 0 || tileX >= 20 || tileY >= 20) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > config.tileDepth) continue;

      tiles.push({ x: tileX, y: tileY });
    }
  }

  return tiles;
}
```

Use `getVisibleTilesSimplified` if `VisibilityService.getVisibleTiles` doesn't exist.

**Step 4: Commit floor and ceiling rendering**

```bash
git add src/services/WebGLRenderingService.ts
git commit -m "feat: add floor and ceiling quad rendering

- Implement renderFloorsAndCeilings method
- Add renderFloorQuad with floor texture
- Add renderCeilingQuad with ceiling texture
- Render floors/ceilings before walls (depth sorting)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Maze Component Integration

**Files:**
- Modify: `src/app/maze/maze.component.ts`
- Remove: Usage of WireframeRenderingService and RaycastingRenderingService

**Step 1: Update maze component imports**

Modify `src/app/maze/maze.component.ts` imports:

```typescript
// Remove these imports:
// import { WireframeRenderingService } from '../../services/WireframeRenderingService';
// import { RaycastingRenderingService } from '../../services/RaycastingRenderingService';

// Add this import:
import { WebGLRenderingService } from '../../services/WebGLRenderingService';
```

**Step 2: Update component fields**

Replace renderer fields:

```typescript
// Remove these:
// readonly wireframeRenderer = WireframeRenderingService;
// readonly raycastingRenderer = new RaycastingRenderingService();
// readonly rendererType = signal<'wireframe' | 'raycasting'>('wireframe');

// Add this:
private webglRenderer: WebGLRenderingService | null = null;
```

**Step 3: Update ngAfterViewInit to initialize WebGL**

Modify `ngAfterViewInit()`:

```typescript
ngAfterViewInit(): void {
  const canvas = this.canvasRef.nativeElement;

  // Initialize WebGL renderer
  this.webglRenderer = new WebGLRenderingService();
  const initialized = this.webglRenderer.initialize(canvas);

  if (!initialized) {
    console.error('[MazeComponent] WebGL initialization failed');
    return;
  }

  // Load textures
  this.loadTextures();
}
```

**Step 4: Update loadTextures to use WebGL**

Modify `loadTextures()` method:

```typescript
private async loadTextures(): Promise<void> {
  try {
    console.log('[MazeComponent] Starting texture load from /assets/textures/eob-dungeon-level-01.json');

    const response = await fetch('/assets/textures/eob-dungeon-level-01.json');
    if (!response.ok) throw new Error(`Failed to load texture atlas: ${response.statusText}`);

    const atlas: TextureAtlas = await response.json();
    console.log('[MazeComponent] Loaded atlas JSON:', {
      id: atlas.id,
      imagePath: atlas.imagePath,
      dimensions: `${atlas.width}x${atlas.height}`,
      textureCount: atlas.textures.length
    });

    const spriteSheet = await TextureAtlasService.loadTextureAtlas(atlas);
    console.log('[MazeComponent] Sprite sheet loaded:', {
      naturalWidth: spriteSheet.naturalWidth,
      naturalHeight: spriteSheet.naturalHeight,
      complete: spriteSheet.complete
    });

    // Upload to WebGL
    if (this.webglRenderer) {
      this.webglRenderer.uploadTexture(spriteSheet);
    }

    const textures = TextureAtlasService.extractAllTextures(spriteSheet, atlas);
    const textureSet = TextureAtlasService.createTextureSet(atlas.id, atlas.description || 'Dungeon Level 1', textures);

    // Configure renderer with texture set
    if (this.webglRenderer) {
      this.webglRenderer.setTextureSet(textureSet);
    }

    console.log('[MazeComponent] ✅ Textures loaded and uploaded to GPU');

    // Trigger initial render
    this.renderMaze();
  } catch (error) {
    console.error('[MazeComponent] ❌ Failed to load textures:', error);
  }
}
```

**Step 5: Update renderMaze method**

Replace `renderMaze()` implementation:

```typescript
private renderMaze(): void {
  const level = this.currentLevel();
  const pos = this.position();
  const config: ViewportConfig = {
    width: this.canvasRef.nativeElement.width,
    height: this.canvasRef.nativeElement.height,
    tileDepth: 20
  };

  if (this.webglRenderer) {
    this.webglRenderer.render(level, pos, config, this.dungeonState());
  }
}
```

**Step 6: Remove keyboard toggle for renderers**

Remove any keyboard handler code that toggles between renderers (if present).

**Step 7: Commit maze component integration**

```bash
git add src/app/maze/maze.component.ts
git commit -m "feat: integrate WebGL renderer into maze component

- Replace wireframe/raycasting with WebGLRenderingService
- Initialize WebGL context in ngAfterViewInit
- Upload texture atlas to GPU
- Configure renderer with TextureSet
- Trigger WebGL rendering in renderMaze

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Remove Old Renderers

**Files:**
- Delete: `src/services/WireframeRenderingService.ts`
- Delete: `src/services/RaycastingRenderingService.ts`
- Delete: `src/components/maze-view/maze-view.component.ts` (if only used for Canvas2D)
- Modify: Any other files that import these services

**Step 1: Check for usage of old renderers**

Run:

```bash
grep -r "WireframeRenderingService" src/ --exclude-dir=node_modules
grep -r "RaycastingRenderingService" src/ --exclude-dir=node_modules
```

**Step 2: Remove old renderer files**

```bash
git rm src/services/WireframeRenderingService.ts
git rm src/services/RaycastingRenderingService.ts
```

**Step 3: Verify maze-view component usage**

Check if `maze-view.component.ts` is still needed. If WebGL renders directly to canvas, this component can be removed:

```bash
git rm src/components/maze-view/maze-view.component.ts
git rm src/components/maze-view/maze-view.component.html
git rm src/components/maze-view/maze-view.component.scss
```

**Step 4: Commit removal**

```bash
git commit -m "refactor: remove deprecated renderers

- Delete WireframeRenderingService (replaced by WebGL)
- Delete RaycastingRenderingService (replaced by WebGL)
- Delete maze-view component (WebGL renders directly)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Performance Optimization - Batched Rendering

**Files:**
- Modify: `src/services/WebGLRenderingService.ts`

**Step 1: Add batch rendering infrastructure**

Add to `WebGLRenderingService` class fields:

```typescript
private maxQuadsPerBatch = 256;  // Adjust based on performance testing
private vertexBatchBuffer: Float32Array;
private indexBatchBuffer: Uint16Array;

constructor() {
  // Pre-allocate batch buffers
  const verticesPerQuad = 4;
  const floatsPerVertex = 5;  // x, y, z, u, v
  this.vertexBatchBuffer = new Float32Array(this.maxQuadsPerBatch * verticesPerQuad * floatsPerVertex);

  const indicesPerQuad = 6;
  this.indexBatchBuffer = new Uint16Array(this.maxQuadsPerBatch * indicesPerQuad);

  // Pre-fill index buffer (pattern repeats for each quad)
  for (let i = 0; i < this.maxQuadsPerBatch; i++) {
    const vertexOffset = i * 4;
    const indexOffset = i * 6;

    this.indexBatchBuffer[indexOffset + 0] = vertexOffset + 0;
    this.indexBatchBuffer[indexOffset + 1] = vertexOffset + 1;
    this.indexBatchBuffer[indexOffset + 2] = vertexOffset + 2;
    this.indexBatchBuffer[indexOffset + 3] = vertexOffset + 0;
    this.indexBatchBuffer[indexOffset + 4] = vertexOffset + 2;
    this.indexBatchBuffer[indexOffset + 5] = vertexOffset + 3;
  }
}
```

**Step 2: Implement batch collection**

Add batch collection method:

```typescript
/**
 * Batch render multiple quads in a single draw call.
 *
 * @param quads - Array of quad vertex data
 */
private renderBatch(quads: Float32Array[]): void {
  if (!this.gl || !this.vertexBuffer || !this.indexBuffer || !this.attributes) return;
  if (quads.length === 0) return;

  const quadCount = Math.min(quads.length, this.maxQuadsPerBatch);

  // Copy all quad vertex data into batch buffer
  let offset = 0;
  for (let i = 0; i < quadCount; i++) {
    this.vertexBatchBuffer.set(quads[i], offset);
    offset += quads[i].length;
  }

  // Upload vertex data
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
  this.gl.bufferData(
    this.gl.ARRAY_BUFFER,
    this.vertexBatchBuffer.subarray(0, offset),
    this.gl.DYNAMIC_DRAW
  );

  const stride = 5 * Float32Array.BYTES_PER_ELEMENT;

  this.gl.enableVertexAttribArray(this.attributes.aPosition);
  this.gl.vertexAttribPointer(this.attributes.aPosition, 3, this.gl.FLOAT, false, stride, 0);

  this.gl.enableVertexAttribArray(this.attributes.aTexCoord);
  this.gl.vertexAttribPointer(
    this.attributes.aTexCoord,
    2,
    this.gl.FLOAT,
    false,
    stride,
    3 * Float32Array.BYTES_PER_ELEMENT
  );

  // Upload index data
  const indexCount = quadCount * 6;
  this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  this.gl.bufferData(
    this.gl.ELEMENT_ARRAY_BUFFER,
    this.indexBatchBuffer.subarray(0, indexCount),
    this.gl.STATIC_DRAW
  );

  // Draw batch
  this.gl.drawElements(this.gl.TRIANGLES, indexCount, this.gl.UNSIGNED_SHORT, 0);

  console.log(`[WebGL] Rendered batch of ${quadCount} quads`);
}
```

**Step 3: Update render() to use batching**

Modify `render()` method to collect all quads first, then batch render:

```typescript
render(
  level: LevelData,
  position: Position,
  config: ViewportConfig,
  dungeonState?: DungeonState
): void {
  if (!this.gl || !this.program || !this.uniforms) {
    console.error('[WebGL] Not initialized');
    return;
  }

  // Clear and setup (same as before)
  this.gl.clearColor(0, 0, 0, 1);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  this.gl.useProgram(this.program);

  // Setup matrices and uniforms (same as before)
  const aspect = config.width / config.height;
  const projMatrix = MatrixService.perspective(Math.PI / 2, aspect, 0.1, config.tileDepth);

  const playerState = PlayerStateService.fromPosition(position);
  const camPosX = playerState.gridX + 0.5;
  const camPosY = 0.5;
  const camPosZ = playerState.gridY + 0.5;

  const viewMatrix = MatrixService.lookAt(
    camPosX, camPosY, camPosZ,
    playerState.dirX, 0, playerState.dirY
  );

  this.gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, projMatrix);
  this.gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, viewMatrix);
  this.gl.uniform1f(this.uniforms.uFogStart, 1.0);
  this.gl.uniform1f(this.uniforms.uFogEnd, config.tileDepth);
  this.gl.uniform3f(this.uniforms.uFogColor, 0.0, 0.0, 0.0);

  if (this.currentTexture && this.uniforms.uTexture) {
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
    this.gl.uniform1i(this.uniforms.uTexture, 0);
  }

  // Collect all quads
  const floorQuads: Float32Array[] = [];
  const ceilingQuads: Float32Array[] = [];
  const wallQuads: Float32Array[] = [];

  // Collect floor/ceiling quads
  const visibleTiles = this.getVisibleTilesSimplified(level, position, {
    tileDepth: config.tileDepth,
    peripheralColumns: 5
  });

  for (const tile of visibleTiles) {
    const floorVerts = this.createFloorQuadVertices(tile.x, tile.y);
    const ceilingVerts = this.createCeilingQuadVertices(tile.x, tile.y);
    floorQuads.push(floorVerts);
    ceilingQuads.push(ceilingVerts);
  }

  // Collect wall quads
  const walls = VisibilityService.getVisibleWalls(level, position, {
    tileDepth: config.tileDepth,
    peripheralColumns: 5
  });

  for (const wall of walls) {
    const wallVerts = this.createWallQuadVertices(wall, level, dungeonState);
    if (wallVerts) wallQuads.push(wallVerts);
  }

  // Batch render
  this.renderBatch(floorQuads);
  this.renderBatch(ceilingQuads);
  this.renderBatch(wallQuads);
}
```

**Step 4: Extract quad creation helpers**

Add helper methods:

```typescript
private createFloorQuadVertices(gridX: number, gridZ: number): Float32Array {
  const [u1, u2, v1, v2] = this.calculateUVs(256, 0, 64, 64);
  return new Float32Array([
    gridX, 0, gridZ, u1, v1,
    gridX + 1, 0, gridZ, u2, v1,
    gridX + 1, 0, gridZ + 1, u2, v2,
    gridX, 0, gridZ + 1, u1, v2
  ]);
}

private createCeilingQuadVertices(gridX: number, gridZ: number): Float32Array {
  const [u1, u2, v1, v2] = this.calculateUVs(320, 0, 64, 64);
  return new Float32Array([
    gridX, 1, gridZ + 1, u1, v2,
    gridX + 1, 1, gridZ + 1, u2, v2,
    gridX + 1, 1, gridZ, u2, v1,
    gridX, 1, gridZ, u1, v1
  ]);
}

private createWallQuadVertices(
  wall: WallSegment,
  level: LevelData,
  dungeonState?: DungeonState
): Float32Array | null {
  const x1 = wall.x1;
  const z1 = wall.z1;
  const x2 = wall.x2;
  const z2 = wall.z2;

  const texInfo = this.selectWallTexture(wall, level, dungeonState);
  if (!texInfo) return null;

  const [u1, u2, v1, v2] = this.calculateUVs(texInfo.x, texInfo.y, texInfo.width, texInfo.height);

  return this.createQuadVertices(x1, 0, z1, x2, z2, wall.height, u1, u2, v2, v1);
}
```

**Step 5: Commit batched rendering**

```bash
git add src/services/WebGLRenderingService.ts
git commit -m "perf: implement batched quad rendering

- Pre-allocate batch buffers for vertex/index data
- Collect all quads before rendering
- Batch render floors, ceilings, walls separately
- Reduce draw calls from N to 3 (one per batch)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Testing and Documentation

**Files:**
- Create: `docs/architecture/webgl-renderer.md`
- Modify: `README.md` (update renderer information)

**Step 1: Write architecture documentation**

Create `docs/architecture/webgl-renderer.md`:

```markdown
# WebGL Quad Renderer Architecture

## Overview

The WebGL renderer replaces the previous WireframeRenderingService and RaycastingRenderingService with GPU-accelerated perspective-correct texture mapping.

## Components

### WebGLRenderingService
- **Location**: `src/services/WebGLRenderingService.ts`
- **Responsibilities**:
  - Initialize WebGL context and shader program
  - Upload texture atlas to GPU
  - Render walls, floors, ceilings as textured quads
  - Handle batched rendering for performance

### Shaders
- **Vertex Shader**: `src/shaders/dungeon.vert.ts`
  - Transforms world-space vertices to clip space
  - Applies projection and view matrices
  - Calculates distance for fog

- **Fragment Shader**: `src/shaders/dungeon.frag.ts`
  - Samples texture atlas with perspective-correct UVs
  - Applies linear distance fog
  - Outputs final pixel color

### MatrixService
- **Location**: `src/services/MatrixService.ts`
- **Responsibilities**:
  - Generate perspective projection matrix (90° FOV)
  - Generate view matrix from camera position/direction
  - Column-major Float32Array format for WebGL

## Rendering Pipeline

1. **Initialization** (one-time)
   - Create WebGL context
   - Compile and link shaders
   - Create vertex/index buffers
   - Upload texture atlas to GPU

2. **Frame Rendering**
   - Clear color and depth buffers
   - Setup projection and view matrices
   - Get visible tiles/walls from VisibilityService
   - Collect floor/ceiling/wall quads
   - Batch render each category
   - Depth testing ensures correct occlusion

3. **Texture Selection**
   - Priority 1: Stairs (stairs_up, stairs_down)
   - Priority 2: Doors (open/closed based on dungeonState)
   - Priority 3: Wall variations (alternating pattern)
   - Fallback: First wall texture

## Coordinate Systems

### Game Coordinates
- X-axis: EAST (right)
- Y-axis: NORTH (up on map)
- Origin: (0, 0) = bottom-left of map

### WebGL Coordinates
- X-axis: right
- Y-axis: up (world height)
- Z-axis: depth (into screen)
- Conversion: gameX → glX, gameY → glZ

## Performance

### Batched Rendering
- Collects up to 256 quads per batch
- Single draw call per batch
- Reduces CPU-GPU round trips
- Typical scene: 3 draw calls (floors, ceilings, walls)

### Texture Atlas
- Single 448×128 sprite sheet
- Reduces texture binding overhead
- UV coordinates calculated per quad

## Texture Atlas Layout

```
[0,0]     [64,0]    [128,0]   [192,0]   [256,0]   [320,0]   [384,0]   [448,0]
  |         |          |         |         |         |         |         |
wall_01  wall_02  stairs_dn  door_cls   floor    ceiling  door_open
 64x64    64x64     64x64     64x64     64x64     64x64     64x64
```

## Integration

### Maze Component
- Initializes WebGLRenderingService in ngAfterViewInit
- Loads texture atlas and uploads to GPU
- Calls render() on each frame or position change
- Passes dungeonState for door tracking

### Visibility Service
- Reused from wireframe renderer
- Provides list of visible walls
- Flood-fill algorithm with peripheral vision
- Back-to-front sorting for painter's algorithm

## Future Enhancements

- [ ] Dynamic lighting (torches, spells)
- [ ] Animated textures (torches, water)
- [ ] Mipmapping for distant textures
- [ ] WebGL 2.0 features (if available)
- [ ] Shadow mapping
```

**Step 2: Update README**

Add section to `README.md`:

```markdown
## Renderer

The game uses a **WebGL-based quad renderer** with perspective-correct texture mapping. Features:

- GPU-accelerated rendering
- Perspective-correct texture interpolation
- Distance fog effect
- Batched rendering (3 draw calls per frame)
- Support for doors, stairs, wall variations
- 90° field of view matching original Wizardry

**Key files:**
- `src/services/WebGLRenderingService.ts` - Main renderer
- `src/shaders/dungeon.vert.ts` - Vertex shader
- `src/shaders/dungeon.frag.ts` - Fragment shader
- `src/services/MatrixService.ts` - Projection math
```

**Step 3: Manual testing checklist**

Test the following scenarios:

1. **Basic rendering**
   - [ ] Walls render with stone textures
   - [ ] Floor renders with floor texture
   - [ ] Ceiling renders with ceiling texture
   - [ ] Distance fog darkens far walls

2. **Movement**
   - [ ] Forward/backward movement updates view correctly
   - [ ] Turning left/right updates view correctly
   - [ ] No visual glitches during movement

3. **Special tiles**
   - [ ] Stairs render with stairs texture
   - [ ] Closed doors render with closed door texture
   - [ ] Open doors render with open door texture (test by opening door first)

4. **Wall variations**
   - [ ] Walls alternate between two textures
   - [ ] Pattern is consistent (doesn't flicker)

5. **Performance**
   - [ ] 60 FPS on modern hardware
   - [ ] No stuttering during movement
   - [ ] Smooth fog transitions

**Step 4: Commit documentation**

```bash
git add docs/architecture/webgl-renderer.md README.md
git commit -m "docs: add WebGL renderer architecture documentation

- Document rendering pipeline
- Explain coordinate system conversions
- Describe batched rendering strategy
- Add texture atlas layout diagram
- Update README with renderer information

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Verification Checklist

Before marking this plan as complete, verify:

- [ ] WebGL context initializes successfully
- [ ] Shaders compile and link without errors
- [ ] Textures upload to GPU correctly
- [ ] All quads render with proper perspective
- [ ] Floors and ceilings appear horizontal
- [ ] Walls appear vertical with correct orientation
- [ ] Texture atlas UV mapping is correct
- [ ] Door states (open/closed) display correctly
- [ ] Stairs textures display on stairs tiles
- [ ] Wall variations alternate properly
- [ ] Distance fog effect works
- [ ] Batched rendering improves performance
- [ ] No visual glitches or artifacts
- [ ] Frame rate is 60 FPS on target hardware
- [ ] Old renderers are completely removed
- [ ] Documentation is complete and accurate

## Estimated Timeline

- **Task 1-4**: WebGL infrastructure (1-2 days)
- **Task 5-7**: Texture integration and selection (2-3 days)
- **Task 8**: Floor/ceiling rendering (1 day)
- **Task 9-10**: Integration and cleanup (1 day)
- **Task 11**: Performance optimization (1-2 days)
- **Task 12**: Testing and documentation (1 day)

**Total**: 7-10 days of focused development

---

## Execution Options

Plan complete and saved to `docs/plans/2025-11-16-webgl-quad-renderer.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
