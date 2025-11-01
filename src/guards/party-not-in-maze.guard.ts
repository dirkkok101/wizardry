import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GameStateService } from '../services/GameStateService';

/**
 * Route guard that prevents access to town services while party is in maze.
 *
 * Redirects to Camp if party is currently in the maze.
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

  const isInMaze = gameState.isInMaze();

  if (isInMaze) {
    console.warn('[Guard] Cannot access town services while in maze. Redirecting to Camp.');
    router.navigate(['/camp']);
    return false;
  }

  return true;
};
