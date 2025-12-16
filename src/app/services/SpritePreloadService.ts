/**
 * SpritePreloadService - Preloads game sprites during initialization
 *
 * Follows the same caching/deduplication pattern as other data loaders.
 * Sprites are preloaded and cached in memory for instant access.
 *
 * Why preload?
 * - Sprites load on-demand by default, causing visual delays
 * - Victory/defeat sprites would flash or appear late without preloading
 * - Monster sprites in combat should be instant for responsive UX
 * - Dungeon textures would cause delays when entering/re-entering maze
 */

import { MonsterDataLoader } from './MonsterDataLoader'
import { SpriteService } from './SpriteService'
import { TextureAtlas } from '@models/texture.types'
import * as TextureAtlasService from './TextureAtlasService'

/** Cached dungeon atlas with both JSON metadata and decoded image */
export interface DungeonAtlasCache {
  atlas: TextureAtlas
  image: HTMLImageElement
}

export class SpritePreloadService {
  private static loadPromise: Promise<void> | null = null
  private static loaded = false
  private static preloadedUrls: Set<string> = new Set()
  private static failedUrls: Set<string> = new Set()

  /** In-memory cache of loaded images (skips both network AND decode on reuse) */
  private static cachedImages: Map<string, HTMLImageElement> = new Map()

  /** Dungeon texture atlas cache (JSON + image) */
  private static dungeonAtlasCache: DungeonAtlasCache | null = null

  /** Path to dungeon texture atlas metadata */
  private static readonly DUNGEON_ATLAS_PATH = '/assets/textures/eob-dungeon-highres-compressed.json'

  /**
   * UI sprite paths (hardcoded - small, known set)
   * Located in data/sprites/ which is served as /assets/sprites/
   */
  private static readonly UI_SPRITES = [
    '/assets/sprites/combat/victory-clean.png',
    '/assets/sprites/combat/victory-pyrrhic.png',
    '/assets/sprites/chest/chest_closed.png',
    '/assets/sprites/chest/chest_open.png'
  ]

  /**
   * Scene background sprites (5-7 MB each)
   * Preloading during initialization ensures instant scene transitions
   */
  private static readonly SCENE_SPRITES = [
    '/assets/sprites/scenes/castle_scene.png',
    '/assets/sprites/scenes/tavern_scene.png',
    '/assets/sprites/scenes/temple_scene.png',
    '/assets/sprites/scenes/trading_post_scene.png',
    '/assets/sprites/scenes/adventurers_inn_scene.png',
    '/assets/sprites/scenes/training_grounds.png'
  ]

  /**
   * Trap sprites for chest playback
   * All 11 trap types from authentic Wizardry 1
   */
  private static readonly TRAP_SPRITES = [
    '/assets/sprites/traps/poison_needle.png',
    '/assets/sprites/traps/gas_bomb.png',
    '/assets/sprites/traps/crossbow_bolt.png',
    '/assets/sprites/traps/exploding_box.png',
    '/assets/sprites/traps/splinters.png',
    '/assets/sprites/traps/blades.png',
    '/assets/sprites/traps/stunner.png',
    '/assets/sprites/traps/alarm.png',
    '/assets/sprites/traps/teleporter.png',
    '/assets/sprites/traps/mage_blaster.png',
    '/assets/sprites/traps/priest_blaster.png'
  ]

  /**
   * Preload all game sprites. Safe to call multiple times.
   * Returns immediately if already loaded or in progress.
   */
  static async preloadAllSprites(): Promise<void> {
    if (this.loaded) return
    if (this.loadPromise) return this.loadPromise

    this.loadPromise = this.performPreload()
    await this.loadPromise
    this.loaded = true
  }

  /**
   * Internal: performs the actual preloading
   */
  private static async performPreload(): Promise<void> {
    const spriteUrls = this.gatherAllSpriteUrls()

    // Preload sprites and dungeon atlas in parallel
    const [spriteResults] = await Promise.all([
      // Sprite preloading (don't fail on missing sprites)
      Promise.allSettled(spriteUrls.map(url => this.preloadImage(url))),
      // Dungeon atlas preloading (critical for maze performance)
      this.preloadDungeonAtlas()
    ])

    // Track sprite results
    const succeeded = spriteResults.filter(r => r.status === 'fulfilled').length
    const failed = spriteResults.filter(r => r.status === 'rejected').length

    // Log stats (useful for debugging missing sprites)
    console.log(`[SpritePreloadService] Preloaded ${succeeded} sprites, ${failed} failed`)

    if (failed > 0) {
      console.log(`[SpritePreloadService] Failed sprites:`, Array.from(this.failedUrls))
    }
  }

  /**
   * Gather all sprite URLs to preload
   */
  private static gatherAllSpriteUrls(): string[] {
    const urls: string[] = []

    // 1. UI Sprites (victory, defeat, etc.)
    urls.push(...this.UI_SPRITES)

    // 2. Scene Sprites (backgrounds for town scenes)
    urls.push(...this.SCENE_SPRITES)

    // 3. Trap Sprites (chest playback)
    urls.push(...this.TRAP_SPRITES)

    // 4. Character Sprites (all 20 race/class combinations)
    const characterSprites = SpriteService.getAllSprites()
    urls.push(...characterSprites.map(s => s.url))

    // 5. Monster Sprites (derived from loaded monster data)
    try {
      const monsters = MonsterDataLoader.getAllMonsters()
      for (const monster of monsters.values()) {
        urls.push(`/assets/sprites/monsters/${monster.id}.png`)
      }
    } catch {
      // MonsterDataLoader not initialized yet - skip monster sprites
      console.warn('[SpritePreloadService] Monster data not loaded, skipping monster sprites')
    }

    return urls
  }

