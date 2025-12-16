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
import { VictoryService, VictoryRewards } from '@services/VictoryService';
import { FightMapService } from '@services/FightMapService';
import { ChestService } from '@services/ChestService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CharacterAction } from '@models/CharacterCardTypes';
import { ActiveSpell } from '@models/active-spell.types';
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
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    CombatOverlayComponent
  ],
  template: `
    <div class="combat-victory">
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
            <!-- Combat Overlay with Victory display -->
            <app-combat-overlay
              [visible]="true"
              [monsterGroups]="[]"
              [roundNumber]="0"
              [selectedGroupId]="null"
              [isTargetingMode]="false"
              [letterboxType]="null"
              [showVictoryOverlay]="true"
              [showDefeatOverlay]="false"
              [showMonsterCards]="false"
              [victoryRewards]="rewards()"
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
    .combat-victory {
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
      .combat-victory {
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
export class CombatVictoryComponent implements OnInit, OnDestroy {
  // Rewards calculated from defeated monsters
  readonly rewards = signal<VictoryRewards | null>(null);

  // Ready for navigation (after rewards processed)
  readonly isReady = signal(false);

  // Next destination after continue
  private nextRoute: string = '/maze';

  // Computed from GameState
  readonly combatState = computed(() => this.gameState.state().combat as CombatState | undefined);
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState | undefined);

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
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
  readonly sceneTitle = computed(() => 'VICTORY');

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

  // Status texts for character cards
  readonly characterStatusTexts = computed((): Map<string, string> => {
    const statusTexts = new Map<string, string>();
    const party = this.partyCharacters();

    for (const char of party) {
      if (!CharacterService.canAct(char)) {
        statusTexts.set(char.id, char.status);
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

    // Show appropriate continue button
    if (this.nextRoute === '/maze/chest') {
      return [
        { id: 'continue', label: 'Open Chest', enabled: true, shortcut: 'Enter' }
      ];
    }

    return [
      { id: 'continue', label: 'Continue', enabled: true, shortcut: 'Enter' }
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
   * Get actions for character (no actions on victory screen)
   */
  getActionsForCharacter = (_char: Character): CharacterAction[] => {
    return [];
  };

  /**
   * Handle footer menu actions
   */
  handleMenuAction(itemId: string): void {
    if (itemId === 'continue' && this.isReady()) {
      this.router.navigate([this.nextRoute]);
    }
  }

  ngOnInit(): void {
    this.processVictory();
  }

  ngOnDestroy(): void {
    // Clean up if needed
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

    console.log('[CombatVictory] Rewards calculated', {
      totalXP: rewards.totalXP,
      xpPerCharacter: rewards.xpPerCharacter,
      livingMembers: rewards.livingCharacterCount,
      items: rewards.items.length
    });

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

    // Add victory messages to log
    this.messageLog.addMessage(`Gained ${rewards.totalXP} XP (${rewards.xpPerCharacter} per character)`);
    if (rewards.totalGold > 0) {
      this.messageLog.addMessage(`Found ${rewards.totalGold} gold`);
    }
    if (rewards.items.length > 0) {
      this.messageLog.addMessage(`Found ${rewards.items.length} item(s)`);
    }

    // Set next destination and enable continue button
    if (pendingChest) {
      this.nextRoute = '/maze/chest';
      this.messageLog.addMessage('A treasure chest appears!');
      console.log('[CombatVictory] Chest awaiting - ready for user input');
    } else {
      this.nextRoute = '/maze';
      console.log('[CombatVictory] Ready to return to exploration');
    }

    // Enable user to continue
    this.isReady.set(true);
  }
}
