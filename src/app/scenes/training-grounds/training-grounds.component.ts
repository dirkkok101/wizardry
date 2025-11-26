import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { CharacterService } from '@services/CharacterService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { CharacterCardComponent } from '@shared/components/character-card/character-card.component';
import { CharacterActionEvent } from '@models/CharacterCardTypes';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { Party } from '@models/GameState';
import { SceneType } from '@models/SceneType';

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
  private readonly gameState = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  // Confirmation dialog state
  readonly showDeleteConfirmation = signal(false);
  readonly deleteConfirmationMessage = signal('');
  private pendingDeleteId: string | null = null;

  // Computed available characters using GameStateQueries
  readonly availableCharacters = computed<CharacterWithStatus[]>(() => {
    const state = this.gameState.state();
    const party = this.gameState.party();

    return GameStateQueries.availableCharacters(state)
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

  ngOnInit(): void {
    this.messages.clear();
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }));
  }

  handleCreateCharacter(): void {
    this.navigation.createCharacter();
  }

  handleInspectCharacter(characterId: string): void {
    this.navigation.inspectCharacter(characterId, 'training-grounds');
  }

  handleDeleteCharacter(characterId: string): void {
    const character = this.gameState.state().roster.get(characterId);
    if (!character) return;

    this.pendingDeleteId = characterId;
    this.deleteConfirmationMessage.set(
      `Are you sure you want to delete ${character.name}? This action cannot be undone.`
    );
    this.showDeleteConfirmation.set(true);
  }

  confirmDelete(): void {
    if (!this.pendingDeleteId) return;

    try {
      const characterId = this.pendingDeleteId;
      this.gameState.updateState(state =>
        CharacterService.deleteCharacter(state, characterId)
      );
      this.messages.clear();
    } catch (error) {
      console.error('Failed to delete character:', error);
      this.messages.showError((error as Error).message);
    }

    this.closeDeleteDialog();
  }

  cancelDelete(): void {
    this.closeDeleteDialog();
  }

  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'create':
        this.handleCreateCharacter();
        break;
      case 'return':
        this.navigation.returnToCastle();
        break;
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (!this.showDeleteConfirmation()) {
      this.navigation.returnToCastle();
    }
  }

  handleActionClick(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.handleInspectCharacter(event.characterId);
    } else if (event.actionType === 'delete') {
      this.handleDeleteCharacter(event.characterId);
    }
  }

  private getCharacterStatus(char: Character, party: Party): CharacterStatus {
    return char.status;
  }

  private closeDeleteDialog(): void {
    this.showDeleteConfirmation.set(false);
    this.deleteConfirmationMessage.set('');
    this.pendingDeleteId = null;
  }
}
