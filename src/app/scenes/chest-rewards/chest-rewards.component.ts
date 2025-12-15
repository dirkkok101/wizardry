import {
  Component,
  OnInit,
  signal,
  computed,
  HostListener
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { ChestService } from '@services/ChestService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { getItemDisplayName } from '@utils/ItemDisplayHelpers';
import { Character } from '@models/Character';
import { Item } from '@models/Item';
import { Chest, TreasureDistributionResult } from '@models/Chest';

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
 */
@Component({
  selector: 'app-chest-rewards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chest-rewards">
      <!-- Treasure Banner -->
      <div class="treasure-banner" [class.visible]="showBanner()">
        <div class="banner-content">TREASURE!</div>
      </div>

      <!-- Rewards Panel -->
      <div class="rewards-panel" [class.visible]="showRewards()">
        <h2 class="rewards-title">Chest Contents</h2>

        <!-- Gold Display -->
        <div class="reward-section gold-section">
          <span class="reward-label">Gold Found:</span>
          <span class="reward-value gold">{{ goldObtained() }} GP</span>
        </div>

        <!-- Items Found -->
        @if (itemsReceived().length > 0 || itemsLost().length > 0) {
          <div class="reward-section items-section">
            <span class="items-header">Items:</span>

            <!-- Items received -->
            @for (item of itemsReceived(); track item.id) {
              <div class="item-row received">
                <span class="item-name">{{ getItemName(item) }}</span>
                <span class="item-status">→ {{ recipientName() }}</span>
              </div>
            }

            <!-- Items lost (no inventory space) -->
            @for (item of itemsLost(); track item.id) {
              <div class="item-row lost">
                <span class="item-name">{{ getItemName(item) }}</span>
                <span class="item-status">Lost!</span>
              </div>
            }

            <!-- No items case -->
            @if (itemsReceived().length === 0 && itemsLost().length === 0) {
              <div class="no-items">No items found</div>
            }
          </div>
        }

        <!-- Recipient Info -->
        @if (recipientName()) {
          <div class="recipient-info">
            Items received by: {{ recipientName() }}
          </div>
        }
      </div>

      <!-- Continue Prompt -->
      <div class="continue-prompt" [class.visible]="showContinue()">
        Press any key to continue...
      </div>
    </div>
  `,
  styles: [`
    .chest-rewards {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.85);
      z-index: 100;
    }

    .treasure-banner {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: linear-gradient(180deg, rgba(180, 130, 50, 0.95), rgba(120, 80, 30, 0.9));
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateY(-100%);
      transition: transform 0.4s ease-out;
      border-bottom: 2px solid var(--color-gold-primary);
      box-shadow: 0 4px 20px rgba(212, 165, 116, 0.4);

      &.visible {
        transform: translateY(0);
      }
    }

    .banner-content {
      font-family: var(--font-display);
      font-size: 2.5rem;
      color: #fff;
      letter-spacing: 0.2em;
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
      animation: glow 1s ease-in-out infinite alternate;
    }

    @keyframes glow {
      from { text-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
      to { text-shadow: 0 0 30px rgba(255, 215, 0, 1); }
    }

    .rewards-panel {
      background: linear-gradient(135deg, rgba(30, 25, 15, 0.95), rgba(20, 15, 10, 0.98));
      border: 2px solid var(--color-gold-primary);
      border-radius: 8px;
      padding: 2rem 3rem;
      min-width: 350px;
      max-width: 500px;
      box-shadow: 0 0 30px rgba(212, 165, 116, 0.3);
      opacity: 0;
      transform: scale(0.95);
      transition: opacity 0.3s ease, transform 0.3s ease;

      &.visible {
        opacity: 1;
        transform: scale(1);
      }
    }

    .rewards-title {
      font-family: var(--font-display);
      font-size: 1.5rem;
      color: var(--color-gold-primary);
      text-align: center;
      margin: 0 0 1.5rem 0;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(212, 165, 116, 0.3);
    }

    .reward-section {
      margin-bottom: 1rem;
    }

    .gold-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
    }

    .reward-label {
      font-family: var(--font-body);
      font-size: 1rem;
      color: var(--color-text-secondary);
    }

    .reward-value {
      font-family: var(--font-body);
      font-size: 1.2rem;
      font-weight: 600;

      &.gold {
        color: var(--color-gold-primary);
      }
    }

    .items-section {
      padding: 1rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
    }

    .items-header {
      display: block;
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-family: var(--font-body);
      font-size: 0.9rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      animation: slideIn 0.3s ease-out;

      &:last-child {
        border-bottom: none;
      }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .item-row.received .item-name {
      color: var(--color-text-primary);
    }

    .item-row.received .item-status {
      color: var(--color-status-ok);
    }

    .item-row.lost .item-name {
      color: var(--color-text-secondary);
      text-decoration: line-through;
    }

    .item-row.lost .item-status {
      color: #ef4444;
    }

    .no-items {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      font-style: italic;
      text-align: center;
    }

    .recipient-info {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(212, 165, 116, 0.3);
      font-family: var(--font-body);
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      text-align: center;
      font-style: italic;
    }

    .continue-prompt {
      position: absolute;
      bottom: 2rem;
      font-family: var(--font-body);
      font-size: 1rem;
      color: var(--color-text-secondary);
      opacity: 0;
      transition: opacity 0.3s ease;
      animation: pulse 1.5s ease-in-out infinite;

      &.visible {
        opacity: 1;
      }
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `]
})
export class ChestRewardsComponent implements OnInit {
  // Animation state
  readonly showBanner = signal(false);
  readonly showRewards = signal(false);
  readonly showContinue = signal(false);
  private canContinue = false;

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

  // Pending chest
  readonly pendingChest = computed(() => this.gameState.state().pendingChest);

  constructor(
    private gameState: GameStateService,
    private router: Router
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

  /**
   * Get display name for an item
   */
  getItemName(item: Item): string {
    return getItemDisplayName(item);
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
    // Phase 1: Show treasure banner
    await this.delay(200);
    this.showBanner.set(true);

    // Phase 2: Show rewards panel
    await this.delay(800);
    this.showRewards.set(true);

    // Phase 3: Enable continue prompt
    await this.delay(1500);
    this.showContinue.set(true);
    this.canContinue = true;
  }

  /**
   * Handle keyboard input to continue
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (this.canContinue) {
      event.preventDefault();
      this.returnToExploration();
    }
  }

  /**
   * Handle click to continue
   */
  @HostListener('click')
  handleClick(): void {
    if (this.canContinue) {
      this.returnToExploration();
    }
  }

  /**
   * Return to maze exploration
   */
  private returnToExploration(): void {
    console.log('[ChestRewards] Returning to exploration');
    this.router.navigate(['/maze']);
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
