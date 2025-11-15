/**
 * Texture system type definitions for Eye of the Beholder style dungeon textures.
 *
 * Supports sprite sheet atlases with multiple textures, vertical slice extraction
 * for raycasting, and texture set management for different dungeon themes.
 */

/**
 * Metadata for a single texture within a sprite sheet atlas.
 *
 * Defines the rectangular region containing the texture and its dimensions.
 */
export interface TextureMetadata {
  /** Unique identifier for this texture (e.g., 'stone_wall_01') */
  id: string

  /** X coordinate in sprite sheet (pixels) */
  x: number

  /** Y coordinate in sprite sheet (pixels) */
  y: number

  /** Width of texture (pixels) */
  width: number

  /** Height of texture (pixels) */
  height: number

  /** Optional tags for categorization (e.g., ['wall', 'stone', 'dark']) */
  tags?: string[]
}

/**
 * Sprite sheet atlas containing multiple textures.
 *
 * Represents a single PNG/image file with multiple textures arranged in a grid
 * or arbitrary layout. Common in retro games to reduce HTTP requests.
 */
export interface TextureAtlas {
  /** Unique identifier for this atlas (e.g., 'eob_walls_level_01') */
  id: string

  /** Path to sprite sheet image file (e.g., '/assets/textures/walls-01.png') */
  imagePath: string

  /** Width of entire sprite sheet (pixels) */
  width: number

  /** Height of entire sprite sheet (pixels) */
  height: number

  /** Array of texture metadata defining regions within the sprite sheet */
  textures: TextureMetadata[]

  /** Optional description of atlas contents */
  description?: string
}

/**
 * Loaded texture data ready for rendering.
 *
 * Contains the extracted ImageData for a single texture, plus metadata.
 * Used by rendering services to draw texture columns.
 */
export interface Texture {
  /** Unique identifier (matches TextureMetadata.id) */
  id: string

  /** Width in pixels */
  width: number

  /** Height in pixels */
  height: number

  /** Raw pixel data (RGBA) */
  imageData: ImageData

  /** Optional HTMLCanvasElement for fast column extraction */
  canvas?: HTMLCanvasElement

  /** Optional tags from metadata */
  tags?: string[]
}

/**
 * Collection of related textures for a dungeon theme.
 *
 * Groups textures by wall type (NS/EW), doors, floors, etc.
 * Allows easy swapping between dungeon level themes.
 */
export interface TextureSet {
  /** Unique identifier (e.g., 'dungeon_level_01') */
  id: string

  /** Display name (e.g., 'Stone Dungeon') */
  name: string

  /** Textures for north-south walls (vertical in 2D map) */
  wallsNS: Texture[]

  /** Textures for east-west walls (horizontal in 2D map) */
  wallsEW: Texture[]

  /** Textures for closed doors */
  doors?: Texture[]

  /** Textures for locked doors */
  lockedDoors?: Texture[]

  /** Textures for secret doors */
  secretDoors?: Texture[]

  /** Textures for floor tiles (for future floor casting) */
  floors?: Texture[]

  /** Textures for ceiling tiles (for future ceiling casting) */
  ceilings?: Texture[]

  /** Optional description */
  description?: string
}

/**
 * Vertical texture slice for raycasting column rendering.
 *
 * Represents a single 1px-wide column extracted from a texture.
 * Used to render one screen column in the raycasting renderer.
 */
export interface TextureSlice {
  /** X position within source texture (0-1 normalized) */
  textureX: number

  /** Height of slice in pixels */
  height: number

  /** Raw pixel data (RGBA, 1px wide × height pixels tall) */
  pixels: Uint8ClampedArray

  /** Source texture ID */
  textureId: string
}

/**
 * Cache key for texture slices.
 *
 * Used to cache extracted slices for performance.
 * Format: `${textureId}:${textureX}:${height}`
 */
export type TextureSliceCacheKey = string

/**
 * Configuration for texture rendering.
 */
export interface TextureRenderConfig {
  /** Enable texture filtering (bilinear interpolation) */
  filtering: boolean

  /** Enable distance fog on textures */
  distanceFog: boolean

  /** Minimum brightness for fog (0-1) */
  minBrightness: number

  /** Maximum brightness for fog (0-1) */
  maxBrightness: number

  /** Enable texture caching */
  caching: boolean

  /** Maximum cache size (number of slices) */
  maxCacheSize: number
}

/**
 * Default texture rendering configuration.
 */
export const DEFAULT_TEXTURE_CONFIG: TextureRenderConfig = {
  filtering: false,           // Crisp pixels (EoB style)
  distanceFog: true,           // Enable fog
  minBrightness: 0.2,          // Match existing raycaster
  maxBrightness: 1.0,          // Full brightness
  caching: true,               // Enable caching
  maxCacheSize: 1000           // Cache up to 1000 slices (~4MB at 64x64)
}

/**
 * Texture loading progress event.
 */
export interface TextureLoadProgress {
  /** Current atlas being loaded */
  atlasId: string

  /** Number of atlases loaded */
  loaded: number

  /** Total number of atlases to load */
  total: number

  /** Progress percentage (0-100) */
  progress: number
}

/**
 * Error thrown when texture operations fail.
 */
export class TextureError extends Error {
  constructor(
    public textureId: string,
    public operation: string,
    message: string,
    public originalError?: Error
  ) {
    super(`Texture operation '${operation}' failed for '${textureId}': ${message}`)
    this.name = 'TextureError'
  }
}
