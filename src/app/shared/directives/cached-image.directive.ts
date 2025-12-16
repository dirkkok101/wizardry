import { Directive, ElementRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { SpritePreloadService } from '@services/SpritePreloadService';
import { LoggerService } from '@services/LoggerService';

/**
 * CachedImageDirective - Uses preloaded images from SpritePreloadService cache.
 *
 * Instead of `<img [src]="url">` which always triggers browser loading,
 * this directive first checks if the image is already in memory from preloading.
 *
 * Benefits:
 * - Skips network request (even 304 responses have latency)
 * - Skips image decode (already decoded HTMLImageElement in memory)
 * - Instant display for preloaded sprites
 *
 * Falls back to direct URL if image not in cache.
 *
 * @example
 * <img [appCachedSrc]="'/assets/sprites/combat/victory-clean.png'" />
 */
@Directive({
  selector: 'img[appCachedSrc]',
  standalone: true
})
export class CachedImageDirective implements OnChanges {
  @Input() appCachedSrc = '';

  private readonly logger = inject(LoggerService);

  constructor(private el: ElementRef<HTMLImageElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appCachedSrc']) {
      this.updateSrc();
    }
  }

  private updateSrc(): void {
    if (!this.appCachedSrc) {
      return;
    }

    // Check if image is in preload cache
    const cached = SpritePreloadService.getCachedImage(this.appCachedSrc);

    if (cached) {
      // Use the cached image's src - browser recognizes it's already loaded
      this.el.nativeElement.src = cached.src;
    } else {
      // Fallback to direct URL (browser HTTP cache may still help)
      this.el.nativeElement.src = this.appCachedSrc;
      this.logger.debug(`[CachedImage] MISS: ${this.appCachedSrc}`);
    }
  }
}
