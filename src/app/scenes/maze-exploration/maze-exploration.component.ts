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
import { MenuItem } from '@shared/components/menu/menu.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { MessageLogComponent } from '@shared/components/message-log/message-log.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import {
  DungeonMovementOps,
  DungeonRotationService,
  MovementResult,
} from '@services/dungeon';
import { DungeonService } from '@services/DungeonService';
import { EncounterTriggerService, EncounterContext, FixedEncounterConfig, EncounterReason } from '@services/EncounterTriggerService';
import { FightMapService } from '@services/FightMapService';
import { TileInspectionService } from '@services/TileInspectionService';
import { SpellCastingService } from '@services/SpellCastingService';
import { SpellLearningService } from '@services/SpellLearningService';
import { LightService } from '@services/LightService';
import { PoisonService } from '@services/PoisonService';
import { initiateCombat } from '@services/combat';
import { moveCharacterUp, moveCharacterDown } from '@services/PartyService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { ActiveSpell } from '@models/active-spell.types';
import { GameState } from '@models/GameState';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { DungeonState } from '@models/Dungeon';

/**
 * MazeExplorationComponent - Handles dungeon exploration when not in combat.
 *
 * This is a child route of MazeLayoutComponent that provides:
 * - Character panels with exploration actions (inspect, cast spell, formation)
 * - Movement handling (WASD/arrows) via keyboard
 * - Footer menu for navigation and actions
 * - Message log for exploration events
 * - Encounter triggering → navigates to /maze/combat/planning
 *
 * The WebGL canvas is owned by the parent MazeLayoutComponent.
 * This component renders as an overlay layer on top of the canvas.
 */
@Component({
  selector: 'app-maze-exploration',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent
  ],
  template: `
    <div class="maze-exploration">
      <!-- Title with Active Spells -->
      <app-scene-title [title]="sceneTitle()" [activeSpells]="activeSpells()"></app-scene-title>

      <!-- 3-Column Layout -->
      <div class="maze-content">
        <!-- Left Column: Positions 1, 3, 5 -->
        <div class="left-panel">
          <app-character-panel
            [characters]="leftColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="['inspect', 'cast-spell']"
            [showSprites]="true"
            (actionClick)="handleCharacterAction($event)"
          />
        </div>

        <!-- Center Column: Message Log -->
        <div class="center-panel">
          <div class="message-log-section">
            <app-message-log [messages]="messages()" />
          </div>
        </div>

        <!-- Right Column: Positions 2, 4, 6 -->
        <div class="right-panel">
          <app-character-panel
            [characters]="rightColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="['inspect', 'cast-spell']"
            [showSprites]="true"
            (actionClick)="handleCharacterAction($event)"
          />
        </div>
      </div>

      <!-- Footer Menu -->
      <app-scene-footer
        [menuItems]="mazeMenuItems()"
        (itemSelected)="handleMenuAction($event)"
      />
    </div>
  `,
  styles: [`
    .maze-exploration {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: transparent;
      color: var(--color-text-primary);
      font-family: var(--font-body);
    }

    .maze-content {
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

    .message-log-section {
      margin-top: auto;
      max-height: 200px;
      overflow-y: auto;
    }
  `]
})
export class MazeExplorationComponent implements OnInit {
  // Local signals
  readonly messages = signal<string[]>([]);
  readonly isMovementLocked = signal(false);

