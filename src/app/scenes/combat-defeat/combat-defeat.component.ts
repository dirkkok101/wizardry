import {
  Component,
  OnInit,
  OnDestroy,
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
import { MenuItem } from '@shared/components/menu/menu.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { LightService } from '@services/LightService';
import { CharacterService } from '@services/CharacterService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CharacterAction } from '@models/CharacterCardTypes';
import { ActiveSpell } from '@models/active-spell.types';
import { CharacterStatus } from '@models/CharacterStatus';
import { DungeonState } from '@models/Dungeon';

/**
 * CombatDefeatComponent - Defeat handling phase of combat.
 *
 * This component:
 * 1. Displays defeat message in the viewport area
 * 2. Shows which party members fell
 * 3. Clears combat and dungeon state (party ejected from maze)
 * 4. Allows user to acknowledge and return to castle
 *
 * Note: Body recovery is NOT handled here. Dead characters' bodies
 * remain at the death location in the dungeon. A new party must
 * retrieve them via the Temple's recovery service.
 */
@Component({
  selector: 'app-combat-defeat',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    CombatOverlayComponent
  ],
  template: `
    <div class="combat-defeat">
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
            <!-- Combat Overlay with Defeat display -->
            <app-combat-overlay
              [visible]="true"
              [monsterGroups]="[]"
              [roundNumber]="0"
              [selectedGroupId]="null"
              [isTargetingMode]="false"
              [letterboxType]="null"
              [showVictoryOverlay]="false"
              [showDefeatOverlay]="true"
              [showMonsterCards]="false"
              [partyCharacters]="partyCharacters()"
            />
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
        (itemSelected)="handleMenuAction($event)"
      />
    </div>
  `,
  styles: [`
    .combat-defeat {
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

    /* 3-COLUMN LAYOUT - matches combat-playback */
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

    /* Viewport container - opaque background hides WebGL renderer */
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

    /* Combat overlay fills the viewport */
    :host ::ng-deep .maze-viewport app-combat-overlay {
      position: absolute;
      inset: 0;
      z-index: 10;
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
      .combat-defeat {
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
export class CombatDefeatComponent implements OnInit, OnDestroy {
  // Ready for navigation (after defeat processed)
  readonly isReady = signal(false);

  // Computed from GameState (capture before clearing)
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState | undefined);

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  // Characters who are dead/incapacitated
  readonly casualties = computed(() => {
    return this.partyCharacters().filter(char => CharacterService.isIncapacitated(char));
  });

  // 3-column layout: left column gets positions 0, 2, 4
  readonly leftColumnCharacters = computed(() => {
    const party = this.partyCharacters();
    return party.filter((_, i) => i % 2 === 0);
  });

  // 3-column layout: right column gets positions 1, 3, 5
  readonly rightColumnCharacters = computed(() => {
    const party = this.partyCharacters();
    return party.filter((_, i) => i % 2 === 1);
  });

  // Scene title
  readonly sceneTitle = computed(() => 'DEFEAT');

  // Active spells (will be empty after dungeon cleared, but show initially)
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

  // Status texts for character cards
  readonly characterStatusTexts = computed((): Map<string, string> => {
    const statusTexts = new Map<string, string>();
    const party = this.partyCharacters();

    for (const char of party) {
      if (CharacterService.isIncapacitated(char)) {
        statusTexts.set(char.id, this.getStatusText(char.status));
      }
    }

    return statusTexts;
  });

  // Footer menu items
  readonly footerMenuItems = computed((): MenuItem[] => {
    if (!this.isReady()) {
      return [
        { id: 'processing', label: 'Processing...', enabled: false }
      ];
    }

    return [
      { id: 'return', label: 'Return to Castle', enabled: true, shortcut: 'Enter' }
    ];
  });

  // Expose message log messages for template
  readonly messages = computed(() => this.messageLog.messages());

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private messageLog: MessageLogService
  ) {}

  /**
   * Get actions for character (no actions on defeat screen)
   */
  getActionsForCharacter = (_char: Character): CharacterAction[] => {
    return [];
  };

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
   * Handle footer menu actions
   */
  handleMenuAction(itemId: string): void {
    if (itemId === 'return' && this.isReady()) {
      this.router.navigate(['/castle-menu']);
    }
  }

  ngOnInit(): void {
    this.processDefeat();
  }

  ngOnDestroy(): void {
    // Clean up if needed
  }

  /**
   * Process defeat and prepare for return to castle
   */
  private processDefeat(): void {
    console.log('[CombatDefeat] Processing defeat');
    console.log('[CombatDefeat] Casualties:', this.casualties().map(c => c.name));

    // Log defeat messages
    this.messageLog.addMessage('The party has fallen...');
    for (const char of this.casualties()) {
      this.messageLog.addMessage(`${char.name} - ${this.getStatusText(char.status)}`);
    }

    // Clear combat and dungeon state - party is ejected
    this.gameState.updateState(state => ({
      ...state,
      combat: undefined,
      dungeon: undefined  // Party leaves the dungeon
    }));

    console.log('[CombatDefeat] State cleared, ready to return to castle');
    this.messageLog.addMessage('The party retreats from the dungeon...');

    // Enable user to continue
    this.isReady.set(true);
  }
}
