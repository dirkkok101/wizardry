import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  HostListener
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { MessageLogComponent } from '@shared/components/message-log/message-log.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { CachedImageDirective } from '@shared/directives/cached-image.directive';
import { GameStateService } from '@services/GameStateService';
import { ChestService } from '@services/ChestService';
import { MessageLogService } from '@services/MessageLogService';
import { LightService } from '@services/LightService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { getItemDisplayName } from '@utils/ItemDisplayHelpers';
import { Character } from '@models/Character';
import { Item } from '@models/Item';
import { Chest, TreasureDistributionResult } from '@models/Chest';
import { ActiveSpell } from '@models/active-spell.types';
import { ANIMATION_TIMINGS } from '@config/AnimationTimings';

/**
 * ChestRewardsComponent - Loot distribution screen.
 *
 * This component:
 * 1. Reads pendingChest from GameState
 * 2. Distributes treasure using ChestService
 * 3. Displays gold and items found
 * 4. Updates party gold and recipient inventory
 * 5. Clears pendingChest from GameState
 * 6. Navigates to /maze
 *
 * Uses same 3-column layout as other maze scenes for consistency.
 */
@Component({
  selector: 'app-chest-rewards',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    SceneFooterComponent,
    CachedImageDirective
  ],
  template: `
    <div class="chest-rewards">
      <!-- Title with Active Spells -->
      <app-scene-title title="Treasure" [activeSpells]="activeSpells()"></app-scene-title>

      <!-- 3-Column Layout -->
      <div class="maze-content">
        <!-- Left Column: Positions 0, 2, 4 -->
        <div class="left-panel">
          <app-character-panel [characters]="leftPanelCharacters()" variant="compact" />
        </div>

        <!-- Center Column: Viewport + Message Log -->
        <div class="center-panel">
          <div class="maze-viewport">
            <!-- Reward overlay (theater elements constrained here) -->
            <div class="reward-overlay">
              <!-- Vignette Effect -->
              <div class="chest-vignette"></div>

              <!-- Sprite Background -->
              <div class="chest-sprite-layer">
                @if (!spriteError()) {
                  <img
                    [appCachedSrc]="spriteUrl()"
                    alt="Open treasure chest"
                    class="chest-sprite"
                    (error)="onSpriteError()"
                  />
                }
              </div>

              <!-- Gradient Overlay -->
              <div class="chest-gradient-overlay"></div>

              <!-- Reward Content -->
              @if (showRewards()) {
                <div class="reward-content">
                  <h3 class="result-title">Treasure!</h3>

                  @if (goldObtained() > 0) {
                    <div class="reward-badge gold">
                      <span class="reward-value">{{ goldObtained() }}</span>
                      <span class="reward-label">GOLD</span>
                    </div>
                  }

                  @if (itemsReceived().length > 0) {
                    <div class="items-section">
                      <p class="items-header">Items for {{ recipientName() }}:</p>
                      <div class="items-row">
                        @for (item of itemsReceived(); track item.id) {
                          <span class="item-tag">{{ getItemName(item) }}</span>
                        }
                      </div>
                    </div>
                  }

                  @if (goldObtained() === 0 && itemsReceived().length === 0 && itemsLost().length === 0) {
                    <p class="empty-chest">The chest was empty.</p>
                  }

                  @if (itemsLost().length > 0) {
                    <div class="items-lost-section">
                      <h4 class="warning-title">Items Lost (Inventory Full)</h4>
                      <div class="items-row lost">
                        @for (item of itemsLost(); track item.id) {
                          <span class="item-tag lost">{{ getItemName(item) }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          <div class="message-log-section">
            <app-message-log [messages]="messages()" />
          </div>
        </div>

        <!-- Right Column: Positions 1, 3, 5 -->
        <div class="right-panel">
          <app-character-panel [characters]="rightPanelCharacters()" variant="compact" />
        </div>
      </div>

      <!-- Footer Menu -->
      <app-scene-footer
        [menuItems]="footerMenuItems()"
        (itemSelected)="onFooterSelect($event)"
      ></app-scene-footer>
    </div>
  `,
  styles: [`
    /* ============================================
       MAIN CONTAINER - matches maze-chest
       ============================================ */
    .chest-rewards {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: transparent;
      color: var(--color-text-primary);
      font-family: var(--font-body);
      padding: 0.5rem;
      box-sizing: border-box;
      overflow: hidden;
    }

    :host ::ng-deep app-scene-title,
    :host ::ng-deep app-scene-footer {
      display: block;
      flex-shrink: 0;
    }

    /* ============================================
       3-COLUMN LAYOUT - matches maze-chest
       ============================================ */
    .maze-content {
      display: grid;
      grid-template-columns: minmax(200px, var(--scene-panel-max-width)) auto minmax(200px, var(--scene-panel-max-width));
      gap: 0.5rem;
      flex: 1;
      min-height: 0;
    }

    /* 4K screens: 50% larger cards */
    @media (min-width: 2000px) {
      .maze-content {
        grid-template-columns: minmax(350px, var(--scene-panel-max-width-4k)) auto minmax(350px, var(--scene-panel-max-width-4k));
      }
    }

    /* Side panels (character columns) */
    .left-panel,
    .right-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      max-width: var(--scene-panel-max-width);
      align-self: start;
    }

    @media (min-width: 2000px) {
      .left-panel,
      .right-panel {
        max-width: var(--scene-panel-max-width-4k);
      }
    }

    /* Make character panel fill the entire side column */
    :host ::ng-deep .left-panel app-character-panel,
    :host ::ng-deep .right-panel app-character-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      min-height: 0;
    }

    /* Center column: Viewport + Message Log */
    .center-panel {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 0;
      min-width: 0;
      align-items: center;
      overflow: visible;
      padding: 0.5rem 2px;
    }

    /* Viewport container - shows overlay content */
    .maze-viewport {
      position: relative;
      flex: 1;
      min-height: 0;
      width: 100%;
      aspect-ratio: var(--scene-viewport-aspect) / 1;
      max-width: 100%;
      background: #000;
      border: 1px solid var(--color-gold-primary);
      border-radius: 4px;
      overflow: hidden;
    }

    .message-log-section {
      width: 100%;
      height: 120px;
      min-height: 90px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 0.1rem 0.25rem;
      background: var(--color-bg-card);
      flex-shrink: 0;
      box-sizing: border-box;
    }

    :host ::ng-deep .message-log-section app-message-log {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    /* ============================================
       REWARD OVERLAY - constrained to viewport
       ============================================ */
    .reward-overlay {
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    /* ============================================
       VIGNETTE EFFECT
       ============================================ */
    .chest-vignette {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(
        ellipse at center,
        transparent 20%,
        rgba(0, 0, 0, 0.4) 60%,
        rgba(0, 0, 0, 0.7) 100%
      );
      animation: vignette-pulse 4s ease-in-out infinite;
      z-index: 1;
    }

    @keyframes vignette-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }

    /* ============================================
       SPRITE LAYER
       ============================================ */
    .chest-sprite-layer {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .chest-sprite {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      animation: sprite-fade-in 0.8s ease-out;
    }

    @keyframes sprite-fade-in {
      0% { opacity: 0; transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* ============================================
       GRADIENT OVERLAY
       ============================================ */
    .chest-gradient-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.5) 0%,
        rgba(0, 0, 0, 0.2) 30%,
        rgba(0, 0, 0, 0.2) 70%,
        rgba(0, 0, 0, 0.6) 100%
      );
    }

    /* ============================================
       REWARD CONTENT
       ============================================ */
    .reward-content {
      position: absolute;
      inset: 0;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      gap: 0.75rem;
      animation: content-fade-in 0.6s ease-out;
    }

    @keyframes content-fade-in {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    .result-title {
      font-family: var(--font-display);
      font-size: 1.5rem;
      color: var(--color-gold-bright, #f4c430);
      text-align: center;
      letter-spacing: 0.1em;
      text-shadow:
        0 0 20px var(--color-gold-glow, rgba(244, 196, 48, 0.8)),
        0 2px 4px rgba(0, 0, 0, 0.8);
      margin: 0;
    }

    /* ============================================
       REWARD BADGE
       ============================================ */
    .reward-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.75rem 1.25rem;
      border-radius: 6px;
      min-width: 80px;
      backdrop-filter: blur(8px);

      &.gold {
        background: rgba(212, 165, 116, 0.2);
        border: 1px solid var(--color-gold-primary);
        box-shadow: 0 0 15px rgba(212, 165, 116, 0.3);
      }

      .reward-value {
        font-family: var(--font-body);
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--color-gold-primary);
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }

      .reward-label {
        font-family: var(--font-display);
        font-size: 0.6rem;
        letter-spacing: 0.15em;
        color: var(--color-text-primary);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      }
    }

    /* ============================================
       ITEMS SECTION
       ============================================ */
    .items-section {
      text-align: center;
    }

    .items-header {
      color: var(--color-text-secondary);
      font-size: 0.8rem;
      margin: 0 0 0.5rem 0;
    }

    .items-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.35rem;

      &.lost .item-tag {
        color: var(--color-text-muted);
        border-color: var(--color-text-muted);
        background: rgba(102, 102, 102, 0.25);
        text-decoration: line-through;
        box-shadow: none;
      }
    }

    .item-tag {
      font-family: var(--font-body);
      font-size: 0.75rem;
      color: var(--color-magic, #a855f7);
      padding: 0.2rem 0.5rem;
      background: rgba(168, 85, 247, 0.25);
      border: 1px solid var(--color-magic, #a855f7);
      border-radius: 4px;
      backdrop-filter: blur(8px);
      box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);

      &.lost {
        color: var(--color-text-muted);
        border-color: var(--color-hp-warning, #f59e0b);
        background: rgba(245, 158, 11, 0.15);
        text-decoration: line-through;
        box-shadow: none;
      }
    }

    .empty-chest {
      color: var(--color-text-secondary);
      font-style: italic;
      text-align: center;
      margin: 0;
    }

    /* ============================================
       ITEMS LOST SECTION (Amber Warning)
       ============================================ */
    .items-lost-section {
      padding: 0.5rem 0.75rem;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid var(--color-hp-warning, #f59e0b);
      border-radius: 6px;
      backdrop-filter: blur(4px);
    }

    .warning-title {
      color: var(--color-hp-warning, #f59e0b);
      font-family: var(--font-display);
      font-size: 0.75rem;
      margin: 0 0 0.5rem 0;
      text-align: center;
    }

    /* ============================================
       REDUCED MOTION
       ============================================ */
    @media (prefers-reduced-motion: reduce) {
      .chest-vignette,
      .chest-sprite,
      .reward-content {
        animation: none;
      }
    }

    /* ============================================
       COMPACT HEIGHT RESPONSIVE - matches maze-chest
       ============================================ */
    @media (max-height: 767px) {
      .chest-rewards {
        padding: 0.25rem;
      }

      .maze-content {
        gap: 0.35rem;
      }

      .message-log-section {
        height: 80px;
        min-height: 70px;
        padding: 0.25rem;
      }
    }

    /* Very compact height */
    @media (max-height: 599px) {
      .message-log-section {
        height: 65px;
      }
    }
  `]
})
export class ChestRewardsComponent implements OnInit, OnDestroy {
  // Animation state
  readonly showRewards = signal(false);
  readonly canContinue = signal(false);

