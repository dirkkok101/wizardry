import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GameStateService } from '@services/GameStateService';
import { LoggerService } from '@services/LoggerService';

/**
 * Route guard that prevents access to town services while party is in maze.
 *
 * Uses state.dungeon !== undefined as the canonical "in maze" check.
 * This is aligned with partyInMazeGuard to prevent redirect loops.
 *
 * Redirects to Maze if party has dungeon state (entered maze).
 *
 * Use on town service routes:
 * - Tavern
 * - Inn
 * - Shop
 * - Temple
 * - Training Grounds
 */
export const partyNotInMazeGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  // Check dungeon state, not scene type - this is the canonical "in maze" check
  // Aligned with partyInMazeGuard to prevent redirect loops
  const state = gameState.state();
  const isInMaze = state.dungeon !== undefined;

  if (isInMaze) {
    logger.warn('[Guard] Cannot access town services while in maze. Redirecting to Maze.');
    router.navigate(['/maze']);
    return false;
  }

  return true;
};
