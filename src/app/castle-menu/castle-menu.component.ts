import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { MenuItem } from '../shared/components/menu/menu.component';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../shared/components/character-card/character-card.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

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
    CharacterCardComponent
  ],
  templateUrl: './castle-menu.component.html',
  styleUrls: ['./castle-menu.component.scss']
})
export class CastleMenuComponent implements OnInit {
  // Party display signals
  readonly currentParty = computed(() => this.gameState.party());
  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  readonly footerMenuItems = computed((): MenuItem[] => {
    const hasParty = (this.currentParty().members?.length ?? 0) > 0;

    return [
      { id: 'tavern', label: 'Tavern', shortcut: 'A', enabled: true },
      { id: 'temple', label: 'Temple', shortcut: 'T', enabled: true },
      { id: 'shop', label: 'Shop', shortcut: 'S', enabled: true },
      { id: 'inn', label: 'Inn', shortcut: 'I', enabled: true },
      { id: 'training', label: 'Training Grounds', shortcut: 'G', enabled: true },
      { id: 'maze', label: 'Maze', shortcut: 'M', enabled: hasParty }
    ];
  });

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private saveService: SaveService
  ) {}

  ngOnInit(): void {
    // Update game state to CASTLE_MENU
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CASTLE_MENU
    }));
  }

  handleActionClick(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.handleInspectCharacter(event.characterId);
    }
  }

  handleInspectCharacter(charId: string): void {
    this.router.navigate(['/character-inspection'], {
      queryParams: { characterId: charId, returnTo: 'castle-menu' }
    });
  }

  handleFooterAction(itemId: string): void {
    switch(itemId) {
      case 'tavern':
        this.router.navigate(['/tavern']);
        break;
      case 'temple':
        this.router.navigate(['/temple']);
        break;
      case 'shop':
        this.router.navigate(['/shop']);
        break;
      case 'inn':
        this.router.navigate(['/inn']);
        break;
      case 'training':
        this.router.navigate(['/training-grounds']);
        break;
      case 'maze':
        this.navigateToMaze();
        break;
    }
  }

  async navigateToMaze(): Promise<void> {
    const party = this.currentParty();

    // Validate party exists and has members
    if (!party || party.members.length === 0) {
      console.warn('Cannot enter maze without party members');
      return;
    }

    // Trigger auto-save before entering dungeon
    await this.saveService.saveGame(this.gameState.state(), 1);

    // Navigate to Camp (pre-dungeon staging area)
    this.router.navigate(['/camp']);
  }
}
