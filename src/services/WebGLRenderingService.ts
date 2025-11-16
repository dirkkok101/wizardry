import { LevelData, Position, WallSegment, DungeonState } from '../types/Dungeon';
import { ViewportConfig } from '../types/rendering.types';
import { UniformLocations, AttributeLocations, RenderableQuad } from '../types/webgl.types';
import { VERTEX_SHADER } from '../shaders/dungeon.vert';
import { FRAGMENT_SHADER } from '../shaders/dungeon.frag';
import { MatrixService } from './MatrixService';
import { PlayerStateService } from './PlayerStateService';
import { VisibilityService } from './VisibilityService';
import { DungeonService } from './DungeonService';

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

  private atlasWidth: number = 448;
  private atlasHeight: number = 128;

  // Batch rendering buffers
  private batchVertices: number[] = [];
  private maxBatchSize: number = 1000; // Max quads per batch (6000 vertices)

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

  /**
   * Render the dungeon scene.
   *
   * @param level - Level data
   * @param position - Player position
   * @param config - Viewport configuration
   * @param dungeonState - Optional dungeon state for door rendering
   */
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

    // Clear buffers
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Start new batch
    this.startBatch();

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

    // Bind texture
    if (this.currentTexture && this.uniforms.uTexture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
      this.gl.uniform1i(this.uniforms.uTexture, 0);
    }

    console.log('[WebGL] Projection and view matrices configured');

    // Get visible walls from VisibilityService
    const walls = VisibilityService.getVisibleWalls(level, position, config.tileDepth, config.peripheralColumns);

    // Render each visible wall
    for (const wall of walls) {
      this.renderWall(level, wall);
    }

    // Render floors and ceilings for all visible tiles
    const visibleTiles = this.getVisibleTiles(position, config);
    for (const [gridX, gridY] of visibleTiles) {
      this.renderFloor(gridX, gridY);
      this.renderCeiling(gridX, gridY);
    }

    // Flush remaining quads in batch
    this.flushBatch();
  }

  /**
   * Calculates UV coordinates for a texture atlas sub-rectangle
   * @param x - Pixel X position in atlas
   * @param y - Pixel Y position in atlas
   * @param width - Pixel width of sub-texture
   * @param height - Pixel height of sub-texture
   * @returns UV coordinates [u1, v1, u2, v2] where (u1,v1) is min, (u2,v2) is max
   */
  private calculateUVs(
    x: number,
    y: number,
    width: number,
    height: number
  ): [number, number, number, number] {
    // Convert pixel coordinates to normalized UV coordinates (0.0 to 1.0)
    const u1 = x / this.atlasWidth;
    const v1 = y / this.atlasHeight;
    const u2 = (x + width) / this.atlasWidth;
    const v2 = (y + height) / this.atlasHeight;

    return [u1, v1, u2, v2];
  }

  /**
   * Selects the appropriate texture for a wall segment based on tile type
   * @param level - Level data containing tile types
   * @param wall - Wall segment to render
   * @returns Texture atlas coordinates [x, y, width, height] in pixels
   */
  private selectWallTexture(
    level: LevelData,
    wall: WallSegment
  ): [number, number, number, number] {
    // Get tile at wall position using DungeonService
    const tile = DungeonService.getTile(level, wall.gridX, wall.gridY);

    // Priority order: stairs > doors > walls

    // Check for stairs (both up and down use the same texture)
    if (tile.type === 'stairs_down' || tile.type === 'stairs_up') {
      return [128, 0, 64, 64]; // stairs_down texture
    }

    // Check for doors
    if (tile.type === 'door') {
      // For now, all doors render as closed
      // TODO: integrate with DungeonState.openDoors when available
      return [192, 0, 64, 64]; // door_closed texture
    }

    // Regular walls: alternate between stone_wall_01 and stone_wall_02
    // Use checkerboard pattern based on grid position
    const useVariation2 = (wall.gridX + wall.gridY) % 2 === 1;

    if (useVariation2) {
      return [64, 0, 64, 64]; // stone_wall_02
    } else {
      return [0, 0, 64, 64];  // stone_wall_01
    }
  }

  /**
   * Renders a single wall segment as a textured quad
   * @param level - Level data containing tile types
   * @param wall - Wall segment from VisibilityService
   */
  private renderWall(level: LevelData, wall: WallSegment): void {
    if (!this.gl) return;

    // Wall height (from floor y=0 to ceiling y=1)
    const y1 = 0;
    const y2 = 1;

    // Select appropriate texture based on tile type
    const [texX, texY, texW, texH] = this.selectWallTexture(level, wall);
    const [u1, v1, u2, v2] = this.calculateUVs(texX, texY, texW, texH);

    // Create quad vertices from wall endpoints
    // Bottom-left, bottom-right, top-right, top-left
    const vertices = this.createQuadVertices(
      wall.x1, y1, wall.z1,  // Bottom-left
      wall.x2, y1, wall.z2,  // Bottom-right
      wall.x2, y2, wall.z2,  // Top-right
      wall.x1, y2, wall.z1,  // Top-left
      u1, v1,                // UV min from atlas
      u2, v2                 // UV max from atlas
    );

    this.addQuadToBatch(vertices);
  }

  /**
   * Renders a floor quad for a single tile
   * @param gridX - Grid X coordinate
   * @param gridY - Grid Y coordinate
   */
  private renderFloor(gridX: number, gridY: number): void {
    if (!this.gl) return;

    // Floor is a horizontal quad at y=0
    // World coordinates: grid (x, y) maps to world (x, 0, y)
    const worldX1 = gridX;
    const worldZ1 = gridY;
    const worldX2 = gridX + 1;
    const worldZ2 = gridY + 1;

    // Floor texture coordinates
    const [u1, v1, u2, v2] = this.calculateUVs(256, 0, 64, 64); // floor_stone

    // Create horizontal quad (floor at y=0)
    // Vertices ordered counter-clockwise when viewed from above:
    // Bottom-left, bottom-right, top-right, top-left
    const vertices = this.createQuadVertices(
      worldX1, 0, worldZ1,  // Bottom-left corner
      worldX2, 0, worldZ1,  // Bottom-right corner
      worldX2, 0, worldZ2,  // Top-right corner
      worldX1, 0, worldZ2,  // Top-left corner
      u1, v1,
      u2, v2
    );

    this.addQuadToBatch(vertices);
  }

  /**
   * Renders a ceiling quad for a single tile
   * @param gridX - Grid X coordinate
   * @param gridY - Grid Y coordinate
   */
  private renderCeiling(gridX: number, gridY: number): void {
    if (!this.gl) return;

    // Ceiling is a horizontal quad at y=1
    const worldX1 = gridX;
    const worldZ1 = gridY;
    const worldX2 = gridX + 1;
    const worldZ2 = gridY + 1;

    // Ceiling texture coordinates
    const [u1, v1, u2, v2] = this.calculateUVs(320, 0, 64, 64); // ceiling_stone

    // Create horizontal quad (ceiling at y=1)
    // Vertices ordered clockwise when viewed from above (counter-clockwise from below):
    // Bottom-left, top-left, top-right, bottom-right
    const vertices = this.createQuadVertices(
      worldX1, 1, worldZ1,  // Bottom-left corner
      worldX1, 1, worldZ2,  // Top-left corner
      worldX2, 1, worldZ2,  // Top-right corner
      worldX2, 1, worldZ1,  // Bottom-right corner
      u1, v1,
      u2, v2
    );

    this.addQuadToBatch(vertices);
  }

  /**
   * Gets the grid coordinates of all visible tiles based on player position and view frustum
   * @param position - Player position
   * @param config - Viewport configuration
   * @returns Array of [gridX, gridY] coordinates
   */
  private getVisibleTiles(position: Position, config: ViewportConfig): Array<[number, number]> {
    const tiles: Array<[number, number]> = [];

    // Player's grid position
    const playerGridX = Math.floor(position.x);
    const playerGridY = Math.floor(position.y);

    // Calculate visible tile range based on facing direction
    // For simplicity, render a rectangular area in front of the player
    const depth = config.tileDepth || 5;
    const width = (config.peripheralColumns || 3) + 1; // +1 for center column

    // Use Direction enum to determine tile coordinates
    // NORTH = +Y, EAST = +X, SOUTH = -Y, WEST = -X
    switch (position.facing) {
      case 'EAST':
        for (let d = 0; d <= depth; d++) {
          for (let w = -Math.floor(width / 2); w <= Math.floor(width / 2); w++) {
            tiles.push([playerGridX + d, playerGridY + w]);
          }
        }
        break;

      case 'NORTH':
        for (let d = 0; d <= depth; d++) {
          for (let w = -Math.floor(width / 2); w <= Math.floor(width / 2); w++) {
            tiles.push([playerGridX + w, playerGridY + d]);
          }
        }
        break;

      case 'WEST':
        for (let d = 0; d <= depth; d++) {
          for (let w = -Math.floor(width / 2); w <= Math.floor(width / 2); w++) {
            tiles.push([playerGridX - d, playerGridY + w]);
          }
        }
        break;

      case 'SOUTH':
        for (let d = 0; d <= depth; d++) {
          for (let w = -Math.floor(width / 2); w <= Math.floor(width / 2); w++) {
            tiles.push([playerGridX + w, playerGridY - d]);
          }
        }
        break;
    }

    return tiles;
  }

  /**
   * Creates vertex data for a textured quad (two triangles)
   * @param x1, y1, z1 - Bottom-left corner
   * @param x2, y2, z2 - Bottom-right corner
   * @param x3, y3, z3 - Top-right corner
   * @param x4, y4, z4 - Top-left corner
   * @param u1, v1, u2, v2 - UV coordinates (min/max)
   * @returns Float32Array with interleaved position + UV data
   */
  private createQuadVertices(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    x3: number, y3: number, z3: number,
    x4: number, y4: number, z4: number,
    u1: number, v1: number,
    u2: number, v2: number
  ): Float32Array {
    // Interleaved format: [x, y, z, u, v] per vertex
    // Two triangles: (v1, v2, v3) and (v1, v3, v4)
    return new Float32Array([
      // Triangle 1: bottom-left, bottom-right, top-right
      x1, y1, z1, u1, v2,
      x2, y2, z2, u2, v2,
      x3, y3, z3, u2, v1,
      // Triangle 2: bottom-left, top-right, top-left
      x1, y1, z1, u1, v2,
      x3, y3, z3, u2, v1,
      x4, y4, z4, u1, v1
    ]);
  }

  /**
   * Uploads quad vertex data to GPU and configures attributes
   * @param vertices - Interleaved vertex data [x,y,z,u,v,...]
   */
  private uploadQuadVertices(vertices: Float32Array): void {
    if (!this.gl || !this.vertexBuffer || !this.attributes) return;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);

    const stride = 5 * Float32Array.BYTES_PER_ELEMENT; // 5 floats per vertex
    const posOffset = 0;
    const uvOffset = 3 * Float32Array.BYTES_PER_ELEMENT;

    // Position attribute (3 floats)
    this.gl.vertexAttribPointer(
      this.attributes.aPosition,
      3,
      this.gl.FLOAT,
      false,
      stride,
      posOffset
    );
    this.gl.enableVertexAttribArray(this.attributes.aPosition);

    // Texture coordinate attribute (2 floats)
    this.gl.vertexAttribPointer(
      this.attributes.aTexCoord,
      2,
      this.gl.FLOAT,
      false,
      stride,
      uvOffset
    );
    this.gl.enableVertexAttribArray(this.attributes.aTexCoord);
  }

  /**
   * Draws a quad using the currently uploaded vertex data
   */
  private drawQuad(): void {
    if (!this.gl) return;
    // 6 vertices (2 triangles)
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  /**
   * Starts a new rendering batch
   */
  private startBatch(): void {
    this.batchVertices = [];
  }

  /**
   * Adds a quad to the current batch instead of rendering immediately
   * @param vertices - Quad vertex data (30 floats)
   */
  private addQuadToBatch(vertices: Float32Array): void {
    // Add all vertex data to batch array
    for (let i = 0; i < vertices.length; i++) {
      this.batchVertices.push(vertices[i]);
    }

    // If batch is full, flush it
    if (this.batchVertices.length >= this.maxBatchSize * 30) {
      this.flushBatch();
    }
  }

  /**
   * Uploads and renders all quads in the current batch
   */
  private flushBatch(): void {
    if (this.batchVertices.length === 0) return;
    if (!this.gl || !this.vertexBuffer || !this.attributes) return;

    // Convert batch array to Float32Array
    const batchData = new Float32Array(this.batchVertices);

    // Upload entire batch to GPU
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, batchData, this.gl.DYNAMIC_DRAW);

    // Configure vertex attributes
    const stride = 5 * Float32Array.BYTES_PER_ELEMENT;
    const posOffset = 0;
    const uvOffset = 3 * Float32Array.BYTES_PER_ELEMENT;

    this.gl.vertexAttribPointer(
      this.attributes.aPosition,
      3,
      this.gl.FLOAT,
      false,
      stride,
      posOffset
    );
    this.gl.enableVertexAttribArray(this.attributes.aPosition);

    this.gl.vertexAttribPointer(
      this.attributes.aTexCoord,
      2,
      this.gl.FLOAT,
      false,
      stride,
      uvOffset
    );
    this.gl.enableVertexAttribArray(this.attributes.aTexCoord);

    // Draw entire batch in one call
    const vertexCount = this.batchVertices.length / 5; // 5 floats per vertex
    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertexCount);

    // Clear batch for next frame
    this.batchVertices = [];
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
