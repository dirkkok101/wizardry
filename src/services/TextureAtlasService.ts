import {
  TextureAtlas,
  TextureMetadata,
  Texture,
  TextureSet,
  TextureSlice,
  TextureSliceCacheKey,
  TextureRenderConfig,
  DEFAULT_TEXTURE_CONFIG,
  TextureError
} from '../types/texture.types';

/**
 * TextureAtlasService - Pure function service for texture atlas operations.
 *
 * Handles loading sprite sheets, extracting individual textures, and extracting
 * vertical slices for raycasting column rendering. Supports caching for performance.
 *
 * All functions are pure (no side effects) except image loading operations.
 */

// ============================================================================
// SPRITE SHEET LOADING
// ============================================================================

/**
 * Load a sprite sheet image from a URL.
 *
 * @param imagePath - Path to sprite sheet image
 * @returns Promise resolving to HTMLImageElement
 * @throws TextureError if loading fails
 */
export async function loadSpriteSheet(imagePath: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(
      new TextureError(imagePath, 'loadSpriteSheet', `Failed to load image from ${imagePath}`)
    );

    img.src = imagePath;
  });
}

/**
 * Load a texture atlas (metadata + sprite sheet image).
 *
 * @param atlas - Texture atlas metadata
 * @returns Promise resolving to loaded HTMLImageElement
 */
export async function loadTextureAtlas(atlas: TextureAtlas): Promise<HTMLImageElement> {
  try {
    return await loadSpriteSheet(atlas.imagePath);
  } catch (error) {
    throw new TextureError(
      atlas.id,
      'loadTextureAtlas',
      `Failed to load atlas ${atlas.id}`,
      error as Error
    );
  }
}

// ============================================================================
// TEXTURE EXTRACTION
// ============================================================================

/**
 * Extract a single texture from a sprite sheet.
 *
 * Creates a canvas with the texture region copied from the sprite sheet.
 *
 * @param spriteSheet - Loaded sprite sheet image
 * @param metadata - Texture metadata (position and size)
 * @returns Extracted texture with canvas and ImageData
 */
export function extractTexture(
  spriteSheet: HTMLImageElement,
  metadata: TextureMetadata
): Texture {
  // Create canvas for this texture
  const canvas = document.createElement('canvas');
  canvas.width = metadata.width;
  canvas.height = metadata.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new TextureError(metadata.id, 'extractTexture', 'Failed to get 2D context');
  }

  // Draw texture region from sprite sheet
  ctx.drawImage(
    spriteSheet,
    metadata.x,           // Source X
    metadata.y,           // Source Y
    metadata.width,       // Source width
    metadata.height,      // Source height
    0,                    // Dest X
    0,                    // Dest Y
    metadata.width,       // Dest width
    metadata.height       // Dest height
  );

  // Get ImageData
  const imageData = ctx.getImageData(0, 0, metadata.width, metadata.height);

  return {
    id: metadata.id,
    width: metadata.width,
    height: metadata.height,
    imageData,
    canvas,
    tags: metadata.tags
  };
}

/**
 * Extract all textures from a sprite sheet atlas.
 *
 * @param spriteSheet - Loaded sprite sheet image
 * @param atlas - Texture atlas metadata
 * @returns Array of extracted textures
 */
export function extractAllTextures(
  spriteSheet: HTMLImageElement,
  atlas: TextureAtlas
): Texture[] {
  return atlas.textures.map(metadata => extractTexture(spriteSheet, metadata));
}

// ============================================================================
// VERTICAL SLICE EXTRACTION (for Raycasting)
// ============================================================================

/**
 * Extract a vertical slice from a texture for raycasting column rendering.
 *
 * @param texture - Source texture
 * @param textureX - X position within texture (0-1 normalized)
 * @param targetHeight - Desired height of slice (for scaling)
 * @returns Vertical texture slice (1px wide)
 */
