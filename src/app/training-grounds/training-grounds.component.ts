import { Component, OnInit, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { CharacterService } from '../../services/CharacterService';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
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
  imports: [CommonModule, CharacterCardComponent, ConfirmationDialogComponent],
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
   * Handle keyboard shortcuts
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'c') {
      this.handleCreateCharacter();
      event.preventDefault();
    } else if (key === 'l') {
      this.returnToCastle();
      event.preventDefault();
    }
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
  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Get character status for display
   */
  private getCharacterStatus(char: Character, party: Party): CharacterStatus {
    if (party.members.includes(char.id)) return CharacterStatus.IN_MAZE;
    if (char.status === CharacterStatus.DEAD) return CharacterStatus.DEAD;
    if (char.status === CharacterStatus.ASHES) return CharacterStatus.ASHES;
    return CharacterStatus.OK;
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
