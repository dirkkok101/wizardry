import { Component, OnInit, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { CharacterService } from '../../services/CharacterService';
import { CharacterCardComponent } from '../shared/components/character-card/character-card.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { ConfirmationDialogComponent } from '../shared/components/confirmation-dialog/confirmation-dialog.component';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { MenuItem } from '../shared/components/menu/menu.component';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';
import { Party } from '../../types/GameState';
import { SceneType } from '../../types/SceneType';

interface CharacterWithStatus {
  character: Character;
  status: CharacterStatus;
}

/**
 * Training Grounds Component - Roster Management Hub
 *
 * Responsibilities:
 * - Display available characters (not in party)
 * - Navigate to character creation wizard
 * - Navigate to character inspection
 * - Handle character deletion with confirmation
 * - Coordinate state updates via services
 */
@Component({
  selector: 'app-training-grounds',
  standalone: true,
  imports: [
    CommonModule,
    CharacterCardComponent,
    ConfirmationDialogComponent,
    SceneTitleComponent,
    SceneFooterComponent
  ],
  templateUrl: './training-grounds.component.html',
  styleUrls: ['./training-grounds.component.scss']
})
export class TrainingGroundsComponent implements OnInit {
  // Confirmation dialog state
  readonly showDeleteConfirmation = signal(false);
  readonly deleteConfirmationMessage = signal('');
  private pendingDeleteId: string | null = null;

  // Error message state
  readonly errorMessage = signal<string | null>(null);

  // Computed available characters
  readonly availableCharacters = computed<CharacterWithStatus[]>(() => {
    const state = this.gameState.state();
    const party = this.gameState.party();

    return Array.from(state.roster.values())
      .filter(char => !party.members.includes(char.id))
      .map(char => ({
        character: char,
        status: this.getCharacterStatus(char, party)
      }));
  });

  // Footer menu items
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'create', label: 'CREATE CHARACTER', shortcut: 'C', enabled: true },
    { id: 'return', label: 'Return to Castle (ESC)', shortcut: 'ESC', enabled: true }
  ]);

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Update scene type
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }));
  }

  /**
   * Navigate to character creation wizard
   */
  handleCreateCharacter(): void {
    this.router.navigate(['/character-creation']);
  }

  /**
   * Navigate to character inspection
   */
  handleInspectCharacter(characterId: string): void {
    this.router.navigate(['/character-inspection'], {
      queryParams: {
        characterId,
        returnTo: 'training-grounds'
      }
    });
  }

  /**
   * Show confirmation dialog for character deletion
   */
  handleDeleteCharacter(characterId: string): void {
    const character = this.gameState.state().roster.get(characterId);
    if (!character) return;

    this.pendingDeleteId = characterId;
    this.deleteConfirmationMessage.set(
      `Are you sure you want to delete ${character.name}? This action cannot be undone.`
    );
    this.showDeleteConfirmation.set(true);
  }

  /**
   * Confirm deletion and update state
   */
  confirmDelete(): void {
    if (!this.pendingDeleteId) return;

    try {
      const characterId = this.pendingDeleteId;
      this.gameState.updateState(state =>
        CharacterService.deleteCharacter(state, characterId)
      );
      this.errorMessage.set(null); // Clear any previous errors
    } catch (error) {
      console.error('Failed to delete character:', error);
      this.errorMessage.set((error as Error).message);
    }

    this.closeDeleteDialog();
  }

  /**
   * Cancel deletion
   */
  cancelDelete(): void {
    this.closeDeleteDialog();
  }

  /**
   * Return to castle menu
   */
  returnToCastleMenu(): void {
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Handle footer menu actions
   */
  handleFooterAction(itemId: string): void {
    switch(itemId) {
      case 'create':
        this.handleCreateCharacter();
        break;
      case 'return':
        this.returnToCastleMenu();
        break;
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Don't navigate if confirmation dialog is open
    if (!this.showDeleteConfirmation()) {
      this.returnToCastleMenu();
    }
  }

  /**
   * Handle actions from character cards
   */
  handleActionClick(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.handleInspectCharacter(event.characterId);
    } else if (event.actionType === 'delete') {
      this.handleDeleteCharacter(event.characterId);
    }
  }

  /**
   * Get character status for display
   */
  private getCharacterStatus(char: Character, party: Party): CharacterStatus {
    // Return actual character status (being in party doesn't change it)
    return char.status;
  }

  /**
   * Close confirmation dialog and reset state
   */
  private closeDeleteDialog(): void {
    this.showDeleteConfirmation.set(false);
    this.deleteConfirmationMessage.set('');
    this.pendingDeleteId = null;
  }
}
