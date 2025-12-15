import {
  Component,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { EncounterService } from '@services/EncounterService';
import { EncounterTriggerService } from '@services/EncounterTriggerService';
import { TrapEffectService } from '@services/trap/TrapEffectService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { PendingTrapResult } from '@models/GameState';

/**
 * ChestPlaybackComponent - Trap animation playback.
 *
 * This component:
 * 1. Reads pendingTrapResult from GameState
 * 2. Displays trap name letterbox
 * 3. Applies damage/status effects with visual indicators
 * 4. Clears pendingTrapResult after animation
 * 5. Navigates based on result:
 *    - If alarm trap (specialEffect === 'combat') → /maze/combat/planning
 *    - Else → /maze/chest/rewards
 */
@Component({
  selector: 'app-chest-playback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chest-playback">
      <!-- Trap Letterbox Banner -->
      <div class="trap-letterbox" [class.visible]="showLetterbox()">
        <div class="letterbox-content">
          <div class="trap-name">{{ trapName() }}</div>
          <div class="trap-message">{{ trapMessage() }}</div>
        </div>
      </div>

      <!-- Damage/Status Display Panel -->
      @if (showEffects()) {
        <div class="effects-panel">
          <h2 class="effects-title">Trap Effects</h2>

          <!-- Damage dealt to party members -->
          @for (effect of damageEffects(); track effect.characterId) {
            <div class="effect-row damage">
              <span class="effect-name">{{ effect.name }}</span>
              <span class="effect-value">-{{ effect.damage }} HP</span>
            </div>
          }

          <!-- Status effects applied -->
          @for (effect of statusEffects(); track effect.characterId) {
            <div class="effect-row status">
              <span class="effect-name">{{ effect.name }}</span>
              <span class="effect-value status-{{ effect.status.toLowerCase() }}">
                {{ formatStatus(effect.status) }}
              </span>
            </div>
          }

          <!-- Special effect message -->
          @if (specialEffectMessage()) {
            <div class="special-effect">
              {{ specialEffectMessage() }}
            </div>
          }
        </div>
      }

      <!-- Status message -->
      <div class="status-message" [class.visible]="showStatus()">
        {{ statusMessage() }}
      </div>
    </div>
  `,
  styles: [`
    .chest-playback {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.9);
      z-index: 100;
    }

    .trap-letterbox {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: linear-gradient(180deg, rgba(139, 0, 0, 0.95), rgba(80, 0, 0, 0.9));
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateY(-100%);
      transition: transform 0.4s ease-out;
      border-bottom: 2px solid #ff4444;
      box-shadow: 0 4px 20px rgba(255, 0, 0, 0.4);

      &.visible {
        transform: translateY(0);
      }
    }

    .letterbox-content {
      text-align: center;
    }

    .trap-name {
      font-family: var(--font-display);
      font-size: 2rem;
      color: #ff6666;
      letter-spacing: 0.2em;
      text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
      animation: pulse 0.5s ease-in-out infinite alternate;
    }

    .trap-message {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: #ffaaaa;
      margin-top: 0.25rem;
    }

    @keyframes pulse {
      from { opacity: 0.8; }
      to { opacity: 1; }
    }

    .effects-panel {
      background: linear-gradient(135deg, rgba(30, 10, 10, 0.95), rgba(20, 5, 5, 0.98));
      border: 2px solid #8b0000;
      border-radius: 8px;
      padding: 1.5rem 2rem;
      min-width: 300px;
      max-width: 450px;
      box-shadow: 0 0 30px rgba(139, 0, 0, 0.4);
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .effects-title {
      font-family: var(--font-display);
      font-size: 1.2rem;
      color: #ff6666;
      text-align: center;
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(139, 0, 0, 0.5);
    }

    .effect-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-family: var(--font-body);
      font-size: 0.9rem;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .effect-name {
      color: var(--color-text-secondary);
    }

    .effect-value {
      font-weight: 600;
    }

    .effect-row.damage .effect-value {
      color: #ef4444;
    }

    .status-poisoned { color: var(--color-status-poisoned); }
    .status-paralyzed { color: #f59e0b; }
    .status-dead { color: var(--color-status-dead); }
    .status-ashes { color: #6b7280; }
    .status-stoned { color: #9ca3af; }

    .special-effect {
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      border-radius: 4px;
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: #ff6666;
      text-align: center;
      font-style: italic;
    }

    .status-message {
      position: absolute;
      bottom: 2rem;
      font-family: var(--font-body);
      font-size: 1rem;
      color: var(--color-text-secondary);
      opacity: 0;
      transition: opacity 0.3s ease;

      &.visible {
        opacity: 1;
      }
    }
  `]
})
export class ChestPlaybackComponent implements OnInit {
  // Animation state
  readonly showLetterbox = signal(false);
  readonly showEffects = signal(false);
  readonly showStatus = signal(false);
  readonly statusMessage = signal('');

  // Trap info from GameState
  readonly pendingTrap = computed(() => this.gameState.state().pendingTrapResult);
  readonly trapName = computed(() => this.pendingTrap()?.trapName ?? '');
  readonly trapMessage = computed(() => this.pendingTrap()?.message ?? '');
  readonly specialEffectMessage = computed(() => {
    const trap = this.pendingTrap();
    if (!trap?.specialEffect) return null;
    if (trap.specialEffect === 'combat') return 'ALARM! Monsters approach!';
    if (trap.specialEffect === 'teleport') return 'The world spins around you...';
    return null;
  });

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  // Format damage effects for display
  readonly damageEffects = computed(() => {
    const trap = this.pendingTrap();
    if (!trap) return [];

    const chars = this.partyCharacters();
    const effects: { characterId: string; name: string; damage: number }[] = [];

    for (const [charId, damage] of trap.damageDealt) {
      const char = chars.find(c => c.id === charId);
      if (char && damage > 0) {
        effects.push({ characterId: charId, name: char.name, damage });
      }
    }

    return effects;
  });

  // Format status effects for display
  readonly statusEffects = computed(() => {
    const trap = this.pendingTrap();
    if (!trap) return [];

    const chars = this.partyCharacters();
    const effects: { characterId: string; name: string; status: CharacterStatus }[] = [];

    for (const [charId, status] of trap.statusApplied) {
      const char = chars.find(c => c.id === charId);
      if (char) {
        effects.push({ characterId: charId, name: char.name, status });
      }
    }

    return effects;
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const trap = this.pendingTrap();
    if (!trap) {
      console.error('[ChestPlayback] No pending trap result!');
      this.router.navigate(['/maze/chest/rewards']);
      return;
    }

    console.log('[ChestPlayback] Playing trap animation:', {
      trapName: trap.trapName,
      damageDealt: trap.damageDealt.size,
      statusApplied: trap.statusApplied.size,
      specialEffect: trap.specialEffect
    });

    this.playTrapSequence(trap);
  }

  /**
   * Format status for display
   */
  formatStatus(status: CharacterStatus): string {
    switch (status) {
      case CharacterStatus.POISONED: return 'Poisoned';
      case CharacterStatus.PARALYZED: return 'Paralyzed';
      case CharacterStatus.DEAD: return 'Dead';
      case CharacterStatus.ASHES: return 'Reduced to Ashes';
      case CharacterStatus.STONED: return 'Petrified';
      default: return status;
    }
  }

  /**
   * Play the trap animation sequence
   */
  private async playTrapSequence(trap: PendingTrapResult): Promise<void> {
    // Phase 1: Show letterbox (0.5s delay, then visible)
    await this.delay(300);
    this.showLetterbox.set(true);

    // Phase 2: Show effects panel (after 1s)
    await this.delay(1000);
    this.showEffects.set(true);

    // Phase 3: Apply effects to game state (after 1s)
    await this.delay(1000);
    this.applyTrapEffects(trap);

    // Phase 4: Show status message and prepare transition
    await this.delay(500);
    this.showStatus.set(true);

    if (trap.specialEffect === 'combat') {
      this.statusMessage.set('Monsters are coming!');
      await this.delay(1500);
      this.navigateToCombat(trap);
    } else {
      this.statusMessage.set('Opening chest...');
      await this.delay(1000);
      this.navigateToRewards();
    }
  }

  /**
   * Apply trap damage and status effects to characters
   */
  private applyTrapEffects(trap: PendingTrapResult): void {
    console.log('[ChestPlayback] Applying trap effects to characters');

    this.gameState.updateState(state =>
      TrapEffectService.applyTrapEffectsToState(state, trap)
    );
  }

  /**
   * Navigate to combat for ALARM trap
   */
  private async navigateToCombat(trap: PendingTrapResult): Promise<void> {
    console.log('[ChestPlayback] ALARM trap - triggering combat encounter');

    // Get dungeon state for encounter generation
    const state = this.gameState.state();
    const dungeon = state.dungeon;

    if (!dungeon) {
      console.error('[ChestPlayback] No dungeon state for alarm combat!');
      this.navigateToRewards();
      return;
    }

    // Generate alarm encounter and create combat state via service
    const monsterGroups = EncounterService.generateEncounter(dungeon.currentLevel);
    const combat = EncounterTriggerService.createAlarmCombatState(dungeon.currentLevel, monsterGroups);

    // Update state: clear trap result, set up combat
    this.gameState.updateState(s => ({
      ...s,
      pendingTrapResult: undefined,
      combat
    }));

    // Navigate to combat planning
    this.router.navigate(['/maze/combat/planning']);
  }

  /**
   * Navigate to chest rewards
   */
  private navigateToRewards(): void {
    console.log('[ChestPlayback] Proceeding to chest rewards');

    // Clear pending trap result
    this.gameState.updateState(state => ({
      ...state,
      pendingTrapResult: undefined
    }));

    this.router.navigate(['/maze/chest/rewards']);
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
