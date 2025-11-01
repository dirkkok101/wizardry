import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GameStateService } from '../services/GameStateService';

/**
 * Route guard that ensures a party exists before accessing certain routes.
 *
 * Redirects to Castle Menu if no party is active.
 *
 * Use on routes that require an active party:
 * - Maze
 * - Combat
 * - Camp
 * - Edge of Town
 */
export const partyExistsGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);

  const party = gameState.party();

  if (!party || party.members.length === 0) {
    console.warn('[Guard] No party exists. Redirecting to Castle Menu.');
    router.navigate(['/castle-menu']);
    return false;
  }

  return true;
};
