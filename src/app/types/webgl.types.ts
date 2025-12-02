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
  uAmbientLight: WebGLUniformLocation | null;
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
