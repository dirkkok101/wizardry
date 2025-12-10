import { Component, OnInit, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { SaveService } from '@services/SaveService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { MenuItem } from '@shared/components/menu/menu.component';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { CharacterActionEvent, CharacterAction } from '@models/CharacterCardTypes';
import { SceneType } from '@models/SceneType';
import { Character } from '@models/Character';
import { GameState } from '@models/GameState';

/**
 * System Scene Component
 *
 * Provides system-level operations:
 * - Backup: Download current game state as JSON file
 * - Restore: Upload JSON file to restore game state
 *
 * Layout mirrors Castle Menu for visual consistency.
 */
@Component({
  selector: 'app-system',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './system.component.html',
  styleUrls: ['./system.component.scss']
})
export class SystemComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly saveService = inject(SaveService);
  private readonly navigation = inject(SceneNavigationService);
  private readonly messages = inject(MessageService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Confirmation dialog state
  readonly showConfirmDialog = signal(false);
  readonly confirmMessage = signal('');
  private pendingState: GameState | null = null;

  /**
   * All party characters in order
   */
  readonly partyCharacters = computed(() =>
    GameStateQueries.partyCharacters(this.gameState.state())
  );

  /**
   * Characters for left column (positions 1, 3, 5 = indices 0, 2, 4)
   */
  readonly leftColumnCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[0], chars[2], chars[4]].filter(c => c !== undefined);
  });

  /**
   * Characters for right column (positions 2, 4, 6 = indices 1, 3, 5)
   */
  readonly rightColumnCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[1], chars[3], chars[5]].filter(c => c !== undefined);
  });

  /**
   * Actions available for each character
   */
  getActionsForCharacter = (char: Character): CharacterAction[] => {
    return [{ type: 'inspect' }];
  };

  readonly footerMenuItems = computed((): MenuItem[] => {
    return [
      { id: 'return', label: 'Return to Castle', shortcut: 'ESC', enabled: true },
      { id: 'backup', label: 'Backup', shortcut: 'B', enabled: true },
      { id: 'restore', label: 'Restore', shortcut: 'R', enabled: true }
    ];
  });

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.SYSTEM
    }));
  }

  handleActionClick(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'castle-menu');
    }
  }

  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'return':
        this.navigation.returnToCastle();
        break;
      case 'backup':
        this.backupGame();
        break;
      case 'restore':
        this.triggerFileInput();
        break;
    }
  }

  /**
   * Download current game state as JSON file
   */
  backupGame(): void {
    const state = this.gameState.state();
    const json = this.saveService.exportGameState(state);

    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `wizardry-backup-${date}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);

    this.messages.showSuccess('Game backed up successfully');
  }

  /**
   * Trigger file input click for restore
   */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  /**
   * Handle file selection for restore
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const json = reader.result as string;
      const result = this.saveService.importGameState(json);

      if (!result.success) {
        this.messages.showError(`Invalid backup file: ${result.error}`);
        // Reset file input for next attempt
        input.value = '';
        return;
      }

      // Store pending state and show confirmation
      this.pendingState = result.state!;
      this.confirmMessage.set('This will replace your current game. Continue?');
      this.showConfirmDialog.set(true);

      // Reset file input for next attempt
      input.value = '';
    };

    reader.onerror = () => {
      this.messages.showError('Failed to read backup file');
      input.value = '';
    };

    reader.readAsText(file);
  }

  /**
   * Confirm restore and apply the new state
   */
  onConfirmRestore(): void {
    if (!this.pendingState) {
      this.showConfirmDialog.set(false);
      return;
    }

    // Update game state
    this.gameState.updateState(() => this.pendingState!);

    // Persist to localStorage
    this.saveService.saveGame(this.pendingState, 1);

    // Clean up
    this.pendingState = null;
    this.showConfirmDialog.set(false);

    this.messages.showSuccess('Game restored successfully');

    // Navigate to castle after restore
    this.navigation.returnToCastle();
  }

  /**
   * Cancel restore
   */
  onCancelRestore(): void {
    this.pendingState = null;
    this.showConfirmDialog.set(false);
  }
}
