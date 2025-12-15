import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  computed,
  effect,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { GameStateService } from '@services/GameStateService';
import { WebGLRenderingService } from '@services/WebGLRenderingService';
import { DungeonService } from '@services/DungeonService';
import { FightMapService } from '@services/FightMapService';
import { LightService } from '@services/LightService';
import { DungeonState } from '@models/Dungeon';
import { TextureAtlas } from '@models/texture.types';
import { ViewportConfig } from '@models/rendering.types';
import * as TextureAtlasService from '@services/TextureAtlasService';

/**
 * MazeLayoutComponent - Container layout for all maze-related routes.
 *
 * This component owns the WebGL canvas and keeps it mounted across all child routes
 * (exploration, combat, chest). Child routes render as overlays via the router-outlet.
 *
 * Architecture:
 * - Canvas is always mounted and initialized once
 * - Child routes render their UI over the canvas
 * - WebGL renderer is shared via MazeCanvasService (TODO: implement if needed)
 *
 * Routes:
 * - /maze → MazeExplorationComponent (default)
 * - /maze/combat/planning → CombatPlanningComponent
 * - /maze/combat/playback → CombatPlaybackComponent
 * - /maze/combat/victory → CombatVictoryComponent
 * - /maze/combat/defeat → CombatDefeatComponent
 * - /maze/chest → ChestComponent
 * - /maze/chest/playback → ChestPlaybackComponent
 * - /maze/chest/rewards → ChestRewardsComponent
 */
