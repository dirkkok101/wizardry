import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../shared/components/character-card/character-card.component';
import { MessageLogComponent } from '../shared/components/message-log/message-log.component';
import { GameStateService } from '../../services/GameStateService';
import { DungeonMovementService } from '../../services/DungeonMovementService';
import { DungeonService } from '../../services/DungeonService';
import { WebGLRenderingService } from '../../services/WebGLRenderingService';
import { EncounterService } from '../../services/EncounterService';
import { CombatService } from '../../services/CombatService';
import { DoorService } from '../../services/DoorService';
import { TileInspectionService } from '../../services/TileInspectionService';
import { SceneType } from '../../types/SceneType';
import { MenuItem } from '../shared/components/menu/menu.component';
import { ActiveSpell } from '../../types/active-spell.types';
import { GameState } from '../../types/GameState';
import { DungeonState, TileData } from '../../types/Dungeon';
import { TextureAtlas } from '../../types/texture.types';
import { ViewportConfig } from '../../types/rendering.types';
import * as TextureAtlasService from '../../services/TextureAtlasService';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent,
    MessageLogComponent
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

  // WebGL Renderer
  private webglRenderer: WebGLRenderingService | null = null;

  // Computed signals from GameStateService
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState);
  readonly position = computed(() => this.dungeonState()?.position);
  readonly currentLevel = computed(() => this.dungeonState()?.currentLevel ?? 1);
  readonly party = computed(() => this.gameState.state().party);
  readonly partyCharacters = computed(() => {
    const roster = this.gameState.state().roster;
    return this.party().members.map(id => roster.get(id)!).filter(c => c);
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

  // Footer menu
  readonly footerMenuItems = computed((): MenuItem[] => {
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
      { id: 'inspect', label: 'Inspect (I)', shortcut: 'I', enabled: canInspect },
      { id: 'camp', label: 'Return to Camp (ESC)', shortcut: 'ESC', enabled: true }
    ];
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
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
      this.errorMessage.set('Error: No active dungeon. Return to camp to enter the dungeon.');
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

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Check if elevator dialog is open
    if (this.showElevatorDialog()) {
      this.cancelElevator();
      return;
    }

    this.router.navigate(['/camp']);
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

  returnToCamp(): void {
    this.addMessage('Returning to camp...');
    this.router.navigate(['/camp']);
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
      case 'camp':
        this.returnToCamp();
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
}
