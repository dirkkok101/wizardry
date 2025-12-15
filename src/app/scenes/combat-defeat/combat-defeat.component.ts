import {
  Component,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { CharacterService } from '@services/CharacterService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';

/**
 * CombatDefeatComponent - Defeat handling phase of combat.
 *
 * This component:
 * 1. Displays defeat message
 * 2. Shows which party members fell
 * 3. Waits for acknowledgement (2 seconds)
 * 4. Clears combat and dungeon state (party ejected from maze)
 * 5. Navigates to /castle-menu
 *
 * Note: Body recovery is NOT handled here. Dead characters' bodies
 * remain at the death location in the dungeon. A new party must
 * retrieve them via the Temple's recovery service.
 */
@Component({
  selector: 'app-combat-defeat',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="combat-defeat">
      <div class="defeat-panel">
        <!-- Defeat Title -->
        <h1 class="defeat-title">DEFEAT</h1>

        <!-- Message -->
        <p class="defeat-message">The party has fallen...</p>

        <!-- Casualty List -->
        @if (casualties().length > 0) {
          <div class="casualties-section">
            <span class="casualties-label">Fallen:</span>
            <ul class="casualties-list">
              @for (char of casualties(); track char.id) {
                <li class="casualty-entry">
                  {{ char.name }} - {{ getStatusText(char.status) }}
                </li>
              }
            </ul>
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
    .combat-defeat {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.9);
      z-index: 100;
    }

    .defeat-panel {
      background: linear-gradient(135deg, rgba(30, 10, 10, 0.95), rgba(20, 5, 5, 0.98));
      border: 2px solid #6b7280;
      border-radius: 8px;
      padding: 2rem 3rem;
      text-align: center;
      min-width: 320px;
      max-width: 480px;
      box-shadow: 0 0 30px rgba(107, 114, 128, 0.3);
    }

    .defeat-title {
      font-family: var(--font-display);
      font-size: 2.5rem;
      color: #6b7280;
      margin: 0 0 1rem 0;
      text-shadow: 0 0 20px rgba(107, 114, 128, 0.5);
      letter-spacing: 0.15em;
    }

    .defeat-message {
      font-family: var(--font-body);
      font-size: 1.1rem;
      color: var(--color-text-secondary);
      margin: 0 0 1.5rem 0;
      font-style: italic;
    }

    .casualties-section {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
    }

    .casualties-label {
      display: block;
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .casualties-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .casualty-entry {
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: #6b7280;
      padding: 0.25rem 0;
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
export class CombatDefeatComponent implements OnInit {
  readonly statusMessage = signal<string>('');

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  // Characters who are dead/incapacitated
  readonly casualties = computed(() => {
    return this.partyCharacters().filter(char => CharacterService.isIncapacitated(char));
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.processDefeat();
  }

  /**
   * Get human-readable status text
   */
  getStatusText(status: CharacterStatus): string {
    switch (status) {
      case CharacterStatus.DEAD: return 'Dead';
      case CharacterStatus.ASHES: return 'Ashes';
      case CharacterStatus.LOST: return 'Lost Forever';
      case CharacterStatus.STONED: return 'Petrified';
      default: return 'Fallen';
    }
  }

  /**
   * Process defeat and return to castle
   */
  private async processDefeat(): Promise<void> {
    console.log('[CombatDefeat] Processing defeat');
    console.log('[CombatDefeat] Casualties:', this.casualties().map(c => c.name));

    this.statusMessage.set('The party retreats from the dungeon...');

    // Wait for player to acknowledge defeat
    await this.delay(2000);

    // Clear combat and dungeon state - party is ejected
    this.gameState.updateState(state => ({
      ...state,
      combat: undefined,
      dungeon: undefined  // Party leaves the dungeon
    }));

    console.log('[CombatDefeat] State cleared, navigating to castle');
    this.statusMessage.set('Returning to the castle...');

    // Brief pause before navigation
    await this.delay(500);

    // Navigate to castle menu
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
