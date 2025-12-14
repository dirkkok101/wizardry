/**
 * MazeCanvasComponent - WebGL Dungeon Rendering
 *
 * Extracted from MazeComponent to handle all canvas/WebGL concerns:
 * - Canvas element management
 * - WebGL renderer initialization
 * - Texture loading
 * - Responsive resize handling
 * - Dungeon view rendering
 *
 * Parent provides dungeon state; this component handles visualization.
 */

import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  input,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebGLRenderingService } from '@services/WebGLRenderingService';
import { DungeonService } from '@services/DungeonService';
import { LightService } from '@services/LightService';
import { DungeonState, Position } from '@models/Dungeon';
import { TextureAtlas } from '@models/texture.types';
import { ViewportConfig } from '@models/rendering.types';
import * as TextureAtlasService from '@services/TextureAtlasService';

@Component({
  selector: 'app-maze-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `<canvas #mazeCanvas></canvas>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `]
})
export class MazeCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mazeCanvas', { static: false })
  canvasRef?: ElementRef<HTMLCanvasElement>;

  // Inputs from parent
  readonly dungeonState = input<DungeonState | null>(null);
  readonly currentLevel = input<number>(1);

  // WebGL Renderer
  private webglRenderer: WebGLRenderingService | null = null;

  // Canvas resize observer for responsive rendering
  private resizeObserver: ResizeObserver | null = null;

  // Track texture loading state
  private texturesLoaded = false;

  constructor() {
    // Effect to re-render when inputs change
    effect(() => {
      const dungeon = this.dungeonState();
      const level = this.currentLevel();

      // Only render if we have valid state and textures are loaded
      if (dungeon && level && this.texturesLoaded) {
        this.render();
      }
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      console.error('[MazeCanvasComponent] Canvas element not found');
      return;
    }

    // Initialize WebGL renderer
    this.webglRenderer = new WebGLRenderingService();
    const success = this.webglRenderer.initialize(canvas);

    if (!success) {
      console.error('[MazeCanvasComponent] Failed to initialize WebGL renderer');
      this.webglRenderer = null;
      return;
    }

    console.log('[MazeCanvasComponent] WebGL renderer initialized successfully');

    // Setup responsive canvas resizing
    this.setupCanvasResizing();

    // Load textures and render
    this.loadTextures();
  }

  ngOnDestroy(): void {
    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clean up WebGL renderer
    if (this.webglRenderer) {
      this.webglRenderer.dispose();
      this.webglRenderer = null;
    }
  }

  /**
   * Public render method - can be called by parent when needed
   * (e.g., after movement, door opens, light changes)
   */
  render(): void {
    if (!this.webglRenderer) {
      console.warn('[MazeCanvasComponent] WebGL renderer not initialized');
      return;
    }

    const dungeon = this.dungeonState();
    if (!dungeon) {
      console.warn('[MazeCanvasComponent] No dungeon state available');
      return;
    }

    const level = DungeonService.loadLevel(this.currentLevel());
    if (!level) {
      console.warn('[MazeCanvasComponent] No current level');
      return;
    }

    const position = dungeon.position;
    if (!position) {
      console.warn('[MazeCanvasComponent] No party position');
      return;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      console.warn('[MazeCanvasComponent] Canvas not available');
      return;
    }

    // Get effective view distance based on light state
    const viewDistance = LightService.getEffectiveViewDistance(dungeon);

    // Viewport configuration - tileDepth controlled by light state
    const config: ViewportConfig = {
      width: canvas.width,
      height: canvas.height,
      tileDepth: viewDistance,
      peripheralColumns: Math.min(viewDistance + 2, 7) // Peripheral scales with view
    };

    // Render the dungeon with dungeon state for door rendering
    this.webglRenderer.render(level, position, config, dungeon);
  }

  /**
   * Setup ResizeObserver for dynamic canvas resolution scaling.
   * Updates canvas pixel dimensions when viewport size changes,
   * ensuring sharp rendering at all screen sizes.
   */
  private setupCanvasResizing(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      console.warn('[MazeCanvasComponent] Canvas not found for resize observer');
      return;
    }

    // Observe the canvas element's parent (or host element)
    const observeTarget = canvas.parentElement || canvas;

    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;

      // Get container size
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      // Update canvas resolution (respecting device pixel ratio for sharpness)
      // Cap at 2x to avoid excessive GPU load on 4K+ displays
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const newWidth = Math.floor(width * dpr);
      const newHeight = Math.floor(height * dpr);

      // Only update if dimensions actually changed
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        console.log(
          `[MazeCanvasComponent] Canvas resized to ${newWidth}x${newHeight} ` +
          `(container: ${Math.floor(width)}x${Math.floor(height)}, dpr: ${dpr})`
        );

        // Re-render with new dimensions
        this.render();
      }
    });

    this.resizeObserver.observe(observeTarget);
  }

  /**
   * Load texture atlas and upload to GPU
   */
  private async loadTextures(): Promise<void> {
    try {
      console.log('[MazeCanvasComponent] Loading texture atlas...');

      // Load compressed texture atlas metadata (11MB vs 35MB original)
      const response = await fetch('/assets/textures/eob-dungeon-highres-compressed.json');
      if (!response.ok) {
        throw new Error(`Failed to load texture atlas: ${response.statusText}`);
      }
      const atlas: TextureAtlas = await response.json();

      // Load texture image
      console.log('[MazeCanvasComponent] Loading texture image from:', atlas.imagePath);
      const image = await TextureAtlasService.loadTextureAtlas(atlas);

      console.log('[MazeCanvasComponent] Texture atlas loaded:', {
        dimensions: `${image.naturalWidth}x${image.naturalHeight}`,
        textures: atlas.textures.length
      });

      // Upload texture to GPU
      if (this.webglRenderer) {
        const texture = this.webglRenderer.uploadTexture(image);
        if (texture) {
          console.log('[MazeCanvasComponent] Texture uploaded to GPU');
          // Set atlas metadata for texture lookups
          this.webglRenderer.setAtlas(atlas);
          console.log('[MazeCanvasComponent] Atlas metadata set');
          this.texturesLoaded = true;
        } else {
          console.error('[MazeCanvasComponent] Failed to upload texture to GPU');
        }
      }

      // Trigger initial render
      this.render();
    } catch (error) {
      console.error('[MazeCanvasComponent] Failed to load textures:', error);
      console.error('[MazeCanvasComponent] Stack trace:', (error as Error).stack);
    }
  }
}
