import { Component, OnInit, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { NavigationService } from '../../services/NavigationService';
import { SceneNavigationService } from '../../services/SceneNavigationService';
import { MessageService } from '../../services/MessageService';
import { GameStateQueries } from '../../utils/GameStateQueries';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '../shared/components/party-character-grid/party-character-grid.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterAction, CharacterActionEvent } from '../../types/CharacterCardTypes';
import { MenuItem } from '../shared/components/menu/menu.component';
import { moveCharacterUp, moveCharacterDown } from '../../services/PartyService';

@Component({
  selector: 'app-camp',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    PartyCharacterGridComponent
  ],
  templateUrl: './camp.component.html',
  styleUrls: ['./camp.component.scss']
})
export class CampComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly saveService = inject(SaveService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  readonly canEnterMaze = computed(() =>
    GameStateQueries.canPartyEnterMaze(this.gameState.state())
  );

  readonly footerMenuItems = computed((): MenuItem[] => [
    {
      id: 'maze',
      label: 'Enter Maze',
      shortcut: 'M',
      enabled: this.canEnterMaze()
    },
    {
      id: 'castle',
      label: 'Return to Castle',
      shortcut: 'ESC',
      enabled: true
    }
  ]);

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CAMP
    }));

    // Auto-save on entry
    this.saveService.saveGame(this.gameState.state(), 1);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.navigation.returnToCastle();
  }

  getActionsForCharacter = (character: Character): CharacterAction[] => {
    const state = this.gameState.state();
    const canMoveUp = GameStateQueries.canMoveUp(state, character.id);
    const canMoveDown = GameStateQueries.canMoveDown(state, character.id);
    const canCast = this.isSpellCaster(character);

    return [
      { type: 'inspect', enabled: true },
      ...(canCast ? [{ type: 'cast', enabled: true }] : []),
      { type: 'moveUp', enabled: canMoveUp },
      { type: 'moveDown', enabled: canMoveDown }
    ];
  }

  isSpellCaster(character: Character): boolean {
    return ['MAGE', 'PRIEST', 'BISHOP', 'SAMURAI', 'LORD'].includes(character.class);
  }

  handleActionClick(event: CharacterActionEvent): void {
    switch (event.actionType) {
      case 'inspect':
        this.navigation.inspectCharacter(event.characterId, 'camp');
        break;
      case 'cast':
        this.navigation.castSpell(event.characterId, 'camp');
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

  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'maze':
        this.enterMaze();
        break;
      case 'castle':
        this.navigation.returnToCastle();
        break;
    }
  }

  enterMaze(): void {
    if (!this.canEnterMaze()) {
      this.messages.showError('Some party members are dead - visit Temple first');
      return;
    }

    const state = this.gameState.state();
    const newState = NavigationService.enterDungeon(state, 1);
    this.gameState.updateState(() => newState);

    this.navigation.enterMaze();
  }
}
