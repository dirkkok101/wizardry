import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { MessageLogComponent } from '../../components/message-log/message-log.component';
import { ActiveSpellsComponent } from '../../components/active-spells/active-spells.component';
import { MazeViewComponent } from '../../components/maze-view/maze-view.component';
import { GameStateService } from '../../services/GameStateService';
import { NavigationService } from '../../services/NavigationService';
import { DungeonService } from '../../services/DungeonService';
import { MazeRenderingService } from '../../services/MazeRenderingService';
import { EncounterService } from '../../services/EncounterService';
import { DoorService } from '../../services/DoorService';
import { TileInspectionService } from '../../services/TileInspectionService';
import { SceneType } from '../../types/SceneType';
import { MenuItem } from '../../components/menu/menu.component';
import { ActiveSpell } from '../../types/active-spell.types';
import { GameState } from '../../types/GameState';
import { DungeonState } from '../../types/Dungeon';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent,
    MessageLogComponent,
    ActiveSpellsComponent,
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
   * Tiles visible from current position based on light radius
   * Darkness tiles override light spells (per-tile darkness)
   */
  readonly visibleTiles = computed(() => {
    const dungeon = this.dungeonState();
    if (!dungeon) return [];

    const level = DungeonService.loadLevel(this.currentLevel());
    const pos = this.position();
    if (!pos) return [];

    // Check if current tile is darkness
    const currentTile = level.tiles[pos.y][pos.x];
    const effectiveLightRadius = currentTile.type === 'darkness' ? 0 : dungeon.lightRadius;

    return DungeonService.getVisibleTiles(level, pos, effectiveLightRadius);
  });

  /**
   * Canvas drawing commands for 3D view
   */
  readonly drawCommands = computed(() => {
    const tiles = this.visibleTiles();
    const pos = this.position();
    if (!pos || tiles.length === 0) return [];

    return MazeRenderingService.generateView(
      tiles,
      pos.facing,
      { width: 600, height: 600, tileDepth: 3 }
    );
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

    const currentTile = level.tiles[pos.y][pos.x];
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

    const currentTile = level.tiles[pos.y][pos.x];
    return currentTile.elevatorDestinations || [];
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

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    switch(key) {
      case 'w': this.moveForward(); break;
      case 's': this.moveBackward(); break;
      case 'a': this.turnLeft(); break;
      case 'd': this.turnRight(); break;
      case 'q': this.strafeLeft(); break;
      case 'e': this.strafeRight(); break;
      case 'k': this.kickDoor(); break;
      case 'i': this.inspectTile(); break;
      case 'escape': this.returnToCamp(); break;
      // More keys will be added in later tasks
    }
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
    const kickerId = state.party.formation.front[0];
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
    // Will be implemented in later tasks
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
    // Roll for random encounter
    const encounterOccurs = EncounterService.rollRandomEncounter();

    if (!encounterOccurs) {
      return;
    }

    // Get encounter table for current level
    const encounterTable = EncounterService.getEncounterTable(this.currentLevel());

    // Select random monster from table
    const monsterId = EncounterService.selectMonster(encounterTable);

    // Format monster name for display (capitalize and replace underscores)
    const monsterName = this.formatMonsterName(monsterId);

    // Add encounter message
    this.addMessage(`You encounter ${monsterName}!`);

    // Navigate to combat using queueMicrotask for async handling
    queueMicrotask(() => {
      this.router.navigate(['/combat-stub']);
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
