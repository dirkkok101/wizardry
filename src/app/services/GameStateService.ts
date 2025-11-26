import { Injectable, signal, computed, effect } from '@angular/core';
import { GameState } from '@types/GameState';
import { SceneType } from '@types/SceneType';
import { GameInitializationService } from './GameInitializationService';
import { SaveService } from './SaveService';
import { LoggerService } from './LoggerService';

/**
 * GameStateService manages the global game state using Angular signals.
 *
 * This is the single source of truth for all game state. All state mutations
 * go through this service using pure functions from service layer.
 *
 * Architecture:
 * - Uses signals for reactive state updates
 * - State is immutable (new objects on every update)
 * - Auto-saves on state changes (debounced)
 * - Provides computed signals for derived state
 */
@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  // Private signal for game state
  private readonly _state = signal<GameState>(
    GameInitializationService.createNewGame()
  );

  // Public read-only signal
  readonly state = this._state.asReadonly();

  // Computed signals for common queries
  readonly currentScene = computed(() => this.state().currentScene);
  readonly party = computed(() => this.state().party);
  readonly roster = computed(() => this.state().roster);
  readonly isInMaze = computed(() => {
    const scene = this.currentScene();
    return scene === SceneType.MAZE || scene === SceneType.COMBAT;
  });

  // Debounce timer for auto-save
  private saveDebounceTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private saveService: SaveService,
    private logger: LoggerService
  ) {
    // Auto-load from slot 1 on initialization
    this.initializeFromSave();

    // Auto-save effect (debounced to prevent excessive IndexedDB writes)
    effect(() => {
      const currentState = this.state();
      // Only auto-save in safe zones (not in maze/combat)
      if (!this.isInMaze()) {
        // Clear previous timer
        if (this.saveDebounceTimer) {
          clearTimeout(this.saveDebounceTimer);
        }
        // Debounce auto-save by 500ms
        this.saveDebounceTimer = setTimeout(() => {
          this.saveService.saveGame(currentState);
        }, 500);
      }
    });
  }

  /**
   * Initialize state from save slot 1 if it exists.
   *
   * Called automatically on service construction. Uses queueMicrotask to ensure
   * the auto-save effect is fully registered before any state updates occur,
   * preventing race conditions where auto-save might capture and persist the
   * initial empty state before the saved state loads.
   *
   * If no save exists or loading fails, keeps the initial state (new game).
   * Automatically persists characters across page reloads.
   *
   * @private
   */
  private initializeFromSave(): void {
    // Use queueMicrotask to ensure effect() registration completes first
    // This prevents race condition where auto-save effect might capture
    // the initial state before saved state loads
    queueMicrotask(() => {
      this.saveService.loadGame(1).then(savedState => {
        if (savedState) {
          this._state.set(savedState);
        }
        // If no save exists, keep the initial state (new game)
      }).catch(error => {
        this.logger.error('Failed to load saved game:', error);
        // Keep initial state on error
      });
    });
  }

  /**
   * Update game state using a pure function.
   *
   * @param updateFn - Pure function that takes current state and returns new state
   *
   * @example
   * gameStateService.updateState(state => ({
   *   ...state,
   *   currentScene: 'CASTLE_MENU'
   * }));
   */
  updateState(updateFn: (state: GameState) => GameState): void {
    const currentState = this.state();
    const newState = updateFn(currentState);
    this._state.set(newState);
  }

  /**
   * Load saved game state.
   */
  async loadGame(saveSlot: number = 1): Promise<void> {
    const savedState = await this.saveService.loadGame(saveSlot);
    if (savedState) {
      this._state.set(savedState);
    }
  }

  /**
   * Reset to initial state (new game).
   */
  resetState(): void {
    this._state.set(GameInitializationService.createNewGame());
  }
}
