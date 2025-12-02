export const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform float uFogStart;
  uniform float uFogEnd;
  uniform vec3 uFogColor;
  uniform float uAmbientLight;  // 0.0 = full darkness, 0.3 = dim, 1.0 = fully lit

  varying vec2 vTexCoord;
  varying float vDistance;
  varying float vDarknessFactor;  // Per-tile darkness: 1.0 = normal, 0.3 = first darkness tile, 0.1 = second

  void main() {
    // Sample texture
    vec4 texColor = texture2D(uTexture, vTexCoord);

    // Calculate effective light: global ambient * per-tile darkness
    // uAmbientLight: global state (player in darkness zone)
    // vDarknessFactor: per-tile (looking at darkness tiles from outside)
    float effectiveLight = uAmbientLight * vDarknessFactor;

    // Apply effective light to texture color
    vec3 litColor = texColor.rgb * effectiveLight;

    // Calculate fog factor (linear fog)
    float fogFactor = clamp((uFogEnd - vDistance) / (uFogEnd - uFogStart), 0.0, 1.0);

    // Mix lit color with fog color
    vec3 finalColor = mix(uFogColor, litColor, fogFactor);

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;
