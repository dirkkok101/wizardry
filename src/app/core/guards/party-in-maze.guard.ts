import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GameStateService } from '@services/GameStateService';
import { LoggerService } from '@services/LoggerService';

/**
 * Route guard that ensures party IS in maze before allowing access to dungeon routes.
 *
 * Prevents direct URL navigation to /maze without properly entering
 * dungeon through castle-menu.
 *
 * Note: Combat, chest, and victory are now handled via overlays in the maze component.
 */
export const partyInMazeGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  const state = gameState.state();

  if (!state.dungeon) {
    logger.warn('[Guard] Cannot access dungeon routes without entering maze. Redirecting to Castle Menu.');
    router.navigate(['/castle-menu']);
    return false;
  }

  return true;
};
