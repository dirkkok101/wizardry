import { LevelData, Position } from '../types/Dungeon';
import { ViewportConfig } from '../types/rendering.types';
import { UniformLocations, AttributeLocations, RenderableQuad } from '../types/webgl.types';
import { VERTEX_SHADER } from '../shaders/dungeon.vert';
import { FRAGMENT_SHADER } from '../shaders/dungeon.frag';
import { MatrixService } from './MatrixService';
import { PlayerStateService } from './PlayerStateService';

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
   */
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

    // Bind texture
    if (this.currentTexture && this.uniforms.uTexture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
      this.gl.uniform1i(this.uniforms.uTexture, 0);
    }

    console.log('[WebGL] Projection and view matrices configured');

    // TODO: Render quads
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