export function extractTextureSlice(
  texture: Texture,
  textureX: number,
  targetHeight: number
): TextureSlice {
  // Clamp textureX to [0, 1)
  const clampedX = Math.max(0, Math.min(0.9999, textureX));

  // Calculate source pixel column
  const sourceX = Math.floor(clampedX * texture.width);

  // Extract column from ImageData
  const pixels = new Uint8ClampedArray(targetHeight * 4); // RGBA

  for (let y = 0; y < targetHeight; y++) {
    // Calculate source Y with scaling
    const sourceY = Math.floor((y / targetHeight) * texture.height);

    // Get pixel from source texture
    const sourceIndex = (sourceY * texture.width + sourceX) * 4;

    // Copy RGBA values
    const destIndex = y * 4;
    pixels[destIndex + 0] = texture.imageData.data[sourceIndex + 0]; // R
    pixels[destIndex + 1] = texture.imageData.data[sourceIndex + 1]; // G
    pixels[destIndex + 2] = texture.imageData.data[sourceIndex + 2]; // B
    pixels[destIndex + 3] = texture.imageData.data[sourceIndex + 3]; // A
  }

  return {
    textureX: clampedX,
    height: targetHeight,
    pixels,
    textureId: texture.id
  };
}

/**
 * Extract a vertical slice with caching support.
 *
 * Checks cache first, extracts if not cached, and adds to cache.
 *
 * @param texture - Source texture
 * @param textureX - X position within texture (0-1 normalized)
 * @param targetHeight - Desired height of slice
 * @param cache - Cache map (modified in place)
 * @param config - Texture render configuration
 * @returns Vertical texture slice
 */
export function extractTextureSliceCached(
  texture: Texture,
  textureX: number,
  targetHeight: number,
  cache: Map<TextureSliceCacheKey, TextureSlice>,
  config: TextureRenderConfig = DEFAULT_TEXTURE_CONFIG
): TextureSlice {
  if (!config.caching) {
    return extractTextureSlice(texture, textureX, targetHeight);
  }

  // Generate cache key
  const cacheKey = generateSliceCacheKey(texture.id, textureX, targetHeight);

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Extract slice
  const slice = extractTextureSlice(texture, textureX, targetHeight);

  // Add to cache (with size limit)
  if (cache.size < config.maxCacheSize) {
    cache.set(cacheKey, slice);
  } else {
    // Cache full - could implement LRU eviction, but for now just skip caching
    // In practice, 1000 slices is plenty for 600px wide screen
  }

  return slice;
}

/**
 * Generate cache key for a texture slice.
 *
 * @param textureId - Texture identifier
 * @param textureX - X position (0-1)
 * @param height - Slice height
 * @returns Cache key string
 */
export function generateSliceCacheKey(
  textureId: string,
  textureX: number,
  height: number
): TextureSliceCacheKey {
  // Round textureX to reduce cache key variations (e.g., 0.001 precision)
  const roundedX = Math.round(textureX * 1000) / 1000;
  return `${textureId}:${roundedX}:${height}`;
}

// ============================================================================
// BRIGHTNESS AND FOG EFFECTS
// ============================================================================

/**
 * Apply brightness adjustment to a texture slice.
 *
 * Multiplies RGB values by brightness factor (0-1).
 * Does not modify alpha channel.
 *
 * @param slice - Texture slice to adjust
 * @param brightness - Brightness factor (0-1, where 1.0 = no change)
 * @returns New slice with adjusted brightness (original unchanged)
 */
export function applyBrightnessToSlice(
  slice: TextureSlice,
  brightness: number
): TextureSlice {
  const adjustedPixels = new Uint8ClampedArray(slice.pixels.length);

  for (let i = 0; i < slice.pixels.length; i += 4) {
    adjustedPixels[i + 0] = Math.floor(slice.pixels[i + 0] * brightness); // R
    adjustedPixels[i + 1] = Math.floor(slice.pixels[i + 1] * brightness); // G
    adjustedPixels[i + 2] = Math.floor(slice.pixels[i + 2] * brightness); // B
    adjustedPixels[i + 3] = slice.pixels[i + 3];                          // A (unchanged)
  }

  return {
    ...slice,
    pixels: adjustedPixels
  };
}

