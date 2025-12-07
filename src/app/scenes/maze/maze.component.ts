import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { MessageLogComponent } from '@shared/components/message-log/message-log.component';
import { SpellPanelComponent } from '@shared/components/spell-panel/spell-panel.component';
import { CharacterSelectionDialogComponent, CharacterOption } from '@shared/components/character-selection-dialog/character-selection-dialog.component';
import { CombatOverlayComponent } from '@shared/components/combat-overlay/combat-overlay.component';
import { GameStateService } from '@services/GameStateService';
import { RandomService } from '@services/RandomService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { DungeonMovementService } from '@services/DungeonMovementService';
import { DungeonService } from '@services/DungeonService';
import { WebGLRenderingService } from '@services/WebGLRenderingService';
import { EncounterService } from '@services/EncounterService';
import { EncounterTriggerService, EncounterContext, EncounterCheckResult, FixedEncounterConfig } from '@services/EncounterTriggerService';
import { FightMapService } from '@services/FightMapService';
import { CombatService } from '@services/CombatService';
import { DoorService } from '@services/DoorService';
import { TileInspectionService } from '@services/TileInspectionService';
import { SpellCastingService, SpellData } from '@services/SpellCastingService';
import { SpellLearningService } from '@services/SpellLearningService';
import { LightService } from '@services/LightService';
import { moveCharacterUp, moveCharacterDown } from '@services/PartyService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { SceneType } from '@models/SceneType';
import { ActiveSpell } from '@models/active-spell.types';
import { GameState } from '@models/GameState';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { DungeonState } from '@models/Dungeon';
import { TextureAtlas } from '@models/texture.types';
import { ViewportConfig } from '@models/rendering.types';
import { CombatState, MonsterGroup, CombatCommand, CombatActionType, Combatant } from '@models/Combat';
import { VictoryService, VictoryRewards } from '@services/VictoryService';
import { PartyAbandonmentService } from '@services/PartyAbandonmentService';
import * as TextureAtlasService from '@services/TextureAtlasService';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    SpellPanelComponent,
    CharacterSelectionDialogComponent,
    CombatOverlayComponent
  ],
  templateUrl: './maze.component.html',
  styleUrls: ['./maze.component.scss']
})
export class MazeComponent implements OnInit, AfterViewInit, OnDestroy {
  // Canvas reference for WebGL rendering
  @ViewChild('mazeCanvas', { static: false })
  canvasRef?: ElementRef<HTMLCanvasElement>;

  // Local signals
  readonly messages = signal<string[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoadingLevel = signal<boolean>(false);

  // Spell casting state
  readonly showSpellDialog = signal<boolean>(false);
  readonly showTargetDialog = signal<boolean>(false);
  readonly selectedCaster = signal<Character | null>(null);
  readonly selectedSpell = signal<SpellData | null>(null);
  readonly targetOptions = signal<CharacterOption[]>([]);
  readonly spellContext = signal<'dungeon' | 'combat'>('dungeon');
  readonly pendingCombatSpell = signal<SpellData | null>(null);

  // ============================================================
  // INTEGRATED COMBAT STATE (Theater Stage Design)
  // Combat happens IN the maze view, not as a separate scene
  // ============================================================
  readonly combatPhase = signal<'idle' | 'encounter' | 'action_select' | 'executing' | 'victory' | 'defeat'>('idle');
  readonly letterboxType = signal<'encounter' | 'ambush' | 'surprise' | null>(null);
  readonly selectedTargetGroupId = signal<'A' | 'B' | 'C' | 'D' | null>(null);
  readonly isTargetingMode = signal<boolean>(false);

  // Computed combat state from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat);
  readonly inCombat = computed(() => !!this.combatState());
  readonly monsterGroups = computed((): MonsterGroup[] => this.combatState()?.monsterGroups ?? []);
  readonly combatRoundNumber = computed(() => this.combatState()?.roundNumber ?? 1);

  // Combat action selection state
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map());
  readonly isExecutingRound = signal<boolean>(false);
  readonly showVictoryOverlay = signal<boolean>(false);
  readonly showDefeatOverlay = signal<boolean>(false);
  readonly victoryRewards = signal<VictoryRewards | null>(null);

  // Abandon party confirmation state
  readonly showAbandonConfirmation = signal<boolean>(false);

  // Get alive party members for combat
  readonly alivePartyMembers = computed(() =>
    this.partyCharacters().filter(c => c.hp > 0)
  );

  // Check if all actions are selected
  readonly allActionsSelected = computed(() => {
    const alive = this.alivePartyMembers();
    const actions = this.selectedActions();
    return alive.every(c => actions.has(c.id));
  });

  /**
   * Check if a character is incapacitated (cannot take combat actions)
   */
  private isCharacterIncapacitated(char: Character): boolean {
    return char.status === CharacterStatus.DEAD ||
           char.status === CharacterStatus.ASHES ||
           char.status === CharacterStatus.LOST ||
           char.status === CharacterStatus.PARALYZED ||
           char.status === CharacterStatus.ASLEEP ||
           char.hp <= 0;
  }

  /**
   * Check if a character has spells available for combat
   */
  private characterHasSpells(char: Character): boolean {
    return SpellCastingService.hasSpellsInContext(char, 'combat');
  }

  /**
   * Get display text for a combat command (e.g., "ATTACK → A")
   */
  private getActionDisplayText(command: CombatCommand): string {
    const groupId = command.data?.groupId;
    const targetText = groupId ? ` → ${groupId}` : '';

    switch (command.type) {
      case 'ATTACK':
        return `ATTACK${targetText}`;
      case 'PARRY':
        return 'PARRY';
      case 'RUN':
        return 'FLEE';
      case 'CAST_SPELL':
        // Get spell name from data
        const spellId = command.data?.spellId;
        if (spellId) {
          // Try to get spell name (uppercase)
          return `${spellId.toUpperCase()}${targetText}`;
        }
        return `CAST${targetText}`;
      default:
        return command.type;
    }
  }

  /**
   * Combat action status texts - shows "ATTACK → A" or "Incapacitated" on character cards
   */
  readonly combatActionTexts = computed((): Map<string, string> => {
    if (!this.inCombat()) return new Map();

    const actions = this.selectedActions();
    const textMap = new Map<string, string>();
    const party = this.partyCharacters();

    for (const char of party) {
      // Show "Incapacitated" for characters who can't act
      if (this.isCharacterIncapacitated(char)) {
        textMap.set(char.id, 'Incapacitated');
        continue;
      }

      // Show selected action text if action has been chosen
      const command = actions.get(char.id);
      if (command) {
        textMap.set(char.id, this.getActionDisplayText(command));
      }
    }

    return textMap;
  });

  /**
   * Get combat actions for a character card
   * Returns action buttons ([Attack], [Cast], [Parry]) for characters who haven't selected yet
   * Returns empty during round execution or when party is surprised
   */
  getCombatActionsForCharacter = (char: Character): CharacterAction[] => {
    // No actions during round execution (monsters attacking, spells resolving, etc.)
    if (this.isExecutingRound()) {
      return [];
    }

    // If character already has action selected, show status text instead (return empty)
    if (this.selectedActions().has(char.id)) {
      return [];
    }

    // Incapacitated characters show "Incapacitated" label, no buttons
    if (this.isCharacterIncapacitated(char)) {
      return [];
    }

    // Build action list based on character capabilities
    const actions: CharacterAction[] = [
      { type: 'attack', enabled: true }
    ];

    // Add Cast if character has combat spells
    if (this.characterHasSpells(char)) {
      actions.push({ type: 'cast-spell', enabled: true });
    }

    actions.push({ type: 'parry', enabled: true });

    return actions;
  };

  // Can flee from current combat
  readonly canFlee = computed(() => this.combatState()?.canFlee ?? false);

  /**
   * Simplified combat footer menu items: [Start Round], [Flee], [Reset Actions]
   * Action selection now happens on character cards, not in footer
   */
  readonly combatFooterMenuItems = computed((): MenuItem[] => {
    const allSelected = this.allActionsSelected();
    const isExecuting = this.isExecutingRound();
    const canFlee = this.combatState()?.canFlee ?? false;
    const hasAnyActions = this.selectedActions().size > 0;

    return [
      {
        id: 'start-round',
        label: `Start Round ${this.combatRoundNumber()}`,
        shortcut: 'ENTER',
        enabled: allSelected && !isExecuting
      },
      {
        id: 'flee',
        label: 'Flee',
        shortcut: 'F',
        enabled: canFlee && !isExecuting
      },
      {
        id: 'reset-actions',
        label: 'Reset Actions',
        shortcut: 'R',
        enabled: hasAnyActions && !isExecuting
      }
    ];
  });