  // Sprite state
  readonly spriteUrl = signal('assets/sprites/chest/chest_open.png');
  readonly spriteError = signal(false);

  // Navigation guard to prevent double-click
  private isNavigating = false;

  // Timeout cleanup for memory leak prevention
  private pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

  // Distribution result
  readonly distributionResult = signal<TreasureDistributionResult | null>(null);

  // Computed from distribution result
  readonly goldObtained = computed(() => this.distributionResult()?.goldAdded ?? 0);
  readonly itemsReceived = computed(() => this.distributionResult()?.itemsReceived ?? []);
  readonly itemsLost = computed(() => this.distributionResult()?.itemsLost ?? []);
  readonly recipientName = computed(() => this.distributionResult()?.recipientName ?? '');

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  // Left panel: positions 0, 2, 4
  readonly leftPanelCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[0], chars[2], chars[4]].filter(Boolean) as Character[];
  });

  // Right panel: positions 1, 3, 5
  readonly rightPanelCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[1], chars[3], chars[5]].filter(Boolean) as Character[];
  });

  // Message log
  readonly messages = computed(() => this.messageLog.messages());

  // Dungeon state for active spells
  readonly dungeonState = computed(() => this.gameState.state().dungeon);

  // Active spells (MILWA, LOMILWA, etc.) - same pattern as maze-chest
  readonly activeSpells = computed((): ActiveSpell[] => {
    const dungeon = this.dungeonState();
    if (!dungeon) return [];

    const spells: ActiveSpell[] = [];

    // Light spells
    if (dungeon.lightActive && dungeon.lightSpellType) {
      const viewDistance = LightService.getEffectiveViewDistance(dungeon);
      const durationText = dungeon.lightDurationRemaining !== undefined
        ? ` (${dungeon.lightDurationRemaining} steps)`
        : '';
      spells.push({
        name: dungeon.lightSpellType,
        icon: '💡',
        description: `Light (Radius: ${viewDistance})${durationText}`,
        variant: 'light'
      });
    }

    return spells;
  });

  // Footer menu items
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'continue', label: 'Continue', shortcut: 'Enter', enabled: this.canContinue() }
  ]);

  // Pending chest
  readonly pendingChest = computed(() => this.gameState.state().pendingChest);

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private messageLog: MessageLogService
  ) {}

  ngOnInit(): void {
    const chest = this.pendingChest();
    if (!chest) {
      console.error('[ChestRewards] No pending chest!');
      this.router.navigate(['/maze']);
      return;
    }

    console.log('[ChestRewards] Distributing treasure:', {
      gold: chest.contents.gold,
      items: chest.contents.items.length
    });

    this.distributeTreasure(chest);
  }

  ngOnDestroy(): void {
    // Clear all pending timeouts to prevent memory leaks
    for (const timeout of this.pendingTimeouts) {
      clearTimeout(timeout);
    }
    this.pendingTimeouts = [];
  }

  /**
   * Get display name for an item
   */
  getItemName(item: Item): string {
    return getItemDisplayName(item);
  }

  /**
   * Handle sprite loading error
   */
  onSpriteError(): void {
    console.warn('[ChestRewards] Failed to load chest sprite');
    this.spriteError.set(true);
  }

  /**
   * Handle footer menu selection
   */
  onFooterSelect(itemId: string): void {
    if (itemId === 'continue' && this.canContinue() && !this.isNavigating) {
      this.returnToExploration();
    }
  }

  /**
   * Distribute treasure and update game state
   */
  private async distributeTreasure(chest: Chest): Promise<void> {
    const partyMembers = this.partyCharacters();

    // Distribute treasure
    const result = ChestService.distributeTreasure(chest, partyMembers);
    this.distributionResult.set(result);

    console.log('[ChestRewards] Distribution result:', {
      gold: result.goldAdded,
      itemsReceived: result.itemsReceived.length,
      itemsLost: result.itemsLost.length,
      recipient: result.recipientName
    });

    // Log rewards to message log
    if (result.goldAdded > 0) {
      this.messageLog.addMessage(`Found ${result.goldAdded} gold!`);
    }

    for (const item of result.itemsReceived) {
      const itemName = getItemDisplayName(item);
      this.messageLog.addMessage(`${result.recipientName} received ${itemName}.`);
    }

    for (const item of result.itemsLost) {
      const itemName = getItemDisplayName(item);
      this.messageLog.addMessage(`Lost ${itemName} - inventory full!`);
    }

    if (result.goldAdded === 0 && result.itemsReceived.length === 0 && result.itemsLost.length === 0) {
      this.messageLog.addMessage('The chest was empty.');
    }

    // Update game state with gold, items, and clear pending chest
    this.gameState.updateState(state =>
      ChestService.applyDistributionToState(state, result)
    );

    // Play animation sequence
    await this.playRewardsSequence();
  }

  /**
   * Play the rewards animation sequence
   */
  private async playRewardsSequence(): Promise<void> {
    // Show rewards after brief delay
    await this.delay(ANIMATION_TIMINGS.CHEST_REWARDS_PANEL_DELAY);
    this.showRewards.set(true);

    // Enable continue after rewards are shown
    await this.delay(ANIMATION_TIMINGS.CHEST_CONTINUE_PROMPT_DELAY);
    this.canContinue.set(true);
  }

  /**
   * Handle keyboard input to continue
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.canContinue() && !this.isNavigating) {
      // Only respond to Enter key (matches footer shortcut)
      if (event.key === 'Enter') {
        event.preventDefault();
        this.returnToExploration();
      }
    }
  }

  /**
   * Return to maze exploration
   */
  private returnToExploration(): void {
    // Prevent double navigation
    this.isNavigating = true;
    console.log('[ChestRewards] Returning to exploration');
    this.router.navigate(['/maze']);
  }

  /**
   * Helper delay function with cleanup tracking
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, ms);
      this.pendingTimeouts.push(timeout);
    });
  }
}
