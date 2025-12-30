# TextureAtlasService

**Pure function service for texture atlas operations, sprite sheet loading, and texture slice extraction for raycasting.**

## Overview

TextureAtlasService provides functionality for loading Eye of the Beholder-style dungeon textures from sprite sheet atlases, extracting individual textures, and generating vertical texture slices for raycasting column rendering.

**Key Features**:
- Sprite sheet loading with position metadata
- Texture extraction from atlases
- Vertical slice extraction for raycasting
- Texture slice caching for performance
- Distance fog and brightness effects
- Texture set organization (walls, doors, floors)

**Related Services**:
- `AssetLoadingService` - High-level asset loading orchestration
- `RaycastingRenderingService` - Consumes texture slices for rendering
- `DungeonService` - Provides wall type data for texture selection

## Architecture

### Pure Functions

All functions are **pure** (no side effects, deterministic output), except for:
- `loadSpriteSheet()` - Async I/O operation
- `loadTextureAtlas()` - Async I/O operation

### Texture Loading Pipeline

```
1. Load JSON metadata  →  TextureAtlas
2. Load PNG image      →  HTMLImageElement
3. Extract textures    →  Texture[]
4. Create texture set  →  TextureSet
5. Extract slices      →  TextureSlice (with caching)
6. Apply fog/brightness →  Adjusted TextureSlice
7. Render to canvas    →  putImageData command
```

### Memory Model

- **Sprite Sheet**: ~1-8MB (512x512 to 2048x2048 PNG)
- **Extracted Textures**: ~16KB each (64x64 RGBA ImageData)
- **Texture Slices**: ~256 bytes each (1px × 64px RGBA)
- **Cache Size**: ~250KB (1000 slices × 256 bytes)

## API Reference

### Sprite Sheet Loading

#### `loadSpriteSheet(imagePath: string): Promise<HTMLImageElement>`

Load a sprite sheet image from a URL.

**Parameters**:
- `imagePath` - Path to PNG sprite sheet

**Returns**: Promise resolving to loaded image

**Throws**: `TextureError` if loading fails

**Example**:
```typescript
const spriteSheet = await loadSpriteSheet('/assets/textures/eob-walls.png');
console.log(`Loaded ${spriteSheet.width}×${spriteSheet.height} sprite sheet`);
```

---

#### `loadTextureAtlas(atlas: TextureAtlas): Promise<HTMLImageElement>`

Load a texture atlas (metadata + sprite sheet image).

**Parameters**:
- `atlas` - Texture atlas metadata with `imagePath`

**Returns**: Promise resolving to loaded sprite sheet

**Example**:
```typescript
const atlas: TextureAtlas = {
  id: 'dungeon_01',
  imagePath: '/assets/textures/dungeon.png',
  width: 512,
  height: 512,
  textures: [...]
};

const spriteSheet = await loadTextureAtlas(atlas);
```

### Texture Extraction

#### `extractTexture(spriteSheet: HTMLImageElement, metadata: TextureMetadata): Texture`

Extract a single texture from a sprite sheet.

**Parameters**:
- `spriteSheet` - Loaded sprite sheet image
- `metadata` - Texture position and size

**Returns**: Extracted texture with `ImageData` and canvas

**Example**:
```typescript
const metadata: TextureMetadata = {
  id: 'stone_wall_01',
  x: 64,
  y: 0,
  width: 64,
  height: 64,
  tags: ['wall', 'ns', 'stone']
};

const texture = extractTexture(spriteSheet, metadata);
console.log(`Extracted ${texture.id}: ${texture.width}×${texture.height}`);
```

---

#### `extractAllTextures(spriteSheet: HTMLImageElement, atlas: TextureAtlas): Texture[]`

Extract all textures from a sprite sheet atlas.

**Parameters**:
- `spriteSheet` - Loaded sprite sheet image
- `atlas` - Atlas metadata with texture definitions

**Returns**: Array of extracted textures

**Example**:
```typescript
const textures = extractAllTextures(spriteSheet, atlas);
console.log(`Extracted ${textures.length} textures`);

textures.forEach(tex => {
  console.log(`- ${tex.id}: ${tex.tags?.join(', ')}`);
});
```

### Vertical Slice Extraction

#### `extractTextureSlice(texture: Texture, textureX: number, targetHeight: number): TextureSlice`

Extract a vertical 1px-wide slice from a texture for raycasting.

**Parameters**:
- `texture` - Source texture
- `textureX` - X position within texture (0-1 normalized)
- `targetHeight` - Desired height in pixels (for scaling)

