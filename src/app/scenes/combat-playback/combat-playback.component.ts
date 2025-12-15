import {
  Component,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CinematicArenaComponent } from '@shared/components/cinematic-arena/cinematic-arena.component';
import { GameStateService } from '@services/GameStateService';
import { LoggerService } from '@services/LoggerService';
import { SpellCastingService } from '@services/SpellCastingService';
import { CharacterService } from '@services/CharacterService';
import {
  executeRound,
  selectMonsterAction
} from '@services/combat';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import {
  CombatState,
  CombatRoundEvent,
  CombatRoundAudit
} from '@models/Combat';
import { DungeonState } from '@models/Dungeon';

/**
 * Result of combat round execution, stored for use after arena playback.
 */
interface PendingCombatResult {
  finalState: CombatState;
  finalCharacterUpdates: Map<string, Character>;
  spellCasters: Map<string, { spellId: string }>;
  victory: boolean;
  defeat: boolean;
}

/**
 * CombatPlaybackComponent - Round execution phase of combat.
 *
 * This component:
 * 1. Executes the combat round using CombatRoundOrchestrator
 * 2. Displays CinematicArenaComponent for visual playback
 * 3. Applies final state changes after animation completes
 * 4. Navigates based on result:
 *    - Victory → /maze/combat/victory
 *    - Defeat → /maze/combat/defeat
 *    - Continue → /maze/combat/planning
 *
 * The WebGL canvas is owned by the parent MazeLayoutComponent.
 * This component renders the cinematic arena as an overlay.
 */
@Component({
  selector: 'app-combat-playback',
  standalone: true,
  imports: [CommonModule, CinematicArenaComponent],
  template: `
    <div class="combat-playback">
      <!-- Cinematic Arena for round animation -->
      @if (showArena()) {
        <app-cinematic-arena
          [visible]="showArena()"
          [events]="arenaEvents()"
          [audit]="arenaAudit()"
          [partyCharacters]="partyCharacters()"
          [monsterGroups]="monsterGroups()"
          (playbackComplete)="onArenaComplete()"
          (eventPlayed)="onArenaEventPlayed($event)"
        />
      }

      <!-- Loading indicator while executing -->
      @if (!showArena()) {
        <div class="loading-overlay">
          <div class="loading-content">
            <p>Executing combat round...</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .combat-playback {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }

    .loading-overlay {
      background: rgba(0, 0, 0, 0.8);
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-content {
      color: var(--color-text-primary);
      font-family: var(--font-body);
      font-size: 1.2rem;
    }
  `]
})
export class CombatPlaybackComponent implements OnInit {
  // Arena state
  readonly showArena = signal(false);
  readonly arenaEvents = signal<CombatRoundEvent[]>([]);
  readonly arenaAudit = signal<CombatRoundAudit | null>(null);

  // Pending result to apply after arena completes
  private pendingCombatResult: PendingCombatResult | null = null;

