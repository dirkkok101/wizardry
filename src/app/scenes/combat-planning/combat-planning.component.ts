import {
  Component,
  OnInit,
  signal,
  computed,
  HostListener
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { MessageLogComponent } from '@shared/components/message-log/message-log.component';
import { CombatOverlayComponent } from '@shared/components/combat-overlay/combat-overlay.component';
import { SpellPanelComponent } from '@shared/components/spell-panel/spell-panel.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageLogService } from '@services/MessageLogService';
import { SpellLearningService } from '@services/SpellLearningService';
import { SpellCastingService, SpellData } from '@services/SpellCastingService';
import { CharacterService } from '@services/CharacterService';
import { LightService } from '@services/LightService';
import { createCommand } from '@services/combat';
import { GameStateQueries } from '@utils/GameStateQueries';
import { getIdentifiedGroupDisplayText } from '@utils/MonsterNameUtils';
import { getCombatActionDisplayText } from '@utils/CombatDisplayUtils';
import { ActiveSpell } from '@models/active-spell.types';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { CombatState, CombatCommand, MonsterGroup, MonsterInstance } from '@models/Combat';
import { DungeonState } from '@models/Dungeon';

/**
 * CombatPlanningComponent - Action selection phase of combat.
 *
 * This is a child route of MazeLayoutComponent that provides:
 * - Monster sprite display via CombatOverlayComponent
 * - Character panels with combat actions (Attack, Cast, Parry, Run)
 * - Target selection for attacks and spells
 * - Footer menu: Start Round, Flee (Run), Reset Actions
 * - Navigation to /maze/combat/playback when round executes
 *
 * The WebGL canvas is owned by the parent MazeLayoutComponent.
 * This component renders as an overlay on top of the canvas.
 */
@Component({
  selector: 'app-combat-planning',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    CombatOverlayComponent,
    SpellPanelComponent
  ],
  template: `
    <div class="combat-planning">
      <!-- Title with Active Spells -->
      <app-scene-title [title]="sceneTitle()" [activeSpells]="activeSpells()"></app-scene-title>

      <!-- 3-Column Layout -->
      <div class="maze-content">
        <!-- Left Column: Positions 1, 3, 5 -->
        <div class="left-panel" [class.dimmed]="shouldDimPanels()">
          <app-character-panel
            [characters]="leftColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="['fight', 'cast-spell', 'parry']"
            [statusTexts]="combatActionTexts()"
            [showSprites]="true"
            (actionClick)="handleCharacterAction($event)"
          />
        </div>

        <!-- Center Column: Viewport + Message Log -->
        <div class="center-panel">
          <!-- Viewport frame for canvas alignment -->
          <div class="maze-viewport">
            <!-- Combat Overlay (monster sprites) - positioned inside viewport -->
            <app-combat-overlay
              [visible]="true"
              [monsterGroups]="monsterGroups()"
              [roundNumber]="roundNumber()"
              [selectedGroupId]="selectedTargetGroup()"
              [isTargetingMode]="isTargetingMode()"
              [letterboxType]="letterboxType()"
              [showVictoryOverlay]="false"
              [showDefeatOverlay]="false"
              [showMonsterCards]="showMonsterCards()"
              [partyCharacters]="partyCharacters()"
              (groupClicked)="onGroupClicked($event)"
            />
          </div>

          <!-- Message log below viewport -->
          <div class="message-log-section">
            <app-message-log [messages]="messages()" />
          </div>
        </div>

        <!-- Right Column: Positions 2, 4, 6 -->
        <div class="right-panel" [class.dimmed]="shouldDimPanels()">
          <app-character-panel
            [characters]="rightColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="['fight', 'cast-spell', 'parry']"
            [statusTexts]="combatActionTexts()"
            [showSprites]="true"
            (actionClick)="handleCharacterAction($event)"
          />
        </div>
      </div>

      <!-- Footer Menu - switches between normal and targeting menus -->
      <app-scene-footer
        [menuItems]="isTargetingMode() ? targetingMenuItems() : combatMenuItems()"
        (itemSelected)="handleMenuAction($event)"
      />

      <!-- Spell Selection Panel (overlay) -->
      @if (selectingSpellForCharacter(); as casterId) {
        @if (getCaster(casterId); as caster) {
          <app-spell-panel
            [visible]="true"
            [character]="caster"
            [mode]="'casting'"
            [context]="'combat'"
            [title]="'SELECT SPELL'"
            (spellSelected)="onSpellSelected($event)"
            (closed)="cancelSpellSelection()"
          />
        }
      }
    </div>
  `,
  styles: [`
    .combat-planning {
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

    /* 3-COLUMN LAYOUT - matches original maze.component.scss */
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
      transition: opacity 0.2s ease;

      &.dimmed {
        opacity: 0.4;
        pointer-events: none;
      }
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
      .combat-planning {
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
export class CombatPlanningComponent implements OnInit {
  // Local signals
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map());
  readonly selectingTargetForCharacter = signal<string | null>(null);
  readonly selectedTargetGroup = signal<'A' | 'B' | 'C' | 'D' | null>(null);
  readonly letterboxType = signal<'encounter' | 'ambush' | 'surprise' | null>(null);

  // Combat intro state - hides monster cards and player actions during letterbox sequence
  readonly combatIntroActive = signal<boolean>(false);
  readonly showMonsterCards = computed(() => !this.combatIntroActive());

  // Spell selection state
  readonly selectingSpellForCharacter = signal<string | null>(null);
  readonly pendingSpell = signal<SpellData | null>(null);
  readonly targetingType = signal<'attack' | 'spell' | null>(null);

  // Computed from GameState
  readonly combatState = computed(() => this.gameState.state().combat as CombatState | undefined);
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState | undefined);
  readonly monsterGroups = computed(() => this.combatState()?.monsterGroups ?? []);
  readonly roundNumber = computed(() => this.combatState()?.roundNumber ?? 1);
  readonly canFlee = computed(() => this.combatState()?.canFlee ?? false);

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

  // Is in targeting mode?
  readonly isTargetingMode = computed(() => this.selectingTargetForCharacter() !== null);

  // Scene title
  readonly sceneTitle = computed(() => {
    const round = this.roundNumber();
    const selecting = this.selectingTargetForCharacter();
    if (selecting) {
      const char = this.partyCharacters().find(c => c.id === selecting);
      return `SELECT TARGET - ${char?.name ?? 'Unknown'}`;
    }
    return `COMBAT - ROUND ${round}`;
  });

  // Footer menu items for normal combat
  readonly combatMenuItems = computed((): MenuItem[] => {
    const allSelected = this.allCharactersHaveActions();
    const anySelected = this.selectedActions().size > 0;
    const canRun = this.canFlee();
    const inTargeting = this.isTargetingMode();

    return [
      {
        id: 'start_round',
        label: `Start Round ${this.roundNumber()}`,
        shortcut: 'Enter',
        enabled: allSelected && !inTargeting
      },
      {
        id: 'reset',
        label: 'Reset',
        shortcut: 'R',
        enabled: anySelected && !inTargeting
      },
      {
        id: 'flee',
        label: 'Flee',
        shortcut: 'F',
        enabled: canRun && !inTargeting
      }
    ];
  });

  // Footer menu items for targeting mode
  readonly targetingMenuItems = computed((): MenuItem[] => {
    const groups = this.monsterGroups();
    if (!this.isTargetingMode() || groups.length === 0) return [];

    const items: MenuItem[] = groups
      .filter(g => g.monsters.some(m => m.hp > 0))
      .map(group => {
        const aliveCount = group.monsters.filter(m => m.hp > 0).length;
        const firstMonster = group.monsters[0];
        const displayName = getIdentifiedGroupDisplayText(aliveCount, firstMonster, group.identified);
        return {
          id: `target-${group.id}`,
          label: displayName,
          shortcut: group.id,
          enabled: true
        };
      });

    items.push({
      id: 'cancel-targeting',
      label: 'Cancel',
      shortcut: 'ESC',
      enabled: true
    });

    return items;
  });

  // Panel dimming during targeting or intro
  readonly shouldDimPanels = computed(() => this.isTargetingMode() || this.combatIntroActive());

  /**
   * Status texts for characters - shows incapacitated status or selected action
   * Maps character ID to status text for CharacterPanel [statusTexts] input
   */
  readonly combatActionTexts = computed((): Map<string, string> => {
    const statusTexts = new Map<string, string>();
    const party = this.partyCharacters();
    const groups = this.monsterGroups();

    for (const char of party) {
      // 1. Incapacitated characters show their status
      if (!CharacterService.canAct(char)) {
        statusTexts.set(char.id, char.status);
        continue;
      }

      // 2. Characters with selected actions show action text
      const command = this.selectedActions().get(char.id);
      if (command) {
        statusTexts.set(char.id, getCombatActionDisplayText(command, groups));
      }
    }

    return statusTexts;
  });

  // Expose message log messages for template
  readonly messages = computed(() => this.messageLog.messages());

  constructor(
    private gameState: GameStateService,
    private navigation: SceneNavigationService,
    private messageLog: MessageLogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const combat = this.combatState();

    // Only show intro sequence on first round
    if (combat && combat.roundNumber === 1) {
      this.showCombatIntro(combat);
    } else {
      // Subsequent rounds - just show action selection message
      this.addMessage('Select actions for your party members.');
    }
  }

  /**
   * Show combat intro sequence with letterbox banners
   * Handles: encounter → surprise/ambush → action selection
   */
  private async showCombatIntro(combat: CombatState): Promise<void> {
    // Mark intro as active to hide monster cards and dim panels
    this.combatIntroActive.set(true);

    // 1. Always show ENCOUNTER! first
    await this.showLetterbox('encounter', 2000);

    // 2. Check for surprise state
    if (combat.surpriseState === 'monsters') {
      // Party is ambushed - monsters get free round
      await this.showLetterbox('ambush', 2500);
      this.addMessage('The monsters ambushed you! They get a free round.');

      // Skip action selection - navigate directly to playback
      // Monster actions will be generated by combat-playback component
      this.gameState.updateState(state => ({
        ...state,
        combat: state.combat ? {
          ...state.combat,
          commandQueue: []  // No party actions in surprise round
        } : undefined
      }));

      queueMicrotask(() => {
        this.router.navigate(['/maze/combat/playback']);
      });
      return;  // Don't proceed to action selection

    } else if (combat.surpriseState === 'party') {
      // Party surprised monsters - party gets free round
      await this.showLetterbox('surprise', 2500);
      this.addMessage('You surprised the monsters! You get a free round.');
    }

    // 3. End intro and enable action selection (only for non-monster-surprise)
    this.combatIntroActive.set(false);
    this.addMessage('Select actions for your party members.');
  }

  /**
   * Show a letterbox banner for a duration, then clear it
   */
  private async showLetterbox(
    type: 'encounter' | 'ambush' | 'surprise',
    durationMs: number
  ): Promise<void> {
    this.letterboxType.set(type);
    await this.delay(durationMs);
    this.letterboxType.set(null);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================
  // CHARACTER ACTIONS
  // ============================================================

  /**
   * Get available combat actions for a character
   * Note: statusTexts handles display after action selection, so labels are simple
   */
  getActionsForCharacter = (char: Character): CharacterAction[] => {
    const actions: CharacterAction[] = [];
    const selectedAction = this.selectedActions().get(char.id);
    const canAct = CharacterService.canAct(char);

    // Attack
    actions.push({
      type: 'fight',
      label: 'Attack',
      enabled: canAct && !selectedAction
    });

    // Cast Spell (for casters with combat spells)
    if (SpellLearningService.isCaster(char) &&
        SpellCastingService.hasSpellsInContext(char, 'combat')) {
      actions.push({
        type: 'cast-spell',
        label: 'Cast',
        enabled: canAct && !selectedAction && char.status !== CharacterStatus.ASLEEP
      });
    }

    // Parry (Defend)
    actions.push({
      type: 'parry',
      label: 'Parry',
      enabled: canAct && !selectedAction
    });

    return actions;
  };

  /**
   * Handle character action button clicks
   */
  handleCharacterAction(event: CharacterActionEvent): void {
    const char = this.partyCharacters().find(c => c.id === event.characterId);
    if (!char) return;

    switch (event.actionType) {
      case 'fight':
        this.startTargeting(char.id);
        break;
      case 'cast-spell':
        // Show spell panel in-component (don't navigate away - preserves selectedActions)
        this.selectingSpellForCharacter.set(char.id);
        break;
      case 'parry':
        this.selectParry(char);
        break;
    }
  }

  // ============================================================
  // TARGETING
  // ============================================================

  /**
   * Start targeting mode for attack
   */
  private startTargeting(characterId: string): void {
    this.selectingTargetForCharacter.set(characterId);
    this.targetingType.set('attack');
    this.addMessage('Select a monster group to attack.');
  }

  // ============================================================
  // SPELL SELECTION
  // ============================================================

  /**
   * Handle spell selection from SpellPanel
   * In combat, offensive spells targeting 'single' or 'group' need group selection
   */
  onSpellSelected(spell: SpellData): void {
    const charId = this.selectingSpellForCharacter();
    if (!charId) return;

    // Close spell panel
    this.selectingSpellForCharacter.set(null);

    // In combat, 'single' = single monster in group, 'group' = all monsters in group
    // Both require group selection
    const needsGroupTarget = spell.target === 'single' || spell.target === 'group';

    if (needsGroupTarget) {
      // Store spell and enter targeting mode
      this.pendingSpell.set(spell);
      this.selectingTargetForCharacter.set(charId);
      this.targetingType.set('spell');
      this.addMessage(`Select target for ${spell.name}`);
    } else {
      // Auto-target spells (party, self, all_enemies, all_allies)
      this.createSpellCommand(charId, spell, null);
    }
  }

  /**
   * Cancel spell selection
   */
  cancelSpellSelection(): void {
    this.selectingSpellForCharacter.set(null);
  }

  /**
   * Get caster character for SpellPanel (used in template)
   */
  getCaster(characterId: string): Character | undefined {
    return this.partyCharacters().find(c => c.id === characterId);
  }

  /**
   * Create a CAST_SPELL combat command
   */
  private createSpellCommand(
    charId: string,
    spell: SpellData,
    targetGroupId: 'A' | 'B' | 'C' | 'D' | null
  ): void {
    const char = this.partyCharacters().find(c => c.id === charId);
    if (!char) return;

    // Get target (first alive monster in group) if targeting a group
    let target: MonsterInstance | undefined;
    if (targetGroupId) {
      const group = this.monsterGroups().find(g => g.id === targetGroupId);
      target = group?.monsters.find(m => m.hp > 0);
    }

    const command = createCommand(char, 'CAST_SPELL', target, {
      spellId: spell.id,
      groupId: targetGroupId ?? undefined,
      spellType: spell.casterType
    });

    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(charId, command);
      return newActions;
    });

    const targetText = targetGroupId ? ` → Group ${targetGroupId}` : '';
    this.addMessage(`${char.name}: ${spell.name.toUpperCase()}${targetText}`);

    // Clear targeting state
    this.clearTargetingState();
  }

  /**
   * Clear all targeting state
   */
  private clearTargetingState(): void {
    this.selectingTargetForCharacter.set(null);
    this.selectedTargetGroup.set(null);
    this.pendingSpell.set(null);
    this.targetingType.set(null);
  }

  /**
   * Cancel targeting mode
   */
  cancelTargeting(): void {
    this.clearTargetingState();
  }

  /**
   * Handle monster group click for targeting (attack or spell)
   */
  onGroupClicked(groupId: 'A' | 'B' | 'C' | 'D'): void {
    const selectingFor = this.selectingTargetForCharacter();
    if (!selectingFor) return;

    const char = this.partyCharacters().find(c => c.id === selectingFor);
    if (!char) return;

    // Validate group has alive targets
    const group = this.monsterGroups().find(g => g.id === groupId);
    if (!group) return;

    const aliveMonsters = group.monsters.filter(m => m.hp > 0 && m.status !== 'DEAD');
    if (aliveMonsters.length === 0) {
      this.addMessage('No valid targets in that group.');
      return;
    }

    // Handle based on targeting type
    if (this.targetingType() === 'spell') {
      // Spell targeting
      const spell = this.pendingSpell();
      if (spell) {
        this.createSpellCommand(char.id, spell, groupId);
      }
    } else {
      // Attack targeting
      const target = aliveMonsters[0];
      const command = createCommand(char, 'ATTACK', target, {
        groupId: groupId
      });

      this.selectedActions.update(actions => {
        const newActions = new Map(actions);
        newActions.set(char.id, command);
        return newActions;
      });

      this.addMessage(`${char.name}: ATTACK → Group ${groupId}`);
      this.clearTargetingState();
    }
  }

  // ============================================================
  // ACTION SELECTION
  // ============================================================

  /**
   * Select Parry action for a character
   */
  private selectParry(char: Character): void {
    const command = createCommand(char, 'PARRY', undefined);

    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(char.id, command);
      return newActions;
    });

    this.addMessage(`${char.name}: PARRY`);
  }

  /**
   * Select Run action for a character
   */
  private selectRun(char: Character): void {
    const command = createCommand(char, 'RUN', undefined);

    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(char.id, command);
      return newActions;
    });

    this.addMessage(`${char.name}: RUN`);
  }

  /**
   * Check if all able characters have actions selected
   */
  private allCharactersHaveActions(): boolean {
    const party = this.partyCharacters();
    const actions = this.selectedActions();

    for (const char of party) {
      // Skip incapacitated characters
      if (!CharacterService.canAct(char)) {
        continue;
      }

      // Check if this character has an action selected
      if (!actions.has(char.id)) {
        return false;
      }
    }

    return true;
  }

  // ============================================================
  // MENU ACTIONS
  // ============================================================

  /**
   * Handle footer menu actions
   */
  handleMenuAction(action: string): void {
    // Handle targeting menu actions
    if (action.startsWith('target-')) {
      const groupId = action.replace('target-', '') as 'A' | 'B' | 'C' | 'D';
      this.selectTargetGroup(groupId);
      return;
    }
    if (action === 'cancel-targeting') {
      this.cancelTargeting();
      return;
    }

    // Handle normal combat menu actions
    switch (action) {
      case 'start_round':
        this.startRound();
        break;
      case 'reset':
        this.resetActions();
        break;
      case 'flee':
        this.fleeAll();
        break;
    }
  }

  /**
   * Start the combat round with selected actions
   */
  private startRound(): void {
    if (!this.allCharactersHaveActions()) {
      this.addMessage('All characters must have actions selected.');
      return;
    }

    const combat = this.combatState();
    if (!combat) return;

    // Collect all commands
    const partyCommands = Array.from(this.selectedActions().values());

    // Update combat state with commands
    this.gameState.updateState(state => ({
      ...state,
      combat: state.combat ? {
        ...state.combat,
        commandQueue: partyCommands
      } : undefined
    }));

    // Clear local selected actions
    this.selectedActions.set(new Map());

    // Navigate to playback
    queueMicrotask(() => {
      this.router.navigate(['/maze/combat/playback']);
    });
  }

  /**
   * Reset all selected actions
   */
  private resetActions(): void {
    this.selectedActions.set(new Map());
    this.cancelTargeting();
    this.addMessage('Actions reset. Select new actions for your party.');
  }

  /**
   * Set all characters to Run action
   */
  private fleeAll(): void {
    if (!this.canFlee()) {
      this.addMessage('You cannot flee from this battle!');
      return;
    }

    const newActions = new Map<string, CombatCommand>();
    const party = this.partyCharacters();

    for (const char of party) {
      // Skip incapacitated characters
      if (!CharacterService.canAct(char)) {
        continue;
      }

      const command = createCommand(char, 'RUN', undefined);
      newActions.set(char.id, command);
    }

    this.selectedActions.set(newActions);
    this.addMessage('All party members will attempt to flee!');
  }

  // ============================================================
  // KEYBOARD HANDLING
  // ============================================================

  @HostListener('window:keydown.enter')
  handleEnterKey(): void {
    if (!this.isTargetingMode() && this.allCharactersHaveActions()) {
      this.startRound();
    }
  }

  @HostListener('window:keydown.escape')
  handleEscapeKey(): void {
    if (this.isTargetingMode()) {
      this.cancelTargeting();
    }
  }

  @HostListener('window:keydown.r')
  handleResetKey(): void {
    if (!this.isTargetingMode() && this.selectedActions().size > 0) {
      this.resetActions();
    }
  }

  @HostListener('window:keydown.f')
  handleFleeKey(): void {
    if (!this.isTargetingMode() && this.canFlee()) {
      this.fleeAll();
    }
  }

  @HostListener('window:keydown.a')
  handleKeyA(): void {
    if (this.isTargetingMode()) this.selectTargetGroup('A');
  }

  @HostListener('window:keydown.b')
  handleKeyB(): void {
    if (this.isTargetingMode()) this.selectTargetGroup('B');
  }

  @HostListener('window:keydown.c')
  handleKeyC(): void {
    if (this.isTargetingMode()) this.selectTargetGroup('C');
  }

  @HostListener('window:keydown.d')
  handleKeyD(): void {
    if (this.isTargetingMode()) this.selectTargetGroup('D');
  }

  /**
   * Select a monster group as target (keyboard or menu)
   */
  private selectTargetGroup(groupId: 'A' | 'B' | 'C' | 'D'): void {
    const group = this.monsterGroups().find(g => g.id === groupId);
    if (!group || group.monsters.filter(m => m.hp > 0).length === 0) {
      return;  // Invalid or empty group
    }
    this.onGroupClicked(groupId);
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  getCharacterName(characterId: string): string {
    const char = this.partyCharacters().find(c => c.id === characterId);
    return char?.name ?? 'Unknown';
  }

  private addMessage(message: string): void {
    this.messageLog.addMessage(message);
  }
}
