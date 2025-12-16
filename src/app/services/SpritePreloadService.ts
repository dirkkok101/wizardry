/**
 * SpritePreloadService - Preloads game sprites during initialization
 *
 * Follows the same caching/deduplication pattern as other data loaders.
 * Sprites are preloaded into browser cache so they're instant when displayed.
 *
 * Why preload?
 * - Sprites load on-demand by default, causing visual delays
 * - Victory/defeat sprites would flash or appear late without preloading
 * - Monster sprites in combat should be instant for responsive UX
 */

import { MonsterDataLoader } from './MonsterDataLoader'
import { SpriteService } from './SpriteService'

export class SpritePreloadService {
  private static loadPromise: Promise<void> | null = null
  private static loaded = false
  private static preloadedUrls: Set<string> = new Set()
  private static failedUrls: Set<string> = new Set()

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

    // Preload in parallel with Promise.allSettled (don't fail on missing sprites)
    const results = await Promise.allSettled(
      spriteUrls.map(url => this.preloadImage(url))
    )

    // Track results
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

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
   * Preload a single image into browser cache
   */
  private static preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        this.preloadedUrls.add(url)
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
   * Reset for testing
   */
  static reset(): void {
    this.loadPromise = null
    this.loaded = false
    this.preloadedUrls.clear()
    this.failedUrls.clear()
  }
}