@Component({
  selector: 'app-maze-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="maze-layout">
      <!-- WebGL Canvas - always mounted -->
      <canvas #mazeCanvas class="maze-canvas"></canvas>

      <!-- Child routes render as overlays -->
      <div class="overlay-layer">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .maze-layout {
      position: relative;
      width: 100%;
      height: 100vh;
      background: var(--color-bg-darkest);
      overflow: hidden;
    }

    .maze-canvas {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      /* Canvas sizing handled by WebGL viewport */
    }

    .overlay-layer {
      position: absolute;
      inset: 0;
      z-index: 1;
      /* Child routes render here with their own positioning */
    }
  `]
})
export class MazeLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mazeCanvas', { static: false })
  canvasRef?: ElementRef<HTMLCanvasElement>;

  // WebGL state
  private webglRenderer: WebGLRenderingService | null = null;
  private textureAtlas: TextureAtlas | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Loading state
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  // Computed from GameState
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState);
  readonly currentLevel = computed(() => this.dungeonState()?.currentLevel ?? 1);
  readonly position = computed(() => this.dungeonState()?.position);
  readonly facing = computed(() => this.dungeonState()?.position?.facing ?? 'N');

  constructor(private gameState: GameStateService) {
    // Effect to re-render when dungeon state changes (position, doors, light)
    effect(() => {
      // Track the position and facing to detect movement
      const pos = this.position();
      const dir = this.facing();
      const dungeon = this.dungeonState();

      // Don't render during initial setup or if textures not loaded
      untracked(() => {
        if (this.textureAtlas && this.webglRenderer && pos && dungeon) {
          console.log(`[MazeLayout] Position changed: (${pos.x}, ${pos.y}) facing ${dir}`);
          this.render();
        }
      });
    });
  }

  ngOnInit(): void {
    // Validate dungeon state
    const dungeon = this.dungeonState();
    if (!dungeon) {
      this.errorMessage.set('No active dungeon. Return to castle and enter the maze.');
      return;
    }

    // Initialize FIGHTMAP for the current level
    this.initializeFightMap(dungeon.currentLevel);
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      console.error('[MazeLayout] Canvas element not found');
      this.errorMessage.set('Failed to initialize maze renderer.');
      return;
    }

    // Initialize WebGL renderer
    this.webglRenderer = new WebGLRenderingService();
    const success = this.webglRenderer.initialize(canvas);

    if (!success) {
      console.error('[MazeLayout] Failed to initialize WebGL renderer');
      this.webglRenderer = null;
      this.errorMessage.set('WebGL not supported. Please use a modern browser.');
      return;
    }

    console.log('[MazeLayout] WebGL renderer initialized');

    // Setup responsive canvas resizing
    this.setupCanvasResizing();

    // Load textures and render initial frame
    this.loadTextures();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.webglRenderer) {
      this.webglRenderer.dispose();
      this.webglRenderer = null;
    }
  }

  /**
   * Initialize FIGHTMAP for a dungeon level.
   * Sets up encounter state tracking and initializes fixed encounters.
   */
  private initializeFightMap(level: number): void {
    const existingState = FightMapService.getLevelState(level);

    if (existingState) {
      console.log(`[MazeLayout] FIGHTMAP already initialized for level ${level}`);
      FightMapService.resetRepeatableEncounters(level);
      return;
    }

    console.log(`[MazeLayout] Initializing FIGHTMAP for level ${level}`);

    try {
      const levelData = DungeonService.loadLevel(level);
      const roomTiles = DungeonService.getRoomTiles(levelData);

      FightMapService.initializeLevel(level, roomTiles);
      FightMapService.seedTreasureRooms(level, roomTiles);

      // Initialize fixed encounters
      const fixedEncounters = DungeonService.getFixedEncounterTiles(levelData);
      for (const fe of fixedEncounters) {
        FightMapService.initializeFixedEncounter(level, fe.x, fe.y, {
          encounterId: fe.encounterId,
          repeatable: fe.repeatable,
          cannotFlee: fe.cannotFlee
        });
      }

      console.log(`[MazeLayout] FIGHTMAP initialized:`, {
        roomTiles: roomTiles.length,
        fixedEncounters: fixedEncounters.length
      });
    } catch (error) {
      console.error(`[MazeLayout] Failed to initialize FIGHTMAP:`, error);
    }
  }

  /**
   * Setup ResizeObserver for dynamic canvas resolution scaling.
   */
  private setupCanvasResizing(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.updateCanvasSize();
    });

    this.resizeObserver.observe(canvas.parentElement!);
    this.updateCanvasSize();
  }

  /**
   * Update canvas dimensions based on container size.
   */
  private updateCanvasSize(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.webglRenderer) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Calculate size maintaining aspect ratio
    const maxWidth = parent.clientWidth * 0.6;
    const maxHeight = parent.clientHeight * 0.7;
    const aspectRatio = 4 / 3;

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;

    // Re-render if textures loaded
    if (this.textureAtlas) {
      this.render();
    }
  }

  /**
   * Load texture atlas and upload to GPU.
   */
  private async loadTextures(): Promise<void> {
    try {
      console.log('[MazeLayout] Loading texture atlas...');

      // Load compressed texture atlas metadata
      const response = await fetch('/assets/textures/eob-dungeon-highres-compressed.json');
      if (!response.ok) {
        throw new Error(`Failed to load texture atlas: ${response.statusText}`);
      }
      const atlas: TextureAtlas = await response.json();
      this.textureAtlas = atlas;

      // Load texture image
      console.log('[MazeLayout] Loading texture image from:', atlas.imagePath);
      const image = await TextureAtlasService.loadTextureAtlas(atlas);

      console.log('[MazeLayout] Texture atlas loaded:', {
        dimensions: `${image.naturalWidth}x${image.naturalHeight}`,
        textures: atlas.textures.length
      });

      // Upload texture to GPU
      if (this.webglRenderer) {
        const texture = this.webglRenderer.uploadTexture(image);
        if (texture) {
          console.log('[MazeLayout] Texture uploaded to GPU');
          this.webglRenderer.setAtlas(atlas);
          console.log('[MazeLayout] Atlas metadata set');
        } else {
          console.error('[MazeLayout] Failed to upload texture to GPU');
        }
      }

      this.isLoading.set(false);
      this.render();
    } catch (error) {
      console.error('[MazeLayout] Failed to load textures:', error);
      this.errorMessage.set('Failed to load game textures.');
    }
  }

  /**
   * Render the current dungeon view using WebGL.
   */
  render(): void {
    if (!this.webglRenderer) {
      console.warn('[MazeLayout] WebGL renderer not initialized');
      return;
    }

    const dungeon = this.dungeonState();
    if (!dungeon) return;

    const level = DungeonService.loadLevel(dungeon.currentLevel);
    if (!level) {
      console.warn('[MazeLayout] No current level');
      return;
    }

    const position = dungeon.position;
    if (!position) {
      console.warn('[MazeLayout] No party position');
      return;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      console.warn('[MazeLayout] Canvas not available');
      return;
    }

    // Get effective view distance based on light state
    const viewDistance = LightService.getEffectiveViewDistance(dungeon);

    // Viewport configuration
    const config: ViewportConfig = {
      width: canvas.width,
      height: canvas.height,
      tileDepth: viewDistance,
      peripheralColumns: Math.min(viewDistance + 2, 7)
    };

    // Render the dungeon with dungeon state for door rendering
    this.webglRenderer.render(level, position, config, dungeon);
  }

  /**
   * Public method to trigger a re-render.
   * Child routes can call this when the dungeon state changes.
   */
  triggerRender(): void {
    this.render();
  }

  /**
   * Get the WebGL renderer for child routes that need direct access.
   */
  getRenderer(): WebGLRenderingService | null {
    return this.webglRenderer;
  }
}