  // Targeting state for attack/spell target selection
  readonly isTargetingCharacterId = signal<string | null>(null);

  /**
   * Dim both character panels during targeting mode (modal interaction)
   * When a character is selecting a target, all other cards should be disabled
   */
  readonly shouldDimLeftPanel = computed(() => this.isTargetingCharacterId() !== null);
  readonly shouldDimRightPanel = computed(() => this.isTargetingCharacterId() !== null);

  // WebGL Renderer
  private webglRenderer: WebGLRenderingService | null = null;

  // Computed signals from GameStateService
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState);
  readonly position = computed(() => this.dungeonState()?.position);
  readonly currentLevel = computed(() => this.dungeonState()?.currentLevel ?? 1);
  readonly party = computed(() => this.gameState.state().party);
  // Note: partyCharacters is used for combat initialization (CombatService.initiateCombat),
  // not for template rendering (which uses CharacterPanelComponent)
  readonly partyCharacters = computed(() => {
    const roster = this.gameState.state().roster;
    return this.party().members.map(id => roster.get(id)!).filter(c => c);
  });

  /**
   * Characters for left column (positions 1, 3, 5 = indices 0, 2, 4)
   * Visual layout only - does not affect combat mechanics
   */
  readonly leftColumnCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[0], chars[2], chars[4]].filter(c => c !== undefined);
  });

  /**
   * Characters for right column (positions 2, 4, 6 = indices 1, 3, 5)
   * Visual layout only - does not affect combat mechanics
   */
  readonly rightColumnCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[1], chars[3], chars[5]].filter(c => c !== undefined);
  });

  /**
   * Check if current tile can be inspected
   */
  readonly canInspectTile = computed(() => {
    const state = this.gameState.state();
    if (!state.dungeon?.position) return false;
    const level = DungeonService.loadLevel(this.currentLevel());
    return TileInspectionService.hasSearchableContent(level, state.dungeon.position);
  });

  // Active spells (computed from dungeon state)
  readonly activeSpells = computed((): ActiveSpell[] => {
    const spells: ActiveSpell[] = [];
    const dungeon = this.dungeonState();

    // Light spells (MILWA/LOMILWA)
    if (dungeon?.lightActive && dungeon.lightSpellType) {
      const durationDisplay = LightService.getSpellDurationDisplay(dungeon);
      const durationText = durationDisplay === 'permanent' ? '' : ` (${durationDisplay})`;
      spells.push({
        name: dungeon.lightSpellType,
        icon: '💡',
        description: `Light${durationText}`,
        variant: 'light'
      });
    }

    // LATUMAPIC (monster identification) - persists for entire expedition
    if (dungeon?.latumapicActive) {
      spells.push({
        name: 'LATUMAPIC',
        icon: '👁️',
        description: 'Monsters Identified',
        variant: 'identification'
      });
    }

    return spells;
  });


  /**
   * Show elevator dialog when on elevator tile
   */
  readonly showElevatorDialog = computed(() => {
    const dungeon = this.dungeonState();
    if (!dungeon) return false;

    const level = DungeonService.loadLevel(this.currentLevel());
    const pos = this.position();
    if (!pos) return false;

    const currentTile = DungeonService.getTile(level, pos.x, pos.y);
    return currentTile.types?.includes('elevator') ?? false;
  });

  /**
   * Available elevator destinations
   */
  readonly elevatorDestinations = computed(() => {
    const dungeon = this.dungeonState();
    if (!dungeon) return [];

    const level = DungeonService.loadLevel(this.currentLevel());
    const pos = this.position();
    if (!pos) return [];

    const currentTile = DungeonService.getTile(level, pos.x, pos.y);
    return currentTile.destinations || [];
  });

  // Scene title - changes during combat
  readonly sceneTitle = computed(() => {
    if (this.inCombat()) {
      return `COMBAT - ROUND ${this.combatRoundNumber()}`;
    }
    return `MAZE - LEVEL ${this.currentLevel()}`;
  });

  // Footer menu items for SceneFooterComponent
  // Note: Door button removed - walking into a door moves through it (original Wizardry behavior)
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
      { id: 'abandon', label: 'Abandon', shortcut: 'X', enabled: true }
    ];
  });

  /**
   * Get actions for a character card in the maze
   * All characters get an "Inspect" button
   * Spellcasters get a "Cast" button if they have dungeon-castable spells
   * All characters get moveUp/moveDown for formation adjustment
   */
  getActionsForCharacter = (char: Character): CharacterAction[] => {
    const actions: CharacterAction[] = [];
    const state = this.gameState.state();

    // All characters can be inspected (except lost forever)
    actions.push({
      type: 'inspect',
      enabled: char.status !== CharacterStatus.LOST
    });

    // Check if character is a spellcaster with available dungeon spells
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

    // Formation adjustment actions
    const canMoveUp = GameStateQueries.canMoveUp(state, char.id);
    const canMoveDown = GameStateQueries.canMoveDown(state, char.id);
    actions.push({ type: 'moveUp', enabled: canMoveUp });
    actions.push({ type: 'moveDown', enabled: canMoveDown });

    return actions;
  };

  /**
   * Handle action clicks from character cards
   */
  handleCharacterAction(event: CharacterActionEvent): void {
    // Handle combat actions from character cards
    if (this.inCombat()) {
      switch (event.actionType) {
        case 'attack':
          this.startCombatTargeting(event.characterId);
          break;
        case 'cast-spell':
          this.openCombatSpellMenu(event.characterId);
          break;
        case 'parry':
          this.selectParryAction(event.characterId);
          break;
        case 'inspect':
          // Allow inspect even during combat
          this.navigation.inspectCharacter(event.characterId, 'maze');
          break;
      }
      return;
    }

    // Non-combat (dungeon exploration) actions
    switch (event.actionType) {
      case 'inspect':
        this.navigation.inspectCharacter(event.characterId, 'maze');
        break;
      case 'cast-spell':
        this.openSpellDialog(event.characterId);
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
   * Start combat targeting mode for a character's attack
   */
  private startCombatTargeting(characterId: string): void {
    const char = this.partyCharacters().find(c => c.id === characterId);
    if (!char || this.isExecutingRound()) return;

    // Set targeting state
    this.isTargetingCharacterId.set(characterId);
    this.isTargetingMode.set(true);
    this.addMessage(`${char.name} prepares to attack... Select a target.`);
  }

  /**
   * Open combat spell menu for a character
   */
  private openCombatSpellMenu(characterId: string): void {
    const char = this.partyCharacters().find(c => c.id === characterId);
    if (!char || this.isExecutingRound()) return;

    // Check if character has combat spells
    if (!SpellCastingService.hasSpellsInContext(char, 'combat')) {
      this.addMessage(`${char.name} has no combat spells available.`);
      return;
    }

    // Set combat context and open spell dialog
    this.spellContext.set('combat');
    this.selectedCaster.set(char);
    this.showSpellDialog.set(true);
  }

  /**
   * Select parry action for a character (immediately confirmed)
   */
  private selectParryAction(characterId: string): void {
    const char = this.partyCharacters().find(c => c.id === characterId);
    if (!char || this.isExecutingRound()) return;

    // Create parry command
    const command = CombatService.createCommand(char, 'PARRY', undefined);

    // Store in selected actions
    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(char.id, command);
      return newActions;
    });

    this.addMessage(`${char.name}: PARRY`);
  }

  onMoveUp(characterId: string): void {
    const newState = moveCharacterUp(this.gameState.state(), characterId);
    this.gameState.updateState(() => newState);
  }

  onMoveDown(characterId: string): void {
    const newState = moveCharacterDown(this.gameState.state(), characterId);
    this.gameState.updateState(() => newState);
  }

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private navigation: SceneNavigationService
  ) {}

  async ngOnInit(): Promise<void> {
    // Set scene type
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.MAZE
    }));

    // Validate dungeon state
    const dungeon = this.dungeonState();
    if (!dungeon) {
      this.errorMessage.set('Error: No active dungeon. Return to castle and enter the maze.');
      return;
    }

    // Initialize FIGHTMAP for the current level
    this.initializeFightMap(dungeon.currentLevel);

    // Add welcome message
    this.addMessage(`Entering Level ${this.currentLevel()}...`);

    // Check for existing combat state (resume interrupted combat)
    this.checkForExistingCombat();

    // Check for chest alarm - triggers immediate combat encounter
    this.checkForChestAlarm();
  }

  /**
   * Check if there's existing combat state from a save/reload and resume it.
   * This handles the case where the game was saved mid-combat or the page refreshed.
   */
  private checkForExistingCombat(): void {
    const combat = this.combatState();
    if (!combat) return;

    // Check if combat is still valid (has alive monsters)
    const aliveMonsters = combat.monsterGroups.some(g =>
      g.monsters.some(m => m.hp > 0)
    );

    if (!aliveMonsters) {
      // Combat ended (all monsters dead) - clear stale combat state
      console.log('[Maze] Clearing stale combat state (no alive monsters)');
      this.gameState.updateState(s => ({ ...s, combat: undefined }));
      return;
    }

    // Resume combat - show encounter banner briefly then go to action selection
    console.log('[Maze] Resuming combat from saved state');
    this.addMessage('Resuming combat...');

    // Go straight to action selection (skip encounter banner for resume)
    this.combatPhase.set('action_select');
    this.selectedActions.set(new Map());
  }

  /**
   * Check for pending chest alarm and trigger combat if active.
   * Alarm traps set this flag and navigate to maze - encounter triggers on entry.
   * Per Apple II reference: Party fights new monsters from alarm, gets Reward 2 from new encounter.
   */
  private checkForChestAlarm(): void {
    const state = this.gameState.state();
    if (!state.chestAlarmActive) return;

    // Clear the flag first
    this.gameState.updateState(s => ({
      ...s,
      chestAlarmActive: false
    }));

    this.addMessage('An alarm sounds! Monsters rush to attack!');

    // Trigger encounter with cannot flee (alarm fights are guaranteed)
    this.initiateEncounter(this.currentLevel(), false);
  }

  /**
   * Initialize FIGHTMAP for a dungeon level
   * Sets up encounter state tracking, seeds treasure rooms, and initializes fixed encounters
   */
  private initializeFightMap(level: number): void {
    // Check if already initialized for this level
    if (FightMapService.getLevelState(level)) {
      console.log(`[Maze] FIGHTMAP already initialized for level ${level}`);
      return;
    }

    console.log(`[Maze] Initializing FIGHTMAP for level ${level}...`);

    try {
      const levelData = DungeonService.loadLevel(level);
      const roomTiles = DungeonService.getRoomTiles(levelData);

      // Initialize level state
      FightMapService.initializeLevel(level, roomTiles);

      // Seed treasure rooms for the level
      FightMapService.seedTreasureRooms(level, roomTiles);

      // Initialize fixed encounters from tile data
      const fixedEncounters = DungeonService.getFixedEncounterTiles(levelData);
      for (const fe of fixedEncounters) {
        FightMapService.initializeFixedEncounter(level, fe.x, fe.y, {
          encounterId: fe.encounterId,
          repeatable: fe.repeatable,
          cannotFlee: fe.cannotFlee
        });
      }

      // Log summary
      const levelState = FightMapService.getLevelState(level);
      console.log(`[Maze] FIGHTMAP initialized for level ${level}:`, {
        roomTiles: levelState?.roomTiles.size || 0,
        treasureRooms: levelState?.treasureRooms ? [...levelState.treasureRooms] : [],
        fixedEncounters: fixedEncounters.length
      });
    } catch (error) {
      console.error(`[MazeComponent] Failed to initialize FIGHTMAP for level ${level}:`, error);
    }
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      console.error('[MazeComponent] Canvas element not found');
      return;
    }

    // Initialize WebGL renderer
    this.webglRenderer = new WebGLRenderingService();
    const success = this.webglRenderer.initialize(canvas);

    if (!success) {
      console.error('[MazeComponent] Failed to initialize WebGL renderer');
      this.webglRenderer = null;
      return;
    }

    console.log('[MazeComponent] WebGL renderer initialized successfully');

    // Load textures and render
    this.loadTextures();
  }

  ngOnDestroy(): void {
    if (this.webglRenderer) {
      this.webglRenderer.dispose();
      this.webglRenderer = null;
    }
  }

  /**
   * Load texture atlas and upload to GPU
   */
  private async loadTextures(): Promise<void> {
    try {
      console.log('[MazeComponent] Loading texture atlas...');

      // Load compressed texture atlas metadata (11MB vs 35MB original)
      const response = await fetch('/assets/textures/eob-dungeon-highres-compressed.json');
      if (!response.ok) {
        throw new Error(`Failed to load texture atlas: ${response.statusText}`);
      }
      const atlas: TextureAtlas = await response.json();

      // Load texture image
      console.log('[MazeComponent] Loading texture image from:', atlas.imagePath);
      const image = await TextureAtlasService.loadTextureAtlas(atlas);

      console.log('[MazeComponent] Texture atlas loaded:', {
        dimensions: `${image.naturalWidth}x${image.naturalHeight}`,
        textures: atlas.textures.length
      });

      // Upload texture to GPU
      if (this.webglRenderer) {
        const texture = this.webglRenderer.uploadTexture(image);
        if (texture) {
          console.log('[MazeComponent] Texture uploaded to GPU');
          // Set atlas metadata for texture lookups
          this.webglRenderer.setAtlas(atlas);
          console.log('[MazeComponent] Atlas metadata set');
        } else {
          console.error('[MazeComponent] Failed to upload texture to GPU');
        }
      }

      // Trigger initial render
      this.render();
    } catch (error) {
      console.error('[MazeComponent] Failed to load textures:', error);
      console.error('[MazeComponent] Stack trace:', (error as Error).stack);
    }
  }

  /**
   * Render the dungeon view using WebGL
   */
  private render(): void {
    if (!this.webglRenderer) {
      console.warn('[MazeComponent] WebGL renderer not initialized');
      return;
    }

    const gameState = this.gameState.state();
    if (!gameState) {
      console.warn('[MazeComponent] No game state available');
      return;
    }

    const level = DungeonService.loadLevel(this.currentLevel());
    if (!level) {
      console.warn('[MazeComponent] No current level');
      return;
    }

    const position = this.position();
    if (!position) {
      console.warn('[MazeComponent] No party position');
      return;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      console.warn('[MazeComponent] Canvas not available');
      return;
    }

    // Get effective view distance based on light state
    const dungeon = this.dungeonState();
    const viewDistance = dungeon
      ? LightService.getEffectiveViewDistance(dungeon)
      : 5;  // Default to full visibility if no dungeon state

    // Viewport configuration - tileDepth controlled by light state
    const config: ViewportConfig = {
      width: canvas.width,
      height: canvas.height,
      tileDepth: viewDistance,
      peripheralColumns: Math.min(viewDistance + 2, 7)  // Peripheral scales with view
    };

    // Render the dungeon with dungeon state for door rendering
    this.webglRenderer.render(level, position, config, dungeon);
  }

  // ============================================================
  // KEYBOARD SHORTCUTS
  // Note: Letter keys (W/A/S/D/Q/E/O/I) are handled by MenuComponent
  // via SceneFooterComponent. Only arrow keys and special keys here.
  // ============================================================

  @HostListener('window:keydown.arrowup')
  handleArrowUp(): void {
    if (!this.isMovementLocked()) this.moveForward();
  }

  @HostListener('window:keydown.arrowdown')
  handleArrowDown(): void {
    if (!this.isMovementLocked()) this.moveBackward();
  }

  @HostListener('window:keydown.arrowleft')
  handleArrowLeft(): void {
    if (!this.isMovementLocked()) this.turnLeft();
  }

  @HostListener('window:keydown.arrowright')
  handleArrowRight(): void {
    if (!this.isMovementLocked()) this.turnRight();
  }

  /**
   * Check if any dialog is currently open or if combat is active
   */
  private isDialogOpen(): boolean {
    return this.showElevatorDialog() || this.showSpellDialog() || this.showTargetDialog();
  }

  /**
   * Check if movement should be locked (during combat or dialogs)
   */
  private isMovementLocked(): boolean {
    return this.inCombat() || this.isDialogOpen();
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Check if elevator dialog is open
    if (this.showElevatorDialog()) {
      this.cancelElevator();
      return;
    }

    // Check if spell dialog is open
    if (this.showSpellDialog()) {
      this.onSpellDialogCancelled();
      return;
    }

    // Check if target dialog is open
    if (this.showTargetDialog()) {
      this.onTargetDialogCancelled();
      return;
    }

    // Check if in combat targeting mode (for spells or attacks)
    if (this.isTargetingMode()) {
      this.cancelCombatTargeting();
      return;
    }

    // ESC only closes dialogs - to exit the maze, use stairs on level 1 or cast LOKTOFEIT
  }

  /**
   * Cancel combat targeting mode (for spells or attacks)
   */
  private cancelCombatTargeting(): void {
    this.isTargetingMode.set(false);
    this.isTargetingCharacterId.set(null);
    this.selectedTargetGroupId.set(null);
    this.pendingCombatSpell.set(null);
    this.selectedSpell.set(null);
    this.selectedCaster.set(null);
    this.spellContext.set('dungeon');
  }

  @HostListener('window:keydown.x')
  handleAbandonShortcut(): void {
    // Ignore if dialogs open or in combat
    if (this.isDialogOpen() || this.inCombat()) return;
    this.promptAbandonParty();
  }

  @HostListener('window:keydown.control.e')
  toggleEncounters(): void {
    const currentState = this.gameState.state();
    const newEncounterState = !currentState.settings.encountersEnabled;

    this.gameState.updateState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        encountersEnabled: newEncounterState
      }
    }));

    const status = newEncounterState ? 'ENABLED' : 'DISABLED';
    this.addMessage(`Random encounters ${status} (Ctrl+E to toggle)`);
  }

  moveForward(): void {
    this.executeMovement('FORWARD', (state: GameState) => DungeonMovementService.moveForward(state));
  }

  moveBackward(): void {
    this.executeMovement('BACKWARD', (state: GameState) => DungeonMovementService.moveBackward(state));
  }

  turnLeft(): void {
    const state = this.gameState.state();
    const newState = DungeonMovementService.turnLeft(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You turn left.');
    this.render();
  }

  turnRight(): void {
    const state = this.gameState.state();
    const newState = DungeonMovementService.turnRight(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You turn right.');
    this.render();
  }

  strafeLeft(): void {
    this.executeMovement('STRAFE_LEFT', (state: GameState) => DungeonMovementService.strafeLeft(state));
  }

  strafeRight(): void {
    this.executeMovement('STRAFE_RIGHT', (state: GameState) => DungeonMovementService.strafeRight(state));
  }

  // Note: openDoor() removed - walking through doors is now automatic (original Wizardry behavior)

  kickDoor(): void {
    const state = this.gameState.state();
    if (!state.dungeon) {
      return;
    }
    const level = DungeonService.loadLevel(this.currentLevel());

    // Check if can kick door
    if (!DoorService.canKickDoor(level, state.dungeon.position)) {
      this.addMessage('No locked door ahead.');
      return;
    }

    // Use first party member to kick (front row)
    const kickerId = state.party.formation.frontRow[0];
    if (!kickerId) {
      this.addMessage('No one in front row to kick door.');
      return;
    }

    const newState = DoorService.kickDoor(state, kickerId);
    this.gameState.updateState(() => newState);

    // Check result
    if (newState.encounterTriggered) {
      this.addMessage('The door bursts open! You encounter a monster!');
      queueMicrotask(() => {
        this.router.navigate(['/combat']);
      });
    } else {
      const kicker = newState.roster.get(kickerId)!;
      const originalHP = state.roster.get(kickerId)!.hp;

      if (kicker.hp < originalHP) {
        const damage = originalHP - kicker.hp;
        this.addMessage(`Failed to kick door! ${kicker.name} takes ${damage} damage.`);
      } else {
        this.addMessage('The door bursts open!');
      }
    }
  }

  inspectTile(): void {
    const state = this.gameState.state();
    if (!state.dungeon) {
      return;
    }
    const level = DungeonService.loadLevel(this.currentLevel());

    // Check if current tile has searchable content (not already looted)
    if (!TileInspectionService.hasSearchableContent(level, state.dungeon.position, state.dungeon)) {
      this.addMessage('Nothing to search here.');
      return;
    }

    const result = TileInspectionService.inspectTileWithState(state, level);

    if (result.found && result.state) {
      this.gameState.updateState(() => result.state!);
      this.addMessage(result.message || `You found ${result.itemId}!`);
    } else if (result.message) {
      // Already looted or other message
      this.addMessage(result.message);
    } else {
      this.addMessage('Nothing found.');
    }
  }

  selectElevatorLevel(level: number): void {
    const state = this.gameState.state();
    const newState = DungeonMovementService.enterLevel(state, level, 'ELEVATOR');
    this.gameState.updateState(() => newState);
    this.addMessage(`Elevator descends to Level ${level}...`);
  }

  cancelElevator(): void {
    this.addMessage('You step away from the elevator.');
    // Move back one tile (reverse last movement)
    this.moveBackward();
  }

  handleMenuAction(action: string): void {
    // Ignore menu actions when movement is locked (dialogs or combat)
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
      case 'abandon':
        this.promptAbandonParty();
        break;
    }
  }

  /**
   * Show abandon party confirmation dialog
   */
  promptAbandonParty(): void {
    this.showAbandonConfirmation.set(true);
  }

  /**
   * Confirm party abandonment - kill all members, leave bodies, return to castle
   */
  confirmAbandon(): void {
    this.gameState.updateState(state =>
      PartyAbandonmentService.abandonParty(state)
    );
    this.showAbandonConfirmation.set(false);
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Cancel abandon confirmation
   */
  cancelAbandon(): void {
    this.showAbandonConfirmation.set(false);
  }

  /**
   * Handle combat footer action selection
   * Footer now only has [Start Round], [Flee], [Reset Actions]
   */
  handleCombatFooterAction(itemId: string): void {
    switch (itemId) {
      case 'start-round':
        this.onExecuteRound();
        break;
      case 'flee':
        this.selectFleeForAll();
        break;
      case 'reset-actions':
        this.resetAllActions();
        break;
    }
  }

  /**
   * Set flee action for all characters and start round immediately
   */
  private selectFleeForAll(): void {
    if (this.isExecutingRound()) return;

    const party = this.partyCharacters();
    const newActions = new Map<string, CombatCommand>();

    for (const char of party) {
      if (!this.isCharacterIncapacitated(char)) {
        const command = CombatService.createCommand(char, 'RUN', undefined);
        newActions.set(char.id, command);
      }
    }

    this.selectedActions.set(newActions);
    this.addMessage('The party attempts to flee!');

    // Start round immediately
    this.onExecuteRound();
  }

  /**
   * Reset all selected actions and return to action selection
   */
  private resetAllActions(): void {
    this.selectedActions.set(new Map());
    this.isTargetingCharacterId.set(null);
    this.isTargetingMode.set(false);
    this.pendingCombatSpell.set(null);
    this.selectedSpell.set(null);
    this.selectedCaster.set(null);
    this.spellContext.set('dungeon');
    this.addMessage('Actions reset. Select new actions for all characters.');
  }


  private executeMovement(
    moveType: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT',
    serviceFn: (state: GameState) => GameState
  ): void {
    const state = this.gameState.state();
    const level = DungeonService.loadLevel(this.currentLevel());
    const position = this.position()!;

    // Validate movement
    const validation = DungeonService.canMove(level, position, moveType, state.dungeon?.openDoors, state.dungeon?.currentLevel);

    if (!validation.allowed) {
      this.addMessage(validation.reason!);
      return;
    }

    // Check if movement is through a door (door-kick mechanic)
    // In original Wizardry, moving through a door = implicit kick
    const tile = DungeonService.getTile(level, position.x, position.y);
    const wallDirection = DungeonService.getWallDirectionForMovement(position.facing, moveType);
    const wallType = tile.walls[wallDirection];
    const isDoorKick = wallType === 'door';

    // Capture light state before movement for comparison
    const oldDungeon = state.dungeon;
    const hadLight = oldDungeon?.lightActive;
    const wasInDarkness = oldDungeon?.inDarknessZone;
    const oldDuration = oldDungeon?.lightDurationRemaining;

    // Execute movement
    const newState = serviceFn(state);
    this.gameState.updateState(() => newState);

    // Check if stairs transition to castle occurred (dungeon becomes undefined)
    if (newState.dungeon === undefined) {
      this.addMessage('You climb the stairs and exit the dungeon...');
      queueMicrotask(() => {
        this.router.navigate(['/castle-menu']);
      });
      return;
    }

    // Dynamic messages based on moveType
    const messages = {
      'FORWARD': isDoorKick ? 'You kick open the door and move forward.' : 'You move forward.',
      'BACKWARD': 'You move backward.',
      'STRAFE_LEFT': 'You strafe left.',
      'STRAFE_RIGHT': 'You strafe right.'
    };
    this.addMessage(messages[moveType]);

    // Display light-related messages based on state changes
    const newDungeon = newState.dungeon;
    if (newDungeon) {
      // Check if entered darkness zone
      if (!wasInDarkness && newDungeon.inDarknessZone) {
        if (hadLight) {
          this.addMessage('An unnatural darkness engulfs you! Your light spell is extinguished!');
        } else {
          this.addMessage('You enter an area of impenetrable darkness.');
        }
      }
      // Check if exited darkness zone
      else if (wasInDarkness && !newDungeon.inDarknessZone) {
        this.addMessage('You emerge from the darkness.');
      }
      // Check light expiration (had light, now doesn't)
      else if (hadLight && !newDungeon.lightActive) {
        this.addMessage('Your light spell has expired! Darkness surrounds you.');
      }
      // Check light warning (duration hit warning threshold)
      else if (newDungeon.lightActive && newDungeon.lightDurationRemaining === 5) {
        this.addMessage(`Your ${newDungeon.lightSpellType} spell is fading... (5 steps remaining)`);
      }
    }

    // Re-render after movement
    this.render();

    // Check for encounter after successful movement
    // Pass isDoorKick flag for 12.5% door-kick encounter mechanic
    this.checkForEncounter(isDoorKick);
  }

  /**
   * Check for encounter using the full priority chain
   * @param isDoorKick - Whether movement was through a door (12.5% encounter chance)
   */
  private checkForEncounter(isDoorKick: boolean = false): void {
    // Skip encounter check if disabled in settings (useful for testing)
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

    // Build encounter context for the priority chain
    // Note: chestAlarmActive is handled separately in checkForChestAlarm() on scene entry
    const context: EncounterContext = {
      level: dungeon.currentLevel,
      x: pos.x,
      y: pos.y,
      isDoorKick,
      chestAlarmActive: false,  // Alarm encounters trigger via checkForChestAlarm(), not during movement
      isRoomTile: DungeonService.isRoomTile(level, pos.x, pos.y),
      fixedEncounterConfig
    }

    // Check for encounter using full priority chain
    const result = EncounterTriggerService.checkForEncounter(context);

    if (!result.trigger) return;

    // Log encounter reason for debugging
    console.log(`[MazeComponent] Encounter triggered: ${result.reason}`);

    // Mark tile as cleared after encounter (prevents immediate re-trigger)
    if (result.reason !== 'random' && result.reason !== 'door_kick') {
      FightMapService.markCleared(dungeon.currentLevel, pos.x, pos.y);
    }

    // Mark fixed encounter as triggered
    // For repeatable encounters, this resets when re-entering the level
    if (result.reason === 'fixed' && result.fixedEncounterConfig) {
      FightMapService.markFixedEncounterTriggered(dungeon.currentLevel, pos.x, pos.y);
    }

    // Initiate encounter - canFlee depends on whether it's a guaranteed fight
    const canFlee = !result.guaranteedFight;
    this.initiateEncounter(this.currentLevel(), canFlee, result.fixedEncounterConfig, result.reason);
  }

  private handleFixedEncounter(monsterId: string): void {
    // For fixed encounters, still use level-based generation
    this.initiateEncounter(this.currentLevel(), false, undefined, 'fixed');  // false = cannot flee
  }

  private async initiateEncounter(
    dungeonLevel: number,
    canFlee: boolean,
    fixedEncounterConfig?: FixedEncounterConfig,
    encounterReason?: 'random' | 'door_kick' | 'treasure_room' | 'alarm' | 'fixed' | 'chest_trap'
  ): Promise<void> {
    this.addMessage(`You encounter monsters!`);

    try {
      // Get party characters for combat
      const partyChars = this.partyCharacters();

      // Initialize combat state with encounter generation
      // Pass fixedEncounterConfig for AUX-based monster selection
      // Pass encounterReason for treasure mechanics (treasure_room = guaranteed chest)
      // Pass latumapicActive so monsters are pre-identified if spell is active
      // Note: Optional chaining is defensive - dungeonState should exist here but may be
      // undefined during edge cases like combat triggered during scene transitions
      const latumapicActive = this.dungeonState()?.latumapicActive ?? false;
      const combatState = CombatService.initiateCombat(
        dungeonLevel,
        partyChars,
        canFlee,
        fixedEncounterConfig,
        false,  // isFriendlyEncounter - default to false for monster encounters
        encounterReason,
        latumapicActive
      );

      // Update game state with combat
      this.gameState.updateState(state => ({
        ...state,
        combat: combatState
      }));

      // ============================================================
      // INTEGRATED COMBAT: Stay in maze view (Theater Stage Design)
      // Instead of navigating to /combat, trigger in-maze combat UI
      // ============================================================

      // Log monster groups for debugging
      console.log('[MazeComponent] Combat initiated in maze:', {
        groups: combatState.monsterGroups.map(g => `${g.id}: ${g.monsters.length}x ${g.monsters[0]?.name}`),
        canFlee,
        reason: encounterReason,
        surprise: combatState.surpriseState
      });

      // Show letterbox cinematic banners
      this.combatPhase.set('encounter');
      await this.showCombatIntro(combatState);

    } catch (error) {
      console.error('[MazeComponent] Failed to initiate encounter:', error);
      this.addMessage(`Error: Failed to create encounter. Please try again.`);
    }
  }

  /**
   * Handle group click from combat overlay (targeting)
   * Clicking a monster group selects it as the target
   */
  onCombatGroupClicked(groupId: 'A' | 'B' | 'C' | 'D'): void {
    if (!this.isTargetingMode()) return;

    // Clicking a monster group confirms it as the target
    this.onCombatTargetSelected(groupId);
  }

  // ============================================================
  // COMBAT ACTION SELECTION (Theater Stage Design)
  // ============================================================

  /**
   * Handle target selection for attack or spell
   * Uses isTargetingCharacterId to know which character is selecting
   */
  onCombatTargetSelected(groupId: 'A' | 'B' | 'C' | 'D'): void {
    // Get the character who is targeting
    const charId = this.isTargetingCharacterId();
    const char = charId ? this.partyCharacters().find(c => c.id === charId) : null;
    if (!char) return;

    const group = this.monsterGroups().find(g => g.id === groupId);
    if (!group || !group.monsters.some(m => m.hp > 0)) return;

    // Pick random alive monster from group
    const aliveMonsters = group.monsters.filter(m => m.hp > 0);
    const target = aliveMonsters[RandomService.random(0, aliveMonsters.length - 1)];

    // Clear targeting state
    this.isTargetingMode.set(false);
    this.isTargetingCharacterId.set(null);
    this.selectedTargetGroupId.set(null);

    // Check if we're targeting for a spell
    const pendingSpell = this.pendingCombatSpell();
    if (pendingSpell) {
      this.confirmCombatSpellActionForCharacter(char, pendingSpell, target, groupId);
      this.pendingCombatSpell.set(null);
      return;
    }

    // Default: attack targeting - create command for this character
    const command = CombatService.createCommand(char, 'ATTACK', target, { groupId });

    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(char.id, command);
      return newActions;
    });

    this.addMessage(`${char.name}: ATTACK -> Group ${groupId}`);
  }

  /**
   * Confirm a spell action for a specific character targeting a monster
   */
  private confirmCombatSpellActionForCharacter(
    char: Character,
    spell: SpellData,
    target: Combatant,
    groupId: 'A' | 'B' | 'C' | 'D'
  ): void {
    // Create combat command with spell and target
    const command = CombatService.createCommand(char, 'CAST_SPELL', target, {
      spellId: spell.id,
      groupId: groupId
    });

    // Store in selected actions
    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(char.id, command);
      return newActions;
    });

    this.addMessage(`${char.name}: CAST ${spell.name} -> Group ${groupId}`);

    // Clear spell selection state
    this.selectedSpell.set(null);
    this.selectedCaster.set(null);
    this.spellContext.set('dungeon');
  }

  /**
   * Confirm a spell action targeting an ally (healing/buff spells)
   */
  private confirmCombatSpellActionForAlly(spell: SpellData, target: Character): void {
    const caster = this.selectedCaster();
    if (!caster) return;

    // Create combat command with spell and ally target
    const command = CombatService.createCommand(caster, 'CAST_SPELL', target, {
      spellId: spell.id,
      targetCharacterId: target.id
    });

    // Store in selected actions
    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(caster.id, command);
      return newActions;
    });

    this.addMessage(`${caster.name}: CAST ${spell.name} -> ${target.name}`);

    // Clear spell selection state
    this.selectedSpell.set(null);
    this.selectedCaster.set(null);
    this.spellContext.set('dungeon');
    this.pendingCombatSpell.set(null);
    this.targetOptions.set([]);
  }

  /**
   * Execute the combat round
   */
  async onExecuteRound(): Promise<void> {
    if (!this.allActionsSelected() || this.isExecutingRound()) return;

    this.isExecutingRound.set(true);
    this.combatPhase.set('executing');

    const combat = this.combatState();
    if (!combat) return;

    // Get front row character IDs and party characters
    const party = this.gameState.state().party;
    const frontRow = party.formation.frontRow;
    const chars = this.partyCharacters();

    // Collect party commands from selected actions
    const partyCommands = Array.from(this.selectedActions().values());

    // Generate monster commands - get all alive monsters
    const aliveMonsters = combat.monsterGroups
      .flatMap(g => g.monsters)
      .filter(m => m.hp > 0);

    const monsterCommands = aliveMonsters.map(m =>
      CombatService.selectMonsterAction(m, chars, frontRow)
    );

    // Create state with all commands in queue
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: [...partyCommands, ...monsterCommands]
    };

    try {
      // Execute round using CombatService
      const result = CombatService.executeRoundWithEvents(
        stateWithCommands,
        chars,
        frontRow
      );

      // Display messages with timing:
      // - First action: instant (no delay)
      // - Delay before result: 1000ms
      // - Delay before next action: 500ms
      const DELAY_BEFORE_RESULT = 1000;
      const DELAY_BEFORE_NEXT_ACTION = 500;

      let isFirstMessage = true;

      for (const event of result.events) {
        for (let i = 0; i < event.messages.length; i++) {
          const msg = event.messages[i];
          const isResult = CombatService.isResultMessage(msg);
          const displayMsg = CombatService.stripResultMarker(msg);

          // Delay BEFORE showing this message (first message is instant)
          if (!isFirstMessage) {
            const delay = isResult ? DELAY_BEFORE_RESULT : DELAY_BEFORE_NEXT_ACTION;
            await this.delay(delay);
          }
          isFirstMessage = false;

          this.addMessage(displayMsg);
        }
      }

      // Apply final state
      this.gameState.updateState(state => ({
        ...state,
        combat: result.finalState,
        roster: this.updateRosterFromCombat(state.roster, result.finalCharacterUpdates)
      }));

      // Check for victory or defeat
      if (result.victory) {
        await this.handleVictory(result.finalState);
      } else if (result.defeat) {
        await this.handleDefeat();
      } else {
        // Continue to next round
        this.resetForNextRound();
      }
    } catch (error) {
      console.error('[Maze] Combat execution error:', error);
      this.addMessage('Error executing combat round!');
      this.resetForNextRound();
    }
  }

  /**
   * Update roster from combat character updates
   * finalCharacterUpdates contains full Character objects with updated HP/status
   */
  private updateRosterFromCombat(
    roster: Map<string, Character>,
    updates: Map<string, Character>
  ): Map<string, Character> {
    const newRoster = new Map(roster);
    for (const [charId, updatedChar] of updates.entries()) {
      // Use the updated character from combat result
      newRoster.set(charId, updatedChar);
    }
    return newRoster;
  }

  /**
   * Reset state for next round
   */
  private resetForNextRound(): void {
    this.selectedActions.set(new Map());
    this.isExecutingRound.set(false);
    this.combatPhase.set('action_select');
    this.isTargetingMode.set(false);
    this.isTargetingCharacterId.set(null);
    this.pendingCombatSpell.set(null);
    this.spellContext.set('dungeon');
  }

  /**
   * Handle combat victory
   */
  private async handleVictory(finalState: CombatState): Promise<void> {
    this.combatPhase.set('victory');
    this.showVictoryOverlay.set(true);
    this.addMessage('VICTORY!');

    // Get all monsters (alive and dead) for reward calculation
    const allMonsters = finalState.monsterGroups.flatMap(g => g.monsters);
    const state = this.gameState.state();

    // Calculate rewards using VictoryService
    const rewards = VictoryService.calculateVictoryRewards(
      allMonsters,
      state.roster,
      state.party.members
    );
    this.victoryRewards.set(rewards);

    this.addMessage(`Gained ${rewards.totalXP} XP and ${rewards.totalGold} gold!`);

    // Wait for player to acknowledge (extra 500ms for full-bleed sprite impact)
    await this.delay(2500);

    // Apply rewards and end combat
    this.applyVictoryRewards(rewards, finalState);
  }

  /**
   * Apply victory rewards to party
   */
  private applyVictoryRewards(rewards: VictoryRewards, finalState: CombatState): void {
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
        combat: undefined  // Clear combat state
      };
    });

    // Check if this was a treasure room encounter (guaranteed chest)
    if (finalState.encounterReason === 'treasure_room') {
      this.router.navigate(['/chest']);
    } else {
      this.endCombat();
    }
  }

  /**
   * Handle combat defeat
   */
  private async handleDefeat(): Promise<void> {
    this.combatPhase.set('defeat');
    this.showDefeatOverlay.set(true);
    this.addMessage('DEFEAT! The party has fallen...');

    await this.delay(2000);

    // Clear combat and return to castle
    this.gameState.updateState(state => ({
      ...state,
      combat: undefined,
      dungeon: undefined  // Party is ejected from dungeon
    }));

    this.router.navigate(['/castle-menu']);
  }

  /**
   * End combat and return to exploration
   */
  private endCombat(): void {
    this.combatPhase.set('idle');
    this.showVictoryOverlay.set(false);
    this.showDefeatOverlay.set(false);
    this.selectedActions.set(new Map());
    this.isExecutingRound.set(false);
    this.isTargetingMode.set(false);
    this.victoryRewards.set(null);
    this.pendingCombatSpell.set(null);
    this.spellContext.set('dungeon');
  }

  // Note: Combat spell menu is now opened via openCombatSpellMenu(characterId) in handleCharacterAction

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Show a letterbox cinematic banner
   */
  private async showLetterbox(type: 'encounter' | 'ambush' | 'surprise', durationMs = 1800): Promise<void> {
    this.letterboxType.set(type);
    await this.delay(durationMs);
    this.letterboxType.set(null);
  }

  /**
   * Show combat intro sequence with letterbox banners
   * Handles encounter + surprise states
   */
  private async showCombatIntro(combatState: CombatState): Promise<void> {
    // 1. Always show ENCOUNTER! first
    await this.showLetterbox('encounter', 1800);

    // 2. Check for surprise
    if (combatState.surpriseState === 'monsters') {
      // Party is surprised - show AMBUSHED! then auto-execute monster round
      await this.showLetterbox('ambush', 2000);
      this.addMessage('Your party is AMBUSHED!');
      await this.handlePartySurprise();
    } else if (combatState.surpriseState === 'party') {
      // Monsters are surprised - show SURPRISE! then let player act
      await this.showLetterbox('surprise', 1800);
      this.addMessage('You surprised the monsters!');
      this.combatPhase.set('action_select');
    } else {
      // Normal combat - proceed to action selection
      this.combatPhase.set('action_select');
    }
  }

  /**
   * Handle party surprise - auto-execute monster round
   */
  private async handlePartySurprise(): Promise<void> {
    const combat = this.gameState.state().combat;
    if (!combat) return;

    // Set phase to executing
    this.combatPhase.set('executing');
    this.isExecutingRound.set(true);

    // Get party info
    const party = this.gameState.state().party;
    const frontRow = party.formation.frontRow;
    const chars = this.alivePartyMembers();

    // Create monster commands (party is surprised, only monsters act)
    const aliveMonsters = combat.monsterGroups
      .flatMap(g => g.monsters)
      .filter(m => m.hp > 0);

    const monsterCommands = aliveMonsters.map(m =>
      CombatService.selectMonsterAction(m, chars, frontRow)
    );

    // Execute monster-only round
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: monsterCommands
    };

    const result = CombatService.executeRoundWithEvents(stateWithCommands, chars, frontRow);

    // Display messages
    const DELAY_BEFORE_RESULT = 1000;
    const DELAY_BEFORE_NEXT_ACTION = 500;
    let isFirstMessage = true;

    for (const event of result.events) {
      for (let i = 0; i < event.messages.length; i++) {
        const msg = event.messages[i];
        const isResult = CombatService.isResultMessage(msg);
        const displayMsg = CombatService.stripResultMarker(msg);

        if (!isFirstMessage) {
          const delay = isResult ? DELAY_BEFORE_RESULT : DELAY_BEFORE_NEXT_ACTION;
          await this.delay(delay);
        }
        isFirstMessage = false;

        this.addMessage(displayMsg);
      }
    }

    // Update game state
    this.gameState.updateState(state => ({
      ...state,
      combat: result.finalState,
      roster: this.updateRosterFromCombat(state.roster, result.finalCharacterUpdates)
    }));

    // Check for defeat
    if (result.defeat) {
      await this.handleDefeat();
    } else {
      // Continue to player's turn
      this.isExecutingRound.set(false);
      this.resetForNextRound();
    }
  }

  private formatMonsterName(monsterId: string): string {
    // Convert "orc" -> "Orc", "lvl_1_mage" -> "Lvl 1 Mage"
    return monsterId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private addMessage(message: string): void {
    this.messages.update(msgs => {
      const newMsgs = [...msgs, message];
      return newMsgs.slice(-10); // Keep last 10 messages
    });
  }

  // ============================================================
  // SPELL CASTING
  // ============================================================

  /**
   * Open the spell selection dialog for a character
   * SpellPanelComponent handles spell organization and filtering internally
   */
  private openSpellDialog(characterId: string): void {
    const state = this.gameState.state();
    const caster = state.roster.get(characterId);

    if (!caster) {
      this.addMessage('Error: Character not found.');
      return;
    }

    // Check if character has any dungeon-castable spells
    if (!SpellCastingService.hasSpellsInContext(caster, 'dungeon')) {
      this.addMessage(`${caster.name} has no spells available.`);
      return;
    }

    this.selectedCaster.set(caster);
    this.showSpellDialog.set(true);
  }

  /**
   * Handle spell selection from the dialog
   * Behavior differs based on context:
   * - dungeon: Cast spell immediately
   * - combat: Store as action for round execution
   */
  onSpellSelected(spell: SpellData): void {
    this.showSpellDialog.set(false);
    this.selectedSpell.set(spell);

    const caster = this.selectedCaster();
    if (!caster) return;

    // Handle combat spell selection differently
    if (this.spellContext() === 'combat') {
      this.handleCombatSpellSelection(spell, caster);
      return;
    }

    // Dungeon context: cast immediately
    // Check if spell needs a target
    if (spell.target === 'single' || spell.target === 'dead_body' || spell.target === 'ashes') {
      // Open character selection dialog
      this.openTargetDialog(spell);
    } else {
      // Party or self-targeting spell - cast immediately
      this.castSpell(spell, null);
    }
  }

  /**
   * Handle spell selection during combat
   * Stores the spell as the character's action for round execution
   */
  private handleCombatSpellSelection(spell: SpellData, caster: Character): void {
    // Check if spell targets enemies (offensive, instant_death, or debuff targeting monsters)
    const targetsEnemies = spell.category === 'offensive' ||
                           spell.category === 'instant_death' ||
                           spell.category === 'debuff' ||
                           spell.target === 'all_enemies' ||
                           spell.target === 'group'

    // For offensive spells that target monsters, show monster target selection
    // (except for all_enemies which hits everyone automatically)
    if (targetsEnemies && spell.target !== 'all_enemies') {
      // Store the spell and show monster targeting
      this.selectedSpell.set(spell);
      this.pendingCombatSpell.set(spell);
      this.isTargetingCharacterId.set(caster.id);  // Track which character is targeting
      this.isTargetingMode.set(true);
      this.addMessage(`${caster.name} prepares ${spell.name}... Select a target.`);
      return;
    }

    // Single-target healing/buff spells need character selection
    if (spell.target === 'single' &&
        (spell.category === 'healing' || spell.category === 'buff')) {
      this.pendingCombatSpell.set(spell);
      this.openTargetDialog(spell);
      this.addMessage(`${caster.name} prepares ${spell.name}... Select a target.`);
      return;
    }

    // For party-wide/self/all-enemy spells, record action immediately - no targeting needed
    const command = CombatService.createCommand(caster, 'CAST_SPELL', undefined, {
      spellId: spell.id
    });

    this.selectedActions.update(actions => {
      const newActions = new Map(actions);
      newActions.set(caster.id, command);
      return newActions;
    });

    this.addMessage(`${caster.name} will cast ${spell.name}.`);

    // Clear spell selection state
    this.selectedSpell.set(null);
    this.selectedCaster.set(null);
    this.spellContext.set('dungeon');
  }

  /**
   * Open character selection dialog for single-target spells
   */
  private openTargetDialog(spell: SpellData): void {
    const caster = this.selectedCaster();
    const partyChars = this.partyCharacters();

    // Build character options based on spell target type
    const options: CharacterOption[] = partyChars.map((char, index) => {
      let enabled = true;

      // Filter based on spell target type
      if (spell.target === 'dead_body') {
        enabled = char.status === CharacterStatus.DEAD;
      } else if (spell.target === 'ashes') {
        enabled = char.status === CharacterStatus.ASHES;
      } else if (spell.target === 'single') {
        // For healing/buff spells, target living characters
        // Skip dead/ashes characters
        enabled = char.status !== CharacterStatus.DEAD &&
                  char.status !== CharacterStatus.ASHES;
      }

      return {
        character: char,
        index: index + 1,
        enabled
      };
    });

    // Check if there are any valid targets
    const hasValidTargets = options.some(opt => opt.enabled);
    if (!hasValidTargets) {
      // Show helpful message based on spell target type
      let message = `${caster?.name || 'Caster'} casts ${spell.name}... but there are no valid targets!`;
      if (spell.target === 'dead_body') {
        message = `${spell.name} requires a dead body to resurrect, but no one is dead.`;
      } else if (spell.target === 'ashes') {
        message = `${spell.name} requires ashes to resurrect, but no one has been reduced to ashes.`;
      }
      this.addMessage(message);

      // Clear spell selection state
      this.selectedSpell.set(null);
      this.selectedCaster.set(null);
      return;
    }

    this.targetOptions.set(options);
    this.showTargetDialog.set(true);
  }

  /**
   * Handle target selection for single-target spells
   */
  onTargetSelected(target: Character): void {
    this.showTargetDialog.set(false);

    const spell = this.selectedSpell() || this.pendingCombatSpell();
    if (!spell) return;

    // Handle combat context - create action instead of casting immediately
    if (this.spellContext() === 'combat') {
      this.confirmCombatSpellActionForAlly(spell, target);
      return;
    }

    // Dungeon context - cast immediately
    this.castSpell(spell, target);
  }

  /**
   * Cancel spell selection
   */
  onSpellDialogCancelled(): void {
    this.showSpellDialog.set(false);
    this.selectedCaster.set(null);
    this.selectedSpell.set(null);
    this.spellContext.set('dungeon');
    this.pendingCombatSpell.set(null);
  }

  /**
   * Cancel target selection
   */
  onTargetDialogCancelled(): void {
    this.showTargetDialog.set(false);
    this.targetOptions.set([]);
    // Go back to spell selection
    const caster = this.selectedCaster();
    if (caster) {
      this.openSpellDialog(caster.id);
    }
  }

  /**
   * Cast a spell and apply its effects
   */
  private castSpell(spell: SpellData, target: Character | null): void {
    const caster = this.selectedCaster();
    if (!caster) {
      this.addMessage('Error: No caster selected.');
      return;
    }

    // Verify spell can be cast
    const canCast = SpellCastingService.canCastSpell(caster, spell.id);
    if (!canCast.canCast) {
      this.addMessage(`${caster.name} cannot cast ${spell.name}: ${canCast.reason}`);
      return;
    }

    // Deduct spell points
    const updatedCaster = SpellCastingService.deductSpellPoints(caster, spell.id);

    // Apply spell effect
    const result = this.applyDungeonSpellEffect(spell, updatedCaster, target);

    // Update game state with new caster spell points and any other changes
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster);
      newRoster.set(updatedCaster.id, result.updatedCaster || updatedCaster);

      // Update target if applicable
      if (result.updatedTarget && target) {
        newRoster.set(target.id, result.updatedTarget);
      }

      // Apply party-wide healing if applicable (MADI)
      if (result.partyHeal && result.partyHeal > 0) {
        for (const memberId of state.party.members) {
          const member = newRoster.get(memberId);
          if (member &&
              member.status !== CharacterStatus.DEAD &&
              member.status !== CharacterStatus.ASHES) {
            const newHp = Math.min(member.hp + result.partyHeal, member.maxHp);
            newRoster.set(memberId, { ...member, hp: newHp });
          }
        }
      }

      // Update dungeon state if applicable
      let newDungeon = state.dungeon;
      if (result.dungeonUpdate && state.dungeon) {
        newDungeon = { ...state.dungeon, ...result.dungeonUpdate };
      }

      return {
        ...state,
        roster: newRoster,
        dungeon: newDungeon
      };
    });

    // Re-render if dungeon state changed (e.g., light spell)
    if (result.dungeonUpdate) {
      this.render();
    }

    // Display result message
    this.addMessage(result.message);

    // Handle special spell effects (e.g., recall to town)
    if (result.navigateTo) {
      queueMicrotask(() => {
        this.router.navigate([result.navigateTo]);
      });
    }

    // Clear selection state
    this.selectedCaster.set(null);
    this.selectedSpell.set(null);
  }

  /**
   * Apply dungeon spell effects and return result
   */
  private applyDungeonSpellEffect(
    spell: SpellData,
    caster: Character,
    target: Character | null
  ): {
    message: string;
    updatedCaster?: Character;
    updatedTarget?: Character;
    partyHeal?: number;  // Heal amount for all living party members
    dungeonUpdate?: Partial<DungeonState>;
    navigateTo?: string;
  } {
    // Handle healing spells
    if (spell.healing && target) {
      if (spell.healing.type === 'full') {
        // Full heal
        const updatedTarget = { ...target, hp: target.maxHp };
        return {
          message: `${caster.name} casts ${spell.name}! ${target.name} is fully healed!`,
          updatedTarget
        };
      } else if (spell.healing.dice) {
        // Dice-based healing
        const healAmount = this.rollDice(spell.healing.dice);
        const newHp = Math.min(target.hp + healAmount, target.maxHp);
        const actualHeal = newHp - target.hp;
        const updatedTarget = { ...target, hp: newHp };
        return {
          message: `${caster.name} casts ${spell.name}! ${target.name} heals ${actualHeal} HP.`,
          updatedTarget
        };
      }
    }

    // Handle party healing (MADI)
    if (spell.healing && spell.target === 'party') {
      const healAmount = spell.healing.dice ? this.rollDice(spell.healing.dice) : 0;
      return {
        message: `${caster.name} casts ${spell.name}! The party heals ${healAmount} HP.`,
        partyHeal: healAmount
      };
    }

    // Handle status cure spells
    if (spell.statusCure && target) {
      let cured = false;
      let updatedTarget = { ...target };

      if (spell.statusCure === 'paralysis' && target.status === CharacterStatus.PARALYZED) {
        updatedTarget.status = CharacterStatus.OK;
        cured = true;
      } else if (spell.statusCure === 'poison' && target.status === CharacterStatus.POISONED) {
        updatedTarget.status = CharacterStatus.OK;
        cured = true;
      } else if (spell.statusCure === 'all') {
        // Cure any curable status
        if ([CharacterStatus.PARALYZED, CharacterStatus.POISONED, CharacterStatus.ASLEEP].includes(target.status)) {
          updatedTarget.status = CharacterStatus.OK;
          cured = true;
        }
      }

      if (cured) {
        return {
          message: `${caster.name} casts ${spell.name}! ${target.name}'s ailment is cured!`,
          updatedTarget
        };
      } else {
        return {
          message: `${caster.name} casts ${spell.name}! But ${target.name} is not afflicted.`
        };
      }
    }

    // Handle resurrection spells
    if (spell.resurrection && target) {
      const successRate = spell.resurrectionSuccessRate || 0.9;
      const success = RandomService.roll(successRate);

      if (success) {
        const updatedTarget = {
          ...target,
          status: CharacterStatus.OK,
          hp: 1  // Resurrect with 1 HP
        };
        return {
          message: `${caster.name} casts ${spell.name}! ${target.name} is resurrected!`,
          updatedTarget
        };
      } else {
        // Failed resurrection - DEAD -> ASHES, ASHES -> permanently lost
        if (target.status === CharacterStatus.DEAD) {
          const updatedTarget = { ...target, status: CharacterStatus.ASHES };
          return {
            message: `${caster.name} casts ${spell.name}... but ${target.name} crumbles to ashes!`,
            updatedTarget
          };
        } else {
          return {
            message: `${caster.name} casts ${spell.name}... but ${target.name} is lost forever!`,
            // Character should be removed from roster (handled in caller if needed)
          };
        }
      }
    }

    // Handle utility spells
    if (spell.utility) {
      // DUMAPIC - Show coordinates
      if (spell.utility === 'show_coordinates') {
        const pos = this.position();
        const facing = this.dungeonState()?.position?.facing || 'N';
        return {
          message: `${spell.name}: Level ${this.currentLevel()}, Position (${pos?.x}, ${pos?.y}), Facing ${facing}`
        };
      }

      // MILWA/LOMILWA - Light
      if (spell.utility === 'extended_light') {
        const dungeon = this.dungeonState();
        if (!dungeon) {
          return { message: `${spell.name} can only be cast in the dungeon.` };
        }

        // Check if casting is allowed (not in darkness zone)
        const canCast = LightService.canCastLightSpell(dungeon);
        if (!canCast.canCast) {
          return { message: `${caster.name} tries to cast ${spell.name}... ${canCast.reason}` };
        }

        // Determine spell type and activate with duration tracking
        const isLomilwa = spell.id === 'lomilwa' || spell.id === 'lomilwa_priest';
        const spellType = isLomilwa ? 'LOMILWA' : 'MILWA';
        const newDungeonState = LightService.activateLightSpell(dungeon, spellType);

        // Format duration for message
        const durationDisplay = LightService.getSpellDurationDisplay(newDungeonState);
        const durationText = durationDisplay === 'permanent' ? '' : ` (${durationDisplay})`;

        return {
          message: `${caster.name} casts ${spell.name}! The area is illuminated${durationText}.`,
          dungeonUpdate: {
            lightActive: newDungeonState.lightActive,
            lightRadius: newDungeonState.lightRadius,
            lightSpellType: newDungeonState.lightSpellType,
            lightDurationRemaining: newDungeonState.lightDurationRemaining
          }
        };
      }

      // LOKTOFEIT - Recall to town
      if (spell.utility === 'recall') {
        const successRate = Math.min((caster.level || 1) * 2, 95) / 100;
        const success = RandomService.roll(successRate);

        if (success) {
          return {
            message: `${caster.name} casts ${spell.name}! The party is recalled to town!`,
            navigateTo: '/castle-menu'
          };
        } else {
          return {
            message: `${caster.name} casts ${spell.name}... but the spell fizzles!`
          };
        }
      }

      // MALOR - Teleport (requires coordinate input - not implemented yet)
      if (spell.utility === 'teleport') {
        return {
          message: `${caster.name} casts ${spell.name}... but teleportation is not yet implemented.`
        };
      }

      // CALFO - Identify trap
      if (spell.utility === 'identify_trap') {
        return {
          message: `${caster.name} casts ${spell.name}! Any traps ahead will be revealed.`
        };
      }

      // KANDI - Locate body
      if (spell.utility === 'locate_person') {
        return {
          message: `${caster.name} casts ${spell.name}! Lost souls can be sensed...`
        };
      }

      // LATUMAPIC - Identify foes (persists for entire expedition)
      if (spell.utility === 'identify_foe') {
        const dungeon = this.dungeonState();
        if (!dungeon) {
          return { message: `${spell.name} can only be cast in the dungeon.` };
        }

        // Already active?
        if (dungeon.latumapicActive) {
          return { message: `${caster.name} casts ${spell.name}... but monsters are already identified.` };
        }

        // Also identify any current combat monsters
        const combat = this.gameState.state().combat;
        if (combat) {
          this.gameState.updateState(state => ({
            ...state,
            combat: state.combat ? {
              ...state.combat,
              monsterGroups: state.combat.monsterGroups.map(g => ({ ...g, identified: true }))
            } : undefined
          }));
        }

        return {
          message: `${caster.name} casts ${spell.name}! All monsters are now identified for this expedition.`,
          dungeonUpdate: {
            latumapicActive: true
          }
        };
      }
    }

    // Default case
    return {
      message: `${caster.name} casts ${spell.name}!`
    };
  }

  /**
   * Roll dice in "XdY" format
   */
  private rollDice(dice: string): number {
    return RandomService.rollDiceNotation(dice);
  }
}