/**
 * Calculate brightness based on distance (linear fog).
 *
 * Same formula as RaycastingRenderingService for consistency.
 *
 * @param distance - Distance to wall (in tiles)
 * @param maxDistance - Maximum render distance
 * @param config - Texture render configuration
 * @returns Brightness factor (config.minBrightness to config.maxBrightness)
 */
export function calculateFogBrightness(
  distance: number,
  maxDistance: number,
  config: TextureRenderConfig = DEFAULT_TEXTURE_CONFIG
): number {
  const fogStart = 1.0;
  const fogEnd = maxDistance;

  if (distance <= fogStart) {
    return config.maxBrightness;
  }

  if (distance >= fogEnd) {
    return config.minBrightness;
  }

  const factor = (distance - fogStart) / (fogEnd - fogStart);
  return config.maxBrightness - (factor * (config.maxBrightness - config.minBrightness));
}

// ============================================================================
// TEXTURE SET MANAGEMENT
// ============================================================================

/**
 * Get appropriate texture for a wall type and orientation.
 *
 * Selects from TextureSet based on wall type (normal, door, locked, secret)
 * and orientation (NS or EW).
 *
 * @param textureSet - Texture set to select from
 * @param wallState - Wall type ('wall', 'door', 'locked_door', 'secret')
 * @param side - Wall orientation ('NS' or 'EW')
 * @param index - Optional index for multiple textures (default 0)
 * @returns Selected texture, or null if not found
 */
export function selectWallTexture(
  textureSet: TextureSet,
  wallState: string,
  side: 'NS' | 'EW',
  index: number = 0
): Texture | null {
  let textureArray: Texture[] | undefined;

  switch (wallState) {
    case 'door':
      textureArray = textureSet.doors;
      break;
    case 'locked_door':
      textureArray = textureSet.lockedDoors;
      break;
    case 'secret':
      textureArray = textureSet.secretDoors;
      break;
    case 'wall':
    default:
      // Select based on orientation
      textureArray = side === 'NS' ? textureSet.wallsNS : textureSet.wallsEW;
      break;
  }

  if (!textureArray || textureArray.length === 0) {
    return null;
  }

  // Use modulo to wrap index if out of bounds
  const safeIndex = index % textureArray.length;
  return textureArray[safeIndex];
}

/**
 * Select wall texture using variation (based on tile position).
 *
 * Alternates between available wall textures based on tile coordinates
 * to create visual variety without orientation-based selection.
 *
 * @param textureSet - Texture set to select from
 * @param mapX - Tile X coordinate
 * @param mapY - Tile Y coordinate
 * @returns Selected texture, or null if not found
 */
export function selectWallTextureVariation(
  textureSet: TextureSet,
  mapX: number,
  mapY: number
): Texture | null {
  const walls = textureSet.walls;
  if (!walls || walls.length === 0) {
    return null;
  }

  // Alternate based on tile position (checkerboard pattern)
  const variation = (mapX + mapY) % walls.length;
  return walls[variation];
}

/**
 * Select stairs texture based on tile type.
 *
 * @param textureSet - Texture set to select from
 * @param tileType - Tile type (stairs_up or stairs_down)
 * @returns Selected texture, or null if not found
 */
export function selectStairsTexture(
  textureSet: TextureSet,
  tileType: import('../types/Dungeon').TileType
): Texture | null {
  if (tileType === 'stairs_up') {
    return textureSet.stairsUp?.[0] || null;
  }
  if (tileType === 'stairs_down') {
    return textureSet.stairsDown?.[0] || null;
  }
  return null;
}

/**
 * Select door texture based on open state.
 *
 * @param textureSet - Texture set to select from
 * @param isOpen - Whether door is open
 * @returns Selected texture, or null if not found
 */
