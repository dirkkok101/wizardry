import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SaveService, SaveSlotMetadata } from '../../services/SaveService';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

/**
 * UtilitiesComponent - Save/Load game system with 3 save slots.
 *
 * Features:
 * - 3 independent save slots
 * - Display metadata (timestamp, party info, location)
 * - Confirmation dialogs for overwrite and delete
 * - Success/error messages
 * - Navigate to castle after load
 */
@Component({
  selector: 'app-utilities',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  templateUrl: './utilities.component.html',
  styleUrls: ['./utilities.component.scss']
})
export class UtilitiesComponent implements OnInit {
  private readonly saveService = inject(SaveService);
  readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  // Save slot state
  readonly saveSlots = signal<Array<SaveSlotMetadata | null>>([null, null, null]);

  // UI messages
  readonly successMessage = signal<string>('');
  readonly errorMessage = signal<string>('');

  // Confirmation dialog state
  readonly showConfirmation = signal<boolean>(false);
  readonly confirmationMessage = signal<string>('');
  readonly pendingAction = signal<(() => Promise<void>) | null>(null);

  /**
   * Load metadata for all 3 slots on initialization
   */
  async ngOnInit(): Promise<void> {
    await this.refreshSlotMetadata();
  }

  /**
   * Refresh metadata for all slots
   */
  private async refreshSlotMetadata(): Promise<void> {
    for (let i = 1; i <= 3; i++) {
      const metadata = await this.saveService.getSlotMetadata(i);
      this.saveSlots.update(slots => {
        const newSlots = [...slots];
        newSlots[i - 1] = metadata;
        return newSlots;
      });
    }
  }

  /**
   * Save game to a slot
   */
  async saveToSlot(slotId: number): Promise<void> {
    const existing = this.saveSlots()[slotId - 1];

    if (existing) {
      // Show confirmation dialog for overwrite
      this.confirmationMessage.set(`Overwrite save in slot ${slotId}?`);
      this.pendingAction.set(async () => {
        await this.performSave(slotId);
      });
      this.showConfirmation.set(true);
      return;
    }

    await this.performSave(slotId);
  }

  /**
   * Perform the actual save operation
   */
  private async performSave(slotId: number): Promise<void> {
    await this.saveService.saveGame(this.gameState.state(), slotId);
    this.setSuccessMessage(`Game saved to slot ${slotId}`);
    await this.refreshSlotMetadata();
  }

  /**
   * Load game from a slot
   */
  async loadFromSlot(slotId: number): Promise<void> {
    const state = await this.saveService.loadGame(slotId);

    if (!state) {
      this.setErrorMessage('No save data in this slot');
      return;
    }

    this.gameState.updateState(() => state);
    this.setSuccessMessage('Game loaded successfully');
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Delete a save slot
   */
  deleteSlot(slotId: number): void {
    this.confirmationMessage.set(`Delete save in slot ${slotId}?`);
    this.pendingAction.set(async () => {
      await this.performDelete(slotId);
    });
    this.showConfirmation.set(true);
  }

  /**
   * Perform the actual delete operation
   */
  private async performDelete(slotId: number): Promise<void> {
    await this.saveService.deleteSave(slotId);
    this.setSuccessMessage(`Save slot ${slotId} deleted`);
    await this.refreshSlotMetadata();
  }

  /**
   * Confirm the pending action
   */
  async confirmAction(): Promise<void> {
    const action = this.pendingAction();
    if (action) {
      await action();
    }
    this.showConfirmation.set(false);
    this.pendingAction.set(null);
  }

  /**
   * Cancel the pending action
   */
  cancelAction(): void {
    this.showConfirmation.set(false);
    this.pendingAction.set(null);
  }

  /**
   * Set success message with auto-clear
   */
  private setSuccessMessage(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      this.successMessage.set('');
    }, 3000);
  }

  /**
   * Set error message with auto-clear
   */
  private setErrorMessage(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => {
      this.errorMessage.set('');
    }, 3000);
  }

  /**
   * Format timestamp for display
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Navigate back to castle menu
   */
  backToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }
}
