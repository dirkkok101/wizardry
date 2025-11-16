import * as TextureAtlasService from '../TextureAtlasService';
import {
  TextureAtlas,
  TextureMetadata,
  Texture,
  TextureSet,
  DEFAULT_TEXTURE_CONFIG
} from '../../types/texture.types';

describe('TextureAtlasService', () => {
  // ============================================================================
  // TEST HELPERS
  // ============================================================================

  /**
   * Create a test sprite sheet image with known pixel patterns.
   */
  function createTestSpriteSheet(width: number, height: number): HTMLImageElement {
    // Create canvas to generate test image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;

    // Fill with gradient pattern for testing
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#ff0000'); // Red
    gradient.addColorStop(0.5, '#00ff00'); // Green
    gradient.addColorStop(1, '#0000ff'); // Blue

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Create image from canvas
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  /**
   * Create a sample texture metadata.
   */
  function createTestTextureMetadata(id: string, x: number, y: number): TextureMetadata {
    return {
      id,
      x,
      y,
      width: 64,
      height: 64,
      tags: ['wall', 'ns', 'stone']
    };
  }

  /**
   * Create a sample texture atlas.
   */
  function createTestAtlas(): TextureAtlas {
    return {
      id: 'test_atlas',
      imagePath: '/test/texture.png',
      width: 256,
      height: 256,
      textures: [
        createTestTextureMetadata('wall_01', 0, 0),
        createTestTextureMetadata('wall_02', 64, 0),
        createTestTextureMetadata('wall_03', 128, 0),
        createTestTextureMetadata('wall_04', 0, 64)
      ]
    };
  }

  /**
   * Create a test texture with known pixel data.
   */
  function createTestTexture(id: string, width: number = 64, height: number = 64): Texture {
    // Create simple red pixel pattern
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i + 0] = 255; // R
      pixels[i + 1] = 0;   // G
      pixels[i + 2] = 0;   // B
      pixels[i + 3] = 255; // A
    }

    const imageData = new ImageData(pixels, width, height);

    return {
      id,
      width,
      height,
      imageData,
      tags: ['wall', 'ns']
    };
  }

  // ============================================================================
  // TEXTURE EXTRACTION TESTS
  // ============================================================================

  describe('extractTexture', () => {
    it('extracts texture from sprite sheet at correct position', () => {
      const spriteSheet = createTestSpriteSheet(256, 256);
      const metadata: TextureMetadata = {
        id: 'test_texture',
        x: 64,
        y: 64,
        width: 64,
        height: 64,
        tags: ['wall']
      };

      const texture = TextureAtlasService.extractTexture(spriteSheet, metadata);

      expect(texture.id).toBe('test_texture');
      expect(texture.width).toBe(64);
      expect(texture.height).toBe(64);
      expect(texture.imageData).toBeDefined();
      expect(texture.canvas).toBeDefined();
      expect(texture.tags).toEqual(['wall']);
    });

    it('extracts texture with correct dimensions', () => {
      const spriteSheet = createTestSpriteSheet(512, 512);
      const metadata: TextureMetadata = {
        id: 'large_texture',
        x: 0,
        y: 0,
        width: 128,
        height: 128
      };

      const texture = TextureAtlasService.extractTexture(spriteSheet, metadata);

      expect(texture.width).toBe(128);
      expect(texture.height).toBe(128);
      expect(texture.imageData.width).toBe(128);
      expect(texture.imageData.height).toBe(128);
    });
  });

  describe('extractAllTextures', () => {
    it('extracts all textures from atlas', () => {
      const spriteSheet = createTestSpriteSheet(256, 256);
      const atlas = createTestAtlas();

      const textures = TextureAtlasService.extractAllTextures(spriteSheet, atlas);

      expect(textures).toHaveLength(4);
      expect(textures[0].id).toBe('wall_01');
      expect(textures[1].id).toBe('wall_02');
      expect(textures[2].id).toBe('wall_03');
      expect(textures[3].id).toBe('wall_04');
    });

    it('extracts textures with correct properties', () => {
      const spriteSheet = createTestSpriteSheet(256, 256);
      const atlas = createTestAtlas();

      const textures = TextureAtlasService.extractAllTextures(spriteSheet, atlas);

      textures.forEach(texture => {
        expect(texture.width).toBe(64);
        expect(texture.height).toBe(64);
        expect(texture.imageData).toBeDefined();
        expect(texture.canvas).toBeDefined();
      });
    });
  });

  // ============================================================================
  // TEXTURE SLICE EXTRACTION TESTS
  // ============================================================================

  describe('extractTextureSlice', () => {
    it('extracts vertical slice from texture', () => {
      const texture = createTestTexture('test', 64, 64);

      const slice = TextureAtlasService.extractTextureSlice(texture, 0.5, 100);

      expect(slice.textureX).toBeCloseTo(0.5);
      expect(slice.height).toBe(100);
      expect(slice.pixels.length).toBe(100 * 4); // RGBA
      expect(slice.textureId).toBe('test');
    });

    it('clamps textureX to valid range', () => {
      const texture = createTestTexture('test', 64, 64);

      const slice1 = TextureAtlasService.extractTextureSlice(texture, -0.5, 100);
      expect(slice1.textureX).toBeGreaterThanOrEqual(0);

      const slice2 = TextureAtlasService.extractTextureSlice(texture, 1.5, 100);
      expect(slice2.textureX).toBeLessThan(1.0);
    });

    it('scales slice to target height', () => {
      const texture = createTestTexture('test', 64, 64);

      const slice1 = TextureAtlasService.extractTextureSlice(texture, 0.5, 32);
      expect(slice1.height).toBe(32);
      expect(slice1.pixels.length).toBe(32 * 4);

      const slice2 = TextureAtlasService.extractTextureSlice(texture, 0.5, 128);
      expect(slice2.height).toBe(128);
      expect(slice2.pixels.length).toBe(128 * 4);
    });

    it('extracts correct pixel column', () => {
      const texture = createTestTexture('test', 64, 64);

      // Extract slice at x=0 (leftmost column)
      const sliceLeft = TextureAtlasService.extractTextureSlice(texture, 0.0, 64);

      // Extract slice at x=0.5 (middle column)
      const sliceMid = TextureAtlasService.extractTextureSlice(texture, 0.5, 64);

      // Both should be red since we created a red texture
      expect(sliceLeft.pixels[0]).toBe(255); // R
      expect(sliceMid.pixels[0]).toBe(255); // R
    });
  });

  describe('extractTextureSliceCached', () => {
    it('returns cached slice on second call', () => {
      const texture = createTestTexture('test', 64, 64);
      const cache = TextureAtlasService.createSliceCache();

      const slice1 = TextureAtlasService.extractTextureSliceCached(
        texture, 0.5, 100, cache
      );

      const slice2 = TextureAtlasService.extractTextureSliceCached(
        texture, 0.5, 100, cache
      );

      // Should be same object from cache
      expect(slice2).toBe(slice1);
      expect(cache.size).toBe(1);
    });

    it('caches different slices separately', () => {
      const texture = createTestTexture('test', 64, 64);
      const cache = TextureAtlasService.createSliceCache();

      TextureAtlasService.extractTextureSliceCached(texture, 0.25, 100, cache);
      TextureAtlasService.extractTextureSliceCached(texture, 0.5, 100, cache);
      TextureAtlasService.extractTextureSliceCached(texture, 0.75, 100, cache);

      expect(cache.size).toBe(3);
    });

    it('respects cache size limit', () => {
      const texture = createTestTexture('test', 64, 64);
      const cache = TextureAtlasService.createSliceCache();
      const config = { ...DEFAULT_TEXTURE_CONFIG, maxCacheSize: 5 };

      // Add 10 slices (should only cache first 5)
      for (let i = 0; i < 10; i++) {
        TextureAtlasService.extractTextureSliceCached(
          texture, i / 10, 100, cache, config
        );
      }

      expect(cache.size).toBeLessThanOrEqual(5);
    });

    it('skips caching when disabled', () => {
      const texture = createTestTexture('test', 64, 64);
      const cache = TextureAtlasService.createSliceCache();
      const config = { ...DEFAULT_TEXTURE_CONFIG, caching: false };

      TextureAtlasService.extractTextureSliceCached(texture, 0.5, 100, cache, config);
      TextureAtlasService.extractTextureSliceCached(texture, 0.5, 100, cache, config);

      expect(cache.size).toBe(0);
    });
  });

  describe('generateSliceCacheKey', () => {
    it('generates consistent cache keys', () => {
      const key1 = TextureAtlasService.generateSliceCacheKey('wall_01', 0.5, 100);
      const key2 = TextureAtlasService.generateSliceCacheKey('wall_01', 0.5, 100);

      expect(key1).toBe(key2);
    });

    it('generates different keys for different parameters', () => {
      const key1 = TextureAtlasService.generateSliceCacheKey('wall_01', 0.5, 100);
      const key2 = TextureAtlasService.generateSliceCacheKey('wall_02', 0.5, 100);
      const key3 = TextureAtlasService.generateSliceCacheKey('wall_01', 0.6, 100);
      const key4 = TextureAtlasService.generateSliceCacheKey('wall_01', 0.5, 200);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).not.toBe(key4);
    });

    it('rounds textureX to reduce key variations', () => {
      const key1 = TextureAtlasService.generateSliceCacheKey('wall_01', 0.5001, 100);
      const key2 = TextureAtlasService.generateSliceCacheKey('wall_01', 0.5009, 100);

      // Should be same after rounding to 0.001 precision
      expect(key1).toBe(key2);
    });
  });

  // ============================================================================
  // BRIGHTNESS AND FOG TESTS
  // ============================================================================

  describe('applyBrightnessToSlice', () => {
    it('reduces pixel brightness', () => {
      const texture = createTestTexture('test', 64, 64);
      const slice = TextureAtlasService.extractTextureSlice(texture, 0.5, 10);

      const brightSlice = TextureAtlasService.applyBrightnessToSlice(slice, 0.5);

      // Original red pixels (255) should be halved
      expect(brightSlice.pixels[0]).toBe(127); // 255 * 0.5 = 127.5 -> 127
      expect(brightSlice.pixels[1]).toBe(0);   // Green unchanged (was 0)
      expect(brightSlice.pixels[2]).toBe(0);   // Blue unchanged (was 0)
      expect(brightSlice.pixels[3]).toBe(255); // Alpha unchanged
    });

    it('does not modify original slice', () => {
      const texture = createTestTexture('test', 64, 64);
      const slice = TextureAtlasService.extractTextureSlice(texture, 0.5, 10);
      const originalR = slice.pixels[0];

      TextureAtlasService.applyBrightnessToSlice(slice, 0.5);

      // Original slice should be unchanged
      expect(slice.pixels[0]).toBe(originalR);
    });

    it('handles brightness of 0 (fully dark)', () => {
      const texture = createTestTexture('test', 64, 64);
      const slice = TextureAtlasService.extractTextureSlice(texture, 0.5, 10);

      const darkSlice = TextureAtlasService.applyBrightnessToSlice(slice, 0.0);

      expect(darkSlice.pixels[0]).toBe(0); // All RGB should be 0
      expect(darkSlice.pixels[1]).toBe(0);
      expect(darkSlice.pixels[2]).toBe(0);
      expect(darkSlice.pixels[3]).toBe(255); // Alpha preserved
    });

    it('handles brightness of 1 (no change)', () => {
      const texture = createTestTexture('test', 64, 64);
      const slice = TextureAtlasService.extractTextureSlice(texture, 0.5, 10);

      const brightSlice = TextureAtlasService.applyBrightnessToSlice(slice, 1.0);

      expect(brightSlice.pixels[0]).toBe(255);
      expect(brightSlice.pixels[1]).toBe(0);
      expect(brightSlice.pixels[2]).toBe(0);
      expect(brightSlice.pixels[3]).toBe(255);
    });
  });

  describe('calculateFogBrightness', () => {
    it('returns max brightness for close distances', () => {
      const brightness = TextureAtlasService.calculateFogBrightness(0.5, 10);
      expect(brightness).toBe(1.0);
    });

    it('returns min brightness for far distances', () => {
      const brightness = TextureAtlasService.calculateFogBrightness(15, 10);
      expect(brightness).toBe(0.2);
    });

    it('interpolates brightness for mid distances', () => {
      const brightness = TextureAtlasService.calculateFogBrightness(5.5, 10);
      expect(brightness).toBeGreaterThan(0.2);
      expect(brightness).toBeLessThan(1.0);
    });

    it('matches raycasting renderer fog formula', () => {
      // Should match RaycastingRenderingService.calculateBrightness
      const distance = 3.0;
      const maxDistance = 10.0;
      const brightness = TextureAtlasService.calculateFogBrightness(distance, maxDistance);

      // Expected: 1.0 - ((3.0 - 1.0) / (10.0 - 1.0)) * (1.0 - 0.2)
      //         = 1.0 - (2.0 / 9.0) * 0.8
      //         = 1.0 - 0.1778
      //         ≈ 0.822
      expect(brightness).toBeCloseTo(0.822, 2);
    });
  });

  // ============================================================================
  // TEXTURE SET MANAGEMENT TESTS
  // ============================================================================

  describe('selectWallTexture', () => {
    let textureSet: TextureSet;

    beforeEach(() => {
      textureSet = {
        id: 'test_set',
        name: 'Test Set',
        wallsNS: [
          createTestTexture('wall_ns_01'),
          createTestTexture('wall_ns_02')
        ],
        wallsEW: [
          createTestTexture('wall_ew_01'),
          createTestTexture('wall_ew_02')
        ],
        doors: [createTestTexture('door_01')],
        lockedDoors: [createTestTexture('locked_door_01')],
        secretDoors: [createTestTexture('secret_door_01')]
      };
    });

    it('selects NS wall texture', () => {
      const texture = TextureAtlasService.selectWallTexture(textureSet, 'wall', 'NS');
      expect(texture?.id).toBe('wall_ns_01');
    });

    it('selects EW wall texture', () => {
      const texture = TextureAtlasService.selectWallTexture(textureSet, 'wall', 'EW');
      expect(texture?.id).toBe('wall_ew_01');
    });

    it('selects door texture', () => {
      const texture = TextureAtlasService.selectWallTexture(textureSet, 'door', 'NS');
      expect(texture?.id).toBe('door_01');
    });

    it('selects locked door texture', () => {
      const texture = TextureAtlasService.selectWallTexture(textureSet, 'locked_door', 'NS');
      expect(texture?.id).toBe('locked_door_01');
    });

    it('selects secret door texture', () => {
      const texture = TextureAtlasService.selectWallTexture(textureSet, 'secret', 'NS');
      expect(texture?.id).toBe('secret_door_01');
    });

    it('uses index to select from multiple textures', () => {
      const texture = TextureAtlasService.selectWallTexture(textureSet, 'wall', 'NS', 1);
      expect(texture?.id).toBe('wall_ns_02');
    });

    it('wraps index if out of bounds', () => {
      const texture = TextureAtlasService.selectWallTexture(textureSet, 'wall', 'NS', 2);
      expect(texture?.id).toBe('wall_ns_01'); // Wraps back to first
    });

    it('returns null if texture type not found', () => {
      const emptySet: TextureSet = {
        id: 'empty',
        name: 'Empty',
        wallsNS: [],
        wallsEW: []
      };

      const texture = TextureAtlasService.selectWallTexture(emptySet, 'door', 'NS');
      expect(texture).toBeNull();
    });
  });

  describe('createTextureSet', () => {
    it('organizes textures by tags', () => {
      const textures = [
        { ...createTestTexture('wall_ns_01'), tags: ['wall', 'ns'] },
        { ...createTestTexture('wall_ew_01'), tags: ['wall', 'ew'] },
        { ...createTestTexture('door_01'), tags: ['door'] },
        { ...createTestTexture('floor_01'), tags: ['floor'] }
      ];

      const textureSet = TextureAtlasService.createTextureSet(
        'test_set',
        'Test Set',
        textures
      );

      expect(textureSet.id).toBe('test_set');
      expect(textureSet.name).toBe('Test Set');
      expect(textureSet.wallsNS).toHaveLength(1);
      expect(textureSet.wallsEW).toHaveLength(1);
      expect(textureSet.doors).toHaveLength(1);
      expect(textureSet.floors).toHaveLength(1);
    });

    it('handles empty texture arrays', () => {
      const textureSet = TextureAtlasService.createTextureSet('empty', 'Empty', []);

      expect(textureSet.wallsNS).toHaveLength(0);
      expect(textureSet.wallsEW).toHaveLength(0);
      expect(textureSet.doors).toBeUndefined();
    });

    it('organizes wall variation textures by variation tag', () => {
      const textures: Texture[] = [
        { ...createTestTexture('wall_01'), tags: ['wall', 'variation-1'] },
        { ...createTestTexture('wall_02'), tags: ['wall', 'variation-2'] }
      ];

      const textureSet = TextureAtlasService.createTextureSet('test', 'Test Set', textures);

      expect(textureSet.walls).toHaveLength(2);
      expect(textureSet.walls![0].id).toBe('wall_01');
      expect(textureSet.walls![1].id).toBe('wall_02');
    });

    it('organizes stairs textures by direction tag', () => {
      const textures: Texture[] = [
        { ...createTestTexture('stairs_up'), tags: ['stairs', 'up'] },
        { ...createTestTexture('stairs_down'), tags: ['stairs', 'down'] }
      ];

      const textureSet = TextureAtlasService.createTextureSet('test', 'Test Set', textures);

      expect(textureSet.stairsUp).toHaveLength(1);
      expect(textureSet.stairsUp![0].id).toBe('stairs_up');
      expect(textureSet.stairsDown).toHaveLength(1);
      expect(textureSet.stairsDown![0].id).toBe('stairs_down');
    });

    it('organizes door textures by state tag', () => {
      const textures: Texture[] = [
        { ...createTestTexture('door_open'), tags: ['door', 'open'] },
        { ...createTestTexture('door_closed'), tags: ['door', 'closed'] }
      ];

      const textureSet = TextureAtlasService.createTextureSet('test', 'Test Set', textures);

      expect(textureSet.doorsOpen).toHaveLength(1);
      expect(textureSet.doorsOpen![0].id).toBe('door_open');
      expect(textureSet.doorsClosed).toHaveLength(1);
      expect(textureSet.doorsClosed![0].id).toBe('door_closed');
    });

    it('maintains backward compatibility with ns/ew wall tags', () => {
      const textures: Texture[] = [
        { ...createTestTexture('wall_ns'), tags: ['wall', 'ns'] },
        { ...createTestTexture('wall_ew'), tags: ['wall', 'ew'] }
      ];

      const textureSet = TextureAtlasService.createTextureSet('test', 'Test Set', textures);

      expect(textureSet.wallsNS).toHaveLength(1);
      expect(textureSet.wallsEW).toHaveLength(1);
    });
  });

  // ============================================================================
  // CACHE MANAGEMENT TESTS
  // ============================================================================

  describe('cache management', () => {
    it('creates empty cache', () => {
      const cache = TextureAtlasService.createSliceCache();
      expect(cache.size).toBe(0);
    });

    it('clears cache', () => {
      const cache = TextureAtlasService.createSliceCache();
      const texture = createTestTexture('test', 64, 64);

      TextureAtlasService.extractTextureSliceCached(texture, 0.5, 100, cache);
      expect(cache.size).toBe(1);

      TextureAtlasService.clearSliceCache(cache);
      expect(cache.size).toBe(0);
    });

    it('calculates cache statistics', () => {
      const cache = TextureAtlasService.createSliceCache();
      const texture = createTestTexture('test', 64, 64);

      // Add a few slices
      TextureAtlasService.extractTextureSliceCached(texture, 0.25, 100, cache);
      TextureAtlasService.extractTextureSliceCached(texture, 0.5, 100, cache);
      TextureAtlasService.extractTextureSliceCached(texture, 0.75, 100, cache);

      const stats = TextureAtlasService.getCacheStats(cache);

      expect(stats.size).toBe(3);
      expect(stats.memoryUsageMB).toBeGreaterThan(0);

      // Each slice is 100 pixels * 4 bytes = 400 bytes
      // 3 slices = 1200 bytes ≈ 0.00114 MB
      expect(stats.memoryUsageMB).toBeCloseTo(0.00114, 4);
    });
  });

  // ============================================================================
  // NEW TEXTURE SELECTION FUNCTIONS (Task 2)
  // ============================================================================

  describe('selectWallTextureVariation', () => {
    let textureSet: TextureSet;

    beforeEach(() => {
      textureSet = {
        id: 'test',
        name: 'Test Set',
        wallsNS: [],
        wallsEW: [],
        walls: [
          createTestTexture('wall_01'),
          createTestTexture('wall_02')
        ]
      };
    });

    it('alternates between two wall textures based on tile position', () => {
      // Even coordinates should use wall_01
      expect(TextureAtlasService.selectWallTextureVariation(textureSet, 0, 0)?.id).toBe('wall_01');
      expect(TextureAtlasService.selectWallTextureVariation(textureSet, 2, 2)?.id).toBe('wall_01');

      // Odd coordinates should use wall_02
      expect(TextureAtlasService.selectWallTextureVariation(textureSet, 0, 1)?.id).toBe('wall_02');
      expect(TextureAtlasService.selectWallTextureVariation(textureSet, 1, 0)?.id).toBe('wall_02');
    });

    it('returns null if no wall textures available', () => {
      const emptySet: TextureSet = {
        id: 'test',
        name: 'Test Set',
        wallsNS: [],
        wallsEW: []
      };

      expect(TextureAtlasService.selectWallTextureVariation(emptySet, 0, 0)).toBeNull();
    });

    it('wraps index if more than 2 textures available', () => {
      const threeTextureSet: TextureSet = {
        id: 'test',
        name: 'Test Set',
        wallsNS: [],
        wallsEW: [],
        walls: [
          createTestTexture('wall_01'),
          createTestTexture('wall_02'),
          createTestTexture('wall_03')
        ]
      };

      // Should cycle through all 3 textures
      expect(TextureAtlasService.selectWallTextureVariation(threeTextureSet, 0, 0)?.id).toBe('wall_01');
      expect(TextureAtlasService.selectWallTextureVariation(threeTextureSet, 1, 0)?.id).toBe('wall_02');
      expect(TextureAtlasService.selectWallTextureVariation(threeTextureSet, 2, 0)?.id).toBe('wall_03');
      expect(TextureAtlasService.selectWallTextureVariation(threeTextureSet, 3, 0)?.id).toBe('wall_01');
    });
  });

  describe('selectStairsTexture', () => {
    let textureSet: TextureSet;

    beforeEach(() => {
      textureSet = {
        id: 'test',
        name: 'Test Set',
        wallsNS: [],
        wallsEW: [],
        stairsUp: [createTestTexture('stairs_up')],
        stairsDown: [createTestTexture('stairs_down')]
      };
    });

    it('returns stairs_up texture for stairs_up tile type', () => {
      const result = TextureAtlasService.selectStairsTexture(textureSet, 'stairs_up');
      expect(result?.id).toBe('stairs_up');
    });

    it('returns stairs_down texture for stairs_down tile type', () => {
      const result = TextureAtlasService.selectStairsTexture(textureSet, 'stairs_down');
      expect(result?.id).toBe('stairs_down');
    });

    it('returns null for non-stairs tile types', () => {
      expect(TextureAtlasService.selectStairsTexture(textureSet, 'teleporter')).toBeNull();
      expect(TextureAtlasService.selectStairsTexture(textureSet, 'pit')).toBeNull();
    });

    it('returns null if no stairs textures defined', () => {
      const emptySet: TextureSet = {
        id: 'test',
        name: 'Test Set',
        wallsNS: [],
        wallsEW: []
      };

      expect(TextureAtlasService.selectStairsTexture(emptySet, 'stairs_up')).toBeNull();
    });
  });

  describe('selectDoorTexture', () => {
    let textureSet: TextureSet;

    beforeEach(() => {
      textureSet = {
        id: 'test',
        name: 'Test Set',
        wallsNS: [],
        wallsEW: [],
        doorsOpen: [createTestTexture('door_open')],
        doorsClosed: [createTestTexture('door_closed')]
      };
    });

    it('returns open door texture when door is open', () => {
      const result = TextureAtlasService.selectDoorTexture(textureSet, true);
      expect(result?.id).toBe('door_open');
    });

    it('returns closed door texture when door is closed', () => {
      const result = TextureAtlasService.selectDoorTexture(textureSet, false);
      expect(result?.id).toBe('door_closed');
    });

    it('falls back to doors array if doorsOpen/doorsClosed not defined', () => {
      const fallbackSet: TextureSet = {
        id: 'test',
        name: 'Test Set',
        wallsNS: [],
        wallsEW: [],
        doors: [createTestTexture('door_generic')]
      };

      expect(TextureAtlasService.selectDoorTexture(fallbackSet, true)?.id).toBe('door_generic');
      expect(TextureAtlasService.selectDoorTexture(fallbackSet, false)?.id).toBe('door_generic');
    });

    it('returns null if no door textures available', () => {
      const emptySet: TextureSet = {
        id: 'test',
        name: 'Test Set',
        wallsNS: [],
        wallsEW: []
      };

      expect(TextureAtlasService.selectDoorTexture(emptySet, true)).toBeNull();
      expect(TextureAtlasService.selectDoorTexture(emptySet, false)).toBeNull();
    });
  });
});
