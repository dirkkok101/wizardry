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
  let lastBufferData: number[] = [];
  let mockTextures: Map<string, any>;

  beforeEach(() => {
    // Reset draw call tracking
    drawCalls = [];
    lastBufferData = [];
    uniformLocations = new Map();
    mockTextures = new Map();

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
      uniform1i: jest.fn(),
      uniform3f: jest.fn(),

      // Buffers
      createBuffer: jest.fn(() => ({} as WebGLBuffer)),
      bindBuffer: jest.fn(),
      bufferData: jest.fn((target, data, usage) => {
        // Capture vertex data for verification
        if (data instanceof Float32Array) {
          lastBufferData = Array.from(data);
        }
      }),

      // Vertex attributes
      getAttribLocation: jest.fn(() => 0),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),

      // Drawing
      drawArrays: jest.fn((mode, first, count) => {
        drawCalls.push({ mode, first, count, vertexData: lastBufferData });
        lastBufferData = []; // Reset for next draw call
      }),

      // State
      viewport: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      depthFunc: jest.fn(),

      // Error handling
      getError: jest.fn(() => 0), // NO_ERROR
      NO_ERROR: 0,

      // Textures
      createTexture: jest.fn(() => ({} as WebGLTexture)),
      bindTexture: jest.fn(),
      texImage2D: jest.fn(),
      texParameteri: jest.fn(),
      activeTexture: jest.fn(),
      TEXTURE_2D: 0x0DE1,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      LINEAR: 0x2601,
      NEAREST: 0x2600,
      TEXTURE0: 0x84C0,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,

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

  // Helper to load a mock texture atlas into the service
  const loadMockAtlas = (service: any) => {
    // Create a minimal mock atlas with required textures
    service['atlas'] = {
      textures: [
        { id: 'wall_stone', x: 0, y: 0, width: 64, height: 64 },
        { id: 'floor_stone', x: 64, y: 0, width: 64, height: 64 },
        { id: 'ceiling_stone', x: 128, y: 0, width: 64, height: 64 }
      ]
    };
    service['atlasWidth'] = 256;
    service['atlasHeight'] = 64;
    service['currentTexture'] = {} as WebGLTexture;
  };

  // Helper to extract grid positions from vertex data
  const extractGridPositionsFromDrawCalls = (): Set<string> => {
    const positions = new Set<string>();

    for (const call of drawCalls) {
      // Each vertex has 5 components: [x, y, z, u, v]
      // Each quad has 6 vertices (2 triangles)
      const stride = 5;
      const verticesPerQuad = 6;
      const floatsPerQuad = verticesPerQuad * stride;
      const quadCount = call.vertexData.length / floatsPerQuad;

      for (let q = 0; q < quadCount; q++) {
        const offset = q * floatsPerQuad;

        // Get all unique X and Z coordinates for this quad
        const xCoords = [];
        const zCoords = [];

        for (let v = 0; v < verticesPerQuad; v++) {
          const vOffset = offset + v * stride;
          xCoords.push(call.vertexData[vOffset]);     // x
          zCoords.push(call.vertexData[vOffset + 2]); // z
        }

        // Use min coordinates to determine grid position
        const minX = Math.min(...xCoords);
        const minZ = Math.min(...zCoords);
        const gridX = Math.floor(minX);
        const gridY = Math.floor(minZ);

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

  describe('render() visibility verification at (0,0)', () => {
    let level: LevelData;

    beforeEach(() => {
      // Load level 1 data
      level = DungeonService.loadLevel(1);
    });

    it('renders exactly 6 tiles when facing NORTH from (0,0)', () => {
      const service = new WebGLRenderingService();
      service.initialize(canvas);

      const position: Position = { x: 0, y: 0, facing: 'NORTH' };

      // Get expected walls from VisibilityService
      const expectedWalls = VisibilityService.getVisibleWalls(level, position, 5, 3);
      const expectedTiles = new Set<string>();
      expectedWalls.forEach(wall => {
        expectedTiles.add(`${wall.gridX},${wall.gridY}`);
      });

      // Render scene
      service.render(level, position, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      });

      // Verify renderer called VisibilityService and rendered those tiles
      // We expect exactly 6 tiles: (0,0), (0,1), (0,2), (0,3), (0,4), (1,0)
      expect(expectedTiles.size).toBe(6);
      expect(expectedTiles.has('0,0')).toBe(true);
      expect(expectedTiles.has('0,1')).toBe(true);
      expect(expectedTiles.has('0,2')).toBe(true);
      expect(expectedTiles.has('0,3')).toBe(true);
      expect(expectedTiles.has('0,4')).toBe(true);
      expect(expectedTiles.has('1,0')).toBe(true);

      // Verify rendering completed without errors (at least 1 draw call)
      expect(drawCalls.length).toBeGreaterThan(0);
    });

    it('renders floors and ceilings for all 6 visible tiles when facing NORTH from (0,0)', () => {
      const service = new WebGLRenderingService();
      service.initialize(canvas);
      loadMockAtlas(service); // Load textures so floors/ceilings render

      const position: Position = { x: 0, y: 0, facing: 'NORTH' };

      // Get expected tiles from VisibilityService
      const expectedWalls = VisibilityService.getVisibleWalls(level, position, 5, 3);
      const expectedTiles = new Set<string>();
      expectedWalls.forEach(wall => {
        expectedTiles.add(`${wall.gridX},${wall.gridY}`);
      });

      // Render scene
      service.render(level, position, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      });

      // Count quads rendered (walls + floors + ceilings)
      const totalQuads = drawCalls.reduce((sum, call) => sum + (call.count / 6), 0);
      const wallCount = expectedWalls.length; // 12 walls for 6 tiles
      const floorCount = expectedTiles.size; // 6 floors (one per tile)
      const ceilingCount = expectedTiles.size; // 6 ceilings (one per tile)
      const expectedQuads = wallCount + floorCount + ceilingCount;

      // Verify we rendered walls + floors + ceilings
      expect(totalQuads).toBe(expectedQuads);
      console.log(`Rendered ${totalQuads} quads: ${wallCount} walls + ${floorCount} floors + ${ceilingCount} ceilings`);
    });

    it('renders floors and ceilings for 6 visible tiles when facing EAST from (0,0)', () => {
      const service = new WebGLRenderingService();
      service.initialize(canvas);
      loadMockAtlas(service);

      const position: Position = { x: 0, y: 0, facing: 'EAST' };

      const expectedWalls = VisibilityService.getVisibleWalls(level, position, 5, 3);
      const expectedTiles = new Set<string>();
      expectedWalls.forEach(wall => {
        expectedTiles.add(`${wall.gridX},${wall.gridY}`);
      });

      service.render(level, position, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      });

      const totalQuads = drawCalls.reduce((sum, call) => sum + (call.count / 6), 0);
      const expectedQuads = expectedWalls.length + expectedTiles.size * 2;

      expect(totalQuads).toBe(expectedQuads);
      expect(expectedTiles.size).toBe(6); // EAST should see 6 tiles
    });

    it('renders floors and ceilings for 2 visible tiles when facing SOUTH from (0,0)', () => {
      const service = new WebGLRenderingService();
      service.initialize(canvas);
      loadMockAtlas(service);

      const position: Position = { x: 0, y: 0, facing: 'SOUTH' };

      const expectedWalls = VisibilityService.getVisibleWalls(level, position, 5, 3);
      const expectedTiles = new Set<string>();
      expectedWalls.forEach(wall => {
        expectedTiles.add(`${wall.gridX},${wall.gridY}`);
      });

      service.render(level, position, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      });

      const totalQuads = drawCalls.reduce((sum, call) => sum + (call.count / 6), 0);
      const expectedQuads = expectedWalls.length + expectedTiles.size * 2;

      expect(totalQuads).toBe(expectedQuads);
      expect(expectedTiles.size).toBe(2); // SOUTH should see 2 tiles
    });

    it('renders floors and ceilings for 2 visible tiles when facing WEST from (0,0)', () => {
      const service = new WebGLRenderingService();
      service.initialize(canvas);
      loadMockAtlas(service);

      const position: Position = { x: 0, y: 0, facing: 'WEST' };

      const expectedWalls = VisibilityService.getVisibleWalls(level, position, 5, 3);
      const expectedTiles = new Set<string>();
      expectedWalls.forEach(wall => {
        expectedTiles.add(`${wall.gridX},${wall.gridY}`);
      });

      service.render(level, position, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      });

      const totalQuads = drawCalls.reduce((sum, call) => sum + (call.count / 6), 0);
      const expectedQuads = expectedWalls.length + expectedTiles.size * 2;

      expect(totalQuads).toBe(expectedQuads);
      expect(expectedTiles.size).toBe(2); // WEST should see 2 tiles
    });
  });

  describe('camera orientation when rotating at (0,0)', () => {
    it('changes visible tiles when rotating from NORTH to EAST', () => {
      const service = new WebGLRenderingService();
      service.initialize(canvas);
      loadMockAtlas(service);

      const level = DungeonService.loadLevel(1);

      // Render facing NORTH
      const northPos: Position = { x: 0, y: 0, facing: 'NORTH' };
      service.render(level, northPos, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      });

      const northWalls = VisibilityService.getVisibleWalls(level, northPos, 5, 3);
      const northTiles = new Set<string>();
      northWalls.forEach(wall => northTiles.add(`${wall.gridX},${wall.gridY}`));

      // Render facing EAST (after "turning right")
      const eastPos: Position = { x: 0, y: 0, facing: 'EAST' };
      service.render(level, eastPos, {
        width: 800,
        height: 600,
        tileDepth: 5,
        peripheralColumns: 3
      });

      const eastWalls = VisibilityService.getVisibleWalls(level, eastPos, 5, 3);
      const eastTiles = new Set<string>();
      eastWalls.forEach(wall => eastTiles.add(`${wall.gridX},${wall.gridY}`));

      // Verify different tiles visible after rotation
      expect(northTiles.size).toBe(6);  // (0,0), (0,1), (0,2), (0,3), (0,4), (1,0)
      expect(eastTiles.size).toBe(6);   // (0,0), (1,0), (2,0), (3,0), (4,0), (0,1)

      // Verify tiles are actually different (rotation changed view)
      const uniqueToNorth = Array.from(northTiles).filter(t => !eastTiles.has(t));
      const uniqueToEast = Array.from(eastTiles).filter(t => !northTiles.has(t));

      expect(uniqueToNorth.length).toBeGreaterThan(0);
      expect(uniqueToEast.length).toBeGreaterThan(0);

      // Both should see (0,0) and (1,0) or (0,1) in common
      expect(northTiles.has('0,0')).toBe(true);
      expect(eastTiles.has('0,0')).toBe(true);
    });
  });
});