  /**
   * Preload a single image and store in memory cache.
   * Stores the HTMLImageElement so we skip both network AND decode on reuse.
   */
  private static preloadImage(url: string): Promise<void> {
    // Return cached image immediately if already loaded
    if (this.cachedImages.has(url)) {
      this.preloadedUrls.add(url)
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        this.preloadedUrls.add(url)
        this.cachedImages.set(url, img)  // Store in memory cache
        resolve()
      }

      img.onerror = () => {
        this.failedUrls.add(url)
        reject(new Error(`Failed to preload: ${url}`))
      }

      img.src = url
    })
  }

  /**
   * Preload dungeon texture atlas (JSON metadata + image).
   * Called during game initialization to avoid delays when entering maze.
   */
  private static async preloadDungeonAtlas(): Promise<void> {
    if (this.dungeonAtlasCache) {
      console.log('[SpritePreloadService] Dungeon atlas already cached')
      return
    }

    try {
      console.log('[SpritePreloadService] Loading dungeon texture atlas...')

      // Fetch atlas JSON metadata
      const response = await fetch(this.DUNGEON_ATLAS_PATH)
      if (!response.ok) {
        throw new Error(`Failed to load atlas JSON: ${response.statusText}`)
      }
      const atlas: TextureAtlas = await response.json()

      // Load and decode the texture image
      const image = await TextureAtlasService.loadTextureAtlas(atlas)

      // Store in cache
      this.dungeonAtlasCache = { atlas, image }

      console.log('[SpritePreloadService] Dungeon atlas cached:', {
        dimensions: `${image.naturalWidth}x${image.naturalHeight}`,
        textures: atlas.textures.length
      })
    } catch (error) {
      console.error('[SpritePreloadService] Failed to load dungeon atlas:', error)
      // Don't throw - dungeon atlas will be loaded on-demand if preload fails
    }
  }

  /**
   * Get cached dungeon atlas. Returns null if not cached.
   * MazeLayoutComponent uses this to skip network fetch + decode.
   */
  static getDungeonAtlasCache(): DungeonAtlasCache | null {
    return this.dungeonAtlasCache
  }

  /**
   * Get a cached image by URL. Returns null if not cached.
   */
  static getCachedImage(url: string): HTMLImageElement | null {
    return this.cachedImages.get(url) ?? null
  }

  /**
   * Check if a specific sprite was successfully preloaded
   */
  static isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url)
  }

  /**
   * Check if a sprite failed to load
   */
  static hasFailed(url: string): boolean {
    return this.failedUrls.has(url)
  }

  /**
   * Get count of successfully preloaded sprites
   */
  static getPreloadedCount(): number {
    return this.preloadedUrls.size
  }

  /**
   * Get count of failed sprites
   */
  static getFailedCount(): number {
    return this.failedUrls.size
  }

  /**
   * Clear sprite cache to free memory.
   * Useful when transitioning from maze to town scenes.
   *
   * Options:
   * - keepSceneSprites: Keep scene backgrounds cached (recommended for town navigation)
   * - keepDungeonAtlas: Keep dungeon textures cached (recommended if returning to maze)
   *
   * @param options - Control what to keep in cache
   */
  static clearCache(options: { keepSceneSprites?: boolean; keepDungeonAtlas?: boolean } = {}): void {
    const { keepSceneSprites = true, keepDungeonAtlas = true } = options

    // Build set of URLs to keep
    const keepUrls = new Set<string>()

    if (keepSceneSprites) {
      this.SCENE_SPRITES.forEach(url => keepUrls.add(url))
    }

    // Filter cached images
    if (keepUrls.size > 0) {
      const toRemove: string[] = []
      this.cachedImages.forEach((_, url) => {
        if (!keepUrls.has(url)) {
          toRemove.push(url)
        }
      })
      toRemove.forEach(url => {
        this.cachedImages.delete(url)
        this.preloadedUrls.delete(url)
      })
    } else {
      this.cachedImages.clear()
      this.preloadedUrls.clear()
    }

    // Clear dungeon atlas if requested
    if (!keepDungeonAtlas) {
      this.dungeonAtlasCache = null
    }

    // Clear failed URLs (allow retry on next preload)
    this.failedUrls.clear()

    console.log(`[SpritePreloadService] Cache cleared. Remaining: ${this.cachedImages.size} sprites`)
  }

  /**
   * Get current memory usage statistics.
   * Useful for debugging memory issues.
   */
  static getMemoryStats(): { spriteCount: number; estimatedSizeMB: number } {
    let estimatedBytes = 0

    // Estimate sprite memory (width * height * 4 bytes per pixel)
    this.cachedImages.forEach(img => {
      estimatedBytes += img.naturalWidth * img.naturalHeight * 4
    })

    // Add dungeon atlas if cached
    if (this.dungeonAtlasCache) {
      const { image } = this.dungeonAtlasCache
      estimatedBytes += image.naturalWidth * image.naturalHeight * 4
    }

    return {
      spriteCount: this.cachedImages.size + (this.dungeonAtlasCache ? 1 : 0),
      estimatedSizeMB: Math.round(estimatedBytes / (1024 * 1024) * 100) / 100
    }
  }

  /**
   * Reset for testing
   */
  static reset(): void {
    this.loadPromise = null
    this.loaded = false
    this.preloadedUrls.clear()
    this.failedUrls.clear()
    this.cachedImages.clear()
    this.dungeonAtlasCache = null
  }
}
