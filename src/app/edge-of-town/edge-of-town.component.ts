import { Component, OnInit, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MenuItem } from '../../components/menu/menu.component';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

/**
 * Edge of Town Component
 *
 * Gateway menu for:
 * - Training Grounds (character creation)
 * - Maze (dungeon entry via Camp)
 * - Castle (return to hub)
 * - Utilities (system options)
 * - Leave Game (save and exit)
 */
@Component({
  selector: 'app-edge-of-town',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './edge-of-town.component.html',
  styleUrls: ['./edge-of-town.component.scss']
})
export class EdgeOfTownComponent implements OnInit {
  readonly footerMenuItems = computed((): MenuItem[] => {
    const hasParty = (this.currentParty().members?.length ?? 0) > 0;

    return [
      { id: 'training-grounds', label: 'Training Grounds', shortcut: 'T', enabled: true },
      { id: 'maze', label: 'Maze', shortcut: 'M', enabled: hasParty },
      { id: 'utilities', label: 'Utilities', shortcut: 'U', enabled: true },
      { id: 'castle', label: 'Return to Castle', shortcut: 'ESC', enabled: true },
      { id: 'leave-game', label: 'Leave Game', shortcut: 'L', enabled: true }
    ];
  });

  // Party display
  readonly currentParty = computed(() => this.gameState.party());

  // Party characters with full details
  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  // Message display state (unified for error/info/success)
  readonly messageText = signal<string | null>(null);
  readonly messageType = signal<'error' | 'info' | 'success'>('info');

  // Confirmation dialog state
  readonly showLeaveConfirmation = signal(false);
  readonly leaveConfirmationMessage = signal('Save and quit the game?');

  constructor(
    private gameState: GameStateService,
    private saveService: SaveService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Update game state to EDGE_OF_TOWN
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.EDGE_OF_TOWN
    }));
  }

  /**
   * Handle keyboard shortcuts
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // ESC - Go back to castle menu
    if (event.key === 'Escape') {
      event.preventDefault();
      this.router.navigate(['/castle-menu']);
    }
  }

  /**
   * Handle character card action clicks
   */
  handleCharacterAction(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.router.navigate(['/character-inspection'], {
        queryParams: {
          characterId: event.characterId,
          returnTo: 'edge-of-town'
        }
      });
    }
  }

  handleFooterAction(itemId: string): void {
    // Clear previous messages
    this.messageText.set(null);

    switch (itemId) {
      case 'training-grounds':
        this.router.navigate(['/training-grounds']);
        break;

      case 'maze':
        this.enterMaze();
        break;

      case 'utilities':
        this.router.navigate(['/utilities']);
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;

      case 'leave-game':
        this.showLeaveConfirmation.set(true);
        break;
    }
  }

  private enterMaze(): void {
    const party = this.currentParty();

    // Validate party exists
    if (party.members.length === 0) {
      this.messageText.set('You need a party to enter the maze (visit Tavern)');
      this.messageType.set('error');
      return;
    }

    // Navigate to Camp (dungeon entry)
    this.router.navigate(['/camp']);
  }

  async confirmLeaveGame(): Promise<void> {
    // Save game state
    const state = this.gameState.state();
    await this.saveService.saveGame(state);

    // Close browser window/tab
    // Note: window.close() only works if window was opened by script
    // For user-opened tabs, this will have no effect
    window.close();

    // If window.close() fails (most browsers), show a message
    // informing the user they can safely close the tab
    this.showLeaveConfirmation.set(false);
    this.messageText.set('Game saved successfully. You can now close this window.');
    this.messageType.set('success');
  }

  cancelLeaveGame(): void {
    this.showLeaveConfirmation.set(false);
  }
}
