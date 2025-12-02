/**
 * GameLoadedGuard - Ensures game data is loaded before route activation
 *
 * If game data hasn't been loaded yet, redirects to the title screen
 * which will trigger the loading process.
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { LoadingProgressService } from '@services/LoadingProgressService';

export const gameLoadedGuard: CanActivateFn = () => {
  const loadingProgress = inject(LoadingProgressService);
  const router = inject(Router);

  // If loading is complete, allow navigation
  if (loadingProgress.isComplete()) {
    return true;
  }

  // Otherwise, redirect to title screen to trigger loading
  console.log('[GameLoadedGuard] Game data not loaded, redirecting to title screen');
  return router.createUrlTree(['/']);
};
