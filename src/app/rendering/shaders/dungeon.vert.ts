export const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  attribute float aDarknessFactor;

  uniform mat4 uProjectionMatrix;
  uniform mat4 uViewMatrix;

  varying vec2 vTexCoord;
  varying float vDistance;
  varying float vDarknessFactor;

  void main() {
    // Transform position to view space
    vec4 viewPos = uViewMatrix * vec4(aPosition, 1.0);

    // Apply projection
    gl_Position = uProjectionMatrix * viewPos;

    // Pass texture coordinates to fragment shader
    vTexCoord = aTexCoord;

    // Pass distance for fog calculation
    vDistance = length(viewPos.xyz);

    // Pass per-tile darkness factor to fragment shader
    vDarknessFactor = aDarknessFactor;
  }
`;
