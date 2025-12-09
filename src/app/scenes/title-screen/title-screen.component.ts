import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SaveService } from '@services/SaveService';
import { LoggerService } from '@services/LoggerService';
import { GameInitializationService } from '@services/GameInitializationService';
import { LoadingProgressService } from '@services/LoadingProgressService';
import { GameStateService } from '@services/GameStateService';
import { PartyAbandonmentService } from '@services/PartyAbandonmentService';
import { KeystrokeInputDirective } from '@shared/directives/keystroke-input.directive';
import { SceneType } from '@models/SceneType';
import { APP_VERSION } from '@config/version';

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
  private readonly gameState = inject(GameStateService);

  // Inject the loading progress service
  readonly loadingProgress = inject(LoadingProgressService);

  // Computed signals from progress service
  readonly isLoading = this.loadingProgress.isLoading;
  readonly isComplete = this.loadingProgress.isComplete;
  readonly percentage = this.loadingProgress.percentage;
  readonly currentAsset = this.loadingProgress.currentAsset;
  readonly hasError = this.loadingProgress.hasError;
  readonly errorMessage = this.loadingProgress.errorMessage;

  // State ready signal - true when saved game has been loaded (or confirmed no save)
  readonly isStateReady = this.gameState.isStateReady;

  // Combined check: game data loaded AND saved state loaded
  readonly isFullyReady = computed(() =>
    this.isComplete() && this.isStateReady()
  );

  // Save data detection
  readonly hasSaveData = computed(() => this._hasSaveData);
  private _hasSaveData = false;

  // App version for display
  readonly appVersion = APP_VERSION;

  // Navigation state
  private hasNavigated = false;

  // State-aware navigation signals
  readonly partyInMaze = computed(() => {
    const state = this.gameState.state();
    return state.dungeon !== undefined;
  });

  readonly hasParty = computed(() => {
    const state = this.gameState.state();
    return state.party.members.length > 0;
  });

  // Confirmation dialog state
  readonly showConfirmation = signal(false);
  readonly confirmationMessage = signal('');

  // Mobile device detection
  readonly isMobile = signal(false);

  async ngOnInit(): Promise<void> {
    // Detect mobile device
    this.isMobile.set(this.detectMobile());
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
    // Ignore if game data not loaded, saved state not ready, or already navigated
    if (!this.isFullyReady() || this.hasNavigated) {
      return;
    }

    // If party is in maze, don't allow keypress navigation
    // (must use explicit buttons to resume or abandon)
    if (this.partyInMaze()) {
      return;
    }

    // Prevent repeated navigation
    this.hasNavigated = true;

    // Navigate to castle menu
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Resume adventure - navigate to maze with existing dungeon position
   */
  handleResumeAdventure(): void {
    if (this.hasNavigated) return;
    this.hasNavigated = true;
    this.router.navigate(['/maze']);
  }

  /**
   * Continue game - return to castle (for parties in town)
   */
  handleContinue(): void {
    if (this.hasNavigated) return;
    this.hasNavigated = true;
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Show abandon confirmation dialog
   */
  promptAbandonParty(): void {
    this.confirmationMessage.set(
      'Abandon your party? All members will die and their bodies (with gold) will remain in the dungeon for recovery.'
    );
    this.showConfirmation.set(true);
  }

  /**
   * Confirm party abandonment - kill all members, leave bodies, return to castle
   */
  confirmAbandon(): void {
    if (this.hasNavigated) return;
    this.hasNavigated = true;

    this.gameState.updateState(state =>
      PartyAbandonmentService.abandonParty(state)
    );

    this.showConfirmation.set(false);
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Cancel abandon confirmation
   */
  cancelAbandon(): void {
    this.showConfirmation.set(false);
  }

  /**
   * Start new game - navigate to castle
   */
  handleNewGame(): void {
    if (this.hasNavigated) return;
    this.hasNavigated = true;
    this.router.navigate(['/castle-menu']);
  }

  /**
   * Detect if the user is on a mobile device
   * Checks for touch capability AND small screen width
   */
  private detectMobile(): boolean {
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return hasTouchScreen && isSmallScreen;
  }
}
