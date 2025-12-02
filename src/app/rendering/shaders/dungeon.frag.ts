export const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform float uFogStart;
  uniform float uFogEnd;
  uniform vec3 uFogColor;
  uniform float uAmbientLight;  // 0.0 = full darkness, 0.3 = dim, 1.0 = fully lit

  varying vec2 vTexCoord;
  varying float vDistance;

  void main() {
    // Sample texture
    vec4 texColor = texture2D(uTexture, vTexCoord);

    // Apply ambient light to texture color
    vec3 litColor = texColor.rgb * uAmbientLight;

    // Calculate fog factor (linear fog)
    float fogFactor = clamp((uFogEnd - vDistance) / (uFogEnd - uFogStart), 0.0, 1.0);

    // Mix lit color with fog color
    vec3 finalColor = mix(uFogColor, litColor, fogFactor);

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;
