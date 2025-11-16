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