**Returns**: Vertical texture slice with RGBA pixel data

**Technical Details**:
- Clamps `textureX` to [0, 0.9999] range
- Scales texture vertically to match target height
- Nearest-neighbor sampling (no interpolation)
- Returns 1px × targetHeight RGBA pixel array

**Example**:
```typescript
const texture = textures.find(t => t.id === 'stone_wall_01')!;

// Extract slice at 50% across the texture, scaled to 200px tall
const slice = extractTextureSlice(texture, 0.5, 200);

console.log(`Slice: ${slice.textureX}, height=${slice.height}`);
console.log(`Pixels: ${slice.pixels.length} bytes (${slice.pixels.length / 4} RGBA pixels)`);
```

---

#### `extractTextureSliceCached(texture, textureX, targetHeight, cache, config?): TextureSlice`

Extract texture slice with caching support.

**Parameters**:
- `texture` - Source texture
- `textureX` - X position (0-1)
- `targetHeight` - Height in pixels
- `cache` - Cache map (modified in place)
- `config` - Optional render configuration

**Returns**: Texture slice (from cache if available)

**Caching Behavior**:
- Generates cache key: `${textureId}:${textureX}:${height}`
- Rounds `textureX` to 0.001 precision
- Respects `config.maxCacheSize` limit
- Skips caching if `config.caching === false`

**Example**:
```typescript
const cache = createSliceCache();
const config = DEFAULT_TEXTURE_CONFIG;

// First call - extracts and caches
const slice1 = extractTextureSliceCached(texture, 0.5, 200, cache, config);

// Second call - returns cached slice (fast)
const slice2 = extractTextureSliceCached(texture, 0.5, 200, cache, config);

console.log(`Cache size: ${cache.size} slices`);
console.log(`Same slice: ${slice1 === slice2}`); // true
```

---

#### `generateSliceCacheKey(textureId, textureX, height): string`

Generate cache key for a texture slice.

**Parameters**:
- `textureId` - Texture identifier
- `textureX` - X position (0-1)
- `height` - Slice height

**Returns**: Cache key string

**Example**:
```typescript
const key = generateSliceCacheKey('stone_wall_01', 0.5, 200);
console.log(key); // "stone_wall_01:0.5:200"
```

### Brightness and Fog

#### `applyBrightnessToSlice(slice: TextureSlice, brightness: number): TextureSlice`

Apply brightness adjustment to a texture slice.

**Parameters**:
- `slice` - Source slice
- `brightness` - Brightness factor (0-1, where 1.0 = no change)

**Returns**: New slice with adjusted brightness (original unchanged)

**Technical Details**:
- Multiplies RGB values by brightness factor
- Preserves alpha channel
- Creates new pixel array (pure function)
- Floors fractional values

**Example**:
```typescript
const slice = extractTextureSlice(texture, 0.5, 200);

// Apply 50% brightness (distance fog)
const dimSlice = applyBrightnessToSlice(slice, 0.5);

// Original slice unchanged
console.log(`Original R: ${slice.pixels[0]}`); // 255
console.log(`Dimmed R: ${dimSlice.pixels[0]}`); // 127
```

---

#### `calculateFogBrightness(distance, maxDistance, config?): number`

Calculate brightness based on distance (linear fog).

**Parameters**:
- `distance` - Distance to wall (in tiles)
- `maxDistance` - Maximum render distance
- `config` - Optional texture render configuration

**Returns**: Brightness factor (config.minBrightness to config.maxBrightness)

**Formula**:
```
fogStart = 1.0
fogEnd = maxDistance

if distance <= fogStart: brightness = 1.0
if distance >= fogEnd:   brightness = 0.2
else:                    brightness = 1.0 - ((distance - fogStart) / (fogEnd - fogStart)) * 0.8
```

**Example**:
```typescript
// Close wall (0.5 tiles away) - fully bright
const bright = calculateFogBrightness(0.5, 10); // 1.0

// Mid-distance wall (5 tiles away) - partially dimmed
const mid = calculateFogBrightness(5, 10); // ~0.644

// Far wall (10 tiles away) - darkest
const dark = calculateFogBrightness(10, 10); // 0.2
```

**Fog Brightness Curve**:
```
1.0│    ████
   │        ████
   │            ████
   │                ████
0.2│                    ████████
   └─────────────────────────────
   0   2   4   6   8   10   12
       Distance (tiles)
```

### Texture Set Management

#### `selectWallTexture(textureSet, wallState, side, index?): Texture | null`

Get appropriate texture for a wall type and orientation.

