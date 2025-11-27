import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { MessageLogComponent } from '@shared/components/message-log/message-log.component';
import { SpellSelectionDialogComponent, SpellOption } from '@shared/components/spell-selection-dialog/spell-selection-dialog.component';
import { CharacterSelectionDialogComponent, CharacterOption } from '@shared/components/character-selection-dialog/character-selection-dialog.component';
import { GameStateService } from '@services/GameStateService';
import { RandomService } from '@services/RandomService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { DungeonMovementService } from '@services/DungeonMovementService';
import { DungeonService } from '@services/DungeonService';
import { WebGLRenderingService } from '@services/WebGLRenderingService';
import { EncounterService } from '@services/EncounterService';
import { CombatService } from '@services/CombatService';
import { DoorService } from '@services/DoorService';
import { TileInspectionService } from '@services/TileInspectionService';
import { SpellCastingService, SpellData } from '@services/SpellCastingService';
import { SpellLearningService } from '@services/SpellLearningService';
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
import * as TextureAtlasService from '@services/TextureAtlasService';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    SpellSelectionDialogComponent,
    CharacterSelectionDialogComponent
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
  readonly availableSpellOptions = signal<SpellOption[]>([]);
  readonly targetOptions = signal<CharacterOption[]>([]);

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
   * Check if a door can be opened at current position
   */
  readonly canOpenDoor = computed(() => {
    const state = this.gameState.state();
    if (!state.dungeon?.position) return false;
    const level = DungeonService.loadLevel(this.currentLevel());
    return DoorService.canOpenDoor(level, state.dungeon.position);
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

    if (dungeon?.lightActive) {
      spells.push({
        name: 'MILWA',
        icon: '💡',
        description: `Light (Radius: ${dungeon.lightRadius})`
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
    return currentTile.type === 'elevator';
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

  // Scene title
  readonly sceneTitle = computed(() => `MAZE - LEVEL ${this.currentLevel()}`);

  // Footer menu (kept for reference, now using keyboard hints)
  readonly footerMenuItems = computed(() => {
    const state = this.gameState.state();
    let canOpen = false;
    let canInspect = false;

    if (state.dungeon?.position) {
      const level = DungeonService.loadLevel(this.currentLevel());
      canOpen = DoorService.canOpenDoor(level, state.dungeon.position);
      canInspect = TileInspectionService.hasSearchableContent(level, state.dungeon.position);
    }

    return [
      { id: 'forward', label: 'Forward (W)', shortcut: 'W', enabled: true },
      { id: 'back', label: 'Backward (S)', shortcut: 'S', enabled: true },
      { id: 'left', label: 'Turn Left (A)', shortcut: 'A', enabled: true },
      { id: 'right', label: 'Turn Right (D)', shortcut: 'D', enabled: true },
      { id: 'strafe_left', label: 'Strafe Left (Q)', shortcut: 'Q', enabled: true },
      { id: 'strafe_right', label: 'Strafe Right (E)', shortcut: 'E', enabled: true },
      { id: 'open', label: 'Open Door (O)', shortcut: 'O', enabled: canOpen },
      { id: 'inspect', label: 'Inspect (I)', shortcut: 'I', enabled: canInspect }
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

    // Add welcome message
    this.addMessage(`Entering Level ${this.currentLevel()}...`);
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

      // Load high-resolution texture atlas metadata
      const response = await fetch('/assets/textures/eob-dungeon-highres.json');
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

    // Viewport configuration
    const config: ViewportConfig = {
      width: canvas.width,
      height: canvas.height,
      tileDepth: 5,
      peripheralColumns: 3
    };

    // Render the dungeon with dungeon state for door rendering
    this.webglRenderer.render(level, position, config, this.dungeonState());
  }

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================

  @HostListener('window:keydown.w')
  @HostListener('window:keydown.arrowup')
  handleKeyW(): void {
    if (!this.isDialogOpen()) this.moveForward();
  }

  @HostListener('window:keydown.s')
  @HostListener('window:keydown.arrowdown')
  handleKeyS(): void {
    if (!this.isDialogOpen()) this.moveBackward();
  }

  @HostListener('window:keydown.a')
  @HostListener('window:keydown.arrowleft')
  handleKeyA(): void {
    if (!this.isDialogOpen()) this.turnLeft();
  }

  @HostListener('window:keydown.d')
  @HostListener('window:keydown.arrowright')
  handleKeyD(): void {
    if (!this.isDialogOpen()) this.turnRight();
  }

  @HostListener('window:keydown.q')
  handleKeyQ(): void {
    if (!this.isDialogOpen()) this.strafeLeft();
  }

  @HostListener('window:keydown.e')
  handleKeyE(): void {
    if (!this.isDialogOpen()) this.strafeRight();
  }

  @HostListener('window:keydown.o')
  handleKeyO(): void {
    if (!this.isDialogOpen()) this.openDoor();
  }

  @HostListener('window:keydown.i')
  handleKeyI(): void {
    if (!this.isDialogOpen()) this.inspectTile();
  }

  /**
   * Check if any dialog is currently open
   */
  private isDialogOpen(): boolean {
    return this.showElevatorDialog() || this.showSpellDialog() || this.showTargetDialog();
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

    // ESC only closes dialogs - to exit the maze, use stairs on level 1 or cast LOKTOFEIT
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

  openDoor(): void {
    const state = this.gameState.state();
    if (!state.dungeon) {
      return;
    }
    const level = DungeonService.loadLevel(this.currentLevel());

    // Check if can open door
    if (!DoorService.canOpenDoor(level, state.dungeon.position)) {
      this.addMessage('No door here.');
      return;
    }

    console.log('[MazeComponent] Before opening door:', {
      openDoorsSize: state.dungeon.openDoors.size,
      allOpenDoors: Array.from(state.dungeon.openDoors)
    });

    const newState = DoorService.openDoor(state);
    this.gameState.updateState(() => newState);

    console.log('[MazeComponent] After updateState:', {
      openDoorsSize: this.dungeonState().openDoors.size,
      allOpenDoors: Array.from(this.dungeonState().openDoors)
    });

    this.addMessage('You open the door.');
    this.render(); // Re-render to show open door
  }

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

    // Check if current tile has searchable content
    if (!TileInspectionService.hasSearchableContent(level, state.dungeon.position)) {
      this.addMessage('Nothing to search here.');
      return;
    }

    const result = TileInspectionService.inspectTileWithState(state, level);

    if (result.found && result.state) {
      this.gameState.updateState(() => result.state!);
      this.addMessage(result.message || `You found ${result.itemId}!`);
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

  handleFooterAction(action: string): void {
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
      case 'open':
        this.openDoor();
        break;
      case 'inspect':
        this.inspectTile();
        break;
    }
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
      'FORWARD': 'You move forward.',
      'BACKWARD': 'You move backward.',
      'STRAFE_LEFT': 'You strafe left.',
      'STRAFE_RIGHT': 'You strafe right.'
    };
    this.addMessage(messages[moveType]);

    // Re-render after movement
    this.render();

    // Check for encounter after successful movement
    this.checkForEncounter();
  }

  private checkForEncounter(): void {
    // Skip encounter check if disabled in settings (useful for testing)
    if (!this.gameState.state().settings.encountersEnabled) {
      return;
    }

    const encounterOccurs = EncounterService.rollRandomEncounter();
    if (!encounterOccurs) return;

    // Initiate random encounter for current dungeon level
    this.initiateEncounter(this.currentLevel(), true);  // true = can flee
  }

  private handleFixedEncounter(monsterId: string): void {
    // For fixed encounters, still use level-based generation
    this.initiateEncounter(this.currentLevel(), false);  // false = cannot flee
  }

  private initiateEncounter(dungeonLevel: number, canFlee: boolean): void {
    this.addMessage(`You encounter monsters!`);

    try {
      // Get party characters for combat
      const partyChars = this.partyCharacters();

      // Initialize combat state with encounter generation
      const combatState = CombatService.initiateCombat(dungeonLevel, partyChars, canFlee);

      // Update game state with combat
      this.gameState.updateState(state => ({
        ...state,
        combat: combatState
      }));

      // Navigate to combat
      queueMicrotask(() => {
        this.router.navigate(['/combat']);
      });
    } catch (error) {
      console.error('[MazeComponent] Failed to initiate encounter:', error);
      this.addMessage(`Error: Failed to create encounter. Please try again.`);
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
   */
  private openSpellDialog(characterId: string): void {
    const state = this.gameState.state();
    const caster = state.roster.get(characterId);

    if (!caster) {
      this.addMessage('Error: Character not found.');
      return;
    }

    // Get spells available in dungeon context
    const spells = SpellCastingService.getSpellsByContext(caster, 'dungeon');

    if (spells.length === 0) {
      this.addMessage(`${caster.name} has no spells available.`);
      return;
    }

    // Build spell options with spell point info
    const spellOptions: SpellOption[] = spells.map((spell, index) => {
      const pool = spell.casterType === 'mage' ? caster.spellPoints?.mage : caster.spellPoints?.priest;
      const levelKey = `level${spell.level}` as keyof typeof pool;
      const points = pool?.[levelKey] || { current: 0, max: 0 };

      return {
        spell,
        index: index + 1,
        enabled: points.current > 0,
        spellPoints: points
      };
    });

    this.selectedCaster.set(caster);
    this.availableSpellOptions.set(spellOptions);
    this.showSpellDialog.set(true);
  }

  /**
   * Handle spell selection from the dialog
   */
  onSpellSelected(spell: SpellData): void {
    this.showSpellDialog.set(false);
    this.selectedSpell.set(spell);

    const caster = this.selectedCaster();
    if (!caster) return;

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

    const spell = this.selectedSpell();
    if (!spell) return;

    this.castSpell(spell, target);
  }

  /**
   * Cancel spell selection
   */
  onSpellDialogCancelled(): void {
    this.showSpellDialog.set(false);
    this.selectedCaster.set(null);
    this.selectedSpell.set(null);
    this.availableSpellOptions.set([]);
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
        const isLomilwa = spell.id === 'lomilwa' || spell.id === 'lomilwa_priest';
        const radius = isLomilwa ? 3 : 2;
        return {
          message: `${caster.name} casts ${spell.name}! The area is illuminated.`,
          dungeonUpdate: {
            lightActive: true,
            lightRadius: radius
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
