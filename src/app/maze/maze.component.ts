import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { MessageLogComponent } from '../../components/message-log/message-log.component';
import { MazeViewComponent } from '../../components/maze-view/maze-view.component';
import { GameStateService } from '../../services/GameStateService';
import { NavigationService } from '../../services/NavigationService';
import { DungeonService } from '../../services/DungeonService';
import { WireframeRenderingService } from '../../services/WireframeRenderingService';
import { RaycastingRenderingService } from '../../services/RaycastingRenderingService';
import { EncounterService } from '../../services/EncounterService';
import { CombatService } from '../../services/CombatService';
import { DoorService } from '../../services/DoorService';
import { TileInspectionService } from '../../services/TileInspectionService';
import { SceneType } from '../../types/SceneType';
import { MenuItem } from '../../components/menu/menu.component';
import { ActiveSpell } from '../../types/active-spell.types';
import { GameState } from '../../types/GameState';
import { DungeonState, TileData } from '../../types/Dungeon';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent,
    MessageLogComponent,
    MazeViewComponent
  ],
  templateUrl: './maze.component.html',
  styleUrls: ['./maze.component.scss']
})
export class MazeComponent implements OnInit {
  // Local signals
  readonly messages = signal<string[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoadingLevel = signal<boolean>(false);

  // Rendering services
  private readonly raycastingRenderer = new RaycastingRenderingService();

  // Renderer toggle (for comparison testing)
  readonly rendererType = signal<'wireframe' | 'raycasting'>('raycasting');

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
   * Canvas drawing commands for 3D view (wireframe or raycasting)
   */
  readonly drawCommands = computed(() => {
    const pos = this.position();

    if (!pos) {
      console.warn('[MazeComponent] No position, returning empty commands');
      return [];
    }

    const levelNum = this.currentLevel();
    const level = DungeonService.loadLevel(levelNum);

    const config = {
      width: 600,
      height: 600,
      tileDepth: 10,
      peripheralColumns: 5
    };

    // Switch based on renderer type
    const commands = this.rendererType() === 'raycasting'
      ? this.raycastingRenderer.generateRaycastCommands(level, pos, config, undefined, this.dungeonState())
      : WireframeRenderingService.generateWireframeCommands(level, pos, config);

    if (commands.length === 0) {
      console.warn('⚠️ NO COMMANDS GENERATED - check visibility and projection!');
    }

    return commands;
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
    let canKick = false;
    let canInspect = false;

    if (state.dungeon?.position) {
      const level = DungeonService.loadLevel(this.currentLevel());
      canKick = DoorService.canKickDoor(level, state.dungeon.position);
      canInspect = TileInspectionService.hasSearchableContent(level, state.dungeon.position);
    }

    return [
      { id: 'forward', label: 'Forward (W)', shortcut: 'W', enabled: true },
      { id: 'back', label: 'Backward (S)', shortcut: 'S', enabled: true },
      { id: 'left', label: 'Turn Left (A)', shortcut: 'A', enabled: true },
      { id: 'right', label: 'Turn Right (D)', shortcut: 'D', enabled: true },
      { id: 'strafe_left', label: 'Strafe Left (Q)', shortcut: 'Q', enabled: true },
      { id: 'strafe_right', label: 'Strafe Right (E)', shortcut: 'E', enabled: true },
      { id: 'kick', label: 'Kick Door (K)', shortcut: 'K', enabled: canKick },
      { id: 'inspect', label: 'Inspect (I)', shortcut: 'I', enabled: canInspect },
      { id: 'camp', label: 'Return to Camp (ESC)', shortcut: 'ESC', enabled: true }
    ];
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
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

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Check if elevator dialog is open
    if (this.showElevatorDialog()) {
      this.cancelElevator();
      return;
    }

    this.router.navigate(['/camp']);
  }

  returnToCamp(): void {
    this.addMessage('Returning to camp...');
    this.router.navigate(['/camp']);
  }

  moveForward(): void {
    this.executeMovement('FORWARD', (state: GameState) => NavigationService.moveForward(state));
  }

  moveBackward(): void {
    this.executeMovement('BACKWARD', (state: GameState) => NavigationService.moveBackward(state));
  }

  turnLeft(): void {
    const state = this.gameState.state();
    const newState = NavigationService.turnLeft(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You turn left.');
  }

  turnRight(): void {
    const state = this.gameState.state();
    const newState = NavigationService.turnRight(state);
    this.gameState.updateState(() => newState);
    this.addMessage('You turn right.');
  }

  strafeLeft(): void {
    this.executeMovement('STRAFE_LEFT', (state: GameState) => NavigationService.strafeLeft(state));
  }

  strafeRight(): void {
    this.executeMovement('STRAFE_RIGHT', (state: GameState) => NavigationService.strafeRight(state));
  }

  kickDoor(): void {
    const state = this.gameState.state();
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
        this.router.navigate(['/combat-stub']);
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
    const newState = NavigationService.enterLevel(state, level, 'ELEVATOR');
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
      case 'kick':
        this.kickDoor();
        break;
      case 'inspect':
        this.inspectTile();
        break;
      case 'camp':
        this.returnToCamp();
        break;
    }
  }

  /**
   * Toggle between wireframe and raycasting renderers.
   * Debug feature for comparison testing.
   */
  toggleRenderer(): void {
    this.rendererType.update(current =>
      current === 'wireframe' ? 'raycasting' : 'wireframe'
    );
  }

  private executeMovement(
    moveType: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT',
    serviceFn: (state: GameState) => GameState
  ): void {
    const state = this.gameState.state();
    const level = DungeonService.loadLevel(this.currentLevel());
    const position = this.position()!;

    // Validate movement
    const validation = DungeonService.canMove(level, position, moveType);

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

    // Check for encounter after successful movement
    this.checkForEncounter();
  }

  private checkForEncounter(): void {
    const encounterOccurs = EncounterService.rollRandomEncounter();
    if (!encounterOccurs) return;

    const encounterTable = EncounterService.getEncounterTable(this.currentLevel());
    const monsterId = EncounterService.selectMonster(encounterTable);

    this.initiateEncounter(monsterId, true);  // true = can flee
  }

  private handleFixedEncounter(monsterId: string): void {
    this.initiateEncounter(monsterId, false);  // false = cannot flee
  }

  private initiateEncounter(monsterId: string, canFlee: boolean): void {
    const monsterName = this.formatMonsterName(monsterId);
    this.addMessage(`You encounter ${monsterName}!`);

    // Get party characters for combat
    const partyChars = this.partyCharacters();

    // Initialize combat state using CombatService
    const combatState = CombatService.initiateCombat(monsterId, partyChars, canFlee);

    // Update game state with combat
    this.gameState.updateState(state => ({
      ...state,
      combat: combatState
    }));

    // Navigate to combat
    queueMicrotask(() => {
      this.router.navigate(['/combat']);
    });
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