**Parameters**:
- `textureSet` - Texture set to select from
- `wallState` - Wall type ('wall', 'door', 'locked_door', 'secret')
- `side` - Wall orientation ('NS' or 'EW')
- `index` - Optional index for multiple textures (default 0)

**Returns**: Selected texture, or null if not found

**Selection Logic**:
```
wallState = 'wall'        → wallsNS or wallsEW (based on side)
wallState = 'door'        → doors array
wallState = 'locked_door' → lockedDoors array
wallState = 'secret'      → secretDoors array
```

**Example**:
```typescript
const textureSet: TextureSet = {
  id: 'dungeon_01',
  name: 'Stone Dungeon',
  wallsNS: [stoneWallNS1, stoneWallNS2],
  wallsEW: [stoneWallEW1],
  doors: [woodenDoor],
  lockedDoors: [ironDoor]
};

// Select NS wall (first variation)
const wallNS = selectWallTexture(textureSet, 'wall', 'NS', 0);

// Select EW wall
const wallEW = selectWallTexture(textureSet, 'wall', 'EW');

// Select door
const door = selectWallTexture(textureSet, 'door', 'NS');

// Select second NS wall variation (wraps if index > length)
const wallNS2 = selectWallTexture(textureSet, 'wall', 'NS', 1);
```

---

#### `createTextureSet(id, name, textures): TextureSet`

Create a texture set from extracted textures.

**Parameters**:
- `id` - Texture set identifier
- `name` - Display name
- `textures` - Array of extracted textures

**Returns**: Organized texture set

**Tag-Based Organization**:
- `['wall', 'ns']` → wallsNS array
- `['wall', 'ew']` → wallsEW array
- `['door']` (no 'locked') → doors array
- `['door', 'locked']` → lockedDoors array
- `['secret']` → secretDoors array
- `['floor']` → floors array
- `['ceiling']` → ceilings array

**Example**:
```typescript
const textures = [
  { id: 'wall_ns_01', tags: ['wall', 'ns', 'stone'], ... },
  { id: 'wall_ew_01', tags: ['wall', 'ew', 'stone'], ... },
  { id: 'door_01', tags: ['door', 'wood'], ... },
  { id: 'locked_01', tags: ['door', 'locked'], ... },
  { id: 'floor_01', tags: ['floor', 'stone'], ... }
];

const textureSet = createTextureSet('dungeon_01', 'Stone Dungeon', textures);

console.log(`NS walls: ${textureSet.wallsNS.length}`); // 1
console.log(`EW walls: ${textureSet.wallsEW.length}`); // 1
console.log(`Doors: ${textureSet.doors?.length}`); // 1
console.log(`Locked doors: ${textureSet.lockedDoors?.length}`); // 1
```

### Cache Management

#### `createSliceCache(): Map<string, TextureSlice>`

Create a new texture slice cache.

**Returns**: Empty cache map

**Example**:
```typescript
const cache = createSliceCache();
console.log(`Initial cache size: ${cache.size}`); // 0
```

---

#### `clearSliceCache(cache): void`

Clear all entries from a texture slice cache.

**Parameters**:
- `cache` - Cache to clear (modified in place)

**Example**:
```typescript
clearSliceCache(cache);
console.log(`Cache cleared: ${cache.size} entries`); // 0
```

---

#### `getCacheStats(cache): { size: number, memoryUsageMB: number }`

Get cache statistics for monitoring/debugging.

**Parameters**:
- `cache` - Cache to analyze

**Returns**: Object with `size` and `memoryUsageMB`

**Example**:
```typescript
const stats = getCacheStats(cache);
console.log(`Cache: ${stats.size} slices, ${stats.memoryUsageMB.toFixed(2)} MB`);

// Example output: "Cache: 450 slices, 0.11 MB"
```

**Memory Calculation**:
- Each pixel = 4 bytes (RGBA)
- Each slice = height × 4 bytes
- Total = sum of all slice pixel arrays

## Usage Examples

### Complete Texture Loading Workflow

