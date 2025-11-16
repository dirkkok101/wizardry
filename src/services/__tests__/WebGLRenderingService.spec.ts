import { WebGLRenderingService } from '../WebGLRenderingService';
import { DungeonService } from '../DungeonService';
import { VisibilityService } from '../VisibilityService';
import { LevelData, Position } from '../../types/Dungeon';

describe('WebGLRenderingService', () => {
  let canvas: HTMLCanvasElement;
  let mockGLContext: Partial<WebGLRenderingContext>;
  let uniformLocations: Map<string, WebGLUniformLocation>;
  let drawCalls: Array<{
    mode: number;
    first: number;
    count: number;
    vertexData: number[];
  }>;

  beforeEach(() => {
    // Reset draw call tracking
    drawCalls = [];
    uniformLocations = new Map();

    // Create mock WebGL context
    mockGLContext = {
      canvas: { width: 800, height: 600 } as HTMLCanvasElement,

      // Shader compilation
      createShader: jest.fn(() => ({} as WebGLShader)),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      getShaderParameter: jest.fn(() => true),
      getShaderInfoLog: jest.fn(() => ''),
      createProgram: jest.fn(() => ({} as WebGLProgram)),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      getProgramParameter: jest.fn(() => true),
      getProgramInfoLog: jest.fn(() => ''),
      useProgram: jest.fn(),

      // Uniforms
      getUniformLocation: jest.fn((program, name) => {
        const location = { name } as WebGLUniformLocation;
        uniformLocations.set(name, location);
        return location;
      }),
      uniformMatrix4fv: jest.fn(),
      uniform1f: jest.fn(),
      uniform3f: jest.fn(),

      // Buffers
      createBuffer: jest.fn(() => ({} as WebGLBuffer)),
      bindBuffer: jest.fn(),
      bufferData: jest.fn((target, data, usage) => {
        // Capture vertex data for verification
        if (data instanceof Float32Array) {
          const vertexData = Array.from(data);
          if (drawCalls.length > 0 && drawCalls[drawCalls.length - 1].vertexData.length === 0) {
            drawCalls[drawCalls.length - 1].vertexData = vertexData;
          }
        }
      }),

      // Vertex attributes
      getAttribLocation: jest.fn(() => 0),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),

      // Drawing
      drawArrays: jest.fn((mode, first, count) => {
        drawCalls.push({ mode, first, count, vertexData: [] });
      }),

      // State
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      depthFunc: jest.fn(),

      // Constants
      VERTEX_SHADER: 0x8B31,
      FRAGMENT_SHADER: 0x8B30,
      ARRAY_BUFFER: 0x8892,
      STATIC_DRAW: 0x88E4,
      TRIANGLES: 0x0004,
      DEPTH_TEST: 0x0B71,
      LEQUAL: 0x0203,
      COLOR_BUFFER_BIT: 0x00004000,
      DEPTH_BUFFER_BIT: 0x00000100,
    };

    // Create canvas and mock getContext
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    jest.spyOn(canvas, 'getContext').mockReturnValue(mockGLContext as WebGLRenderingContext);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to extract grid positions from vertex data
  const extractGridPositionsFromDrawCalls = (): Set<string> => {
    const positions = new Set<string>();

    for (const call of drawCalls) {
      // Each vertex has 5 components: [x, y, z, u, v]
      // Each wall quad has 6 vertices (2 triangles)
      const stride = 5;
      const vertexCount = call.vertexData.length / stride;

      for (let i = 0; i < vertexCount; i += 6) {
        // Get first vertex of quad to determine grid position
        const x = call.vertexData[i * stride];
        const z = call.vertexData[i * stride + 2];

        // Convert world coordinates back to grid coordinates
        // World coords are tile-corner based: grid (0,0) = world (0,0) to (1,1)
        const gridX = Math.floor(x);
        const gridY = Math.floor(z);

        positions.add(`${gridX},${gridY}`);
      }
    }

    return positions;
  };

  it('should initialize WebGL context', () => {
    const service = new WebGLRenderingService();
    const result = service.initialize(canvas);

    expect(canvas.getContext).toHaveBeenCalledWith('webgl');
    expect(result).toBe(true);
  });
});