  // Computed from GameState
  readonly combatState = computed(() => this.gameState.state().combat as CombatState | undefined);
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState | undefined);
  readonly monsterGroups = computed(() => this.combatState()?.monsterGroups ?? []);

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private logger: LoggerService
  ) {}

  ngOnInit(): void {
    // Execute the round immediately when component loads
    this.executeRound();
  }

  /**
   * Execute the combat round
   */
  private executeRound(): void {
    const combat = this.combatState();
    if (!combat) {
      this.logger.error('[CombatPlayback] No combat state!');
      this.router.navigate(['/maze']);
      return;
    }

    // Get party info
    const state = this.gameState.state();
    const frontRow = state.party.formation.frontRow;
    const chars = this.partyCharacters();

    // Get party commands from queue (set by CombatPlanningComponent)
    const partyCommands = combat.commandQueue;

    // Generate monster commands for all alive monsters
    const aliveMonsters = combat.monsterGroups
      .flatMap(g => g.monsters)
      .filter(m => m.hp > 0);

    const monsterCommands = aliveMonsters.map(m =>
      selectMonsterAction({ monster: m, party: chars, frontRow })
    );

    // Create state with all commands in queue
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: [...partyCommands, ...monsterCommands]
    };

    try {
      // Execute round (pre-calculates everything)
      const result = executeRound(stateWithCommands, chars, frontRow);

      this.logger.log('[CombatPlayback] Round executed', {
        eventsCount: result.events.length,
        victory: result.victory,
        defeat: result.defeat,
        fled: result.fled,
        damagedCharacters: result.damagedCharacters.size,
        spellCasters: result.spellCasters.size
      });

      // Store result for use after arena playback completes
      this.pendingCombatResult = {
        finalState: result.newState,
        finalCharacterUpdates: result.damagedCharacters,
        spellCasters: result.spellCasters,
        victory: result.victory,
        defeat: result.defeat
      };

      // Check if party fled successfully - skip arena and go straight to exploration
      if (result.fled) {
        this.logger.log('[CombatPlayback] Party fled successfully');
        this.handleFleeSuccess();
        return;
      }

      // Activate cinematic arena for playback
      this.arenaEvents.set(result.events);
      this.arenaAudit.set(result.audit ?? null);
      this.showArena.set(true);

      this.logger.log('[CombatPlayback] Arena activated', {
        arenaEventsSet: this.arenaEvents().length,
        showArena: this.showArena()
      });
    } catch (error) {
      this.logger.error('[CombatPlayback] Execution error:', error);
      // Return to planning on error
      this.router.navigate(['/maze/combat/planning']);
    }
  }

  /**
   * Handle successful flee - clear combat and return to exploration
   */
  private handleFleeSuccess(): void {
    this.gameState.updateState(state => ({
      ...state,
      combat: undefined
    }));

    queueMicrotask(() => {
      this.router.navigate(['/maze']);
    });
  }

  /**
   * Handle arena playback completion
   */
  onArenaComplete(): void {
    this.logger.log('[CombatPlayback] Arena playback complete');

    // Hide the arena
    this.showArena.set(false);
    this.arenaEvents.set([]);
    this.arenaAudit.set(null);

    // Apply the stored combat result
    const result = this.pendingCombatResult;
    if (!result) {
      this.logger.error('[CombatPlayback] No pending combat result!');
      this.router.navigate(['/maze/combat/planning']);
      return;
    }

    // Apply final state
    this.gameState.updateState(state => {
      let newRoster = this.updateRosterFromCombat(state.roster, result.finalCharacterUpdates);

      // Apply spell point deductions for characters who cast spells
      for (const [charId, { spellId }] of result.spellCasters) {
        const caster = newRoster.get(charId);
        if (caster) {
          const updatedCaster = SpellCastingService.deductSpellPoints(caster, spellId);
          newRoster = new Map(newRoster).set(charId, updatedCaster);
        }
      }

      const newMembers = this.reorderPartyAfterCasualties(state.party.members, newRoster);

      return {
        ...state,
        combat: result.finalState,
        roster: newRoster,
        party: {
          ...state.party,
          members: newMembers
        }
      };
    });

    // Clear pending result
    this.pendingCombatResult = null;

    // Navigate based on result
    if (result.victory) {
      this.logger.log('[CombatPlayback] Victory - navigating to victory screen');
      queueMicrotask(() => {
        this.router.navigate(['/maze/combat/victory']);
      });
    } else if (result.defeat) {
      this.logger.log('[CombatPlayback] Defeat - navigating to defeat screen');
      queueMicrotask(() => {
        this.router.navigate(['/maze/combat/defeat']);
      });
    } else {
      // Continue to next round
      this.logger.log('[CombatPlayback] Combat continues - returning to planning');
      queueMicrotask(() => {
        this.router.navigate(['/maze/combat/planning']);
      });
    }
  }

  /**
   * Handle arena event played (for logging/sync purposes)
   */
  onArenaEventPlayed(event: CombatRoundEvent): void {
    // Could be used to sync combat log display
    this.logger.log('[CombatPlayback] Event played:', event.actorId);
  }

  /**
   * Update roster from combat character updates
   */
  private updateRosterFromCombat(
    roster: Map<string, Character>,
    updates: Map<string, Character>
  ): Map<string, Character> {
    this.logger.log('[CombatPlayback] Processing', updates.size, 'character updates');
    const newRoster = new Map(roster);
    for (const [charId, updatedChar] of updates.entries()) {
      const oldChar = roster.get(charId);
      this.logger.log(`[CombatPlayback] ${updatedChar.name}: HP ${oldChar?.hp} → ${updatedChar.hp}, Status ${oldChar?.status} → ${updatedChar.status}`);
      newRoster.set(charId, updatedChar);
    }
    return newRoster;
  }

  /**
   * Reorder party members after combat casualties.
   * Dead/incapacitated characters move to the end, living characters shift forward.
   */
  private reorderPartyAfterCasualties(
    members: string[],
    roster: Map<string, Character>
  ): string[] {
    const living: string[] = [];
    const incapacitated: string[] = [];

    for (const id of members) {
      const char = roster.get(id);
      if (!char) continue;

      if (CharacterService.isIncapacitated(char)) {
        incapacitated.push(id);
      } else {
        living.push(id);
      }
    }

    return [...living, ...incapacitated];
  }
}
