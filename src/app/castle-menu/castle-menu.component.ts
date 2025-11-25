import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { SceneNavigationService } from '../../services/SceneNavigationService';
import { GameStateQueries } from '../../utils/GameStateQueries';
import { MenuItem } from '../shared/components/menu/menu.component';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '../shared/components/party-character-grid/party-character-grid.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { SceneType } from '../../types/SceneType';

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
    PartyCharacterGridComponent
  ],
  templateUrl: './castle-menu.component.html',
  styleUrls: ['./castle-menu.component.scss']
})
export class CastleMenuComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly saveService = inject(SaveService);
  private readonly navigation = inject(SceneNavigationService);

  readonly footerMenuItems = computed((): MenuItem[] => {
    const hasParty = GameStateQueries.hasPartyMembers(this.gameState.state());

    return [
      { id: 'tavern', label: 'Tavern', shortcut: 'A', enabled: true },
      { id: 'temple', label: 'Temple', shortcut: 'T', enabled: true },
      { id: 'shop', label: 'Shop', shortcut: 'S', enabled: true },
      { id: 'inn', label: 'Inn', shortcut: 'I', enabled: true },
      { id: 'training', label: 'Training Grounds', shortcut: 'G', enabled: true },
      { id: 'maze', label: 'Maze', shortcut: 'M', enabled: hasParty }
    ];
  });

  ngOnInit(): void {
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
    if (!GameStateQueries.hasPartyMembers(this.gameState.state())) {
      console.warn('Cannot enter maze without party members');
      return;
    }

    // Trigger auto-save before entering dungeon
    await this.saveService.saveGame(this.gameState.state(), 1);
    this.navigation.enterCamp();
  }
}