export function selectDoorTexture(
  textureSet: TextureSet,
  isOpen: boolean
): Texture | null {
  // Try specific open/closed textures first
  if (isOpen && textureSet.doorsOpen && textureSet.doorsOpen.length > 0) {
    return textureSet.doorsOpen[0];
  }
  if (!isOpen && textureSet.doorsClosed && textureSet.doorsClosed.length > 0) {
    return textureSet.doorsClosed[0];
  }

  // Fallback to generic doors array
  return textureSet.doors?.[0] || null;
}

/**
 * Create a texture set from extracted textures.
 *
 * Helper function to organize textures by tags into a TextureSet.
 *
 * @param id - Texture set identifier
 * @param name - Display name
 * @param textures - Array of extracted textures
 * @returns Organized texture set
 */
export function createTextureSet(
  id: string,
  name: string,
  textures: Texture[]
): TextureSet {
  // Filter textures by tags

  // Wall variation (new system)
  const walls = textures.filter(t =>
    t.tags?.includes('wall') &&
    (t.tags?.includes('variation-1') || t.tags?.includes('variation-2'))
  );

  // Wall orientation (legacy system - maintain backward compatibility)
  const wallsNS = textures.filter(t => t.tags?.includes('wall') && t.tags?.includes('ns'));
  const wallsEW = textures.filter(t => t.tags?.includes('wall') && t.tags?.includes('ew'));

  // Doors
  const doors = textures.filter(t => t.tags?.includes('door') && !t.tags?.includes('locked') && !t.tags?.includes('open') && !t.tags?.includes('closed'));
  const doorsOpen = textures.filter(t => t.tags?.includes('door') && t.tags?.includes('open'));
  const doorsClosed = textures.filter(t => t.tags?.includes('door') && t.tags?.includes('closed'));
  const lockedDoors = textures.filter(t => t.tags?.includes('door') && t.tags?.includes('locked'));
  const secretDoors = textures.filter(t => t.tags?.includes('secret'));

  // Stairs
  const stairsUp = textures.filter(t => t.tags?.includes('stairs') && t.tags?.includes('up'));
  const stairsDown = textures.filter(t => t.tags?.includes('stairs') && t.tags?.includes('down'));

  // Floor and ceiling
  const floors = textures.filter(t => t.tags?.includes('floor'));
  const ceilings = textures.filter(t => t.tags?.includes('ceiling'));

  return {
    id,
    name,
    wallsNS: wallsNS.length > 0 ? wallsNS : [],
    wallsEW: wallsEW.length > 0 ? wallsEW : [],
    walls: walls.length > 0 ? walls : undefined,
    doors: doors.length > 0 ? doors : undefined,
    doorsOpen: doorsOpen.length > 0 ? doorsOpen : undefined,
    doorsClosed: doorsClosed.length > 0 ? doorsClosed : undefined,
    lockedDoors: lockedDoors.length > 0 ? lockedDoors : undefined,
    secretDoors: secretDoors.length > 0 ? secretDoors : undefined,
    stairsUp: stairsUp.length > 0 ? stairsUp : undefined,
    stairsDown: stairsDown.length > 0 ? stairsDown : undefined,
    floors: floors.length > 0 ? floors : undefined,
    ceilings: ceilings.length > 0 ? ceilings : undefined
  };
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Create a new texture slice cache.
 *
 * @returns Empty cache map
 */
export function createSliceCache(): Map<TextureSliceCacheKey, TextureSlice> {
  return new Map();
}

/**
 * Clear a texture slice cache.
 *
 * @param cache - Cache to clear (modified in place)
 */
export function clearSliceCache(cache: Map<TextureSliceCacheKey, TextureSlice>): void {
  cache.clear();
}

/**
 * Get cache statistics.
 *
 * @param cache - Cache to analyze
 * @returns Cache stats
 */
export function getCacheStats(cache: Map<TextureSliceCacheKey, TextureSlice>): {
  size: number
  memoryUsageMB: number
} {
  let totalBytes = 0;

  for (const slice of cache.values()) {
    totalBytes += slice.pixels.length; // Each pixel is 4 bytes (RGBA)
  }

  return {
    size: cache.size,
    memoryUsageMB: totalBytes / (1024 * 1024)
  };
}
