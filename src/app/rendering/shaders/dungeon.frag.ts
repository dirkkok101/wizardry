export const FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D uTexture;
  uniform float uFogStart;
  uniform float uFogEnd;
  uniform vec3 uFogColor;

  varying vec2 vTexCoord;
  varying float vDistance;

  void main() {
    // Sample texture
    vec4 texColor = texture2D(uTexture, vTexCoord);

    // Calculate fog factor (linear fog)
    float fogFactor = clamp((uFogEnd - vDistance) / (uFogEnd - uFogStart), 0.0, 1.0);

    // Mix texture color with fog color
    vec3 finalColor = mix(uFogColor, texColor.rgb, fogFactor);

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;