  // Computed from GameState
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState | undefined);
  readonly currentLevel = computed(() => this.dungeonState()?.currentLevel ?? 1);
  readonly position = computed(() => this.dungeonState()?.position);

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

  // Active spells (MILWA, LOMILWA, etc.)
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

  // Scene title
  readonly sceneTitle = computed(() => {
    return `MAZE - LEVEL ${this.currentLevel()}`;
  });

  // Footer menu items
  readonly mazeMenuItems = computed((): MenuItem[] => {
    const state = this.gameState.state();
    let canInspect = false;

    if (state.dungeon?.position) {
      const level = DungeonService.loadLevel(this.currentLevel());
      canInspect = TileInspectionService.hasSearchableContent(level, state.dungeon.position);
    }

    return [
      { id: 'forward', label: 'Forward', shortcut: 'W', enabled: true },
      { id: 'back', label: 'Back', shortcut: 'S', enabled: true },
      { id: 'left', label: 'Turn L', shortcut: 'A', enabled: true },
      { id: 'right', label: 'Turn R', shortcut: 'D', enabled: true },
      { id: 'strafe_left', label: 'Strafe L', shortcut: 'Q', enabled: true },
      { id: 'strafe_right', label: 'Strafe R', shortcut: 'E', enabled: true },
      { id: 'inspect', label: 'Inspect', shortcut: 'I', enabled: canInspect },
      { id: 'camp', label: 'Camp', shortcut: 'C', enabled: true }
    ];
  });

  constructor(
    private gameState: GameStateService,
    private navigation: SceneNavigationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.addMessage('You are exploring the maze...');
    this.displayPendingSpellMessage();
  }

  /**
   * Display any pending spell message from spell casting scene.
   * Clears the message from dungeon state after displaying.
   */
  private displayPendingSpellMessage(): void {
    const dungeon = this.dungeonState();
    if (dungeon?.pendingSpellMessage) {
      this.addMessage(dungeon.pendingSpellMessage);

      // Clear the message from state
      this.gameState.updateState(state => ({
        ...state,
        dungeon: state.dungeon ? {
          ...state.dungeon,
          pendingSpellMessage: undefined
        } : undefined
      }));
    }
  }

  /**
   * Get actions for a character card in exploration mode
   */
  getActionsForCharacter = (char: Character): CharacterAction[] => {
    const actions: CharacterAction[] = [];
    const state = this.gameState.state();

    // All characters can be inspected
    actions.push({
      type: 'inspect',
      enabled: char.status !== CharacterStatus.LOST
    });

    // Spellcasters with dungeon spells
    if (SpellLearningService.isCaster(char) &&
        SpellCastingService.hasSpellsInContext(char, 'dungeon') &&
        char.status !== CharacterStatus.DEAD &&
        char.status !== CharacterStatus.ASHES &&
        char.status !== CharacterStatus.PARALYZED &&
        char.status !== CharacterStatus.ASLEEP) {
      actions.push({
        type: 'cast-spell',
        label: 'Cast',
        enabled: true
      });
    }

    // Formation actions
    const canMoveUp = GameStateQueries.canMoveUp(state, char.id);
    const canMoveDown = GameStateQueries.canMoveDown(state, char.id);
    actions.push({ type: 'moveUp', enabled: canMoveUp });
    actions.push({ type: 'moveDown', enabled: canMoveDown });

    return actions;
  };

  /**
   * Handle character card action clicks
   */
  handleCharacterAction(event: CharacterActionEvent): void {
    switch (event.actionType) {
      case 'inspect':
        this.navigation.inspectCharacter(event.characterId, 'maze');
        break;
      case 'cast-spell':
        this.navigation.castSpell(event.characterId, 'maze');
        break;
      case 'moveUp':
        this.onMoveUp(event.characterId);
        break;
      case 'moveDown':
        this.onMoveDown(event.characterId);
        break;
    }
  }

  /**
   * Handle footer menu actions
   */
  handleMenuAction(action: string): void {
    if (this.isMovementLocked()) return;

    switch (action) {
      case 'forward':
        this.moveForward();
        break;
      case 'back':
        this.moveBackward();
        break;
      case 'left':
        this.turnLeft();
        break;
      case 'right':
        this.turnRight();
        break;
      case 'strafe_left':
        this.strafeLeft();
        break;
      case 'strafe_right':
        this.strafeRight();
        break;
      case 'inspect':
        this.inspectTile();
        break;
      case 'camp':
        this.navigation.goToCamp();
        break;
    }
  }

  // ============================================================
  // KEYBOARD HANDLING
  // ============================================================

  @HostListener('window:keydown.arrowup')
  @HostListener('window:keydown.w')
  handleForwardKey(): void {
    if (!this.isMovementLocked()) this.moveForward();
  }

  @HostListener('window:keydown.arrowdown')
  @HostListener('window:keydown.s')
  handleBackKey(): void {
    if (!this.isMovementLocked()) this.moveBackward();
  }

  @HostListener('window:keydown.arrowleft')
  @HostListener('window:keydown.a')
  handleLeftKey(): void {
    if (!this.isMovementLocked()) this.turnLeft();
  }

  @HostListener('window:keydown.arrowright')
  @HostListener('window:keydown.d')
  handleRightKey(): void {
    if (!this.isMovementLocked()) this.turnRight();
  }

  @HostListener('window:keydown.q')
  handleStrafeLeftKey(): void {
    if (!this.isMovementLocked()) this.strafeLeft();
  }

  @HostListener('window:keydown.e')
  handleStrafeRightKey(): void {
    if (!this.isMovementLocked()) this.strafeRight();
  }

  @HostListener('window:keydown.c')
  handleCampKey(): void {
    if (!this.isMovementLocked()) this.navigation.goToCamp();
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Could return to castle or show menu
    this.addMessage('Press C to camp, or use stairs to return to castle.');
  }

  // ============================================================
  // MOVEMENT METHODS
  // ============================================================

  private moveForward(): void {
    this.executeMovement('FORWARD', DungeonMovementOps.moveForward);
  }

  private moveBackward(): void {
    this.executeMovement('BACKWARD', DungeonMovementOps.moveBackward);
  }

  private turnLeft(): void {
    const state = this.gameState.state();
    const newState = DungeonRotationService.turnLeft(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You turn left.');
  }

  private turnRight(): void {
    const state = this.gameState.state();
    const newState = DungeonRotationService.turnRight(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You turn right.');
  }

  private strafeLeft(): void {
    this.executeMovement('STRAFE_LEFT', DungeonMovementOps.strafeLeft);
  }

  private strafeRight(): void {
    this.executeMovement('STRAFE_RIGHT', DungeonMovementOps.strafeRight);
  }

  private executeMovement(
    moveType: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT',
    serviceFn: (state: GameState) => MovementResult
  ): void {
    const state = this.gameState.state();
    const level = DungeonService.loadLevel(this.currentLevel());
    const position = this.position()!;

    // Validate movement
    const validation = DungeonService.canMove(
      level,
      position,
      moveType,
      state.dungeon?.openDoors,
      state.dungeon?.currentLevel
    );

    if (!validation.allowed) {
      this.addMessage(validation.reason!);
      return;
    }

    // Check if movement is through a door
    const tile = DungeonService.getTile(level, position.x, position.y);
    const wallDirection = DungeonService.getWallDirectionForMovement(position.facing, moveType);
    const wallType = tile.walls[wallDirection];
    const isDoorKick = wallType === 'door';

    // Execute movement
    const movementResult = serviceFn(state);
    const newState = movementResult.state;
    this.gameState.updateState(() => newState);

    // Check if stairs returned to castle
    if (newState.dungeon === undefined) {
      this.addMessage('You climb the stairs and exit the dungeon...');
      queueMicrotask(() => {
        this.router.navigate(['/castle-menu']);
      });
      return;
    }

    // Apply poison damage via service (handles state update internally)
    const poisonResult = PoisonService.applyMazePoisonToState(newState);
    if (poisonResult.messages.length > 0) {
      this.gameState.updateState(() => poisonResult.state);
      for (const msg of poisonResult.messages) {
        this.addMessage(msg);
      }
    }

    // Movement message
    const messages = {
      'FORWARD': isDoorKick ? 'You kick open the door and move forward.' : 'You move forward.',
      'BACKWARD': 'You move backward.',
      'STRAFE_LEFT': 'You strafe left.',
      'STRAFE_RIGHT': 'You strafe right.'
    };
    this.addMessage(messages[moveType]);

    // Check for encounter
    this.checkForEncounter(isDoorKick);
  }

  /**
   * Check for random or fixed encounters
   */
  private checkForEncounter(isDoorKick: boolean = false): void {
    if (!this.gameState.state().settings.encountersEnabled) {
      return;
    }

    const dungeon = this.dungeonState();
    if (!dungeon) return;

    const level = DungeonService.loadLevel(dungeon.currentLevel);
    const pos = dungeon.position;

    // Get fixed encounter config from FIGHTMAP if present
    const fixedEncounterConfig = FightMapService.getFixedEncounterConfig(
      dungeon.currentLevel,
      pos.x,
      pos.y
    );

    const context: EncounterContext = {
      level: dungeon.currentLevel,
      x: pos.x,
      y: pos.y,
      isDoorKick,
      chestAlarmActive: false, // Alarm encounters handled separately
      isRoomTile: DungeonService.isRoomTile(level, pos.x, pos.y),
      fixedEncounterConfig
    };

    const result = EncounterTriggerService.checkForEncounter(context);

    if (!result.trigger) return;

    console.log(`[MazeExploration] Encounter triggered: ${result.reason}`);

    // Mark tile as cleared after encounter (prevents immediate re-trigger)
    if (result.reason !== 'random' && result.reason !== 'door_kick') {
      FightMapService.markCleared(dungeon.currentLevel, pos.x, pos.y);
    }

    // Initiate encounter
    const canFlee = !result.guaranteedFight;
    this.initiateEncounter(canFlee, result.fixedEncounterConfig, result.reason);
  }

  /**
   * Initiate combat encounter and navigate to combat planning
   */
  private initiateEncounter(
    canFlee: boolean,
    fixedEncounterConfig?: FixedEncounterConfig,
    encounterReason?: EncounterReason
  ): void {
    this.addMessage('You encounter monsters!');

    const partyChars = this.partyCharacters();
    const dungeon = this.dungeonState();
    if (!dungeon) return;

    const latumapicActive = dungeon.latumapicActive ?? false;
    const expeditionAcBuff = dungeon.expeditionAcBuff ?? 0;

    // Create combat state
    const combatState = initiateCombat(dungeon.currentLevel, partyChars, {
      canFlee,
      fixedEncounterConfig,
      encounterReason,
      latumapicActive,
      expeditionAcBuff
    });

    // Update game state with combat
    this.gameState.updateState(currentState => ({
      ...currentState,
      combat: combatState
    }));

    // Navigate to combat planning
    queueMicrotask(() => {
      this.router.navigate(['/maze/combat/planning']);
    });
  }

  // ============================================================
  // FORMATION METHODS
  // ============================================================

  private onMoveUp(characterId: string): void {
    const state = this.gameState.state();
    const char = state.roster.get(characterId);
    const currentIndex = state.party.members.indexOf(characterId);

    if (currentIndex <= 0) {
      return; // Already at top
    }

    const newState = moveCharacterUp(state, characterId);
    this.gameState.updateState(() => newState);
    this.addMessage(`${char?.name ?? 'Character'} moves up in formation.`);
  }

  private onMoveDown(characterId: string): void {
    const state = this.gameState.state();
    const char = state.roster.get(characterId);
    const currentIndex = state.party.members.indexOf(characterId);

    if (currentIndex === -1 || currentIndex >= state.party.members.length - 1) {
      return; // Already at bottom
    }

    const newState = moveCharacterDown(state, characterId);
    this.gameState.updateState(() => newState);
    this.addMessage(`${char?.name ?? 'Character'} moves down in formation.`);
  }

  // ============================================================
  // TILE INSPECTION
  // ============================================================

  private inspectTile(): void {
    const state = this.gameState.state();
    const dungeon = state.dungeon;
    if (!dungeon) return;

    const level = DungeonService.loadLevel(dungeon.currentLevel);
    const result = TileInspectionService.inspectTile(level, dungeon.position);

    if (result.found) {
      if (result.message) {
        this.addMessage(result.message);
      }
      if (result.state) {
        this.gameState.updateState(() => result.state!);
      }
    } else {
      this.addMessage('You search but find nothing of interest.');
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private addMessage(message: string): void {
    this.messages.update(msgs => [...msgs, message]);
  }
}