```typescript
import * as TextureAtlasService from './services/TextureAtlasService';
import { TextureAtlas } from './types/texture.types';

// Step 1: Define atlas metadata
const atlas: TextureAtlas = {
  id: 'eob_dungeon_01',
  imagePath: '/assets/textures/eob-dungeon-01.png',
  width: 512,
  height: 512,
  textures: [
    { id: 'wall_ns_01', x: 0, y: 0, width: 64, height: 64, tags: ['wall', 'ns'] },
    { id: 'wall_ew_01', x: 64, y: 0, width: 64, height: 64, tags: ['wall', 'ew'] },
    { id: 'door_01', x: 0, y: 64, width: 64, height: 64, tags: ['door'] }
  ]
};

// Step 2: Load sprite sheet
const spriteSheet = await TextureAtlasService.loadTextureAtlas(atlas);

// Step 3: Extract all textures
const textures = TextureAtlasService.extractAllTextures(spriteSheet, atlas);

// Step 4: Create texture set
const textureSet = TextureAtlasService.createTextureSet(
  atlas.id,
  'EoB Dungeon Level 1',
  textures
);

console.log(`Loaded texture set: ${textureSet.name}`);
console.log(`- NS walls: ${textureSet.wallsNS.length}`);
console.log(`- EW walls: ${textureSet.wallsEW.length}`);
console.log(`- Doors: ${textureSet.doors?.length ?? 0}`);
```

### Raycasting Integration

```typescript
import * as TextureAtlasService from './services/TextureAtlasService';
import { DEFAULT_TEXTURE_CONFIG } from './types/texture.types';
import { RayHit } from './types/rendering.types';

// Initialize cache
const sliceCache = TextureAtlasService.createSliceCache();

// Render a single ray hit
function renderRayHit(hit: RayHit, textureSet: TextureSet, screenHeight: number) {
  // Calculate wall height on screen
  const wallHeight = Math.floor(screenHeight / hit.distance);

  // Select appropriate texture
  const texture = TextureAtlasService.selectWallTexture(
    textureSet,
    hit.wallState,
    hit.side
  );

  if (!texture) {
    console.warn(`No texture for ${hit.wallState} ${hit.side}`);
    return null;
  }

  // Extract texture slice at hit position
  const slice = TextureAtlasService.extractTextureSliceCached(
    texture,
    hit.wallX,           // Position on wall (0-1)
    wallHeight,           // Target height
    sliceCache,
    DEFAULT_TEXTURE_CONFIG
  );

  // Apply distance fog
  const brightness = TextureAtlasService.calculateFogBrightness(hit.distance, 10);
  const shadedSlice = TextureAtlasService.applyBrightnessToSlice(slice, brightness);

  // Create ImageData for canvas rendering
  const imageData = new ImageData(shadedSlice.pixels, 1, wallHeight);

  return imageData;
}
```

### Performance Monitoring

```typescript
import * as TextureAtlasService from './services/TextureAtlasService';

const cache = TextureAtlasService.createSliceCache();

// Render frame...
// (extract many slices, cache fills up)

// Check cache performance
const stats = TextureAtlasService.getCacheStats(cache);
console.log(`Cache performance:`);
console.log(`- Entries: ${stats.size}`);
console.log(`- Memory: ${stats.memoryUsageMB.toFixed(2)} MB`);
console.log(`- Hit rate: ${calculateHitRate()}%`);

// Clear cache if memory usage too high
if (stats.memoryUsageMB > 5.0) {
  console.warn('Cache too large, clearing...');
  TextureAtlasService.clearSliceCache(cache);
}
```

## Performance Considerations

### Caching Strategy

**Cache Key Format**: `${textureId}:${textureX}:${height}`

**Benefits**:
- Eliminates redundant slice extraction
- Reduces CPU usage by ~80% for repeated frames
- Typical cache size: 400-600 slices per frame

**Limits**:
- Default max: 1000 slices (~250KB memory)
- No LRU eviction (stops caching when full)
- Cache persists across frames

### Memory Usage

**Per Texture**:
- 64×64 texture = 16,384 pixels × 4 bytes = ~16KB
- 512×512 atlas = ~1MB image data + extracted textures

**Per Slice**:
- 1px × 64px slice = 256 bytes
- 1px × 200px slice = 800 bytes

**Cache Memory**:
- 1000 slices × 256 bytes avg = ~250KB

### Optimization Tips

1. **Use Caching**: Enable caching for static scenes
2. **Limit Atlas Size**: Keep sprite sheets < 2048×2048
3. **Match Texture Height**: Use 64×64 for optimal scaling
4. **Preload Textures**: Load atlases during loading screen
5. **Monitor Cache**: Use `getCacheStats()` to track memory

## Related Documentation

- `AssetLoadingService.md` - High-level asset loading
- `RaycastingRenderingService.md` - Textured raycasting renderer
- `/assets/textures/README.md` - Texture atlas format guide
- `texture.types.ts` - Type definitions

## See Also

- Eye of the Beholder textures: https://www.spriters-resource.com/ms_dos/eyeofthebeholder/
- Raycasting texture mapping: https://lodev.org/cgtutor/raycasting.html
