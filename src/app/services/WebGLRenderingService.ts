import { LevelData, Position, WallSegment, DungeonState } from '@models/Dungeon';
import { ViewportConfig } from '@models/rendering.types';
import { UniformLocations, AttributeLocations, RenderableQuad } from '@models/webgl.types';
import { TextureAtlas, TextureMetadata } from '@models/texture.types';
import { VERTEX_SHADER } from '@rendering/shaders/dungeon.vert';
import { FRAGMENT_SHADER } from '@rendering/shaders/dungeon.frag';
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
  private debugMode = false;

  // Camera offset from tile center (0.0 = center, positive = back from facing direction)
  // Moving back reveals more of the current tile's floor/ceiling
  private static readonly CAMERA_OFFSET = 0.3;

  // Minimum distance from tile edge to prevent wall clipping
  // Must be >= near plane (0.1) to avoid rendering artifacts
  private static readonly MIN_DIST_FROM_EDGE = 0.15;

  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private isWebGL2: boolean = false;
  private program: WebGLProgram | null = null;
  private uniforms: UniformLocations | null = null;
  private attributes: AttributeLocations | null = null;

  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;

  private currentTexture: WebGLTexture | null = null;

  private atlasWidth: number = 0;
  private atlasHeight: number = 0;
  private atlas: TextureAtlas | null = null;

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
    // Try WebGL 2 first for better texture filtering support (mipmaps on NPOT textures)
    this.gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
    if (this.gl) {
      this.isWebGL2 = true;
      if (this.debugMode) {
        console.log('[WebGL] Using WebGL 2 context');
      }
    } else {
      // Fallback to WebGL 1
      this.gl = canvas.getContext('webgl');
      this.isWebGL2 = false;
      if (this.debugMode) {
        console.log('[WebGL] Falling back to WebGL 1 context');
      }
    }

    if (!this.gl) {
      if (this.debugMode) {
        console.error('[WebGL] WebGL not supported');
      }
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

    // Enable depth testing for proper occlusion
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);

    if (this.debugMode) {
      console.log('[WebGL] Initialization successful');
    }
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
      if (this.debugMode) {
        console.error('[WebGL] Shader compilation failed:', this.gl.getShaderInfoLog(shader));
      }
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
      if (this.debugMode) {
        console.error('[WebGL] Program linking failed:', this.gl.getProgramInfoLog(program));
      }
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
      if (this.debugMode) {
        console.error('[WebGL] Cannot upload texture - not initialized');
      }
      return null;
    }

    const texture = this.gl.createTexture();
    if (!texture) {
      if (this.debugMode) {
        console.error('[WebGL] Failed to create texture');
      }
      return null;
    }

    // Derive atlas dimensions from loaded image
    this.atlasWidth = image.width;
    this.atlasHeight = image.height;

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

    // Check if we can use mipmaps (WebGL 2 supports NPOT, WebGL 1 requires POT)
    const isPowerOfTwo = (n: number) => (n & (n - 1)) === 0;
    const canUseMipmaps = this.isWebGL2 || (isPowerOfTwo(image.width) && isPowerOfTwo(image.height));

    if (canUseMipmaps) {
      // Generate mipmaps for trilinear filtering
      this.gl.generateMipmap(this.gl.TEXTURE_2D);

      // Use trilinear filtering (LINEAR_MIPMAP_LINEAR interpolates between mipmap levels)
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

      if (this.debugMode) {
        console.log('[WebGL] Trilinear filtering enabled with mipmaps');
      }
    } else {
      // Fallback to bilinear filtering for NPOT textures in WebGL 1
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

      if (this.debugMode) {
        console.log('[WebGL] Bilinear filtering (NPOT texture in WebGL 1, mipmaps not supported)');
      }
    }

    // Clamp to edge (no wrapping)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.currentTexture = texture;
    if (this.debugMode) {
      console.log('[WebGL] Texture uploaded:', image.width, 'x', image.height);
    }

    return texture;
  }

  /**
   * Set texture atlas metadata for texture lookups
   * @param atlas - TextureAtlas metadata from JSON
   */
  setAtlas(atlas: TextureAtlas): void {
    this.atlas = atlas;
  }

  /**
   * Get texture metadata by ID from atlas
   * @param id - Texture ID (e.g., 'floor_stone')
   * @returns TextureMetadata if found, undefined otherwise
   */
  private getTextureById(id: string): TextureMetadata | undefined {
    return this.atlas?.textures.find(t => t.id === id);
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
      if (this.debugMode) {
        console.error('[WebGL] Not initialized');
      }
      return;
    }

    // Set viewport to match canvas size
    this.gl.viewport(0, 0, config.width, config.height);

    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // Start new batch
    this.startBatch();

    // Use shader program
    this.gl.useProgram(this.program);

    // Create perspective projection matrix
    const aspect = config.width / config.height;
    const vFOV = Math.PI * 90 / 180;  // 90° vertical FOV
    // Far plane at 10 tiles provides depth precision for walls up to 5 tiles away
    const farPlane = 10.0;
    // Near plane at 0.1 for close geometry
    const projMatrix = MatrixService.perspective(vFOV, aspect, 0.1, farPlane);

    // Create view matrix from player state
    const playerState = PlayerStateService.fromPosition(position);
    // Position camera slightly back from tile center to reveal more of current tile
    // Clamp offset to ensure camera stays MIN_DIST_FROM_EDGE from tile boundaries
    const maxOffset = 0.5 - WebGLRenderingService.MIN_DIST_FROM_EDGE;
    const safeOffset = Math.min(WebGLRenderingService.CAMERA_OFFSET, maxOffset);
    const camPosX = playerState.gridX + 0.5 - playerState.dirX * safeOffset;
    const camPosY = 0.5;  // Camera height (eye level)
    const camPosZ = playerState.gridY + 0.5 - playerState.dirY * safeOffset;

    if (this.debugMode) {
      console.log('[WebGL] Player state:', {
        pos: `(${position.x}, ${position.y})`,
        facing: position.facing,
        gridPos: `(${playerState.gridX}, ${playerState.gridY})`,
        direction: `(${playerState.dirX.toFixed(2)}, ${playerState.dirY.toFixed(2)})`,
        angle: `${(playerState.angle * 180 / Math.PI).toFixed(0)}°`,
        cameraPos: `(${camPosX.toFixed(1)}, ${camPosY.toFixed(1)}, ${camPosZ.toFixed(1)})`
      });
    }

    // Convert direction to view direction (game coords use +Y = NORTH)
    // WebGL uses +Z = forward, so we map: gameX → glX, gameY → glZ
    const viewMatrix = MatrixService.lookAt(
      camPosX, camPosY, camPosZ,
      playerState.dirX, 0, playerState.dirY
    );

    // Set uniforms
    this.gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, projMatrix);
    this.gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, viewMatrix);
    // Fog starts at 2 tiles, ends at 10 tiles
    // Ensures walls at depth 5 are ~62% visible instead of 0% visible
    this.gl.uniform1f(this.uniforms.uFogStart, 2.0);
    this.gl.uniform1f(this.uniforms.uFogEnd, 10.0);
    this.gl.uniform3f(this.uniforms.uFogColor, 0.0, 0.0, 0.0);  // Black fog

    // Bind texture
    if (this.currentTexture && this.uniforms.uTexture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
      this.gl.uniform1i(this.uniforms.uTexture, 0);
    }

    if (this.debugMode) {
      console.log('[WebGL] Projection and view matrices configured');
    }

    // Get visible geometry (walls and tiles) from single traversal
    // This ensures walls and floor/ceiling tiles are always in sync
    const { walls, tiles: visibleTiles } = VisibilityService.getVisibleGeometry(
      level,
      position,
      config.tileDepth || 5,
      config.peripheralColumns || 5
    );

    if (this.debugMode) {
      console.log(`[WebGL] Got ${walls.length} walls and ${visibleTiles.length} tiles to render`);
      if (walls.length > 0) {
        const firstWall = walls[0];

        // Calculate expected fog factor
        const fogStart = 2.0;
        const fogEnd = 10.0;
        const fogFactor = Math.max(0, Math.min(1, (fogEnd - firstWall.distance) / (fogEnd - fogStart)));
        const visibilityPercent = (fogFactor * 100).toFixed(1);

        console.log(`[WebGL] First wall: (${firstWall.x1}, ${firstWall.z1}) to (${firstWall.x2}, ${firstWall.z2}), distance=${firstWall.distance.toFixed(2)}, side=${firstWall.side}`);
        console.log(`[WebGL] Fog factor: ${fogFactor.toFixed(3)} (${visibilityPercent}% visible, ${(100 - parseFloat(visibilityPercent)).toFixed(1)}% fog)`);
      }
    }

    // Render all visible walls
    for (const wall of walls) {
      this.renderWall(level, wall, dungeonState);
    }

    // Render floor and ceiling for all visible tiles
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
   * Selects the appropriate texture for a wall segment based on wall type
   * @param level - Level data containing tile types
   * @param wall - Wall segment to render
   * @returns Texture atlas coordinates [x, y, width, height] in pixels
   */
  private selectWallTexture(
    level: LevelData,
    wall: WallSegment,
    dungeonState?: DungeonState
  ): [number, number, number, number] {
    // Get tile at wall position using DungeonService
    const tile = DungeonService.getTile(level, wall.gridX, wall.gridY);

    // Priority order: stairs > doors > walls

    // Check for stairs walls (check the specific wall direction)
    // wall.side is already typed as 'north' | 'south' | 'east' | 'west'
    const wallType = tile.walls[wall.side];

    // Check if this wall is a stairs wall
    if (wallType === 'stairs_up') {
      const texture = this.getTextureById('stairs_up');
      if (!texture) {
        throw new Error('[WebGL] Texture "stairs_up" not found in atlas');
      }
      return [texture.x, texture.y, texture.width, texture.height];
    }

    if (wallType === 'stairs_down') {
      const texture = this.getTextureById('stairs_down');
      if (!texture) {
        throw new Error('[WebGL] Texture "stairs_down" not found in atlas');
      }
      return [texture.x, texture.y, texture.width, texture.height];
    }

    // Check for doors (check wall type, matching how stairs work)
    if (wallType === 'door' || wallType === 'locked_door') {
      // Determine if door is open by checking dungeonState
      const doorKey = `${dungeonState?.currentLevel}_${wall.gridY}_${wall.gridX}`;
      const isOpen = dungeonState?.openDoors?.has(doorKey) ?? false;

      console.log('[WebGL] Checking door:', {
        position: { x: wall.gridX, y: wall.gridY },
        doorKey,
        isOpen,
        openDoorsSize: dungeonState?.openDoors?.size,
        allOpenDoors: Array.from(dungeonState?.openDoors || [])
      });

      // Select texture based on door state
      const textureId = isOpen ? 'door_open' : 'door_closed';
      const texture = this.getTextureById(textureId);

      if (!texture) {
        throw new Error(`[WebGL] Door texture "${textureId}" not found in atlas`);
      }

      return [texture.x, texture.y, texture.width, texture.height];
    }

    // Regular walls: alternate between wall_1 and wall_2 using checkerboard pattern
    const useVariation2 = (wall.gridX + wall.gridY) % 2 === 1;
    const textureId = useVariation2 ? 'wall_2' : 'wall_1';
    const texture = this.getTextureById(textureId);

    if (!texture) {
      throw new Error(`[WebGL] Wall texture "${textureId}" not found in atlas`);
    }

    return [texture.x, texture.y, texture.width, texture.height];
  }

  /**
   * Renders a single wall segment as a textured quad
   * @param level - Level data containing tile types
   * @param wall - Wall segment from VisibilityService
   */
  private renderWall(level: LevelData, wall: WallSegment, dungeonState?: DungeonState): void {
    if (!this.gl) return;

    // Wall height (from floor y=0 to ceiling y=1)
    const y1 = 0;
    const y2 = 1;

    // Select appropriate texture based on tile type
    const [texX, texY, texW, texH] = this.selectWallTexture(level, wall, dungeonState);
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

    const floorTexture = this.getTextureById('floor_stone');
    if (!floorTexture) {
      if (this.debugMode) {
        console.warn('[WebGL] floor_stone texture not found in atlas');
      }
      return;
    }

    // Floor is a horizontal quad at y=0
    // World coordinates: grid (x, y) maps to world (x, 0, y)
    const worldX1 = gridX;
    const worldZ1 = gridY;
    const worldX2 = gridX + 1;
    const worldZ2 = gridY + 1;

    // Floor texture coordinates from atlas
    const [u1, v1, u2, v2] = this.calculateUVs(
      floorTexture.x,
      floorTexture.y,
      floorTexture.width,
      floorTexture.height
    );

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

    const ceilingTexture = this.getTextureById('ceiling_stone');
    if (!ceilingTexture) {
      if (this.debugMode) {
        console.warn('[WebGL] ceiling_stone texture not found in atlas');
      }
      return;
    }

    // Ceiling is a horizontal quad at y=1
    const worldX1 = gridX;
    const worldZ1 = gridY;
    const worldX2 = gridX + 1;
    const worldZ2 = gridY + 1;

    // Ceiling texture coordinates from atlas
    const [u1, v1, u2, v2] = this.calculateUVs(
      ceilingTexture.x,
      ceilingTexture.y,
      ceilingTexture.width,
      ceilingTexture.height
    );

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

    // Check for WebGL errors
    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      console.error(`[WebGL] Error after drawArrays: ${error}`);
    }

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
