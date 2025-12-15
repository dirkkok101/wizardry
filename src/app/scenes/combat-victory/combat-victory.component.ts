import {
  Component,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { VictoryService, VictoryRewards } from '@services/VictoryService';
import { FightMapService } from '@services/FightMapService';
import { ChestService } from '@services/ChestService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CombatState } from '@models/Combat';
import { DungeonState } from '@models/Dungeon';
import { Chest } from '@models/Chest';

/**
 * CombatVictoryComponent - Victory rewards phase of combat.
 *
 * This component:
 * 1. Calculates XP, gold, and item rewards from defeated monsters
 * 2. Displays the rewards to the player
 * 3. Applies rewards to party (XP, gold, items)
 * 4. Marks fixed encounters as triggered
 * 5. Clears combat state
 * 6. Navigates based on result:
 *    - If treasure_room encounter → /maze/chest (sets pendingChest)
 *    - Else → /maze
 *
 * The rewards are displayed for 2.5 seconds before transitioning.
 */
@Component({
  selector: 'app-combat-victory',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="combat-victory">
      <div class="victory-panel">
        <!-- Victory Title -->
        <h1 class="victory-title">VICTORY!</h1>

        <!-- Rewards Display -->
        @if (rewards()) {
          <div class="rewards-section">
            <div class="reward-row">
              <span class="reward-label">Experience:</span>
              <span class="reward-value">{{ rewards()!.totalXP }} XP</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Per Character:</span>
              <span class="reward-value">{{ rewards()!.xpPerCharacter }} XP each</span>
            </div>
            <div class="reward-row">
              <span class="reward-label">Living Members:</span>
              <span class="reward-value">{{ rewards()!.livingCharacterCount }}</span>
            </div>
            @if (rewards()!.totalGold > 0) {
              <div class="reward-row gold">
                <span class="reward-label">Gold:</span>
                <span class="reward-value">{{ rewards()!.totalGold }} GP</span>
              </div>
            }
            @if (rewards()!.items.length > 0) {
              <div class="items-section">
                <span class="items-label">Items Found:</span>
                <ul class="items-list">
                  @for (item of rewards()!.items; track item.itemId) {
                    <li class="item-entry" [class.unidentified]="!item.identified">
                      {{ item.identified ? item.itemName : item.unidentifiedName || 'Unknown Item' }}
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        }

        <!-- Status Message -->
        <div class="status-message">
          {{ statusMessage() }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .combat-victory {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.85);
      z-index: 100;
    }

    .victory-panel {
      background: linear-gradient(135deg, rgba(20, 30, 20, 0.95), rgba(10, 20, 10, 0.98));
      border: 2px solid var(--color-status-ok);
      border-radius: 8px;
      padding: 2rem 3rem;
      text-align: center;
      min-width: 320px;
      max-width: 480px;
      box-shadow: 0 0 30px rgba(34, 197, 94, 0.3);
    }

    .victory-title {
      font-family: var(--font-display);
      font-size: 2.5rem;
      color: var(--color-status-ok);
      margin: 0 0 1.5rem 0;
      text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
      letter-spacing: 0.1em;
    }

    .rewards-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .reward-row {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-body);
      font-size: 1rem;
      padding: 0.25rem 0;
    }

    .reward-label {
      color: var(--color-text-secondary);
    }

    .reward-value {
      color: var(--color-text-primary);
      font-weight: 600;
    }

    .reward-row.gold .reward-value {
      color: var(--color-gold-primary);
    }

    .items-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .items-label {
      display: block;
      font-family: var(--font-body);
      color: var(--color-text-secondary);
      margin-bottom: 0.5rem;
      text-align: left;
    }

    .items-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .item-entry {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--color-text-primary);
      padding: 0.25rem 0.5rem;
      text-align: left;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      margin-bottom: 0.25rem;
    }

    .item-entry.unidentified {
      color: var(--color-text-secondary);
      font-style: italic;
    }

    .status-message {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      margin-top: 1rem;
      font-style: italic;
    }
  `]
})
export class CombatVictoryComponent implements OnInit {
  // Rewards calculated from defeated monsters
  readonly rewards = signal<VictoryRewards | null>(null);
  readonly statusMessage = signal<string>('Calculating rewards...');

  // Computed from GameState
  readonly combatState = computed(() => this.gameState.state().combat as CombatState | undefined);
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState | undefined);

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.processVictory();
  }

  /**
   * Process victory rewards and apply them to party
   */
  private async processVictory(): Promise<void> {
    const combat = this.combatState();
    if (!combat) {
      console.error('[CombatVictory] No combat state!');
      this.router.navigate(['/maze']);
      return;
    }

    console.log('[CombatVictory] Starting victory processing');

    // Get all monsters (alive and dead) for reward calculation
    const allMonsters = combat.monsterGroups.flatMap(g => g.monsters);
    const state = this.gameState.state();

    // Calculate rewards using VictoryService
    const rewards = VictoryService.calculateVictoryRewards(
      allMonsters,
      state.roster,
      state.party.members
    );
    this.rewards.set(rewards);
    this.statusMessage.set('Distributing rewards...');

    console.log('[CombatVictory] Rewards calculated', {
      totalXP: rewards.totalXP,
      xpPerCharacter: rewards.xpPerCharacter,
      livingMembers: rewards.livingCharacterCount,
      items: rewards.items.length
    });

    // Wait for player to see rewards (2.5 seconds for visual impact)
    await this.delay(2500);

    // Apply rewards and determine next destination
    await this.applyVictoryRewards(rewards, combat);
  }

  /**
   * Apply victory rewards to party
   */
  private async applyVictoryRewards(rewards: VictoryRewards, combatState: CombatState): Promise<void> {
    console.log('[CombatVictory] Applying rewards');

    // Mark fixed encounter as triggered at VICTORY (not before combat)
    // This allows re-triggering if player flees, but prevents repeats after victory
    if (combatState.encounterReason === 'fixed') {
      const dungeon = this.dungeonState();
      if (dungeon) {
        console.log(`[CombatVictory] Marking fixed encounter as triggered at (${dungeon.position.x},${dungeon.position.y})`);
        FightMapService.markFixedEncounterTriggered(
          dungeon.currentLevel,
          dungeon.position.x,
          dungeon.position.y
        );
      }
    }

    // Determine if chest should appear (only for treasure_room encounters)
    const shouldShowChest = combatState.encounterReason === 'treasure_room';
    let pendingChest: Chest | undefined;

    if (shouldShowChest) {
      // Generate chest based on monster level
      const dungeon = this.dungeonState();
      const position = dungeon?.position ?? { x: 0, y: 0, facing: 'NORTH' as const };
      const mazeLevel = dungeon?.currentLevel ?? 1;

      // Get highest monster level from defeated groups for reward tier calculation
      const maxMonsterLevel = combatState.monsterGroups
        .flatMap(g => g.monsters)
        .reduce((max, m) => Math.max(max, m.level), 1);

      pendingChest = await ChestService.generateCombatChest(
        maxMonsterLevel,
        mazeLevel,
        { x: position.x, y: position.y, facing: position.facing }
      );

      console.log('[CombatVictory] Generated chest for treasure room', {
        gold: pendingChest.contents.gold,
        itemCount: pendingChest.contents.items.length,
        trapped: pendingChest.trapped
      });
    }

    // Apply all state changes atomically
    this.gameState.updateState(state => {
      // Use VictoryService to distribute XP (handles dead character exclusion)
      const rosterWithXP = VictoryService.distributeRewards(
        state.roster,
        state.party.members,
        rewards.xpPerCharacter
      );

      // Distribute items if any
      const { roster: finalRoster } = VictoryService.distributeItems(
        rosterWithXP,
        state.party.members,
        rewards.items
      );

      return {
        ...state,
        roster: finalRoster,
        party: {
          ...state.party,
          gold: state.party.gold + rewards.totalGold
        },
        combat: undefined,  // Clear combat state
        pendingChest: pendingChest  // Set pending chest if treasure room
      };
    });

    // Log final character states
    console.log('[CombatVictory] After rewards - Character states:');
    for (const char of this.partyCharacters()) {
      console.log(`[CombatVictory]   ${char.name}: HP=${char.hp}, Status=${char.status}, XP=${char.experience}`);
    }

    // Navigate based on result
    if (pendingChest) {
      this.statusMessage.set('A treasure chest appears!');
      await this.delay(500);
      console.log('[CombatVictory] Navigating to chest');
      this.router.navigate(['/maze/chest']);
    } else {
      this.statusMessage.set('Returning to exploration...');
      await this.delay(500);
      console.log('[CombatVictory] Returning to exploration');
      this.router.navigate(['/maze']);
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
