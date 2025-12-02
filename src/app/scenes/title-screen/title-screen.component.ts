import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SaveService } from '@services/SaveService';
import { LoggerService } from '@services/LoggerService';
import { GameInitializationService } from '@services/GameInitializationService';
import { LoadingProgressService } from '@services/LoadingProgressService';
import { KeystrokeInputDirective } from '@shared/directives/keystroke-input.directive';

/**
 * Title Screen Component
 *
 * Entry point for the application. Displays the Wizardry title immediately,
 * then loads game data in the background with progress indication.
 * Navigation is only enabled after all data has loaded.
 */
@Component({
  selector: 'app-title-screen',
  standalone: true,
  imports: [CommonModule, KeystrokeInputDirective],
  templateUrl: './title-screen.component.html',
  styleUrls: ['./title-screen.component.scss']
})
export class TitleScreenComponent implements OnInit {
  private readonly saveService = inject(SaveService);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);

  // Inject the loading progress service
  readonly loadingProgress = inject(LoadingProgressService);

  // Computed signals from progress service
  readonly isLoading = this.loadingProgress.isLoading;
  readonly isComplete = this.loadingProgress.isComplete;
  readonly percentage = this.loadingProgress.percentage;
  readonly currentAsset = this.loadingProgress.currentAsset;
  readonly hasError = this.loadingProgress.hasError;
  readonly errorMessage = this.loadingProgress.errorMessage;

  // Save data detection
  readonly hasSaveData = computed(() => this._hasSaveData);
  private _hasSaveData = false;

  // Navigation state
  private hasNavigated = false;

  async ngOnInit(): Promise<void> {
    try {
      // Start loading game data with progress tracking
      // This runs in background while title screen is visible
      await GameInitializationService.initializeGame(this.loadingProgress);

      // Check for existing save data after game data loads
      this._hasSaveData = await this.saveService.hasSaveData();

    } catch (error) {
      this.logger.error('Failed to load game data:', error);
      this.loadingProgress.error('Failed to load game data. Please refresh the page.');
    }
  }

  handleKeyPress(event: KeyboardEvent): void {
    // Ignore if still loading or already navigated
    if (!this.isComplete() || this.hasNavigated) {
      return;
    }

    // Prevent repeated navigation
    this.hasNavigated = true;

    // Navigate to castle menu
    this.router.navigate(['/castle-menu']);
  }
}
