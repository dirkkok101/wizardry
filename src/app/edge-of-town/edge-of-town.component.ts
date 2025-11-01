import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
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
  imports: [CommonModule, MenuComponent],
  templateUrl: './edge-of-town.component.html',
  styleUrls: ['./edge-of-town.component.scss']
})
export class EdgeOfTownComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'training-grounds',
      label: 'TRAINING GROUNDS',
      enabled: true,
      shortcut: 'T'
    },
    {
      id: 'maze',
      label: 'MAZE',
      enabled: true,
      shortcut: 'M'
    },
    {
      id: 'castle',
      label: 'CASTLE',
      enabled: true,
      shortcut: 'C'
    },
    {
      id: 'utilities',
      label: 'UTILITIES',
      enabled: true,
      shortcut: 'U'
    },
    {
      id: 'leave-game',
      label: 'LEAVE GAME',
      enabled: true,
      shortcut: 'L'
    }
  ];

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

  // Error and confirmation state
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);
  readonly showExitConfirmation = signal(false);

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

  handleMenuSelect(itemId: string): void {
    // Clear previous errors
    this.errorMessage.set(null);

    switch (itemId) {
      case 'training-grounds':
        this.router.navigate(['/training-grounds']);
        break;

      case 'maze':
        this.enterMaze();
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;

      case 'utilities':
        this.router.navigate(['/utilities']);
        break;

      case 'leave-game':
        this.showExitConfirmation.set(true);
        break;
    }
  }

  private enterMaze(): void {
    const party = this.currentParty();

    // Validate party exists
    if (party.members.length === 0) {
      this.errorMessage.set('You need a party to enter the maze (visit Tavern)');
      return;
    }

    // Navigate to Camp (dungeon entry)
    this.router.navigate(['/camp']);
  }

  async confirmExit(): Promise<void> {
    // Save game state
    const state = this.gameState.state();
    await this.saveService.saveGame(state);

    // Close browser window/tab
    // Note: window.close() only works if window was opened by script
    // For user-opened tabs, this will have no effect
    window.close();

    // If window.close() fails (most browsers), show a message
    // informing the user they can safely close the tab
    this.showExitConfirmation.set(false);
    this.infoMessage.set('Game saved successfully. You can now close this window.');
  }

  cancelExit(): void {
    this.showExitConfirmation.set(false);
  }
}
