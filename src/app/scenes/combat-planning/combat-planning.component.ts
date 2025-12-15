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
import { MenuItem } from '@shared/components/menu/menu.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { SpellLearningService } from '@services/SpellLearningService';
import { SpellCastingService } from '@services/SpellCastingService';
import { CharacterService } from '@services/CharacterService';
import { createCommand } from '@services/combat';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { CombatState, CombatCommand, MonsterGroup } from '@models/Combat';
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
    CombatOverlayComponent
  ],
  template: `
    <div class="combat-planning">
      <!-- Combat Overlay (monster sprites) -->
      <app-combat-overlay
        [visible]="true"
        [monsterGroups]="monsterGroups()"
        [roundNumber]="roundNumber()"
        [selectedGroupId]="selectedTargetGroup()"
        [isTargetingMode]="isTargetingMode()"
        [letterboxType]="letterboxType()"
        [showVictoryOverlay]="false"
        [showDefeatOverlay]="false"
        [showMonsterCards]="true"
        [partyCharacters]="partyCharacters()"
        (groupClicked)="onGroupClicked($event)"
      />

      <!-- Title -->
      <app-scene-title [title]="sceneTitle()"></app-scene-title>

      <!-- 3-Column Layout -->
      <div class="combat-content">
        <!-- Left Column: Positions 1, 3, 5 -->
        <div class="left-panel">
          <app-character-panel
            [characters]="leftColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="['fight', 'cast-spell', 'parry', 'run']"
            [showSprites]="true"
            (actionClick)="handleCharacterAction($event)"
          />
        </div>

        <!-- Center Column: Message Log and Instructions -->
        <div class="center-panel">
          <!-- Targeting Instructions -->
          @if (isTargetingMode()) {
            <div class="targeting-instructions">
              <p class="instruction-text">
                @if (selectingTargetForCharacter()) {
                  Select a monster group for {{ getCharacterName(selectingTargetForCharacter()!) }} to attack.
                } @else {
                  Select a target group (click or press 1-4).
                }
              </p>
              <button class="cancel-btn" (click)="cancelTargeting()">Cancel (ESC)</button>
            </div>
          }

          <div class="message-log-section">
            <app-message-log [messages]="messages()" />
          </div>
        </div>

        <!-- Right Column: Positions 2, 4, 6 -->
        <div class="right-panel">
          <app-character-panel
            [characters]="rightColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="['fight', 'cast-spell', 'parry', 'run']"
            [showSprites]="true"
            (actionClick)="handleCharacterAction($event)"
          />
        </div>
      </div>

      <!-- Footer Menu -->
      <app-scene-footer
        [menuItems]="combatMenuItems()"
        (itemSelected)="handleMenuAction($event)"
      />
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
    }

    .combat-content {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 2fr 1fr;
      gap: 0.5rem;
      padding: 0.5rem;
      min-height: 0;
    }

    .left-panel,
    .right-panel {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow-y: auto;
    }

    .center-panel {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .targeting-instructions {
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid var(--color-gold-primary);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.5rem;
      text-align: center;
    }

    .instruction-text {
      color: var(--color-gold-primary);
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }

    .cancel-btn {
      background: transparent;
      border: 1px solid var(--color-text-secondary);
      color: var(--color-text-secondary);
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;

      &:hover {
        border-color: var(--color-gold-primary);
        color: var(--color-gold-primary);
      }
    }

    .message-log-section {
      margin-top: auto;
      max-height: 200px;
      overflow-y: auto;
    }
  `]
})
export class CombatPlanningComponent implements OnInit {
  // Local signals
  readonly messages = signal<string[]>([]);
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map());
  readonly selectingTargetForCharacter = signal<string | null>(null);
  readonly selectedTargetGroup = signal<'A' | 'B' | 'C' | 'D' | null>(null);
  readonly letterboxType = signal<'encounter' | 'ambush' | 'surprise' | null>(null);

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

  // Footer menu items
  readonly combatMenuItems = computed((): MenuItem[] => {
    const allSelected = this.allCharactersHaveActions();
    const anySelected = this.selectedActions().size > 0;
    const canRun = this.canFlee();
    const inTargeting = this.isTargetingMode();

    return [
      {
        id: 'start_round',
        label: 'Start Round',
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

  constructor(
    private gameState: GameStateService,
    private navigation: SceneNavigationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check for surprise state on first round
    const combat = this.combatState();
    if (combat && combat.roundNumber === 1 && combat.surpriseState) {
      if (combat.surpriseState === 'party') {
        this.letterboxType.set('surprise');
        this.addMessage('You surprised the monsters! You get a free round.');
      } else if (combat.surpriseState === 'monsters') {
        this.letterboxType.set('ambush');
        this.addMessage('The monsters ambushed you! They get a free round.');
      }
    }

    this.addMessage('Select actions for your party members.');
  }

  // ============================================================
  // CHARACTER ACTIONS
  // ============================================================

  /**
   * Get available combat actions for a character
   */
  getActionsForCharacter = (char: Character): CharacterAction[] => {
    const actions: CharacterAction[] = [];
    const selectedAction = this.selectedActions().get(char.id);
    const canAct = CharacterService.canAct(char);

    // Fight (Attack)
    actions.push({
      type: 'fight',
      label: selectedAction?.type === 'ATTACK' ? `ATK→${selectedAction.targetGroupId}` : 'Fight',
      enabled: canAct && !selectedAction
    });

    // Cast Spell (for casters with combat spells)
    if (SpellLearningService.isCaster(char) &&
        SpellCastingService.hasSpellsInContext(char, 'combat')) {
      actions.push({
        type: 'cast-spell',
        label: selectedAction?.type === 'CAST_SPELL' ? `CAST` : 'Cast',
        enabled: canAct && !selectedAction && char.status !== CharacterStatus.ASLEEP
      });
    }

    // Parry (Defend)
    actions.push({
      type: 'parry',
      label: selectedAction?.type === 'PARRY' ? 'PARRY' : 'Parry',
      enabled: canAct && !selectedAction
    });

    // Run (Flee) - only if flee is allowed
    if (this.canFlee()) {
      actions.push({
        type: 'run',
        label: selectedAction?.type === 'RUN' ? 'RUN' : 'Run',
        enabled: canAct && !selectedAction
      });
    }

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
        // Navigate to spell casting scene, return to maze (combat guards will redirect to planning)
        this.navigation.castSpell(char.id, 'maze');
        break;
      case 'parry':
        this.selectParry(char);
        break;
      case 'run':
        this.selectRun(char);
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
    this.addMessage('Select a monster group to attack.');
  }

  /**
   * Cancel targeting mode
   */
  cancelTargeting(): void {
    this.selectingTargetForCharacter.set(null);
    this.selectedTargetGroup.set(null);
  }

  /**
   * Handle monster group click for targeting
   */
  onGroupClicked(groupId: 'A' | 'B' | 'C' | 'D'): void {
    const selectingFor = this.selectingTargetForCharacter();
    if (!selectingFor) return;

    const char = this.partyCharacters().find(c => c.id === selectingFor);
    if (!char) return;

    // Find a valid target in the group
    const group = this.monsterGroups().find(g => g.id === groupId);
    if (!group) return;

    const aliveMonsters = group.monsters.filter(m => m.hp > 0 && m.status !== 'DEAD');
    if (aliveMonsters.length === 0) {
      this.addMessage('No valid targets in that group.');
      return;
    }

    // Select first alive monster as target
    const target = aliveMonsters[0];

    // Create attack command
    const command = createCommand(char, 'ATTACK', target, {
      groupId: groupId
    });

    // Store the action
    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(char.id, command);
      return newActions;
    });

    // Clear targeting mode
    this.selectingTargetForCharacter.set(null);
    this.selectedTargetGroup.set(null);

    this.addMessage(`${char.name}: ATTACK → Group ${groupId}`);
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

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  getCharacterName(characterId: string): string {
    const char = this.partyCharacters().find(c => c.id === characterId);
    return char?.name ?? 'Unknown';
  }

  private addMessage(message: string): void {
    this.messages.update(msgs => [...msgs, message]);
  }
}
