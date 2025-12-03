import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { SaveService } from '@services/SaveService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { DungeonMovementService } from '@services/DungeonMovementService';
import { MessageService } from '@services/MessageService';
import { FightMapService } from '@services/FightMapService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { MenuItem } from '@shared/components/menu/menu.component';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CharacterActionEvent, CharacterAction } from '@models/CharacterCardTypes';
import { SceneType } from '@models/SceneType';
import { Character } from '@models/Character';

/**
 * Castle Menu Component
 *
 * Central hub for all town services. Player navigates to:
 * - Tavern (party formation)
 * - Temple (healing/resurrection)
 * - Shop (equipment)
 * - Inn (rest/level up)
 * - Training Grounds (character creation)
 * - Maze (dungeon access, requires party, triggers auto-save)
 */
@Component({
  selector: 'app-castle-menu',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    EmptyStateComponent
  ],
  templateUrl: './castle-menu.component.html',
  styleUrls: ['./castle-menu.component.scss']
})
export class CastleMenuComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly saveService = inject(SaveService);
  private readonly navigation = inject(SceneNavigationService);
  private readonly messages = inject(MessageService);

  /**
   * Front row characters (positions 1, 2, 3)
   */
  readonly frontRowCharacters = computed(() =>
    GameStateQueries.frontRowCharacters(this.gameState.state())
  );

  /**
   * Back row characters (positions 4, 5, 6)
   */
  readonly backRowCharacters = computed(() =>
    GameStateQueries.backRowCharacters(this.gameState.state())
  );

  /**
   * Actions available for each character
   */
  getActionsForCharacter = (char: Character): CharacterAction[] => {
    return [{ type: 'inspect' }];
  };

  readonly footerMenuItems = computed((): MenuItem[] => {
    const canEnterMaze = GameStateQueries.canPartyEnterMaze(this.gameState.state());

    return [
      { id: 'tavern', label: 'Tavern', shortcut: 'A', enabled: true },
      { id: 'temple', label: 'Temple', shortcut: 'T', enabled: true },
      { id: 'shop', label: 'Shop', shortcut: 'S', enabled: true },
      { id: 'inn', label: 'Inn', shortcut: 'I', enabled: true },
      { id: 'training', label: 'Training Grounds', shortcut: 'G', enabled: true },
      { id: 'maze', label: 'Maze', shortcut: 'M', enabled: canEnterMaze }
    ];
  });

  ngOnInit(): void {
    // Reset FIGHTMAP state when returning to castle
    // (covers both stair exit from level 1 and LOKTOFEIT spell recall)
    FightMapService.resetAll();

    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CASTLE_MENU
    }));
  }

  handleActionClick(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'castle-menu');
    }
  }

  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'tavern':
        this.navigation.goToTavern();
        break;
      case 'temple':
        this.navigation.goToTemple();
        break;
      case 'shop':
        this.navigation.goToShop();
        break;
      case 'inn':
        this.navigation.goToInn();
        break;
      case 'training':
        this.navigation.goToTrainingGrounds();
        break;
      case 'maze':
        this.navigateToMaze();
        break;
    }
  }

  async navigateToMaze(): Promise<void> {
    if (!GameStateQueries.canPartyEnterMaze(this.gameState.state())) {
      this.messages.showError('Some party members are dead - visit Temple first');
      return;
    }

    // Initialize dungeon state before entering
    const state = this.gameState.state();
    const newState = DungeonMovementService.enterDungeon(state, 1);
    this.gameState.updateState(() => newState);

    // Trigger auto-save before entering dungeon
    await this.saveService.saveGame(this.gameState.state(), 1);

    // Go directly to maze
    this.navigation.enterMaze();
  }
}
