import {
  Component,
  OnInit,
  signal,
  computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { MessageLogComponent } from '@shared/components/message-log/message-log.component';
import { CombatOverlayComponent } from '@shared/components/combat-overlay/combat-overlay.component';
import { CinematicArenaComponent } from '@shared/components/cinematic-arena/cinematic-arena.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { LoggerService } from '@services/LoggerService';
import { LightService } from '@services/LightService';
import { SpellCastingService } from '@services/SpellCastingService';
import { CharacterService } from '@services/CharacterService';
import {
  executeRound,
  selectMonsterAction,
  RESULT_MARKER
} from '@services/combat';
import { GameStateQueries } from '@utils/GameStateQueries';
import { ActiveSpell } from '@models/active-spell.types';
import { Character } from '@models/Character';
import { CharacterAction } from '@models/CharacterCardTypes';
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
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    CombatOverlayComponent,
    CinematicArenaComponent
  ],
  template: `
    <div class="combat-playback">
      <!-- Title with Active Spells -->
      <app-scene-title [title]="sceneTitle()" [activeSpells]="activeSpells()"></app-scene-title>

      <!-- 3-Column Layout -->
      <div class="maze-content">
        <!-- Left Column: Positions 1, 3, 5 -->
        <div class="left-panel">
          <app-character-panel
            [characters]="leftColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="[]"
            [statusTexts]="characterStatusTexts()"
            [showSprites]="true"
          />
        </div>

        <!-- Center Column: Viewport + Message Log -->
        <div class="center-panel">
          <!-- Viewport frame for canvas alignment -->
          <div class="maze-viewport">
            <!-- Combat Overlay (monster sprites) -->
            <app-combat-overlay
              [visible]="true"
              [monsterGroups]="monsterGroups()"
              [roundNumber]="roundNumber()"
              [selectedGroupId]="null"
              [isTargetingMode]="false"
              [letterboxType]="null"
              [showVictoryOverlay]="false"
              [showDefeatOverlay]="false"
              [showMonsterCards]="true"
              [partyCharacters]="partyCharacters()"
            />

            <!-- Cinematic Arena for round animation (overlays the viewport) -->
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
          </div>

          <!-- Message log below viewport -->
          <div class="message-log-section">
            <app-message-log [messages]="messages()" />
          </div>
        </div>

        <!-- Right Column: Positions 2, 4, 6 -->
        <div class="right-panel">
          <app-character-panel
            [characters]="rightColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="[]"
            [statusTexts]="characterStatusTexts()"
            [showSprites]="true"
          />
        </div>
      </div>

      <!-- Footer Menu -->
      <app-scene-footer
        [menuItems]="footerMenuItems()"
      />
    </div>
  `,
  styles: [`
    .combat-playback {
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

    /* 3-COLUMN LAYOUT - matches combat-planning */
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

    /* Viewport container - shows canvas through transparent background */
    .maze-viewport {
      position: relative;
      flex: 1;
      min-height: 0;
      width: 100%;
      aspect-ratio: var(--scene-viewport-aspect) / 1;
      max-width: 100%;
      background: transparent;
      border: 1px solid var(--color-gold-primary);
      border-radius: 4px;
      overflow: hidden;
    }

    /* Combat overlay fills the viewport */
    :host ::ng-deep .maze-viewport app-combat-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
    }

    /* Cinematic arena overlays everything in the viewport */
    :host ::ng-deep .maze-viewport app-cinematic-arena {
      position: absolute;
      inset: 0;
      z-index: 20;
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

    /* Compact height responsive adjustments */
    @media (max-height: 767px) {
      .combat-playback {
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
  readonly roundNumber = computed(() => this.combatState()?.roundNumber ?? 1);

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  readonly leftColumnCharacters = computed(() => {
    const party = this.partyCharacters();
    return party.filter((_, i) => i % 2 === 0); // Positions 0, 2, 4
  });

  readonly rightColumnCharacters = computed(() => {
    const party = this.partyCharacters();
    return party.filter((_, i) => i % 2 === 1); // Positions 1, 3, 5
  });

  // Scene title
  readonly sceneTitle = computed(() => {
    const round = this.roundNumber();
    return `COMBAT - ROUND ${round}`;
  });

  // Active spells (MILWA, LOMILWA, LATUMAPIC, MAPORFIC)
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

    // LATUMAPIC (monster identification)
    if (dungeon.latumapicActive) {
      spells.push({
        name: 'LATUMAPIC',
        icon: '👁️',
        description: 'Monsters Identified',
        variant: 'identification'
      });
    }

    // MAPORFIC (party AC buff)
    if (dungeon.expeditionAcBuff && dungeon.expeditionAcBuff !== 0) {
      spells.push({
        name: 'MAPORFIC',
        icon: '🛡️',
        description: `Party AC ${dungeon.expeditionAcBuff > 0 ? '+' : ''}${dungeon.expeditionAcBuff}`,
        variant: 'protection'
      });
    }

    return spells;
  });

  // Status texts for character cards during playback
  readonly characterStatusTexts = computed((): Map<string, string> => {
    const statusTexts = new Map<string, string>();
    const party = this.partyCharacters();

    for (const char of party) {
      // Show character status
      if (!CharacterService.canAct(char)) {
        statusTexts.set(char.id, char.status);
      }
      // During playback, no action texts - characters are executing their chosen actions
    }

    return statusTexts;
  });

  // Footer menu items (disabled during playback)
  readonly footerMenuItems = computed((): MenuItem[] => {
    return [
      {
        id: 'executing',
        label: 'Executing Round...',
        enabled: false
      }
    ];
  });

  // Expose message log messages for template
  readonly messages = computed(() => this.messageLog.messages());

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private logger: LoggerService,
    private messageLog: MessageLogService
  ) {}

  /**
   * Get actions for character (empty during playback - no interactions)
   */
  getActionsForCharacter = (_char: Character): CharacterAction[] => {
    return []; // No actions during playback
  };

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
    // Add event messages to the message log
    for (const message of event.messages) {
      // Skip the RESULT_MARKER prefix if present (used for arena parsing)
      const cleanMessage = message.startsWith(RESULT_MARKER)
        ? message.substring(RESULT_MARKER.length)
        : message;
      this.messageLog.addMessage(cleanMessage);
    }
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
